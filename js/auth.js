/**
 * Simple Mock Authentication Module
 * Manages the "logged in" user and access checks.
 */

const Auth = {
    currentUser: null,

    init: () => {
        const isSessionActive = localStorage.getItem('is_logged_in') === 'true';
        const savedLogin = localStorage.getItem('current_login');
        const users = Store.get('users');

        if (isSessionActive && savedLogin) {
            let user = users.find(u => u.login === savedLogin);
            if (user) {
                Auth.currentUser = user;
                Auth.updateUI();
                Auth.applyRoleRestrictions();
                return;
            }
        }

        // Se sessão inativa ou não validada
        Auth.currentUser = null;
    },

    login: (loginName) => {
        const users = Store.get('users');
        const user = users.find(u => u.login === loginName);
        if (user) {
            Auth.currentUser = user;
            localStorage.setItem('current_login', user.login);
            Auth.updateUI();
            Auth.applyRoleRestrictions();
            // Reload page to re-render all data depending on role
            window.location.reload();
        } else {
            alert('Usuário não encontrado!');
        }
    },

    updateUI: () => {
        const nameEl = document.getElementById('current-user-name');
        const roleEl = document.getElementById('current-user-role');

        if (nameEl && Auth.currentUser) nameEl.textContent = Auth.currentUser.nome;
        if (roleEl && Auth.currentUser) roleEl.textContent = Auth.currentUser.grupo;
    },

    applyRoleRestrictions: () => {
        // Hide/Show Gestão Tab based on role
        const gestaoTab = document.getElementById('nav-gestao');
        if (gestaoTab) {
            const forbiddenGroups = ['Operador', 'Supervisor', 'Visitante'];
            if (forbiddenGroups.includes(Auth.currentUser.grupo)) {
                gestaoTab.style.display = 'none';
            } else {
                gestaoTab.style.display = 'flex';
            }
        }

        // Hide specific sub-tabs in Configuracoes if Operador
        const isOp = Auth.isOperador();

        // Use querySelector by data-subtarget because those buttons don't have IDs
        const btnLocais = document.querySelector('button[data-subtarget="sub-config-locais"]');
        const btnLimites = document.querySelector('button[data-subtarget="sub-config-limites"]');

        if (btnLocais) btnLocais.style.display = isOp ? 'none' : 'block';
        if (btnLimites) btnLimites.style.display = isOp ? 'none' : 'block';

        // Se a tab atual for Locais ou Limites e for Operador, mandar para a primeira
        if (isOp) {
            const activeSub = document.querySelector('#tab-configuracoes .subnav-item.active');
            if (activeSub && (activeSub.getAttribute('data-subtarget') === 'sub-config-locais' || activeSub.getAttribute('data-subtarget') === 'sub-config-limites')) {
                const btnTipos = document.querySelector('button[data-subtarget="sub-config-tipo"]');
                if (btnTipos) btnTipos.click();
            }
        }
    },

    // Replaces simple prompt with a true modal
    promptLogin: () => {
        const rememberedLogin = localStorage.getItem('remembered_login') || '';
        const isRemembered = !!rememberedLogin;

        const formHtml = `
            <form id="form-login">
                <div class="form-group">
                    <label>Login *</label>
                    <input type="text" name="login" class="form-control" value="${rememberedLogin}" required />
                </div>
                <div class="form-group">
                    <label>Senha *</label>
                    <input type="password" name="senha" class="form-control" required />
                </div>
                <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" name="LembrarSenha" id="chk-lembrar" style="width: auto;" ${isRemembered ? 'checked' : ''} />
                    <label for="chk-lembrar" style="margin: 0; font-weight: normal; cursor: pointer; user-select: none;">Manter conectado (Lembrar Login)</label>
                </div>
                <div id="login-error" class="text-danger" style="margin-top: 8px; font-size: 0.85rem;"></div>
                
                <!-- Hidden submit to allow 'Enter' key to trigger form validation naturally -->
                <button type="submit" style="display: none;"></button>
            </form>
        `;

        const titleHtml = `
            <div style="display:flex; align-items:center; gap:8px;">
                <i data-lucide="package" style="color: var(--primary); width: 24px; height: 24px;"></i> 
                <span style="color: var(--primary); font-size: 1.25rem; font-weight: 700;">LogAgend</span>
            </div>
        `;

        UI.openModal({
            title: titleHtml,
            formHtml,
            saveText: 'Entrar',
            width: '400px',
            hideClose: true,
            onSave: () => {
                const form = document.getElementById('form-login');
                const err = document.getElementById('login-error');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);

                const users = Store.get('users');
                const user = users.find(u => u.login === data.login);

                if (!user) {
                    err.textContent = 'Usuário não encontrado!';
                    return false;
                }

                if (user.senha !== data.senha) {
                    // Fallback to Senha123 if senha is not defined in older data
                    if (!(user.senha === undefined && data.senha === 'Senha123')) {
                        err.textContent = 'Senha incorreta!';
                        return false;
                    }
                }

                // Handle Remember Me
                const rememberMe = document.getElementById('chk-lembrar').checked;
                if (rememberMe) {
                    localStorage.setItem('remembered_login', user.login);
                } else {
                    localStorage.removeItem('remembered_login');
                }

                Auth.currentUser = user;
                localStorage.setItem('current_login', user.login);
                localStorage.setItem('is_logged_in', 'true');

                // Update interface in-place instead of reloading to prevent local file protocol sync bugs
                Auth.updateUI();
                Auth.applyRoleRestrictions();

                // If the Dashboards or any active tab needs to fetch data again
                const activeNav = document.querySelector('.sidebar-nav .nav-item.active');
                if (activeNav) activeNav.click();

                return true; // Return true closes the modal automatically
            }
        });

        // Add Enter Key listener to the form to trigger the modal 'Save' button
        setTimeout(() => {
            const formObj = document.getElementById('form-login');
            if (formObj) {
                formObj.addEventListener('submit', (e) => {
                    e.preventDefault(); // prevent native submission refresh
                    // Trigger the UI openModal save button click
                    const saveBtn = document.querySelector('.modal-footer .btn-primary');
                    if (saveBtn) saveBtn.click();
                });

                // Set focus to password if login is already filled
                if (isRemembered) {
                    formObj.querySelector('input[name="senha"]').focus();
                } else {
                    formObj.querySelector('input[name="login"]').focus();
                }
            }
        }, 100);
    },

    changePassword: () => {
        const formHtml = `
            <form id="form-changepw">
                <div class="form-group">
                    <label>Senha Atual *</label>
                    <input type="password" name="senha_atual" class="form-control" required />
                </div>
                <div class="form-group">
                    <label>Nova Senha *</label>
                    <input type="password" name="nova_senha" class="form-control" required minlength="4" />
                </div>
                <div class="form-group">
                    <label>Confirmar Nova Senha *</label>
                    <input type="password" name="confirmar_senha" class="form-control" required minlength="4" />
                </div>
            </form>
        `;

        UI.openModal({
            title: 'Alterar Minha Senha',
            formHtml,
            width: '400px',
            onSave: (modalId) => {
                const form = document.getElementById('form-changepw');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);

                if (data.senha_atual !== Auth.currentUser.senha) {
                    Utils.showAlert('Senha atual incorreta!', 'danger', `body-${modalId}`);
                    return false;
                }

                if (data.nova_senha !== data.confirmar_senha) {
                    Utils.showAlert('As novas senhas não coincidem!', 'danger', `body-${modalId}`);
                    return false;
                }

                Store.update('users', Auth.currentUser.id, { senha: data.nova_senha });
                
                // Update session object
                Auth.currentUser.senha = data.nova_senha;
                
                alert('Senha alterada com sucesso!');
                return true;
            }
        });
    },

    // Role verification utilities
    isOperador: () => Auth.currentUser && Auth.currentUser.grupo === 'Operador',
    isSupervisor: () => Auth.currentUser && Auth.currentUser.grupo === 'Supervisor',
    isADM: () => Auth.currentUser && Auth.currentUser.grupo === 'ADM',
    isVisitante: () => Auth.currentUser && Auth.currentUser.grupo === 'Visitante',

    logout: () => {
        localStorage.removeItem('is_logged_in');
        window.location.reload();
    }
};

// Init UI listener for the switch user and change password
document.addEventListener('DOMContentLoaded', () => {
    const btnSwitch = document.getElementById('btn-switch-user');
    if (btnSwitch) btnSwitch.addEventListener('click', Auth.logout);

    const btnChangePw = document.getElementById('btn-change-pw');
    if (btnChangePw) btnChangePw.addEventListener('click', Auth.changePassword);

    // If no user is logged in at all (first load issue if storage fails), force login screen
    if (!Auth.currentUser) {
        Auth.promptLogin();
    }
});
