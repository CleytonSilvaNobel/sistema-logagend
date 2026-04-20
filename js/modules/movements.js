/**
 * Movements Module (Agendamentos, Apontamento, Reagendamento)
 */

window.MovementsModule = (function () {
    const containerId = 'mov-content-area';

    // Helpers para Calendário
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const generateCalendarHTML = (year, month, schedulesData, isHistory = false) => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const today = new Date();
        const todayStr = Utils.getToday();

        let html = `
            <div class="calendar">
                <div class="calendar-header" style="display:flex; justify-content:space-between; margin-bottom: 24px; align-items:center;">
                    <h3 style="margin:0;">${new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                    <div class="calendar-nav">
                        <button class="icon-btn btn-prev-month" data-y="${year}" data-m="${month}"><i data-lucide="chevron-left"></i></button>
                        <button class="icon-btn btn-next-month" data-y="${year}" data-m="${month}"><i data-lucide="chevron-right"></i></button>
                    </div>
                </div>
                <div class="calendar-grid" style="display:grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
                    ${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => `<div style="text-align:center; font-weight:bold; font-size:0.85rem; color:var(--text-muted);">${d}</div>`).join('')}
        `;

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += `<div></div>`;
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isPast = Utils.isBefore(dateStr, todayStr);
            const holidays = Store.get('holidays') || [];
            const isHoliday = holidays.find(h => h.data === dateStr);
            const isBlocked = (isPast && !isHistory); // Agendamento block past
            
            const isSunday = new Date(year, month, day).getDay() === 0;
            const bgDefault = 'var(--bg-surface)';
            const titleTooltip = (isHoliday ? `FERIADO: ${isHoliday.descricao} ` : '') + (isSunday ? `(Domingo)` : '');

            const daySchedules = schedulesData.filter(s => s.data === dateStr);
            daySchedules.sort((a, b) => (a.hora_inicio || '99:99').localeCompare(b.hora_inicio || '99:99'));

            let badges = '';
            daySchedules.forEach(s => {
                let color = 'var(--text-main)';
                let bg = 'var(--border-color)';
                if (s.status === 'RECEBIDO') { color = 'var(--secondary)'; bg = 'var(--bg-main)'; }
                if (s.status === 'PENDENTE') { color = 'var(--primary)'; bg = 'var(--primary-light)'; }
                if (s.status === 'NOSHOW') { color = 'var(--danger)'; bg = '#FEF2F2'; }

                badges += `<div onclick="event.stopPropagation(); MovementsModule.handleEditSchedule('${s.id}')" style="cursor:pointer; font-size: 0.7rem; color:${color}; background:${bg}; padding: 2px 4px; border-radius: 4px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${s.fornecedor_nome}">[${s.hora_inicio || '--'}] ${s.fornecedor_nome} (V: ${s.volumes_estimados || 0})</div>`;
            });

            html += `
                <div class="calendar-day ${isBlocked ? 'blocked' : 'interactive'} ${isHoliday || isSunday ? 'holiday' : ''}" 
                     data-date="${dateStr}" 
                     title="${titleTooltip}"
                     style="border: 1px solid var(--border-color); border-radius: var(--border-radius); min-height: 100px; padding: 8px; background: ${isBlocked ? 'var(--bg-main)' : bgDefault}; cursor: ${isBlocked ? 'not-allowed' : 'pointer'}; opacity: ${isBlocked ? '0.6' : '1'}; position: relative;">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="font-weight: ${(isToday || isSunday) ? 'bold' : 'normal'}; color: ${isToday ? 'var(--primary)' : (isSunday ? 'var(--warning)' : 'inherit')};">${day}</span>
                        ${isToday ? '<span style="font-size:0.65rem; color:white; background:var(--primary); padding: 2px 6px; border-radius: 10px;">Hoje</span>' : ''}
                        ${isSunday && !isHoliday ? '<span style="font-size:0.65rem; color:white; background:var(--warning); padding: 2px 6px; border-radius: 10px; opacity: 0.8;">DOM</span>' : ''}
                    </div>
                    <div style="margin-top: 8px; display:flex; flex-direction:column; gap:2px;">
                        ${badges}
                    </div>
                </div>
            `;
        }

        html += `</div>
            <div class="calendar-footer" style="margin-top: 16px; display: flex; gap: 20px; justify-content: center; font-size: 0.85rem; border-top: 1px solid var(--border-color); padding-top: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; color: #16a34a; font-weight: 600;">
                    <span style="width: 10px; height: 10px; background: #22c55e; border-radius: 50%;"></span> Recebido
                </div>
                <div style="display: flex; align-items: center; gap: 6px; color: var(--primary); font-weight: 600;">
                    <span style="width: 10px; height: 10px; background: var(--primary); border-radius: 50%;"></span> Pendente
                </div>
                <div style="display: flex; align-items: center; gap: 6px; color: var(--danger); font-weight: 600;">
                    <span style="width: 10px; height: 10px; background: var(--danger); border-radius: 50%;"></span> No Show
                </div>
            </div>
        </div>`;
        return html;
    };

    // Variáveis globais de controle do calendário
    let currentCalYear = new Date().getFullYear();
    let currentCalMonth = new Date().getMonth();

    // --- 1. Agendamento ---
    const renderAgendamento = () => {
        const container = document.getElementById(containerId);
        const types = Store.get('receiptTypes');
        const suppliers = Store.get('suppliers');
        const schedules = Store.get('schedules');

        // Enrich schedules
        const enriched = schedules.map(s => {
            const t = types.find(x => x.id === s.tipo_recebimento);
            const sup = suppliers.find(x => x.id === s.fornecedor);
            return {
                ...s,
                tipo_nome: t ? t.nome_tipo : '...',
                fornecedor_nome: sup ? sup.nome_fornecedor : '...'
            };
        });

        container.innerHTML = `
            <h2>Agendamento (Calendário)</h2>
            <div id="mov-alerts" style="margin-top: 16px;"></div>
            <div class="card" style="margin-top: 16px;">
                <div class="card-body" id="calendar-container">
                    ${generateCalendarHTML(currentCalYear, currentCalMonth, enriched, false)}
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        attachCalendarEvents();
    };

    const attachCalendarEvents = () => {
        // Navigations
        document.querySelectorAll('.btn-prev-month').forEach(btn => {
            btn.addEventListener('click', () => {
                currentCalMonth--;
                if (currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; }
                renderAgendamento();
            });
        });
        document.querySelectorAll('.btn-next-month').forEach(btn => {
            btn.addEventListener('click', () => {
                currentCalMonth++;
                if (currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; }
                renderAgendamento();
            });
        });

        // Day clicks
        document.querySelectorAll('.calendar-day.interactive').forEach(dayEl => {
            dayEl.addEventListener('click', (e) => {
                const dateClicked = e.currentTarget.getAttribute('data-date');
                openModalAgendamento(dateClicked);
            });
        });
    };

    const runValidations = (data) => {
        // Validação de Sequência de Horário
        if (data.hora_inicio && data.hora_fim) {
            if (data.hora_fim <= data.hora_inicio) {
                alert('Erro: A Hora Fim não pode ser menor ou igual à Hora Início.');
                return false;
            }
        }

        // Validação Feriado para Operador
        if (Auth.isOperador()) {
            const isHoliday = Store.get('holidays').find(h => h.data === data.data);
            if (isHoliday) {
                alert(`Data bloqueada: Feriado (${isHoliday.descricao}). Operadores não podem agendar em feriados.`);
                return false;
            }
        }
        
        // Validação Domingo
        const [y, m, d] = data.data.split('-');
        const isSunday = new Date(y, parseInt(m) - 1, d).getDay() === 0;
        if (isSunday) {
            if (Auth.isOperador()) {
                alert(`Data bloqueada: Domingos não são permitidos para agendamento. Validar com gestão.`);
                return false;
            } else {
                const confirmBypass = confirm("Agendamento aos Domingos é restrito. Como você é Gestor/Supervisor, deseja forçar este agendamento?");
                if (!confirmBypass) return false;
                data.autorizado_por = Auth.currentUser.nome;
            }
        }

        // Validação de Capacidade Diária (Limite Operacional)
        const limitConfig = Store.get('limits').find(l => l.tipo_recebimento === data.tipo_recebimento);

        if (limitConfig) {
            const allOfSameTypeThatDay = Store.get('schedules').filter(s => s.data === data.data && s.tipo_recebimento === data.tipo_recebimento && s.status !== 'NOSHOW' && (!data.id || s.id !== data.id));

            const count = allOfSameTypeThatDay.length;
            if (count >= limitConfig.capacidade_dia) {
                if (Auth.isOperador()) {
                    alert("Limite operacional já atingido. Por gentileza validar com gestão.");
                    return false;
                } else {
                    const confirmBypass = confirm("Limite operacional diário atingido. Como você é Gestor/Supervisor, deseja forçar este agendamento (será registrado)?");
                    if (!confirmBypass) return false;
                    data.limite_excedido = true;
                    data.autorizado_por = Auth.currentUser.nome;
                }
            }

            // Validação de Horário Operacional (Limites Operacionais)
            if (limitConfig.hora_inicio && limitConfig.hora_fim) {
                if (!data.hora_inicio || !data.hora_fim) {
                    alert('É obrigatório informar Hora Início e Hora Fim, pois este Tipo de Recebimento possui restrição de horário operacional.');
                    return false;
                }
                
                let foraDeHorario = false;
                if (data.hora_inicio < limitConfig.hora_inicio) foraDeHorario = true;
                if (data.hora_fim > limitConfig.hora_fim) foraDeHorario = true;

                if (foraDeHorario) {
                    const msgHorarioOp = `O horário operacional para este Tipo de Recebimento é de ${limitConfig.hora_inicio} às ${limitConfig.hora_fim}.`;
                    if (Auth.isOperador()) {
                        alert(`${msgHorarioOp} Operadores não podem agendar fora deste horário.`);
                        return false;
                    } else {
                        const confirmBypass = confirm(`${msgHorarioOp}\nComo você é Gestor/Supervisor, deseja forçar este agendamento Fora do Horário Operacional?`);
                        if (!confirmBypass) return false;
                        data.autorizado_por = Auth.currentUser.nome;
                    }
                }
            }

            // Validação de Conflito de Horário e Buffer na Doca/Local
            if (data.hora_inicio && data.hora_fim && data.local_recebimento) {
                const buffer = limitConfig.buffer_minutos || 0;
                
                const conflict = Store.get('schedules').find(s => {
                    if (s.data !== data.data) return false;
                    if (s.local_recebimento !== data.local_recebimento) return false;
                    if (s.status === 'NOSHOW') return false;
                    if (data.id && s.id === data.id) return false;
                    if (!s.hora_inicio || !s.hora_fim) return false;

                    // Check overlap using s.hora_inicio/fim and data.hora_inicio/fim with buffer
                    return Utils.checkTimeOverlap(data.hora_inicio, data.hora_fim, s.hora_inicio, s.hora_fim, buffer);
                });

                if (conflict) {
                    const msgConflict = `Conflito de horário! Existe outro agendamento neste local [${conflict.hora_inicio} - ${conflict.hora_fim}] que impede o agendamento devido ao tempo de buffer configurado (${buffer} min).`;
                    if (Auth.isOperador()) {
                        alert(msgConflict);
                        return false;
                    } else {
                        const confirmBypass = confirm(`${msgConflict}\nComo você é Gestor/Supervisor, deseja forçar este agendamento sobreposto?`);
                        if (!confirmBypass) return false;
                        data.autorizado_por = Auth.currentUser.nome;
                    }
                }
            }
        }

        // Validação de Horário do Fornecedor
        const fornecedor = Store.get('suppliers').find(s => s.id === data.fornecedor);
        if (fornecedor && (fornecedor.hora_inicio || fornecedor.hora_fim)) {
            // Se o fornecedor tem restrição, os campos de hora do agendamento são fundamentais para validar
            if (!data.hora_inicio || !data.hora_fim) {
                alert('O fornecedor selecionado possui restrição de horário de funcionamento. É obrigatório informar Hora Início e Hora Fim no agendamento.');
                return false;
            }

            let foraDeHorario = false;
            if (fornecedor.hora_inicio && data.hora_inicio < fornecedor.hora_inicio) foraDeHorario = true;
            if (fornecedor.hora_fim && data.hora_fim > fornecedor.hora_fim) foraDeHorario = true;

            if (foraDeHorario) {
                const msgHorario = `O horário permitido para o fornecedor é de ${fornecedor.hora_inicio || '00:00'} às ${fornecedor.hora_fim || '23:59'}.`;
                if (Auth.isOperador()) {
                    alert(`${msgHorario} Operadores não podem agendar fora do horário permitido.`);
                    return false;
                } else {
                    const confirmBypass = confirm(`${msgHorario}\nComo você é Gestor/Supervisor, deseja forçar este agendamento Fora do Horário?`);
                    if (!confirmBypass) return false;
                    data.autorizado_por = Auth.currentUser.nome;
                }
            }
        }

        return true;
    };

    const openModalAgendamento = (dateStr, existingData = null) => {
        const types = Store.get('receiptTypes');
        const suppliers = Store.get('suppliers');
        const locations = Store.get('locations');

        if (types.length === 0 || suppliers.length === 0 || locations.length === 0) {
            alert('Você precisa cadastrar Tipos, Fornecedores e Locais antes de agendar!');
            return;
        }

        const typeOpts = types.map(t => `<option value="${t.id}" ${existingData?.tipo_recebimento === t.id ? 'selected' : ''}>${t.nome_tipo}</option>`).join('');
        const supOpts = suppliers.map(t => `<option value="${t.id}" ${existingData?.fornecedor === t.id ? 'selected' : ''}>${t.nome_fornecedor}</option>`).join('');
        const locOpts = locations.map(l => `<option value="${l.id}" ${existingData?.local_recebimento === l.id ? 'selected' : ''}>${l.nome_local}</option>`).join('');

        const formHtml = `
            <form id="form-novo-agendamento">
                <input type="hidden" name="id" value="${existingData?.id || ''}" />
                <div class="alert alert-warning" style="padding: 8px;">Nova Data: ${Utils.formatDateBR(dateStr)}</div>
                <input type="hidden" name="data" value="${dateStr}" />
                
                <div class="form-group">
                    <label>Fornecedor *</label>
                    <select name="fornecedor" id="select-fornecedor" class="form-control" required>
                        <option value="">Selecione...</option>
                        ${supOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Tipo de Recebimento *</label>
                    <select name="tipo_recebimento" id="select-tipo" class="form-control" required disabled>
                        <option value="">Selecione o Fornecedor primeiro...</option>
                    </select>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Local de Recebimento *</label>
                        <select name="local_recebimento" class="form-control" required>
                            <option value="">Selecione...</option>
                            ${locOpts}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Volumes Estimados *</label>
                        <input type="number" name="volumes_estimados" class="form-control" required min="1" value="${existingData?.volumes_estimados || ''}" />
                    </div>
                </div>
                <div style="display:flex; gap: 16px;">
                    <div class="form-group" style="flex:1;">
                        <label>Hora Início</label>
                        <input type="time" name="hora_inicio" class="form-control" value="${existingData?.hora_inicio || ''}" />
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label>Hora Fim</label>
                        <input type="time" name="hora_fim" class="form-control" value="${existingData?.hora_fim || ''}" />
                    </div>
                </div>
                <div class="form-group">
                    <label>Observações</label>
                    <textarea name="observacoes" class="form-control" rows="2">${existingData?.observacoes || ''}</textarea>
                </div>
            </form>
        `;

        UI.openModal({
            title: existingData ? 'Reagendar Entrega' : 'Novo Agendamento',
            formHtml,
            width: '600px',
            onSave: () => {
                const form = document.getElementById('form-novo-agendamento');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);

                // Flag Encaixe se a data for hoje
                data.flag_encaixe = data.data === Utils.getToday();
                data.status = 'PENDENTE';

                if (!runValidations(data)) return false;

                if (data.id) {
                    const original = Store.getById('schedules', data.id);
                    // CRITICAL CHANGE: If rescheduling a NOSHOW, we DO NOT UPDATE the original.
                    // We insert a NEW record so the NOSHOW persists in history/dashboard.
                    if (original && original.status === 'NOSHOW') {
                        const newRecord = { ...data };
                        delete newRecord.id; // Store.insert generates new ID
                        newRecord.was_noshow = true; // Flag for audit
                        Store.insert('schedules', newRecord);
                        Utils.showAlert('Agendamento criado com sucesso (Original No Show preservado)!', 'success', 'mov-alerts');
                    } else {
                        data.atualizado_por = Auth.currentUser?.nome || 'Desconhecido';
                        Store.update('schedules', data.id, data);
                        Utils.showAlert('Reagendamento concluído!', 'success', 'mov-alerts');
                    }
                } else {
                    data.criado_por = Auth.currentUser?.nome || 'Desconhecido';
                    Store.insert('schedules', data);
                    Utils.showAlert('Agendamento criado com sucesso!', 'success', 'mov-alerts');
                }

                // Reload active tab
                const activeTabBtn = document.querySelector('#tab-movimentacoes .subnav-item.active');
                if (activeTabBtn) activeTabBtn.click();

                return true;
            }
        });

        // Add dynamic filtering logic after modal is rendered
        const selectForn = document.getElementById('select-fornecedor');
        const selectTipo = document.getElementById('select-tipo');
        
        const supplierTypes = Store.get('supplierTypes');
        const updateTypes = () => {
            const fId = selectForn.value;
            selectTipo.innerHTML = '<option value="">Selecione...</option>';

            if (!fId) {
                selectTipo.disabled = true;
                return;
            }

            // Filter types mapped to this supplier
            const allowedTypeIds = supplierTypes.filter(st => st.fornecedor_id === fId).map(st => st.tipo_id);
            const allowedTypes = types.filter(t => allowedTypeIds.includes(t.id));

            if (allowedTypes.length === 0) {
                selectTipo.innerHTML = '<option value="">Nenhum Tipo configurado para este fornecedor.</option>';
                selectTipo.disabled = true;
            } else {
                allowedTypes.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = t.nome_tipo;
                    if (existingData && existingData.tipo_recebimento === t.id) opt.selected = true;
                    selectTipo.appendChild(opt);
                });
                selectTipo.disabled = false;
            }
        };

        if (selectForn && selectTipo) {
            selectForn.addEventListener('change', updateTypes);
            if (existingData) updateTypes(); // Initialize if editing
        }
    };

    const handleEditSchedule = (id) => {
        const schedule = Store.getById('schedules', id);
        if (!schedule) return;

        // Optionally restrict editing of RECEIVED items if needed, 
        // but user asked to enable editing of created schedules.
        openModalAgendamento(schedule.data, schedule);
    };

    // --- 2. Apontamento (Recebimento) ---
    const renderApontamento = () => {
        const container = document.getElementById(containerId);

        let schedules = Store.get('schedules').filter(s => s.status === 'PENDENTE');
        const types = Store.get('receiptTypes');
        const suppliers = Store.get('suppliers');
        const locations = Store.get('locations');

        // Sort by date nearest to today
        schedules.sort((a, b) => new Date(a.data) - new Date(b.data));

        const viewData = schedules.map(s => {
            const t = types.find(x => x.id === s.tipo_recebimento);
            const sup = suppliers.find(x => x.id === s.fornecedor);
            const loc = locations.find(x => x.id === s.local_recebimento);
            return {
                ...s,
                data_br: Utils.formatDateBR(s.data),
                tipo_nome: t ? t.nome_tipo : '-',
                fornecedor_nome: sup ? sup.nome_fornecedor : '-',
                local_nome: loc ? loc.nome_local : '-'
            };
        });

        const columns = [
            { key: 'data_br', label: 'Data Prevista' },
            { key: 'hora_inicio', label: 'Hora Inc.' },
            { key: 'tipo_nome', label: 'Tipo' },
            { key: 'fornecedor_nome', label: 'Fornecedor' },
            { key: 'local_nome', label: 'Local' }
        ];

        const actionsRenderer = (row) => `
            <div style="display:flex; gap:8px;">
                <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="MovementsModule.openReceber('${row.id}')">
                    <i data-lucide="check" style="width:16px; height:16px;"></i> Receber
                </button>
                <button class="btn" style="padding: 6px 12px; font-size: 0.85rem; background: var(--danger); color: white;" onclick="MovementsModule.markNoShow('${row.id}')">
                    <i data-lucide="x" style="width:16px; height:16px;"></i> No Show
                </button>
            </div>
        `;

        const tableHtml = UI.buildTable(columns, viewData, actionsRenderer);

        container.innerHTML = `
            <h2>Apontamento de Entregas Pendentes</h2>
            <div id="mov-alerts" style="margin-top: 16px;"></div>
            <div class="card" style="margin-top: 16px;">
                <div class="card-body" style="padding:0;">
                    ${tableHtml}
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    const openReceber = (id) => {
        const schedule = Store.getById('schedules', id);
        const formHtml = `
            <form id="form-receber">
                <input type="hidden" name="id" value="${id}" />
                <div class="form-group">
                    <label>Volumes Recebidos *</label>
                    <input type="number" name="volumes_recebidos" class="form-control" required min="1" value="${schedule?.volumes_estimados || ''}" />
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">
                    <i data-lucide="user" style="width:14px;height:14px;vertical-align:middle;"></i>
                    Responsável: <strong>${Auth.currentUser?.nome || 'Usuário'}</strong>
                </div>
            </form>
        `;
        UI.openModal({
            title: 'Efetuar Apontamento (Recebimento)',
            formHtml,
            onSave: () => {
                const form = document.getElementById('form-receber');
                if (!form.checkValidity()) { form.reportValidity(); return false; }
                const data = Utils.getFormData(form);
                data.volumes_recebidos = parseInt(data.volumes_recebidos);
                data.status = 'RECEBIDO';
                data.data_recebimento_real = Utils.getToday();
                data.hora_recebimento_real = new Date().toTimeString().split(' ')[0].substring(0, 5);
                data.responsavel_recebimento = Auth.currentUser?.nome || 'Desconhecido';

                Store.update('schedules', id, data);
                Utils.showAlert('Recebimento apontado com sucesso!', 'success', 'mov-alerts');
                renderApontamento();
                return true;
            }
        });
    };

    const markNoShow = (id) => {
        if (confirm('Deseja marcar este agendamento como No Show (não compareceu)?')) {
            Store.update('schedules', id, { 
                status: 'NOSHOW',
                foi_noshow_manual: true,
                noshow_marcado_por: Auth.currentUser?.nome || 'Desconhecido',
                observacoes: 'Marcado manualmente como No Show no Apontamento.'
            });
            Utils.showAlert('Agendamento marcado como No Show.', 'warning', 'mov-alerts');
            renderApontamento();
        }
    };

    // --- 3. Reagendamento (No Shows 15 dias) ---
    const renderReagendamento = () => {
        const container = document.getElementById(containerId);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const limitDate = new Date();
        limitDate.setDate(today.getDate() - 15);
        limitDate.setHours(0, 0, 0, 0);

        // Fetch NoShows within 15 days
        let schedules = Store.get('schedules').filter(s => {
            if (s.status !== 'NOSHOW') return false;
            // parse strictly as local time midnight
            const [y, m, d] = s.data.split('-');
            const dateObj = new Date(y, parseInt(m)-1, d);
            return dateObj >= limitDate && dateObj <= today;
        });

        const types = Store.get('receiptTypes');
        const suppliers = Store.get('suppliers');
        const locations = Store.get('locations');

        schedules.sort((a, b) => new Date(b.data) - new Date(a.data));

        const viewData = schedules.map(s => {
            const t = types.find(x => x.id === s.tipo_recebimento);
            const sup = suppliers.find(x => x.id === s.fornecedor);
            const loc = locations.find(x => x.id === s.local_recebimento);
            return {
                ...s,
                data_br: Utils.formatDateBR(s.data),
                tipo_nome: t ? t.nome_tipo : '-',
                fornecedor_nome: sup ? sup.nome_fornecedor : '-',
                local_nome: loc ? loc.nome_local : '-'
            };
        });

        const columns = [
            { key: 'data_br', label: 'Data Perdida' },
            { key: 'tipo_nome', label: 'Tipo' },
            { key: 'fornecedor_nome', label: 'Fornecedor' },
            { key: 'local_nome', label: 'Local' }
        ];

        const actionsRenderer = (row) => `
            <button class="btn btn-warning" style="padding: 6px 12px; font-size: 0.85rem;" onclick="MovementsModule.iniciarReagendamento('${row.id}')">
                <i data-lucide="refresh-cw" style="width:16px; height:16px;"></i> Reagendar
            </button>
        `;

        const tableHtml = UI.buildTable(columns, viewData, actionsRenderer);

        container.innerHTML = `
            <h2>Reagendamento (No Shows últimos 15 dias)</h2>
            <div id="mov-alerts" style="margin-top: 16px;"></div>
            <div class="card" style="margin-top: 16px;">
                <div class="card-body" style="padding:0;">
                    ${tableHtml}
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    const iniciarReagendamento = (id) => {
        const schedule = Store.getById('schedules', id);
        if (!schedule) return;

        // Ask for new date for reschedule in DD/MM/YYYY format
        const todayBR = Utils.formatDateBR(Utils.getToday());
        const newDateBR = prompt('Para qual NOVA DATA você deseja reagendar (Formato: DD/MM/AAAA)?', todayBR);
        if (!newDateBR) return;

        // Convert DD/MM/YYYY to YYYY-MM-DD for internal storage
        let newDateISO = '';
        if (newDateBR.includes('/')) {
            const [d, m, y] = newDateBR.split('/');
            if (d && m && y && y.length === 4) {
                newDateISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
        }

        if (!newDateISO || isNaN(new Date(newDateISO).getTime())) {
            alert('Formato de data inválido. Use DD/MM/AAAA.');
            return;
        }

        if (Utils.isBefore(newDateISO, Utils.getToday())) {
            alert('Não é possível reagendar para datas passadas.');
            return;
        }

        openModalAgendamento(newDateISO, schedule);
    };

    return {
        render: (subTarget) => {
            if (!window.document.getElementById(containerId)) return;
            switch (subTarget) {
                case 'sub-mov-agendamento': renderAgendamento(); break;
                case 'sub-mov-apontamento': renderApontamento(); break;
                case 'sub-mov-reagendamento': renderReagendamento(); break;
            }
        },
        openReceber: openReceber, // Exposed for inline onclick
        markNoShow: markNoShow,   // Exposed for inline onclick
        iniciarReagendamento: iniciarReagendamento,
        handleEditSchedule: handleEditSchedule
    };
})();
