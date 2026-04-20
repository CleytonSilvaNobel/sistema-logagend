/**
 * Consultations Module
 */

window.ConsultationsModule = (function () {
    const containerId = 'cons-content-area';

    let currentCalYear = new Date().getFullYear();
    let currentCalMonth = new Date().getMonth();

    // Evaluation filters state
    let evalStartDate = '';
    let evalEndDate = '';

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const generateCalendarHTML = (year, month, schedulesData, idPrefix = 'hist') => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        let html = `
            <div class="calendar">
                <div class="calendar-header" style="display:flex; justify-content:space-between; margin-bottom: 24px; align-items:center;">
                    <h3 style="margin:0;">${new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                    <div class="calendar-nav">
                        <button class="icon-btn btn-prev-month-${idPrefix}" data-y="${year}" data-m="${month}"><i data-lucide="chevron-left"></i></button>
                        <button class="icon-btn btn-next-month-${idPrefix}" data-y="${year}" data-m="${month}"><i data-lucide="chevron-right"></i></button>
                    </div>
                </div>
                <div class="calendar-grid" style="display:grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
                    ${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => `<div style="text-align:center; font-weight:bold; font-size:0.85rem; color:var(--text-muted);">${d}</div>`).join('')}
        `;

        for (let i = 0; i < firstDay; i++) { html += `<div></div>`; }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const holidays = Store.get('holidays') || [];
            const isHoliday = holidays.find(h => h.data === dateStr);
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

                badges += `<div style="font-size: 0.7rem; color:${color}; background:${bg}; padding: 2px 4px; border-radius: 4px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="[${s.hora_inicio || '--'}] ${s.fornecedor_nome}">[${s.hora_inicio || '--'}] ${s.fornecedor_nome} (V: ${s.volumes_estimados || 0})</div>`;
            });

            html += `
                <div class="calendar-day ${isHoliday || isSunday ? 'holiday' : ''}" 
                     title="${titleTooltip}"
                     style="border: 1px solid var(--border-color); border-radius: var(--border-radius); min-height: 100px; padding: 8px; background: ${bgDefault}; position: relative;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight: ${isSunday ? 'bold' : 'normal'}; color: ${isSunday ? 'var(--warning)' : 'inherit'};">${day}</span>
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

    const attachCalNav = (prefix, renderFn) => {
        document.querySelectorAll(`.btn-prev-month-${prefix}`).forEach(btn => {
            btn.addEventListener('click', () => {
                currentCalMonth--;
                if (currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; }
                renderFn();
            });
        });
        document.querySelectorAll(`.btn-next-month-${prefix}`).forEach(btn => {
            btn.addEventListener('click', () => {
                currentCalMonth++;
                if (currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; }
                renderFn();
            });
        });
    };

    const enrichData = (schedules) => {
        const types = Store.get('receiptTypes');
        const suppliers = Store.get('suppliers');
        return schedules.map(s => ({
            ...s,
            tipo_nome: types.find(x => x.id === s.tipo_recebimento)?.nome_tipo || '-',
            fornecedor_nome: suppliers.find(x => x.id === s.fornecedor)?.nome_fornecedor || '-'
        }));
    };

    // --- 1. Agenda (Unificada) ---
    const renderAgenda = () => {
        const container = document.getElementById(containerId);
        // Mostrar tanto agendamentos recebidos quanto pendentes
        const agendaData = enrichData(Store.get('schedules').filter(s => s.status === 'RECEBIDO' || s.status === 'PENDENTE'));

        container.innerHTML = `
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2>Agenda Consolidada</h2>
                <div style="display:flex; gap: 8px;">
                    <button id="btn-agenda-export" class="btn btn-success" style="background-color: #16a34a; color: white; border: none;">
                        <i data-lucide="download"></i> Excel
                    </button>
                    <button id="btn-agenda-print" class="btn btn-primary">
                        <i data-lucide="printer"></i> Imprimir
                    </button>
                </div>
            </div>
            <div class="card" style="margin-top: 16px;">
                <div class="card-body">
                    ${generateCalendarHTML(currentCalYear, currentCalMonth, agendaData, 'agenda')}
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        attachCalNav('agenda', renderAgenda);

        // Events
        document.getElementById('btn-agenda-export').onclick = () => openExportOptionsModal();
        document.getElementById('btn-agenda-print').onclick = () => printAgenda(agendaData);
    };

    const openExportOptionsModal = () => {
        const currentMonthName = new Date(currentCalYear, currentCalMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        
        const formHtml = `
            <div id="export-options-modal-content">
                <style>
                    .radio-option { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer; font-size: 0.9rem; }
                    .radio-option input { cursor: pointer; }
                </style>
                <p style="margin-bottom: 15px; font-size: 0.9rem; color: var(--text-muted);">Escolha o período de exportação:</p>
                
                <label class="radio-option">
                    <input type="radio" name="export-period" value="month" checked onclick="document.getElementById('export-range-fields').style.display='none'"> 
                    Apenas registros de <strong>${currentMonthName}</strong>
                </label>
                
                <label class="radio-option">
                    <input type="radio" name="export-period" value="range" onclick="document.getElementById('export-range-fields').style.display='flex'"> 
                    Informar um período customizado
                </label>

                <div id="export-range-fields" style="display:none; gap:10px; margin-top:15px; padding-left: 24px;">
                    <div class="form-group" style="flex:1; margin-bottom:0;">
                        <label style="font-size: 0.75rem;">De:</label>
                        <input type="date" id="exp-date-start" class="form-control">
                    </div>
                    <div class="form-group" style="flex:1; margin-bottom:0;">
                        <label style="font-size: 0.75rem;">Até:</label>
                        <input type="date" id="exp-date-end" class="form-control">
                    </div>
                </div>
            </div>
        `;

        UI.openModal({
            title: 'Exportar Agenda para Excel',
            formHtml,
            saveText: 'Exportar Agora',
            onSave: () => {
                const periodType = document.querySelector('input[name="export-period"]:checked').value;
                let filteredRaw = [];
                let label = "";

                if (periodType === 'month') {
                    const startOfMonth = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-01`;
                    const lastDay = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
                    const endOfMonth = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                    filteredRaw = Store.get('schedules').filter(s => s.data >= startOfMonth && s.data <= endOfMonth);
                    label = currentMonthName.replace(' ', '_');
                } else {
                    const start = document.getElementById('exp-date-start').value;
                    const end = document.getElementById('exp-date-end').value;
                    if (!start || !end) { alert('Informe o período completo.'); return false; }
                    filteredRaw = Store.get('schedules').filter(s => s.data >= start && s.data <= end);
                    label = `de_${start}_ate_${end}`;
                }

                if (filteredRaw.length === 0) {
                    alert('Nenhum dado encontrado para o período selecionado.');
                    return false;
                }

                exportAgendaToExcel(enrichData(filteredRaw), label);
                return true;
            }
        });
    };

    const exportAgendaToExcel = (data, label = null) => {
        if (!window.XLSX) { alert('Biblioteca Excel não carregada.'); return; }
        
        const sortedData = [...data].sort((a, b) => {
            if (a.status !== b.status) return a.status === 'PENDENTE' ? -1 : 1;
            if (a.data !== b.data) return new Date(a.data) - new Date(b.data);
            return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
        });

        const exportData = sortedData.map(s => ({
            'Data': Utils.formatDateBR(s.data),
            'Hora Início': s.hora_inicio || '--',
            'Hora Fim': s.hora_fim || '--',
            'Fornecedor': s.fornecedor_nome,
            'Tipo': s.tipo_nome,
            'Local': Store.getById('locations', s.local_recebimento)?.nome_local || '-',
            'Status': s.status,
            'Volumes Est.': s.volumes_estimados || 0,
            'Volumes Rec.': s.volumes_recebidos || 0,
            'Docas/Notas': s.documentos || ''
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Agenda");
        
        const filename = label || `agenda_${new Date(currentCalYear, currentCalMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(' ', '_')}`;
        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    const printAgenda = (data) => {
        // Only keep PENDENTE and sort by data/hora
        const pendingData = data.filter(s => s.status === 'PENDENTE');
        const sortedData = pendingData.sort((a, b) => {
            if (a.data !== b.data) return new Date(a.data) - new Date(b.data);
            return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
        });

        let tableRows = sortedData.map(s => `
            <tr>
                <td>${Utils.formatDateBR(s.data)}</td>
                <td>${s.hora_inicio || '--'}</td>
                <td>${s.fornecedor_nome}</td>
                <td>${s.tipo_nome}</td>
                <td>${Store.getById('locations', s.local_recebimento)?.nome_local || '-'}</td>
                <td>${s.volumes_estimados || '-'}</td>
                <td>${s.status}</td>
            </tr>
        `).join('');

        if (sortedData.length === 0) {
            tableRows = `<tr><td colspan="7" style="text-align:center;">Nenhum recebimento PENDENTE neste período.</td></tr>`;
        }

        const printWin = window.open('', '', 'width=900,height=600');
        printWin.document.write(`
            <html>
            <head>
                <title>Programação de Recebimento - ${new Date(currentCalYear, currentCalMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    h1 { font-size: 1.5rem; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 0.85rem; }
                    th { background: #f0f0f0; }
                    .footer { margin-top: 30px; font-size: 0.75rem; color: #666; text-align: center; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <h1>Programação de Recebimento - LogAgend</h1>
                <p><strong>Período:</strong> ${new Date(currentCalYear, currentCalMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Hora</th>
                            <th>Fornecedor</th>
                            <th>Tipo</th>
                            <th>Local</th>
                            <th>Vol.</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
                <div class="footer">Gerado em: ${new Date().toLocaleString('pt-BR')} | LogAgend System</div>
                <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body>
            </html>
        `);
        printWin.document.close();
    };

    // --- 4. Excedidos Lista ---
    const renderExcedidos = () => {
        const container = document.getElementById(containerId);
        const exceededData = enrichData(Store.get('schedules').filter(s => s.limite_excedido === true)).map(s => ({
            ...s,
            data_br: Utils.formatDateBR(s.data)
        }));
        exceededData.sort((a, b) => new Date(b.data) - new Date(a.data));

        const columns = [
            { key: 'data_br', label: 'Data Forçada' },
            { key: 'tipo_nome', label: 'Tipo' },
            { key: 'fornecedor_nome', label: 'Fornecedor' },
            { key: 'criado_por', label: 'Criado Por' },
            { key: 'autorizado_por', label: 'Autorizado Por (Gestor)' }
        ];

        container.innerHTML = `
            <h2>Auditoria de Limites Diários Excedidos</h2>
            <p class="text-muted" style="margin-bottom:16px;">Agendamentos que ultrapassaram a capacidade diária, aprovados por Supervisores ou ADMs.</p>
            <div class="card">
                <div class="card-body" style="padding:0;">
                    ${UI.buildTable(columns, exceededData)}
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    // --- 5. Avaliação de Fornecedores ---
    const renderAvaliacao = () => {
        const container = document.getElementById(containerId);
        let schedules = Store.get('schedules');
        const suppliers = Store.get('suppliers');

        if (suppliers.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhum fornecedor cadastrado para avaliação.</p>';
            return;
        }

        // Apply Date Filters if set
        if (evalStartDate || evalEndDate) {
            schedules = schedules.filter(s => {
                if (evalStartDate && s.data < evalStartDate) return false;
                if (evalEndDate && s.data > evalEndDate) return false;
                return true;
            });
        }

        // Calculate Metrics per Supplier
        const metrics = suppliers.map(sup => {
            const supSchedules = schedules.filter(s => s.fornecedor === sup.id);
            const total = supSchedules.length;
            if (total === 0) return null;

            const noShows = supSchedules.filter(s => s.status === 'NOSHOW').length;
            const completed = supSchedules.filter(s => s.status === 'RECEBIDO').length;
            const encaixes = supSchedules.filter(s => s.flag_encaixe === true).length;
            
            const noShowRate = (noShows / total) * 100;

            // Advance Notice Calculation
            let totalLeadTimeHours = 0;
            let leadTimeEntries = 0;

            supSchedules.forEach(s => {
                if (s.criado_em) {
                    const created = new Date(s.criado_em);
                    const scheduled = new Date(`${s.data}T${s.hora_inicio || '00:00'}`);
                    let diffMs = scheduled - created;
                    if (diffMs < 0) diffMs = 0; // Prevent negative lead times for last-minute schedules
                    const diffHours = diffMs / (1000 * 60 * 60);
                    totalLeadTimeHours += diffHours;
                    leadTimeEntries++;
                }
            });

            const params = Store.parameters;
            const noShowLimit = params.noshow_threshold || 15;
            const leadTimeLimit = params.lead_time_threshold || 24;

            const avgLeadTime = leadTimeEntries > 0 ? totalLeadTimeHours / leadTimeEntries : 0;
            const isIndisciplinado = noShowRate > noShowLimit || (leadTimeEntries > 0 && avgLeadTime < leadTimeLimit);

            return {
                id: sup.id,
                nome: sup.nome_fornecedor,
                total,
                completed,
                noShows,
                noShowRateNum: noShowRate,
                noShowRate: noShowRate.toFixed(1) + '%',
                avgLeadTimeHours: avgLeadTime,
                avgLeadTime: avgLeadTime >= 24 ? (avgLeadTime / 24).toFixed(1) + ' dias' : avgLeadTime.toFixed(1) + ' horas',
                encaixes,
                statusText: isIndisciplinado ? 'Indisciplinado' : 'Regular',
                status: isIndisciplinado ? '<span class="badge" style="background:var(--danger); color:white;">Indisciplinado</span>' : '<span class="badge" style="background:var(--secondary); color:white;">Regular</span>'
            };
        }).filter(m => m !== null);

        const columns = [
            { key: 'nome', label: 'Fornecedor' },
            { key: 'total', label: 'Total Agend.' },
            { key: 'completed', label: 'Entregues' },
            { key: 'noShows', label: 'No Shows' },
            { key: 'noShowRate', label: 'Taxa No Show' },
            { key: 'avgLeadTime', label: 'Antecedência Média' },
            { key: 'encaixes', label: 'Encaixes' },
            { key: 'status', label: 'Status Performance' }
        ];

        container.innerHTML = `
            <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <h2>Avaliação de Performance de Fornecedores</h2>
                    <p class="text-muted">Analise a disciplina e eficiência dos agendamentos por período.</p>
                </div>
                <div style="background: var(--primary-light); padding: 12px 20px; border-radius: 12px; font-size: 0.85rem; border: 1px solid var(--primary); max-width: 320px;">
                    <i data-lucide="info" style="width:16px; height:16px; vertical-align:middle; margin-right:4px;"></i>
                    <strong>Critério Indisciplina:</strong> No Show > ${Store.parameters.noshow_threshold}% OU Antecedência < ${Store.parameters.lead_time_threshold}h
                </div>
            </div>

            <!-- Filters & Export Bar -->
            <div class="card" style="margin-bottom: 24px;">
                <div class="card-body" style="display:flex; align-items:flex-end; gap: 16px; flex-wrap: wrap;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Data Início</label>
                        <input type="date" id="eval-start-date" class="form-control" value="${evalStartDate}">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Data Fim</label>
                        <input type="date" id="eval-end-date" class="form-control" value="${evalEndDate}">
                    </div>
                    <button id="btn-eval-filter" class="btn btn-primary">
                        <i data-lucide="filter"></i> Filtrar
                    </button>
                    <button id="btn-eval-clear" class="btn btn-primary">
                        <i data-lucide="refresh-cw"></i> Limpar
                    </button>
                    <button id="btn-eval-export" class="btn btn-success" style="margin-left: auto; background-color: #16a34a; color: white; border: none;">
                        <i data-lucide="download"></i> Exportar Excel
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-body" style="padding:0;">
                    ${UI.buildTable(columns, metrics)}
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        // Attach Events
        document.getElementById('btn-eval-filter').onclick = () => {
            evalStartDate = document.getElementById('eval-start-date').value;
            evalEndDate = document.getElementById('eval-end-date').value;
            renderAvaliacao();
        };

        document.getElementById('btn-eval-clear').onclick = () => {
            evalStartDate = '';
            evalEndDate = '';
            renderAvaliacao();
        };

        document.getElementById('btn-eval-export').onclick = () => {
            exportAvaliacaoToExcel(metrics);
        };
    };

    const exportAvaliacaoToExcel = (data) => {
        if (!window.XLSX) {
            alert('Biblioteca para Excel não carregada.');
            return;
        }

        const exportData = data.map(m => ({
            'Fornecedor': m.nome,
            'Total Agendamentos': m.total,
            'Entregas Concluídas': m.completed,
            'No Shows': m.noShows,
            'Taxa No Show': m.noShowRate,
            'Antecedência Média': m.avgLeadTime,
            'Encaixes': m.encaixes,
            'Status Performance': m.statusText
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Avaliação Fornecedores");
        
        let filename = "avaliacao_fornecedores";
        if (evalStartDate) filename += `_de_${evalStartDate}`;
        if (evalEndDate) filename += `_ate_${evalEndDate}`;
        
        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    return {
        render: (subTarget) => {
            if (!window.document.getElementById(containerId)) return;
            switch (subTarget) {
                case 'sub-cons-agenda': renderAgenda(); break;
                case 'sub-cons-excedidos': renderExcedidos(); break;
                case 'sub-cons-avaliacao': renderAvaliacao(); break;
            }
        }
    };
})();
