/**
 * Simple Mock Authentication Module
 * Manages the "logged in" user and access checks.
 */

const Auth = {
    currentUser: null,

    init: () => {
        // Agora quem controla a sessão é o Firebase Auth
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // PASSO CRÍTICO: Puxar dados da nuvem ANTES de verificar permissões
                // Isso garante que numa máquina nova, os usuários cadastrados estarão disponíveis
                if (typeof FirebaseDB !== 'undefined' && FirebaseDB.syncLoad) {
                    try {
                        await FirebaseDB.syncLoad();
                    } catch (e) {
                        console.warn('Falha ao sincronizar dados da nuvem antes do login:', e);
                    }
                }

                const users = Store.get('users');
                const localUser = users.find(u => u.login && u.login.toLowerCase() === user.email.toLowerCase());
                
                if (localUser) {
                    Auth.currentUser = localUser;
                    Auth.updateUI();
                    Auth.applyRoleRestrictions();
                    
                    // Forçar o carregamento do conteúdo inicial
                    setTimeout(() => {
                        const activeTab = document.querySelector('.nav-item.active') || document.querySelector('.nav-item');
                        if (activeTab) activeTab.click();
                    }, 100);

                    const mc = document.getElementById('modal-container');
                    if (mc) mc.innerHTML = ''; // Fecha o modal de login
                } else if (user.email.toLowerCase() === 'cleyton.silva@nobelpack.com.br' || user.email.toLowerCase() === 'admin@nobelpack.com.br') {
                    const newAdm = {
                        id: Utils.generateId(8),
                        nome: 'Cleyton Silva (ADM)',
                        login: user.email.toLowerCase(),
                        senha: 'Protegida (Firebase)',
                        grupo: 'ADM'
                    };
                    users.push(newAdm);
                    Store.set('users', users);
                    Auth.currentUser = newAdm;
                    Auth.updateUI();
                    Auth.applyRoleRestrictions();
                    const mc = document.getElementById('modal-container');
                    if (mc) mc.innerHTML = ''; // Fecha o modal de login
                    alert('Perfil de Administrador vinculado com sucesso!');
                } else {
                    firebase.auth().signOut();
                    alert('Usuário logado no Google não possui cadastro interno de permissões no LogAgend.');
                    Auth.currentUser = null;
                    Auth.promptLogin();
                }
            } else {
                Auth.currentUser = null;
                Auth.promptLogin();
            }
        });
    },

    login: (loginName) => {
        // Função deprecada na migração para o Firebase Auth
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
        const formHtml = `
            <div class="logo-login">
                <i data-lucide="package"></i>
                <h1>LogAgend</h1>
                <span class="brand-nobel">NOBELPACK</span>
            </div>
            <form id="form-login">
                <div class="form-group">
                    <label>E-mail de Acesso</label>
                    <input type="email" name="login" class="form-control" placeholder="ex: seunome@empresa.com.br" required />
                </div>
                <div class="form-group">
                    <div style="display:flex; justify-content: space-between;">
                        <label>Senha</label>
                        <a href="#" onclick="Auth.resetPassword(); return false;" style="font-size: 0.8rem; text-decoration: none; color: var(--primary);">Esqueci a senha</a>
                    </div>
                    <input type="password" name="senha" class="form-control" placeholder="Digite sua senha" required />
                </div>
                <div id="login-error" style="color: #f87171; font-size: 0.85rem; margin-top: 10px; text-align: center;"></div>
            </form>
        `;

        UI.openModal({
            title: '',
            formHtml,
            saveText: 'Conectar',
            width: '400px',
            hideClose: true,
            overlayClass: 'auth-overlay',
            onSave: () => {
                const form = document.getElementById('form-login');
                const err = document.getElementById('login-error');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);

                const saveBtn = document.querySelector('.modal-footer .btn-primary');
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = 'Verificando no Firebase...';
                saveBtn.disabled = true;

                firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
                    .then(() => {
                        return firebase.auth().signInWithEmailAndPassword(data.login, data.senha);
                    })
                    .then(() => {
                        // O onAuthStateChanged vai fechar o modal.
                    })
                    .catch((error) => {
                        saveBtn.innerHTML = originalText;
                        saveBtn.disabled = false;
                        let msg = 'Erro no login.';
                        if (error.code === 'auth/invalid-credential') msg = 'E-mail ou senha incorretos.';
                        err.textContent = msg;
                    });

                return false; // Evita que feche automaticamente antes da verificação
            }
        });

        setTimeout(() => {
            const formObj = document.getElementById('form-login');
            if (formObj) {
                formObj.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const saveBtn = document.querySelector('.modal-footer .btn-primary');
                    if (saveBtn) saveBtn.click();
                });
                formObj.querySelector('input[name="login"]').focus();
            }
            if (window.lucide) window.lucide.createIcons();
        }, 100);
    },

    resetPassword: () => {
        const form = document.getElementById('form-login');
        if (!form) return;
        const login = form.querySelector('input[name="login"]').value.trim();
        
        if (!login) {
            Utils.notify('Preencha seu e-mail no campo acima primeiro.', 'warning');
            return;
        }

        if (confirm(`Deseja enviar um e-mail de recuperação de senha para ${login}?`)) {
            firebase.auth().sendPasswordResetEmail(login)
                .then(() => {
                    Utils.notify('E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'success');
                })
                .catch((error) => {
                    console.error(error);
                    Utils.notify('Erro ao enviar e-mail. Verifique se o endereço está correto.', 'danger');
                });
        }
    },

    changePassword: () => {
        if (confirm('Deseja receber o e-mail oficial de redefinição de senha para sua conta atual?')) {
            firebase.auth().sendPasswordResetEmail(Auth.currentUser.login)
                .then(() => {
                    alert('Verifique sua caixa de entrada para alterar a senha.');
                })
                .catch(error => {
                    console.error(error);
                    alert('Erro ao enviar o e-mail de redefinição.');
                });
        }
    },

    // Role verification utilities
    isOperador: () => Auth.currentUser && Auth.currentUser.grupo === 'Operador',
    isSupervisor: () => Auth.currentUser && Auth.currentUser.grupo === 'Supervisor',
    isADM: () => Auth.currentUser && Auth.currentUser.grupo === 'ADM',
    isVisitante: () => Auth.currentUser && Auth.currentUser.grupo === 'Visitante',

    logout: () => {
        firebase.auth().signOut().then(() => {
            window.location.reload();
        });
    }
};

// Init UI listener for the switch user and change password
document.addEventListener('DOMContentLoaded', () => {
    const btnSwitch = document.getElementById('btn-switch-user');
    if (btnSwitch) btnSwitch.addEventListener('click', Auth.logout);

    const btnChangePw = document.getElementById('btn-change-pw');
    if (btnChangePw) btnChangePw.addEventListener('click', Auth.changePassword);

    // Como Auth.init() agora usa onAuthStateChanged assíncrono, 
    // a verificação inicial para abrir o modal fica a cargo do estado do onAuthStateChanged.

});
