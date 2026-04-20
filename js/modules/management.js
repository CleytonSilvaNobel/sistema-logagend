/**
 * Management Module (Gestão de Usuários)
 */

window.ManagementModule = (function () {
    let currentContainerId = 'ges-content-area';
    let noShowFilters = { supplier: '', date: '', type: '' };

    const renderLayout = (title, primaryButton, extraButtons = '', tableHtml) => {
        const container = document.getElementById(currentContainerId);
        if (!container) return;
        
        const isVisitor = typeof Auth !== 'undefined' && Auth.isVisitante();
        
        // Ensure UI branding is current
        updateBranding();
        
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
                <h2>${title}</h2>
                <div style="display: flex; gap: 12px;">
                    ${!isVisitor ? extraButtons : ''}
                    ${(primaryButton && !isVisitor) ? `
                        <button class="btn btn-primary" id="btn-new-ges">
                            <i data-lucide="plus"></i> ${primaryButton.text}
                        </button>
                    ` : ''}
                </div>
            </div>
            <div id="ges-alerts"></div>
            <div class="card">
                <div class="card-body" style="padding: 0;">
                    ${tableHtml}
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        if (primaryButton && primaryButton.onClick && !isVisitor) {
            const btnNew = document.getElementById('btn-new-ges');
            if (btnNew) btnNew.addEventListener('click', primaryButton.onClick);
        }
    };

    // --- Grupos ---
    const renderGrupos = () => {
        const data = Store.get('groups');
        const columns = [
            { key: 'nome', label: 'Nome do Grupo' },
            { key: 'permissoes', label: 'Regras de Negócio / Permissões' }
        ];

        const actionsRenderer = (row) => {
            const isDefault = (row.nome === 'ADM' || row.nome === 'Supervisor' || row.nome === 'Operador');
            let html = `
                <button class="icon-btn text-primary" title="Editar" onclick="ManagementModule.openModalGrupos('${row.id}')">
                    <i data-lucide="edit"></i>
                </button>
            `;
            if (isDefault) {
                html += `<span class="badge" style="background:var(--warning); color:#fff;">Padrão</span>`;
            } else {
                html += `<button class="icon-btn btn-delete text-danger" title="Excluir" onclick="ManagementModule.removerGrupo('${row.id}')"><i data-lucide="trash-2"></i></button>`;
            }
            return html;
        };

        const isVisitor = typeof Auth !== 'undefined' && Auth.isVisitante();
        const tableHtml = UI.buildTable(columns, data, (Auth.isADM() && !isVisitor) ? actionsRenderer : null);

        const isAdm = Auth.isADM();
        renderLayout(
            'Grupos de Acesso', 
            isAdm ? { text: 'Novo Grupo', onClick: () => openModalGrupos() } : null, 
            '',
            tableHtml
        );
    };

    const openModalGrupos = (id = null) => {
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        const existing = id ? Store.getById('groups', id) : null;
        const isDefault = existing && (existing.nome === 'ADM' || existing.nome === 'Supervisor' || existing.nome === 'Operador');

        const formHtml = `
            <form id="form-grupo">
                <div class="form-group">
                    <label>Nome do Grupo *</label>
                    <input type="text" name="nome" class="form-control" placeholder="Ex: Visitante" value="${existing?.nome || ''}" required ${isDefault ? 'disabled' : ''} />
                </div>
                <div class="form-group">
                    <label>Permissões</label>
                    <input type="text" name="permissoes" class="form-control" placeholder="Ex: visualizacao_basica" value="${existing?.permissoes || ''}" />
                </div>
                <div class="form-group" style="display:flex; align-items:center; gap:8px; margin-top:10px;">
                    <input type="checkbox" name="permitir_ia" id="permitir_ia" ${existing?.permitir_ia ? 'checked' : ''} style="width:auto; cursor:pointer;">
                    <label for="permitir_ia" style="margin-bottom:0; cursor:pointer;">Permitir uso da Inteligência Artificial (Assistente)</label>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">
                    <i data-lucide="info" style="width:14px; height:14px; margin-right:4px;"></i>
                    Grupos criados herdam permissões básicas de Operador.
                </div>
            </form>
        `;

        UI.openModal({
            title: existing ? 'Editar Grupo de Acesso' : 'Novo Grupo de Acesso',
            formHtml,
            onSave: () => {
                const form = document.getElementById('form-grupo');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);
                data.permitir_ia = !!document.getElementById('permitir_ia').checked;

                if (id) {
                    Store.update('groups', id, data);
                    Utils.showAlert('Grupo atualizado com sucesso.', 'success', 'ges-alerts');
                } else {
                    const dbGroups = Store.get('groups');
                    if (dbGroups.find(g => g.nome.toLowerCase() === data.nome.toLowerCase())) {
                        alert('Já existe um grupo com este nome.');
                        return false;
                    }
                    Store.insert('groups', data);
                    Utils.showAlert('Grupo criado com sucesso.', 'success', 'ges-alerts');
                }
                renderGrupos();
                return true;
            }
        });
    };

    const removerGrupo = (id) => {
        if (confirm('Tem certeza que deseja remover este Grupo? Certifique-se de que não há usuários atrelados a ele!')) {
            Store.delete('groups', id);
            Utils.showAlert('Grupo removido!', 'success', 'ges-alerts');
            renderGrupos();
        }
    };

    // --- Usuários ---
    const renderUsuarios = () => {
        const data = Store.get('users');
        const columns = [
            { key: 'nome', label: 'Nome' },
            { key: 'login', label: 'Login (ID)' },
            { key: 'grupo', label: 'Grupo de Acesso' }
        ];

        const actionsRenderer = (row) => `
            <button class="icon-btn text-primary" title="Editar" onclick="ManagementModule.openModalUsuarios('${row.id}')"><i data-lucide="edit"></i></button>
            <button class="icon-btn btn-warning" title="Redefinir Senha" onclick="ManagementModule.redefinirSenha('${row.id}')"><i data-lucide="key"></i></button>
            <button class="icon-btn btn-delete text-danger" title="Excluir" onclick="ManagementModule.removerUsuario('${row.id}')"><i data-lucide="trash-2"></i></button>
        `;

        const isVisitor = typeof Auth !== 'undefined' && Auth.isVisitante();
        const tableHtml = UI.buildTable(columns, data, isVisitor ? null : actionsRenderer);
        renderLayout(
            'Usuários', 
            { text: 'Novo Usuário', onClick: () => openModalUsuarios() }, 
            '', 
            tableHtml
        );
    };

    const openModalUsuarios = (id = null) => {
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        const existing = id ? Store.getById('users', id) : null;
        const groups = Store.get('groups');
        const optionsHtml = groups.map(g => `<option value="${g.nome}" ${existing?.grupo === g.nome ? 'selected' : ''}>${g.nome}</option>`).join('');

        const formHtml = `
            <form id="form-user">
                <div class="form-group">
                    <label>Nome Completo *</label>
                    <input type="text" name="nome" class="form-control" value="${existing?.nome || ''}" required />
                </div>
                <div class="form-group">
                    <label>Login de Acesso *</label>
                    <input type="text" name="login" class="form-control" value="${existing?.login || ''}" required ${existing ? 'readonly style="background:var(--bg-main)"' : ''} />
                </div>
                <div class="form-group">
                    <label>Grupo / Perfil *</label>
                    <select name="grupo" class="form-control" required>
                        <option value="">Selecione...</option>
                        ${optionsHtml}
                    </select>
                </div>
            </form>
        `;

        UI.openModal({
            title: existing ? 'Editar Usuário do Sistema' : 'Novo Usuário do Sistema',
            formHtml,
            onSave: () => {
                const form = document.getElementById('form-user');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);

                if (id) {
                    Store.update('users', id, data);
                    Utils.showAlert('Usuário atualizado com sucesso.', 'success', 'ges-alerts');
                } else {
                    // Check conflict login
                    const exist = Store.get('users').find(u => u.login === data.login);
                    if (exist) {
                        alert('Este login já existe.');
                        return false;
                    }
                    // Add Default Password
                    data.senha = 'Senha123';
                    Store.insert('users', data);
                    Utils.showAlert('Usuário salvo com senha padrão "Senha123"!', 'success', 'ges-alerts');
                }
                renderUsuarios();
                return true;
            }
        });
    };

    const removerUsuario = (id) => {
        if (id === 'u1') {
            alert('Você não pode remover o Admin Master!');
            return;
        }
        if (confirm('Remover usuário? Isso não apagará os históricos atrelados ao login dele.')) {
            Store.delete('users', id);
            renderUsuarios();
        }
    };

    const redefinirSenha = (id) => {
        if (confirm('Tem certeza que deseja redefinir a senha deste usuário para "Senha123"?')) {
            Store.update('users', id, { senha: 'Senha123' });
            Utils.showAlert('Senha redefinida para "Senha123" com sucesso!', 'success', 'ges-alerts');
        }
    };

    // --- Feriados ---
    const renderFeriados = () => {
        const data = Store.get('holidays');
        const viewData = data.map(d => ({ ...d, data_br: Utils.formatDateBR(d.data) }));
        const columns = [
            { key: 'data_br', label: 'Data' },
            { key: 'descricao', label: 'Descrição' }
        ];
        const actionsRenderer = (row) => `
            <button class="icon-btn text-primary" title="Editar" onclick="ManagementModule.openModalFeriados('${row.id}')"><i data-lucide="edit"></i></button>
            <button class="icon-btn btn-delete text-danger" title="Excluir" onclick="ManagementModule.removerFeriado('${row.id}')"><i data-lucide="trash-2"></i></button>
        `;
        const isVisitor = typeof Auth !== 'undefined' && Auth.isVisitante();
        const tableHtml = UI.buildTable(columns, viewData, isVisitor ? null : actionsRenderer);
        
        const extraButtons = `
            <button class="btn btn-primary" onclick="ManagementModule.openHelpImportModal()">
                <i data-lucide="help-circle"></i> Ajuda / Modelo
            </button>
            <button class="btn btn-primary" onclick="document.getElementById('xlsx-import-holidays').click()">
                <i data-lucide="upload"></i> Importar Excel
            </button>
            <input type="file" id="xlsx-import-holidays" style="display:none" accept=".xlsx, .xls" onchange="ManagementModule.handleHolidayImport(event)" />
        `;

        renderLayout(
            'Feriados Restritos', 
            { text: 'Novo Feriado', onClick: () => openModalFeriados() }, 
            extraButtons, 
            tableHtml
        );
    };

    const openHelpImportModal = () => {
        const formHtml = `
            <div style="font-size:0.9rem; line-height:1.6; color:var(--text-main);">
                <p>Para realizar o lançamento em massa, siga as instruções abaixo:</p>
                <ul style="margin: 12px 0; padding-left: 20px;">
                    <li>O arquivo deve ser no formato <strong>Excel (.xlsx ou .xls)</strong>.</li>
                    <li>As colunas obrigatórias são: <strong>Data</strong> (Formato sugerido: DD/MM/AAAA ou YYYY-MM-DD) e <strong>Descricao</strong>.</li>
                    <li>A primeira linha será considerada o cabeçalho.</li>
                </ul>
                <div style="background: var(--bg-main); padding: 12px; border-radius: 8px; border: 1px dashed var(--border-color); margin-top: 16px;">
                    <p style="margin:0; font-weight:600; color:var(--primary);">Dica:</p>
                    <p style="margin:0;">Baixe o modelo pronto clicando no botão abaixo.</p>
                </div>
                <div style="margin-top:20px; text-align:center;">
                    <button class="btn btn-primary" onclick="ManagementModule.downloadTemplate()">
                        <i data-lucide="download"></i> Baixar Modelo Excel
                    </button>
                </div>
            </div>
        `;
        UI.openModal({
            title: 'Instruções de Importação',
            formHtml,
            hideActions: true
        });
        if (window.lucide) window.lucide.createIcons();
    };

    const downloadTemplate = () => {
        const templateData = [
            ["Data", "Descricao"],
            ["01/01/2026", "Confraternização Universal"],
            ["01/05/2026", "Dia do Trabalho"],
            ["25/12/2026", "Natal"]
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        XLSX.utils.book_append_sheet(wb, ws, "Feriados");
        XLSX.writeFile(wb, "modelo_feriados_logagend.xlsx");
    };

    const handleHolidayImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                if (jsonData.length === 0) {
                    alert("O arquivo está vazio!");
                    return;
                }

                let importedCount = 0;
                let errorCount = 0;
                const dbHolidays = Store.get('holidays');

                jsonData.forEach(row => {
                    const dataRaw = row.Data || row.data || row.DATA;
                    const descRaw = row.Descricao || row.descricao || row.DESCRIÇÃO || row.DESCRICAO || "";

                    if (dataRaw) {
                        let formattedDate = "";
                        if (typeof dataRaw === 'number') {
                            const date = XLSX.utils.numdate(dataRaw);
                            formattedDate = date.toISOString().split('T')[0];
                        } else {
                            if (dataRaw.includes('/')) {
                                const [d, m, y] = dataRaw.split('/');
                                formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                            } else {
                                formattedDate = dataRaw;
                            }
                        }

                        const exists = dbHolidays.find(h => h.data === formattedDate);
                        if (!exists && formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            Store.insert('holidays', { data: formattedDate, descricao: descRaw });
                            importedCount++;
                        } else if (!exists) {
                            errorCount++;
                        }
                    } else {
                        errorCount++;
                    }
                });

                Utils.showAlert(`Importação concluída: ${importedCount} feriados adicionados. ${errorCount > 0 ? `${errorCount} linhas ignoradas por erro ou formato inválido.` : ''}`, 'success', 'ges-alerts');
                renderFeriados();
            } catch (err) {
                console.error(err);
                alert("Erro ao ler o arquivo. Certifique-se de que é um Excel válido.");
            }
            event.target.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    const openModalFeriados = (id = null) => {
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        const existing = id ? Store.getById('holidays', id) : null;
        const formHtml = `
            <form id="form-feriado">
                <div class="form-group">
                    <label>Data *</label>
                    <input type="date" name="data" class="form-control" value="${existing?.data || ''}" required />
                </div>
                <div class="form-group">
                    <label>Descrição</label>
                    <input type="text" name="descricao" class="form-control" value="${existing?.descricao || ''}" />
                </div>
            </form>
        `;
        UI.openModal({
            title: existing ? 'Editar Feriado' : 'Registrar Feriado',
            formHtml,
            onSave: () => {
                const form = document.getElementById('form-feriado');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);
                
                if (id) {
                    Store.update('holidays', id, data);
                    Utils.showAlert('Feriado atualizado com sucesso!', 'success', 'ges-alerts');
                } else {
                    Store.insert('holidays', data);
                    Utils.showAlert('Feriado registrado com sucesso!', 'success', 'ges-alerts');
                }
                renderFeriados();
                return true;
            }
        });
    };

    const removerFeriado = (id) => {
        if (confirm('Tem certeza que deseja remover este feriado?')) {
            Store.delete('holidays', id);
            Utils.showAlert('Feriado removido!', 'success', 'ges-alerts');
            renderFeriados();
        }
    };

    // --- Limpeza de Dados ---
    const requireAuth = (callback) => {
        if (Auth.currentUser?.grupo !== 'ADM') {
            alert('Apenas administradores podem executar esta ação!');
            return;
        }

        const formHtml = `
            <div class="alert alert-danger" style="margin-bottom:15px; font-size:0.85rem;">
                <i data-lucide="alert-triangle" style="width:16px;height:16px;"></i>
                AÇÃO DESTRUTIVA: Os dados serão apagados permanentemente.<br>Confirme suas credenciais para prosseguir.
            </div>
            <form id="form-auth-confirm">
                <div class="form-group">
                    <label>Usuário</label>
                    <input type="text" id="confirm_user" class="form-control" required />
                </div>
                <div class="form-group">
                    <label>Senha</label>
                    <input type="password" id="confirm_pass" class="form-control" required />
                </div>
            </form>
        `;

        UI.openModal({
            title: 'AUTENTICAÇÃO NECESSÁRIA',
            formHtml,
            onSave: () => {
                const u = document.getElementById('confirm_user').value;
                const p = document.getElementById('confirm_pass').value;
                const dbUsers = Store.get('users');
                const user = dbUsers.find(x => x.login === u && x.senha === p);

                if (!user || user.grupo !== 'ADM') {
                    alert('Credenciais inválidas ou sem permissão de Administrador.');
                    return false;
                }
                callback();
                return true;
            }
        });
    };

    const renderLimpezaDados = () => {
        const container = document.getElementById(currentContainerId);
        if (!container) return;
        const isVisitor = typeof Auth !== 'undefined' && Auth.isVisitante();
        if (Auth.currentUser?.grupo !== 'ADM' || isVisitor) {
            container.innerHTML = `<div style="padding: 40px; text-align:center; color: var(--text-muted);"><h2>Acesso Restrito</h2></div>`;
            return;
        }

        container.innerHTML = `
            <h2>Limpeza de Dados (Ações Irreversíveis)</h2>
            <div id="ges-alerts" style="margin-top:16px;"></div>
            
            <div style="display:flex; gap:20px; margin-top: 20px;">
                <div class="card" style="flex:1; border-color: var(--danger);">
                    <div class="card-body">
                        <h3 style="color:var(--danger);">Apagar Tudo (Factory Reset)</h3>
                        <p>Apaga todos os Agendamentos, Apontamentos e Avaliações.</p>
                        <button class="btn" style="background:var(--danger); color:white;" onclick="ManagementModule.wipeAllData()">Confirmar Restauração</button>
                    </div>
                </div>
                <div class="card" style="flex:1; border-color: var(--warning);">
                    <div class="card-body">
                        <h3 style="color:var(--warning);">Apagar por Período</h3>
                        <div style="display:flex; gap:10px; margin-bottom: 15px;">
                            <input type="date" id="purge-start" class="form-control" />
                            <input type="date" id="purge-end" class="form-control" />
                        </div>
                        <button class="btn" style="background:var(--warning); color:white;" onclick="ManagementModule.purgeDataByDate()">Limpar Período</button>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    const wipeAllData = () => {
        requireAuth(() => {
            Store.set('schedules', []);
            Store.set('supplierEvaluations', []);
            Utils.showAlert('Todos os dados operacionais foram limpos.', 'success', 'ges-alerts');
        });
    };

    const purgeDataByDate = () => {
        const start = document.getElementById('purge-start').value;
        const end = document.getElementById('purge-end').value;
        if (!start || !end) { alert('Informe o período.'); return; }
        requireAuth(() => {
            const sc = Store.get('schedules').filter(s => s.data < start || s.data > end);
            const ev = Store.get('supplierEvaluations').filter(e => e.data_referencia < start || e.data_referencia > end);
            Store.set('schedules', sc);
            Store.set('supplierEvaluations', ev);
            Utils.showAlert('Dados removidos.', 'success', 'ges-alerts');
        });
    };

    // --- Integrações ---
    const renderIntegracoes = () => {
        const container = document.getElementById(currentContainerId);
        if (!container) return;
        container.innerHTML = `
            <h2>Integração e Sincronização</h2>
            <div id="ges-alerts" style="margin-top:16px;"></div>
            
            <div style="display:flex; gap:20px; margin-top:20px;">
                <div class="card" style="flex:1;">
                    <div class="card-body">
                        <h3>Exportar Base</h3>
                        <button class="btn btn-primary" onclick="ManagementModule.exportDatabase()">Gerar Backup</button>
                    </div>
                </div>
                <div class="card" style="flex:1;">
                    <div class="card-body">
                        <h3>Importar Base</h3>
                        <input type="file" id="db-import-file" accept=".json" style="margin-bottom:10px; width:100%;" />
                        <button class="btn btn-secondary" onclick="ManagementModule.importDatabase()">Sincronizar</button>
                    </div>
                </div>
            </div>

            <h3 style="margin-top: 30px;">Inteligência Artificial (Gemini)</h3>
            <div class="card" style="border-left: 4px solid var(--primary);">
                <div class="card-body">
                    <form onsubmit="event.preventDefault(); Store.saveParameters({ gemini_api_key: document.getElementById('ai-key').value, gemini_model: document.getElementById('ai-model').value }); Utils.showAlert('Salvo!', 'success', 'ges-alerts');">
                        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                            <input id="ai-model" class="form-control" value="${Store.parameters.gemini_model || 'gemini-2.0-flash'}" style="flex: 1;" />
                            <input type="password" id="ai-key" class="form-control" value="${Store.parameters.gemini_api_key || ''}" placeholder="API Key" style="flex: 2;" />
                            ${!(typeof Auth !== 'undefined' && Auth.isVisitante()) ? '<button type="submit" class="btn btn-primary">Salvar</button>' : ''}
                        </div>
                    </form>
                </div>
            </div>

            <h3 style="margin-top: 30px;">Backup Automático e Caminho Local</h3>
            <div class="card">
                <div class="card-body">
                    <form onsubmit="ManagementModule.saveBackupConfig(event)">
                        <div style="display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 20px; border-bottom: 1px dashed var(--border); padding-bottom: 20px;">
                            <div class="form-group" style="margin-bottom:0;"><label>Status</label><select id="bkp-active" class="form-control"><option value="false">Desativado</option><option value="true">Ativado</option></select></div>
                            <div class="form-group" style="margin-bottom:0;"><label>Frequência</label><select id="bkp-freq" class="form-control" onchange="ManagementModule.toggleBackupFields()"><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></div>
                            <div id="group-weekday" class="form-group" style="margin-bottom:0;"><label>Dia Semana</label><select id="bkp-weekday" class="form-control"><option value="1">Seg</option><option value="2">Ter</option><option value="3">Qua</option><option value="4">Qui</option><option value="5">Sex</option><option value="6">Sáb</option><option value="0">Dom</option></select></div>
                            <div id="group-monthday" class="form-group" style="display:none; margin-bottom:0;"><label>Dia Mês</label><input type="number" id="bkp-monthday" class="form-control" min="1" max="31" value="1" /></div>
                            <div class="form-group" style="margin-bottom:0;"><label>Horário</label><input type="time" id="bkp-time" class="form-control" required /></div>
                            <button type="submit" class="btn btn-primary">Salvar Agendamento</button>
                        </div>
                    </form>
                    
                    <form onsubmit="ManagementModule.saveBackupPath(event)">
                        <label>Caminho de Destino para Backups Automáticos</label>
                        <div style="display: flex; gap: 15px; align-items: center; margin-top: 8px;">
                            <input type="text" id="param-backup-path" class="form-control" value="${Store.parameters.backup_path || ''}" placeholder="Ex: C:\Backups\LogAgend" style="flex: 1;">
                            <button type="submit" class="btn btn-secondary">Atualizar Caminho</button>
                        </div>
                        <small class="text-muted" style="margin-top: 5px; display: block;">Configure uma pasta local sincronizada (Ex: OneDrive/Dropbox) para maior segurança.</small>
                    </form>
                </div>
            </div>
        `;
        const bkp = Store.get('backupConfig') || { active:false, freq:'weekly', weekday:5, monthday:1, time:'18:00' };
        document.getElementById('bkp-active').value = String(bkp.active);
        document.getElementById('bkp-freq').value = bkp.freq;
        document.getElementById('bkp-weekday').value = String(bkp.weekday);
        document.getElementById('bkp-monthday').value = String(bkp.monthday);
        document.getElementById('bkp-time').value = bkp.time;
        toggleBackupFields();
        if (window.lucide) window.lucide.createIcons();
    };

    const toggleBackupFields = () => {
        const freq = document.getElementById('bkp-freq')?.value;
        const gw = document.getElementById('group-weekday');
        const gm = document.getElementById('group-monthday');
        if (gw) gw.style.display = freq === 'weekly' ? 'block' : 'none';
        if (gm) gm.style.display = freq === 'monthly' ? 'block' : 'none';
    };

    const saveBackupConfig = (e) => {
        e.preventDefault();
        Store.set('backupConfig', {
            active: document.getElementById('bkp-active').value === 'true',
            freq: document.getElementById('bkp-freq').value,
            weekday: parseInt(document.getElementById('bkp-weekday').value),
            monthday: parseInt(document.getElementById('bkp-monthday').value),
            time: document.getElementById('bkp-time').value
        });
        Utils.showAlert('Backup salvo!', 'success', 'ges-alerts');
    };

    const exportDatabase = () => {
        const db = Store.loadDB();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
        const dl = document.createElement('a');
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", `logagend_backup_${new Date().toISOString().split('T')[0]}.json`);
        dl.click();
    };

    const renderAdministracao = () => {
        const p = Store.parameters;
        const container = document.getElementById(currentContainerId);
        if (!container) return;

        container.innerHTML = `
            <h2>Administração do Sistema</h2>
            <div id="ges-alerts" style="margin-top:16px;"></div>
            
            <div class="card" style="margin-top:20px;">
                <div class="card-body">
                    <h3 style="margin-bottom:20px;">Identidade Visual</h3>
                    <p class="text-muted" style="margin-bottom:20px;">Personalize o nome e o logotipo exibidos no sistema.</p>
                    
                    ${!(typeof Auth !== 'undefined' && Auth.isVisitante()) ? `
                    <form onsubmit="ManagementModule.saveBranding(event)" id="form-branding">
                        <div class="grid-2">
                            <div class="form-group">
                                <label>Nome do Sistema (Principal)</label>
                                <input type="text" id="brand-app-name" class="form-control" value="${p.brand_app_name || 'LogAgend'}" required>
                            </div>
                            <div class="form-group">
                                <label>Nome da Empresa (Subtítulo)</label>
                                <input type="text" id="brand-company-name" class="form-control" value="${p.brand_company_name || 'NobelPack'}" required>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-top:15px;">
                            <label>URL do Logotipo (ou Base64)</label>
                            <input type="text" id="brand-logo-url" class="form-control" value="${p.brand_logo_url || ''}" placeholder="Deixe vazio para usar o padrão">
                            <small class="text-muted">Dica: Você pode colar uma URL de imagem ou transformar sua imagem em Base64 online.</small>
                        </div>

                        <div style="margin-top:20px; display:flex; gap:10px;">
                            <button type="submit" class="btn btn-primary">Salvar Personalização</button>
                            <button type="button" class="btn btn-secondary" onclick="ManagementModule.resetBranding()">Restaurar Padrão</button>
                        </div>
                    </form>
                    ` : '<div class="alert alert-info">Apenas visualização habilitada para Visitantes.</div>'}
                </div>
            </div>
        `;
    };

    const saveBranding = (e) => {
        e.preventDefault();
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        const updates = {
            brand_app_name: document.getElementById('brand-app-name').value,
            brand_company_name: document.getElementById('brand-company-name').value,
            brand_logo_url: document.getElementById('brand-logo-url').value
        };
        Store.saveParameters(updates);
        updateBranding();
        Utils.showAlert('Identidade visual atualizada!', 'success', 'ges-alerts');
    };

    const resetBranding = () => {
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        if (confirm('Deseja restaurar o nome e logo originais?')) {
            Store.saveParameters({
                brand_app_name: 'LogAgend',
                brand_company_name: 'NobelPack',
                brand_logo_url: ''
            });
            updateBranding();
            renderAdministracao();
            Utils.showAlert('Padrões restaurados!', 'success', 'ges-alerts');
        }
    };

    const updateBranding = () => {
        const p = Store.parameters;
        const appNameEl = document.getElementById('app-brand-name');
        const companyNameEl = document.getElementById('app-company-name');
        const logoEl = document.querySelector('.logo-icon');

        if (appNameEl) appNameEl.textContent = p.brand_app_name || 'LogAgend';
        if (companyNameEl) companyNameEl.textContent = p.brand_company_name || 'NobelPack';
        
        if (logoEl && p.brand_logo_url) {
            // Replace icon with image if URL exists
            if (logoEl.tagName === 'I') {
                const img = document.createElement('img');
                img.src = p.brand_logo_url;
                img.className = 'logo-icon';
                img.style.width = '32px';
                img.style.height = '32px';
                img.style.objectFit = 'contain';
                logoEl.parentNode.replaceChild(img, logoEl);
            } else if (logoEl.tagName === 'IMG') {
                logoEl.src = p.brand_logo_url;
            }
        } else if (logoEl && !p.brand_logo_url && logoEl.tagName === 'IMG') {
            // Restore icon if URL is removed
            const icon = document.createElement('i');
            icon.setAttribute('data-lucide', 'package');
            icon.className = 'logo-icon';
            logoEl.parentNode.replaceChild(icon, logoEl);
            if (window.lucide) window.lucide.createIcons();
        }
    };

    const importDatabase = () => {
        const file = document.getElementById('db-import-file').files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                Object.keys(imported).forEach(key => {
                    if (Array.isArray(imported[key])) {
                        const existing = Store.get(key);
                        const ids = new Set(existing.map(x => x.id));
                        imported[key].forEach(item => { if (!ids.has(item.id)) existing.push(item); });
                        Store.set(key, existing);
                    }
                });
                Utils.showAlert('Importado!', 'success', 'ges-alerts');
            } catch (err) { alert('Erro!'); }
        };
        reader.readAsText(file);
    };

    // --- No Show ---
    const renderNoShow = () => {
        const container = document.getElementById(currentContainerId);
        if (!container) return;
        const schedules = Store.get('schedules');
        const types = Store.get('receiptTypes');
        const suppliers = Store.get('suppliers');

        let data = schedules.filter(s => s.status === 'NOSHOW').map(s => ({
            ...s,
            tipo_nome: types.find(x => x.id === s.tipo_recebimento)?.nome_tipo || '-',
            fornecedor_nome: suppliers.find(x => x.id === s.fornecedor)?.nome_fornecedor || '-',
            data_br: Utils.formatDateBR(s.data)
        }));

        if (noShowFilters.supplier) data = data.filter(d => d.fornecedor_nome.toLowerCase().includes(noShowFilters.supplier.toLowerCase()));
        if (noShowFilters.date) data = data.filter(d => d.data === noShowFilters.date);
        if (noShowFilters.type) data = data.filter(d => d.tipo_nome.toLowerCase().includes(noShowFilters.type.toLowerCase()));

        data.sort((a, b) => new Date(b.data) - new Date(a.data));
        const columns = [{ key: 'data_br', label: 'Data Perdida' }, { key: 'tipo_nome', label: 'Tipo' }, { key: 'fornecedor_nome', label: 'Fornecedor' }, { key: 'criado_por', label: 'Criador por' }];

        container.innerHTML = `
            <h2>Registro de No Shows</h2>
            <div class="card" style="margin: 20px 0;">
                <div class="card-body" style="display:flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;">
                    <input type="text" id="filter-noshow-supplier" class="form-control" placeholder="Fornecedor" value="${noShowFilters.supplier}">
                    <input type="date" id="filter-noshow-date" class="form-control" value="${noShowFilters.date}">
                    <input type="text" id="filter-noshow-type" class="form-control" placeholder="Tipo" value="${noShowFilters.type}">
                    <button class="btn btn-primary" onclick="ManagementModule.applyNoShowFilters()">Filtrar</button>
                    <button class="btn btn-secondary" onclick="ManagementModule.clearNoShowFilters()">Limpar</button>
                </div>
            </div>
            <div id="ges-alerts"></div>
            <div class="card"><div class="card-body" style="padding:0;">
                ${UI.buildTable(columns, data, (row) => (Auth.isSupervisor() || Auth.isADM()) ? `<button class="btn btn-secondary btn-sm" onclick="ManagementModule.handleRetirarNoShow('${row.id}')">Retirar No Show</button>` : '-')}
            </div></div>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    const applyNoShowFilters = () => {
        noShowFilters.supplier = document.getElementById('filter-noshow-supplier').value;
        noShowFilters.date = document.getElementById('filter-noshow-date').value;
        noShowFilters.type = document.getElementById('filter-noshow-type').value;
        renderNoShow();
    };

    const clearNoShowFilters = () => {
        noShowFilters = { supplier: '', date: '', type: '' };
        renderNoShow();
    };

    const handleRetirarNoShow = (id) => {
        const schedule = Store.getById('schedules', id);
        if (!schedule) return;
        const formHtml = `
            <form id="form-retirar-noshow">
                <textarea name="justificativa" class="form-control" required placeholder="Justificativa..." style="margin-bottom:10px;"></textarea>
                <div class="grid-2">
                    <input type="number" name="volumes" class="form-control" value="${schedule.volumes_recebidos || ''}" placeholder="Volumes">
                    <input type="text" name="responsavel" class="form-control" value="${Auth.currentUser.nome}">
                </div>
            </form>
        `;
        UI.openModal({
            title: 'Retirar No Show',
            formHtml,
            onSave: () => {
                if (typeof Auth !== 'undefined' && Auth.isVisitante()) return false;
                const data = Utils.getFormData(document.getElementById('form-retirar-noshow'));
                const now = new Date();
                Store.update('schedules', id, {
                    status: 'RECEBIDO',
                    volumes_recebidos: parseInt(data.volumes) || 0,
                    responsavel_recebimento: data.responsavel,
                    data_recebimento_real: Utils.getToday(),
                    hora_recebimento_real: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                    observacoes: (schedule.observacoes || '') + `\n[Estorno por ${Auth.currentUser.login}]: ${data.justificativa}`
                });
                renderNoShow();
                return true;
            }
        });
    };

    // --- Parâmetros ---
    const renderParametros = () => {
        const p = Store.parameters;
        const container = document.getElementById(currentContainerId);
        if (!container) return;
        container.innerHTML = `
            <h2>Parâmetros Gerais de Performance</h2>
            <div id="ges-alerts" style="margin-top:16px;"></div>
            
            <div class="card" style="margin-top:20px; border-left: 4px solid var(--secondary);">
                <div class="card-body">
                    <p class="text-muted" style="margin-bottom: 20px;">Estes parâmetros definem os limites para a Avaliação Automática de Disciplina dos Fornecedores.</p>
                    <form onsubmit="ManagementModule.savePerformanceParams(event)">
                        <div class="grid-2">
                            <div class="form-group">
                                <label>Limite Taxa de No Show (%)</label>
                                <input type="number" id="param-noshow" class="form-control" value="${p.noshow_threshold || 15}" min="0" max="100">
                                <small class="text-muted">Taxas de No Show acima deste limite marcam o fornecedor como "Indisciplinado".</small>
                            </div>
                            <div class="form-group">
                                <label>Antecedência Mínima (Horas)</label>
                                <input type="number" id="param-leadtime" class="form-control" value="${p.lead_time_threshold || 24}" min="1">
                                <small class="text-muted">Agendamentos feitos com menos horas de antecedência que este limite são considerados falhas de disciplina.</small>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary" style="margin-top: 10px;">
                            <i data-lucide="save"></i> Salvar Critérios de Performance
                        </button>
                    </form>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    const savePerformanceParams = (e) => {
        e.preventDefault();
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        Store.saveParameters({
            noshow_threshold: parseInt(document.getElementById('param-noshow').value),
            lead_time_threshold: parseInt(document.getElementById('param-leadtime').value)
        });
        Utils.showAlert('Salvo!', 'success', 'ges-alerts');
    };

    const saveBackupPath = (e) => {
        e.preventDefault();
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        Store.saveParameters({ backup_path: document.getElementById('param-backup-path').value });
        Utils.showAlert('Salvo!', 'success', 'ges-alerts');
    };

    return {
        render: (target) => {
            // Dynamically set container based on sub-target prefix
            if (target.startsWith('sub-config-')) {
                currentContainerId = 'config-content-area';
            } else {
                currentContainerId = 'ges-content-area';
            }

            const isAdm = Auth.currentUser?.grupo === 'ADM';
            const btnAdm = document.getElementById('btn-sub-ges-adm');
            if (btnAdm) btnAdm.style.display = isAdm ? 'block' : 'none';

            switch(target) {
                // Configurações (Routed to ManagementModule)
                case 'sub-config-noshow': renderNoShow(); break;
                case 'sub-config-parametros': renderParametros(); break;
                
                // Gestão
                case 'sub-ges-grupos': renderGrupos(); break;
                case 'sub-ges-usuarios': renderUsuarios(); break;
                case 'sub-ges-noshow': renderNoShow(); break;
                case 'sub-ges-feriados': renderFeriados(); break;
                case 'sub-ges-parametros': renderParametros(); break;
                case 'sub-ges-dados': renderLimpezaDados(); break;
                case 'sub-ges-integracoes': renderIntegracoes(); break;
                case 'sub-ges-administracao': renderAdministracao(); break;
            }
        },
        openModalGrupos, removerGrupo, openModalUsuarios, removerUsuario, redefinirSenha, openModalFeriados, removerFeriado,
        openHelpImportModal, downloadTemplate, handleHolidayImport, wipeAllData, purgeDataByDate, exportDatabase, importDatabase,
        saveBackupConfig, toggleBackupFields, handleRetirarNoShow, applyNoShowFilters, clearNoShowFilters, savePerformanceParams, saveBackupPath,
        saveBranding, updateBranding, resetBranding
    };
})();
