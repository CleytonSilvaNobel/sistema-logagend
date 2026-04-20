/**
 * Main App Initialization and Routing
 */

document.addEventListener('DOMContentLoaded', async () => {
    // --- Sincronização Inicial da Nuvem ---
    try {
        if (typeof FirebaseDB !== 'undefined') {
            FirebaseDB.listen((cloudData) => {
                if (cloudData) {
                    Store.loadDB();
                    // Triggers re-render if user is already logged in
                    if (typeof App !== 'undefined' && App.currentUser) {
                        const activeTab = document.querySelector('.nav-item.active');
                        if (activeTab) App.switchTab(activeTab);
                    }
                }
            });
        }
    } catch (e) {
        console.warn('Erro ao inicializar Firebase Sync.', e);
    }
    // ---------------------------------------

    // 1. Initialize Auth
    Auth.init();

    // 2. Initialize Icons
    if (window.lucide) window.lucide.createIcons();

    // 3. Current Date display in Header
    document.getElementById('current-date-display').textContent = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Theme Toggle Logic
    const themeBtn = document.getElementById('btn-theme-toggle');
    const savedTheme = localStorage.getItem('theme-preference') || 'light';

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeBtn) themeBtn.innerHTML = '<i data-lucide="sun"></i> <span>Tema Claro</span>';
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');

            // Update Icon and Text
            themeBtn.innerHTML = isDark ? 
                '<i data-lucide="sun"></i> <span>Tema Claro</span>' : 
                '<i data-lucide="moon"></i> <span>Tema Escuro</span>';
            if (window.lucide) window.lucide.createIcons();

            // Re-render dashboards if active to update chart colors
            const activeNav = document.querySelector('.sidebar-nav .nav-item.active');
            if (activeNav && activeNav.getAttribute('data-target') === 'tab-dashboards') {
                if (window.DashboardsModule) window.DashboardsModule.render();
            }
        });
    }

    // 4. Main Navigation (Tabs)
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Remove active from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Hide all tabs
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                tab.classList.add('hidden');
            });

            // Show target tab
            const targetId = item.getAttribute('data-target');
            const targetTab = document.getElementById(targetId);
            if (targetTab) {
                targetTab.classList.remove('hidden');
                targetTab.classList.add('active');
                
                // Auto-selected first sub-tab
                const firstSub = targetTab.querySelector('.subnav-item');
                if (firstSub) {
                    firstSub.click();
                } else if (targetId === 'tab-dashboards') {
                    if (window.DashboardsModule) DashboardsModule.render();
                }
            }

            // Update Title
            pageTitle.textContent = item.textContent.trim();
        });
    });

    // 5. Sub Navigation (Inner Tabs)
    const setupSubNav = (tabId) => {
        const tabEl = document.getElementById(tabId);
        if (!tabEl) return;

        const subNavItems = tabEl.querySelectorAll('.subnav-item');

        subNavItems.forEach(item => {
            item.addEventListener('click', () => {
                subNavItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                const subTarget = item.getAttribute('data-subtarget');
                triggerSubModuleLoad(subTarget);
            });
        });

        // Auto click first subnav item when tab is opened
        if (subNavItems.length > 0) {
            subNavItems[0].click();
        }
    };

    // Initialize subnavs for all main tabs
    ['tab-configuracoes', 'tab-movimentacoes', 'tab-consultas', 'tab-gestao'].forEach(setupSubNav);

    // Initial Trigger for default active tab
    const activeNav = document.querySelector('.sidebar-nav .nav-item.active');
    if (activeNav) activeNav.click();

    // Initial Branding Update
    if (typeof ManagementModule !== 'undefined' && ManagementModule.updateBranding) {
        ManagementModule.updateBranding();
    }
});

// Load controllers based on active section
function triggerModuleLoad(tabId) {
    if (tabId === 'tab-dashboards') {
        if (window.DashboardsModule) DashboardsModule.render();
    } else {
        const tabEl = document.getElementById(tabId);
        if (tabEl) {
            const activeSub = tabEl.querySelector('.subnav-item.active');
            if (activeSub) {
                const subTarget = activeSub.getAttribute('data-subtarget');
                if (typeof triggerSubModuleLoad === 'function') {
                    triggerSubModuleLoad(subTarget);
                }
            }
        }
    }
}

function triggerSubModuleLoad(subTarget) {
    // Configurações
    if (subTarget.startsWith('sub-config-')) {
        if (subTarget === 'sub-config-noshow' || subTarget === 'sub-config-parametros') {
            if (window.ManagementModule) window.ManagementModule.render(subTarget);
        } else if (window.ConfigModule) {
            window.ConfigModule.render(subTarget);
        }
    }
    // Movimentações
    else if (subTarget.startsWith('sub-mov-') && window.MovementsModule) {
        window.MovementsModule.render(subTarget);
    }
    // Consultas
    else if (subTarget.startsWith('sub-cons-') && window.ConsultationsModule) {
        window.ConsultationsModule.render(subTarget);
    }
    // Gestão
    else if (subTarget.startsWith('sub-ges-') && window.ManagementModule) {
        window.ManagementModule.render(subTarget);
    }
}

// ==========================================
// AUTOMATED BACKUP SCHEDULER
// ==========================================
setInterval(() => {
    // Only run if user is logged in and modules are loaded
    if (typeof Auth === 'undefined' || !Auth.currentUser || typeof Store === 'undefined' || typeof ManagementModule === 'undefined') return;
    
    const config = Store.get('backupConfig');
    if (!config || !config.active) return;

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMin = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMin}`;

    // Only trigger precisely at the scheduled minute
    if (currentTime !== config.time) return;

    let shouldBackup = false;
    if (config.freq === 'daily') {
        shouldBackup = true;
    } else if (config.freq === 'weekly') {
        shouldBackup = now.getDay() === parseInt(config.weekday);
    } else if (config.freq === 'monthly') {
        shouldBackup = now.getDate() === parseInt(config.monthday);
    }

    if (!shouldBackup) return;

    // Ensure we only backup once per day for this specific schedule
    const lastBackup = Store.get('lastBackupDate');
    const todayStr = now.toISOString().split('T')[0];
    if (lastBackup === todayStr) return;

    Store.set('lastBackupDate', todayStr);
    console.log('[Autobackup] Triggering scheduled backup...');
    
    // Automatically call the export function (which natively invokes a file download)
    try {
        ManagementModule.exportDatabase();
    } catch (e) {
        console.error('[Autobackup] Failed to export database:', e);
    }
}, 30000); // Check every 30 seconds

