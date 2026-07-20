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
        toast.innerText = message;
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

        setTimeout(removeToast, 3000);
    };
})();
