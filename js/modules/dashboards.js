/**
 * Dashboards Module
 */

window.DashboardsModule = (function () {
    const containerId = 'dash-content-area';

    let currentPeriod = 'all'; // hoje, semana, mes, ano, ano_passado, all
    let chartInstances = [];

    const getFilteredData = () => {
        let schedules = Store.get('schedules');
        const todayStr = Utils.getToday();
        const todayObj = new Date();

        return schedules.filter(s => {
            const d = new Date(s.data);

            switch (currentPeriod) {
                case 'hoje':
                    return s.data === todayStr;
                case 'semana': {
                    const firstDayOfWeek = new Date(todayObj.setDate(todayObj.getDate() - todayObj.getDay()));
                    const lastDayOfWeek = new Date(todayObj.setDate(todayObj.getDate() - todayObj.getDay() + 6));
                    return d >= firstDayOfWeek && d <= lastDayOfWeek;
                }
                case 'mes':
                    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                case 'ano':
                    return d.getFullYear() === new Date().getFullYear();
                case 'ano_passado':
                    return d.getFullYear() === new Date().getFullYear() - 1;
                case 'all':
                default:
                    return true;
            }
        });
    };

    const countBy = (arr, keyFn) => {
        return arr.reduce((acc, item) => {
            const key = keyFn(item);
            if (key) {
                acc[key] = (acc[key] || 0) + 1;
            }
            return acc;
        }, {});
    };

    const destroyCharts = () => {
        chartInstances.forEach(c => c.destroy());
        chartInstances = [];
    };

    const getColors = (count) => {
        const palette = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
        let colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(palette[i % palette.length]);
        }
        return colors;
    };

    const drawChart = (canvasId, type, labels, dataArr, label) => {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const c = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: dataArr,
                    backgroundColor: getColors(labels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: type === 'pie' || type === 'doughnut' ? 'right' : 'top' }
                }
            }
        });
        chartInstances.push(c);
    };

    const renderDashboards = () => {
        const container = document.getElementById(containerId);
        const data = getFilteredData();

        // Helpers references
        const types = Store.get('receiptTypes');
        const suppliers = Store.get('suppliers');
        const locations = Store.get('locations');

        // Metrics calculations
        const recebidos = data.filter(s => s.status === 'RECEBIDO').length;
        const noShows = data.filter(s => s.status === 'NOSHOW').length;
        const encaixes = data.filter(s => s.flag_encaixe === true).length;
        const excedidos = data.filter(s => s.limite_excedido === true).length;

        const byType = countBy(data, s => types.find(t => t.id === s.tipo_recebimento)?.nome_tipo || 'Outro');
        const bySupplier = countBy(data, s => suppliers.find(su => su.id === s.fornecedor)?.nome_fornecedor || 'Outro');
        const byLocation = countBy(data, s => locations.find(l => l.id === s.local_recebimento)?.nome_local || 'Outro');

        // Summing volumes_recebidos for status === 'RECEBIDO'
        const bySupplierVolume = data.reduce((acc, s) => {
            if (s.status === 'RECEBIDO' && s.volumes_recebidos) {
                const supName = suppliers.find(su => su.id === s.fornecedor)?.nome_fornecedor || 'Outro';
                acc[supName] = (acc[supName] || 0) + s.volumes_recebidos;
            }
            return acc;
        }, {});

        // Layout HTML
        container.innerHTML = `
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2>Painel Gerencial</h2>
                <div style="display:flex; gap: 12px; align-items:center;">
                    <select id="dash-period-select" class="form-control" style="width: 200px;">
                        <option value="hoje" ${currentPeriod === 'hoje' ? 'selected' : ''}>Hoje</option>
                        <option value="semana" ${currentPeriod === 'semana' ? 'selected' : ''}>Esta Semana</option>
                        <option value="mes" ${currentPeriod === 'mes' ? 'selected' : ''}>Este Mês</option>
                        <option value="ano" ${currentPeriod === 'ano' ? 'selected' : ''}>Este Ano</option>
                        <option value="ano_passado" ${currentPeriod === 'ano_passado' ? 'selected' : ''}>Ano Passado</option>
                        <option value="all" ${currentPeriod === 'all' ? 'selected' : ''}>Acumulado Total</option>
                    </select>
                    <button class="icon-btn" title="Imprimir" onclick="window.print()"><i data-lucide="printer"></i></button>
                </div>
            </div>

            <!-- KPIs -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
                <div class="card"><div class="card-body" style="text-align:center;">
                    <i data-lucide="check-circle" style="color:var(--secondary); width:32px; height:32px; margin-bottom:8px;"></i>
                    <h4 style="font-size:2rem;">${recebidos}</h4><p class="text-muted">Agendamento Concluído</p>
                </div></div>
                <div class="card"><div class="card-body" style="text-align:center;">
                    <i data-lucide="x-circle" style="color:var(--danger); width:32px; height:32px; margin-bottom:8px;"></i>
                    <h4 style="font-size:2rem;">${noShows}</h4><p class="text-muted">Agendamento No Show</p>
                </div></div>
                <div class="card"><div class="card-body" style="text-align:center;">
                    <i data-lucide="zap" style="color:var(--warning); width:32px; height:32px; margin-bottom:8px;"></i>
                    <h4 style="font-size:2rem;">${encaixes}</h4><p class="text-muted">Encaixes (Mesmo dia)</p>
                </div></div>
                <div class="card"><div class="card-body" style="text-align:center;">
                    <i data-lucide="alert-triangle" style="color:#8b5cf6; width:32px; height:32px; margin-bottom:8px;"></i>
                    <h4 style="font-size:2rem;">${excedidos}</h4><p class="text-muted">Limites Excedidos</p>
                </div></div>
            </div>

            <!-- Charts Row 1 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                <div class="card" style="height: 350px;">
                    <div class="card-header"><span class="card-title">Agendamentos por Tipo</span></div>
                    <div class="card-body" style="height: 280px;"><canvas id="chart-type"></canvas></div>
                </div>
                <div class="card" style="height: 350px;">
                    <div class="card-header"><span class="card-title">Agendamentos por Fornecedor</span></div>
                    <div class="card-body" style="height: 280px;"><canvas id="chart-supplier"></canvas></div>
                </div>
            </div>

            <!-- Charts Row 2 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                <div class="card" style="height: 350px;">
                    <div class="card-header"><span class="card-title">Agendamentos por Local (Doca)</span></div>
                    <div class="card-body" style="height: 280px;"><canvas id="chart-location"></canvas></div>
                </div>
                <div class="card" style="height: 350px;">
                    <div class="card-header"><span class="card-title">Volumes Físicos Recebidos (por Fornecedor)</span></div>
                    <div class="card-body" style="height: 280px;"><canvas id="chart-supplier-received"></canvas></div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        document.getElementById('dash-period-select').addEventListener('change', (e) => {
            currentPeriod = e.target.value;
            renderDashboards();
        });

        // Initialize Charts
        destroyCharts();

        drawChart('chart-type', 'doughnut', Object.keys(byType), Object.values(byType), 'Agendamentos');
        drawChart('chart-supplier', 'bar', Object.keys(bySupplier), Object.values(bySupplier), 'Agendamentos');
        drawChart('chart-location', 'bar', Object.keys(byLocation), Object.values(byLocation), 'Agendamentos');
        drawChart('chart-supplier-received', 'bar', Object.keys(bySupplierVolume), Object.values(bySupplierVolume), 'Qtd Volumes');
    };

    return {
        render: renderDashboards
    };
})();
