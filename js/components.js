/**
 * Reusable Component Builders
 */

const UI = {
    // Generate a Modal via JS
    openModal: ({ title, formHtml, onSave, onCancel = null, saveText = 'Salvar', width = '500px', hideClose = false }) => {
        const container = document.getElementById('modal-container');

        const modalId = `modal-${Date.now()}`;
        const modalHtml = `
            <div class="modal-overlay" id="${modalId}">
                <div class="modal-content" style="max-width: ${width};">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        ${hideClose ? '' : `<button class="btn-close-icon" id="btn-close-${modalId}">
                            <i data-lucide="x"></i>
                        </button>`}
                    </div>
                    <div class="modal-body" id="body-${modalId}">
                        ${formHtml}
                    </div>
                    <div class="modal-footer">
                        ${hideClose ? '' : `<button class="btn btn-secondary" id="btn-cancel-${modalId}">Cancelar</button>`}
                        <button class="btn btn-primary" id="btn-save-${modalId}">${saveText}</button>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', modalHtml);
        if (window.lucide) window.lucide.createIcons();

        const closeBtn = hideClose ? null : document.getElementById(`btn-close-${modalId}`);
        const cancelBtn = hideClose ? null : document.getElementById(`btn-cancel-${modalId}`);
        const saveBtn = document.getElementById(`btn-save-${modalId}`);
        const overlay = document.getElementById(modalId);

        const closeModal = () => {
            overlay.remove();
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (onCancel) onCancel();
                closeModal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (onCancel) onCancel();
                closeModal();
            });
        }

        saveBtn.addEventListener('click', () => {
            if (onSave(modalId)) {
                closeModal();
            }
        });
    },

    // Build a common data table with Actions
    buildTable: (columns, data, actionsRenderer = null) => {
        if (data.length === 0) {
            return `
                <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i data-lucide="inbox" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;"></i>
                    <p>Nenhum registro encontrado.</p>
                </div>
            `;
        }

        let html = `<table><thead><tr>`;
        columns.forEach(col => {
            html += `<th>${col.label}</th>`;
        });
        if (actionsRenderer) html += `<th>Ações</th>`;
        html += `</tr></thead><tbody>`;

        data.forEach(row => {
            html += `<tr>`;
            columns.forEach(col => {
                html += `<td>${row[col.key] || '-'}</td>`;
            });
            if (actionsRenderer) {
                html += `<td>${actionsRenderer(row)}</td>`;
            }
            html += `</tr>`;
        });

        html += `</tbody></table>`;
        return html;
    }
};
