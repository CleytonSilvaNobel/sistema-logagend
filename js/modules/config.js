/**
 * Configurations Module
 */

window.ConfigModule = (function () {
    const containerId = 'config-content-area';

    const renderLayout = (title, buttonText, onClickNew, tableHtml) => {
        const container = document.getElementById(containerId);
        const isVisitor = typeof Auth !== 'undefined' && Auth.isVisitante();

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2>${title}</h2>
                ${!isVisitor ? `
                    <button class="btn btn-primary" id="btn-new-config">
                        <i data-lucide="plus"></i> ${buttonText}
                    </button>
                ` : ''}
            </div>
            <div id="config-alerts"></div>
            <div class="card">
                <div class="card-body" style="padding: 0;">
                    ${tableHtml}
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        const btnNew = document.getElementById('btn-new-config');
        if (btnNew) btnNew.addEventListener('click', onClickNew);
    };

    const attachDeleteHandlers = (collection, renderFn) => {
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (typeof Auth !== 'undefined' && Auth.isVisitante()) {
                    return alert('Acesso negado: Perfil de Visitante não permite exclusão.');
                }
                if (confirm('Tem certeza que deseja remover este item?')) {
                    const id = e.currentTarget.getAttribute('data-id');
                    Store.delete(collection, id);
                    Utils.showAlert('Removido com sucesso!', 'success', 'config-alerts');
                    renderFn();
                }
            });
        });
    };

    // --- 1. Tipos de Recebimento ---
    const renderTipos = () => {
        const data = Store.get('receiptTypes');
        const columns = [
            { key: 'nome_tipo', label: 'Nome do Tipo' },
            { key: 'descricao', label: 'Descrição' }
        ];

        const actionsRenderer = (row) => `
            <button class="icon-btn text-primary" onclick="ConfigModule.openModalTipos('${row.id}')" title="Editar">
                <i data-lucide="edit"></i>
            </button>
            <button class="icon-btn btn-delete text-danger" data-id="${row.id}" title="Remover">
                <i data-lucide="trash-2"></i>
            </button>
        `;

        const isVisitor = typeof Auth !== 'undefined' && Auth.isVisitante();
        const tableHtml = UI.buildTable(columns, data, isVisitor ? null : actionsRenderer);

        renderLayout('Tipos de Recebimento', 'Novo Tipo', () => openModalTipos(), tableHtml);
        attachDeleteHandlers('receiptTypes', renderTipos);
    };

    const openModalTipos = (id = null) => {
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        const existing = id ? Store.getById('receiptTypes', id) : null;

        const formHtml = `
            <form id="form-tipo">
                <div class="form-group">
                    <label>Nome do Tipo *</label>
                    <input type="text" name="nome_tipo" class="form-control" value="${existing?.nome_tipo || ''}" required />
                </div>
                <div class="form-group">
                    <label>Descrição</label>
                    <textarea name="descricao" class="form-control" rows="3">${existing?.descricao || ''}</textarea>
                </div>
            </form>
        `;

        UI.openModal({
            title: existing ? 'Editar Tipo de Recebimento' : 'Novo Tipo de Recebimento',
            formHtml,
            onSave: () => {
                const form = document.getElementById('form-tipo');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);
                
                if (id) {
                    Store.update('receiptTypes', id, data);
                    Utils.showAlert('Tipo atualizado com sucesso!', 'success', 'config-alerts');
                } else {
                    Store.insert('receiptTypes', data);
                    Utils.showAlert('Tipo salvo com sucesso!', 'success', 'config-alerts');
                }
                renderTipos();
                return true;
            }
        });
    };

    // --- 2. Limites Operacionais ---
    const renderLimites = () => {
        const data = Store.get('limits');
        const types = Store.get('receiptTypes');

        // Enrich data with type name
        const viewData = data.map(item => {
            const t = types.find(t => t.id === item.tipo_recebimento);
            return {
                ...item,
                tipo_nome: t ? t.nome_tipo : 'Desconhecido',
                horario: (item.hora_inicio && item.hora_fim) ? `${item.hora_inicio} as ${item.hora_fim}` : 'Livre'
            };
        });

        const columns = [
            { key: 'tipo_nome', label: 'Tipo' },
            { key: 'capacidade_dia', label: 'Cap. Dia' },
            { key: 'horario', label: 'Horário Op.' },
            { key: 'buffer_minutos', label: 'Buffer (min)' }
        ];

        const actionsRenderer = (row) => `
            <button class="icon-btn text-primary" onclick="ConfigModule.openModalLimites('${row.id}')" title="Editar">
                <i data-lucide="edit"></i>
            </button>
            <button class="icon-btn btn-delete text-danger" data-id="${row.id}" title="Remover">
                <i data-lucide="trash-2"></i>
            </button>
        `;

        const isVisitor = typeof Auth !== 'undefined' && Auth.isVisitante();
        const tableHtml = UI.buildTable(columns, viewData, isVisitor ? null : actionsRenderer);

        renderLayout('Limites Operacionais', 'Novo Limite', () => openModalLimites(), tableHtml);
        attachDeleteHandlers('limits', renderLimites);
    };

    const openModalLimites = (id = null) => {
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        const existing = id ? Store.getById('limits', id) : null;
        const types = Store.get('receiptTypes');
        if (types.length === 0) {
            alert('Cadastre Tipos de Recebimento primeiro!');
            return;
        }

        const optionsHtml = types.map(t => `<option value="${t.id}" ${existing?.tipo_recebimento === t.id ? 'selected' : ''}>${t.nome_tipo}</option>`).join('');

        const formHtml = `
            <form id="form-limite">
                <div class="form-group">
                    <label>Tipo de Recebimento *</label>
                    <select name="tipo_recebimento" class="form-control" required ${existing ? 'disabled' : ''}>
                        <option value="">Selecione...</option>
                        ${optionsHtml}
                    </select>
                </div>
                <div style="display: flex; gap: 16px;">
                    <div class="form-group" style="flex:1;">
                        <label>Capacidade por Dia (qtd) *</label>
                        <input type="number" name="capacidade_dia" class="form-control" value="${existing?.capacidade_dia || ''}" required min="1" />
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label>Buffer entre Agend. (min)</label>
                        <input type="number" name="buffer_minutos" class="form-control" min="0" value="${existing?.buffer_minutos || 0}" />
                    </div>
                </div>
                <div style="display: flex; gap: 16px;">
                    <div class="form-group" style="flex:1;">
                        <label>Hora Início (Opcional)</label>
                        <input type="time" name="hora_inicio" class="form-control" value="${existing?.hora_inicio || ''}" />
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label>Hora Fim (Opcional)</label>
                        <input type="time" name="hora_fim" class="form-control" value="${existing?.hora_fim || ''}" />
                    </div>
                </div>
            </form>
        `;

        UI.openModal({
            title: existing ? 'Editar Limite Operacional' : 'Configurar Limite Operacional',
            formHtml,
            width: '600px',
            onSave: () => {
                const form = document.getElementById('form-limite');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);
                data.capacidade_dia = parseInt(data.capacidade_dia);
                data.buffer_minutos = parseInt(data.buffer_minutos || 0);

                if (!id) {
                    const existingTie = Store.get('limits').find(l => l.tipo_recebimento === data.tipo_recebimento);
                    if (existingTie) {
                        alert('Já existe um limite para este tipo. Remova ou edite o existente.');
                        return false;
                    }
                    Store.insert('limits', data);
                    Utils.showAlert('Limite configurado com sucesso!', 'success', 'config-alerts');
                } else {
                    Store.update('limits', id, data);
                    Utils.showAlert('Limite atualizado com sucesso!', 'success', 'config-alerts');
                }
                
                renderLimites();
                return true;
            }
        });
    };

    const renderFornecedores = () => {
        const data = Store.get('suppliers');

        // Formato para visão da tabela
        const viewData = data.map(d => ({
            ...d,
            horario_str: (d.hora_inicio && d.hora_fim) ? `${d.hora_inicio} às ${d.hora_fim}` : 'Livre'
        }));

        const columns = [
            { key: 'nome_fornecedor', label: 'Nome do Fornecedor' },
            { key: 'horario_str', label: 'Horário Perm.' },
            { key: 'observacoes', label: 'Observações' }
        ];
        const actionsRenderer = (row) => `
            <button class="icon-btn text-primary" onclick="ConfigModule.openModalFornecedores('${row.id}')" title="Editar">
                <i data-lucide="edit"></i>
            </button>
            <button class="icon-btn btn-delete text-danger" data-id="${row.id}">
                <i data-lucide="trash-2"></i>
            </button>
        `;
        const isVisitor = typeof Auth !== 'undefined' && Auth.isVisitante();
        const tableHtml = UI.buildTable(columns, viewData, isVisitor ? null : actionsRenderer);

        renderLayout('Fornecedores', 'Novo Fornecedor', () => openModalFornecedores(), tableHtml);
        attachDeleteHandlers('suppliers', renderFornecedores);
    };

    const openModalFornecedores = (id = null) => {
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        const existing = id ? Store.getById('suppliers', id) : null;
        const types = Store.get('receiptTypes');
        const existingTies = existing ? Store.get('supplierTypes').filter(t => t.fornecedor_id === id).map(t => t.tipo_id) : [];

        const typeCheckboxesHTML = types.map(t => `
            <div style="margin-bottom: 4px;">
                <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer;">
                    <input type="checkbox" name="tipo_recebimento_${t.id}" value="${t.id}" ${existingTies.includes(t.id) ? 'checked' : ''} />
                    ${t.nome_tipo}
                </label>
            </div>
        `).join('');

        const typesSection = types.length > 0 
            ? `<div class="form-group" style="margin-top: 16px;">
                 <label>Tipos de Recebimento Permitidos</label>
                 <div style="background: var(--bg-surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); max-height: 150px; overflow-y: auto;">
                     ${typeCheckboxesHTML}
                 </div>
               </div>`
            : `<div class="form-group" style="margin-top: 16px;"><p class="text-danger" style="font-size:0.85rem;">Cadastre Tipos de Recebimento primeiro.</p></div>`;

        const formHtml = `
            <form id="form-fornecedor">
                <div class="form-group">
                    <label>Nome Alfanumérico *</label>
                    <input type="text" name="nome_fornecedor" class="form-control" value="${existing?.nome_fornecedor || ''}" required />
                </div>
                ${typesSection}
                <div style="display: flex; gap: 16px; margin-top: 16px;">
                    <div class="form-group" style="flex:1;">
                        <label>Hora Início Perm. (Opcional)</label>
                        <input type="time" name="hora_inicio" class="form-control" value="${existing?.hora_inicio || ''}" />
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label>Hora Fim Perm. (Opcional)</label>
                        <input type="time" name="hora_fim" class="form-control" value="${existing?.hora_fim || ''}" />
                    </div>
                </div>
                <div class="form-group">
                    <label>Observações</label>
                    <textarea name="observacoes" class="form-control" rows="3">${existing?.observacoes || ''}</textarea>
                </div>
            </form>
        `;
        UI.openModal({
            title: existing ? 'Editar Fornecedor' : 'Novo Fornecedor',
            formHtml,
            onSave: () => {
                const form = document.getElementById('form-fornecedor');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);

                // Base Fornecedor fields
                const fornData = {
                    nome_fornecedor: data.nome_fornecedor,
                    hora_inicio: data.hora_inicio,
                    hora_fim: data.hora_fim,
                    observacoes: data.observacoes
                };

                let targetId = id;

                if (targetId) {
                    Store.update('suppliers', targetId, fornData);
                } else {
                    targetId = window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 10);
                    fornData.id = targetId;
                    Store.insert('suppliers', fornData);
                }

                // Handle Ties
                const db = Store.loadDB();
                db.supplierTypes = db.supplierTypes.filter(t => t.fornecedor_id !== targetId); // Clear old
                
                types.forEach(t => {
                    const cb = form.querySelector(`input[name="tipo_recebimento_${t.id}"]`);
                    if (cb && cb.checked) {
                        db.supplierTypes.push({
                            id: window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 10),
                            fornecedor_id: targetId,
                            tipo_id: t.id
                        });
                    }
                });
                Store.saveDB(db);

                Utils.showAlert(id ? 'Fornecedor atualizado!' : 'Fornecedor salvo!', 'success', 'config-alerts');
                renderFornecedores();
                return true;
            }
        });
    };



    // --- 5. Locais de Recebimento ---
    const renderLocais = () => {
        const data = Store.get('locations');
        const columns = [
            { key: 'nome_local', label: 'Nome do Local/Doca' },
            { key: 'observacoes', label: 'Obs' }
        ];
        const actionsRenderer = (row) => `
            <button class="icon-btn text-primary" onclick="ConfigModule.openModalLocais('${row.id}')" title="Editar">
                <i data-lucide="edit"></i>
            </button>
            <button class="icon-btn btn-delete text-danger" data-id="${row.id}"><i data-lucide="trash-2"></i></button>
        `;
        const isVisitor = typeof Auth !== 'undefined' && Auth.isVisitante();
        const tableHtml = UI.buildTable(columns, data, isVisitor ? null : actionsRenderer);

        renderLayout('Locais de Recebimento', 'Novo Local', () => openModalLocais(), tableHtml);
        attachDeleteHandlers('locations', renderLocais);
    };

    const openModalLocais = (id = null) => {
        if (typeof Auth !== 'undefined' && Auth.isVisitante()) return;
        const existing = id ? Store.getById('locations', id) : null;

        const formHtml = `
            <form id="form-local">
                <div class="form-group">
                    <label>Nome do Local (ex: Doca 1, Armazém A) *</label>
                    <input type="text" name="nome_local" class="form-control" value="${existing?.nome_local || ''}" required />
                </div>
                <div class="form-group">
                    <label>Observações</label>
                    <input type="text" name="observacoes" class="form-control" value="${existing?.observacoes || ''}" />
                </div>
            </form>
        `;
        UI.openModal({
            title: existing ? 'Editar Local' : 'Registrar Local',
            formHtml,
            onSave: () => {
                const form = document.getElementById('form-local');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);

                if (id) {
                    Store.update('locations', id, data);
                } else {
                    Store.insert('locations', data);
                }
                renderLocais();
                return true;
            }
        });
    };

    return {
        render: (subTarget) => {
            if (!window.document.getElementById(containerId)) return;
            switch (subTarget) {
                case 'sub-config-tipo': renderTipos(); break;
                case 'sub-config-limites': renderLimites(); break;
                case 'sub-config-forn': renderFornecedores(); break;
                case 'sub-config-locais': renderLocais(); break;
            }
        },
        openModalTipos: openModalTipos,
        openModalLimites: openModalLimites,
        openModalFornecedores: openModalFornecedores,
        openModalLocais: openModalLocais
    };
})();
