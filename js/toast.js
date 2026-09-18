"use strict";

(function() {
    window.showToast = function(message, type) {
        type = type || 'info';
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Select badge icon according to type
        let iconSymbol = 'ℹ';
        if (type === 'success') iconSymbol = '✓';
        else if (type === 'error') iconSymbol = '✕';
        else if (type === 'warning') iconSymbol = '⚠';

        // Clean any leading symbols from input string if passed
        let cleanText = typeof message === 'string' ? message.replace(/^[✓✔✕✖ℹ⚠]\s*/, '') : String(message || '');

        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.setAttribute('aria-hidden', 'true');
        iconSpan.textContent = iconSymbol;

        const textSpan = document.createElement('span');
        textSpan.className = 'toast-text';
        textSpan.textContent = cleanText;

        toast.appendChild(iconSpan);
        toast.appendChild(textSpan);
        container.appendChild(toast);

        // Force reflow to trigger css transition
        toast.offsetHeight;
        toast.classList.add('is-visible');

        const removeToast = function() {
            toast.classList.remove('is-visible');
            toast.addEventListener('transitionend', function() {
                toast.remove();
            });
        };

        setTimeout(removeToast, 3200);
    };
})();
