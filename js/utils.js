/**
 * Utility Functions for the Delivery Scheduling System
 */

const Utils = {
    // Generate a simple UUID
    generateId: () => {
        return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    },

    // Format date string to DD/MM/YYYY
    formatDateBR: (dateString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    },

    // Get today's date in YYYY-MM-DD
    getToday: () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        let mm = today.getMonth() + 1;
        let dd = today.getDate();

        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;

        return `${yyyy}-${mm}-${dd}`;
    },

    // Check if date1 is before date2
    isBefore: (date1, date2) => {
        return new Date(date1) < new Date(date2);
    },

    // Form builder helper
    getFormData: (formElement) => {
        const formData = new FormData(formElement);
        return Object.fromEntries(formData.entries());
    },

    // Render alert message
    // Convert HH:MM to minutes from midnight
    timeToMinutes: (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    },

    // Check overlap with buffer
    checkTimeOverlap: (startA, endA, startB, endB, bufferMin = 0) => {
        const sA = Utils.timeToMinutes(startA);
        const eA = Utils.timeToMinutes(endA);
        const sB = Utils.timeToMinutes(startB);
        const eB = Utils.timeToMinutes(endB);

        // A starts before B ends + buffer AND A ends after B starts - buffer
        // Or simply: [sA, eA] overlaps with [sB - buffer, eB + buffer]
        return (sA < eB + bufferMin) && (eA > sB - bufferMin);
    },

    showAlert: (message, type = 'warning', containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const alertEl = document.createElement('div');
        alertEl.className = `alert alert-${type}`;

        let icon = 'alert-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'danger') icon = 'x-circle';

        alertEl.innerHTML = `
            <i data-lucide="${icon}" style="width: 20px; height: 20px;"></i>
            <span>${message}</span>
        `;

        container.insertBefore(alertEl, container.firstChild);

        // Ensure Lucide icons compile in the new HTML
        if (window.lucide) window.lucide.createIcons();

        // Auto remove after 5 seconds
        setTimeout(() => {
            alertEl.style.opacity = '0';
            setTimeout(() => alertEl.remove(), 300);
        }, 5000);
    }
};
