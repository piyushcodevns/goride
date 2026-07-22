document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const rememberCheckbox = document.getElementById('remember-me');
    const submitBtn = document.getElementById('login-submit-btn');

    // ----------------------------------------------------
    // Show/Hide Password Toggle
    // ----------------------------------------------------
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePasswordBtn.innerText = type === 'password' ? '👁️' : '🔒';
        togglePasswordBtn.setAttribute('aria-label', type === 'password' ? 'Show password' : 'Hide password');
    });

    // ----------------------------------------------------
    // Validation Helpers
    // ----------------------------------------------------
    const showError = (input, message) => {
        const wrapper = input.parentElement;
        let errorEl = wrapper.nextElementSibling;
        
        if (!errorEl || !errorEl.classList.contains('error-msg')) {
            errorEl = document.createElement('small');
            errorEl.className = 'error-msg';
            errorEl.style.color = '#DC2626';
            errorEl.style.fontSize = '0.78rem';
            errorEl.style.marginTop = '0.25rem';
            errorEl.style.display = 'block';
            wrapper.parentNode.appendChild(errorEl);
        }
        
        errorEl.innerText = message;
        input.style.borderColor = '#DC2626';
        input.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.12)';
        return false;
    };

    const clearError = (input) => {
        const wrapper = input.parentElement;
        const errorEl = wrapper.nextElementSibling;
        if (errorEl && errorEl.classList.contains('error-msg')) {
            errorEl.remove();
        }
        input.style.borderColor = '';
        input.style.boxShadow = '';
        return true;
    };

    const validateEmail = () => {
        const val = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (val === '') {
            return showError(emailInput, "Email address is required.");
        }
        if (!emailRegex.test(val)) {
            return showError(emailInput, "Please enter a valid email address.");
        }
        return clearError(emailInput);
    };

    const validatePassword = () => {
        const val = passwordInput.value;
        if (val === '') {
            return showError(passwordInput, "Password is required.");
        }
        if (val.length < 6) {
            return showError(passwordInput, "Password must be at least 6 characters.");
        }
        return clearError(passwordInput);
    };

    // Real-time events
    emailInput.addEventListener('input', validateEmail);
    passwordInput.addEventListener('input', validatePassword);

    // ----------------------------------------------------
    // Form Submit Handler
    // ----------------------------------------------------
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const isEmailOk = validateEmail();
        const isPasswordOk = validatePassword();

        if (!isEmailOk || !isPasswordOk) {
            window.showToast("Please enter valid credentials.", "error");
            if (!isEmailOk) emailInput.focus();
            else passwordInput.focus();
            return;
        }

        // Show Loading State
        const oldBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Signing In...`;

        const emailVal = emailInput.value.trim().toLowerCase();
        const rememberMe = rememberCheckbox.checked;

        setTimeout(() => {
            // Simulated login rules
            if (emailVal === 'error@goride.com') {
                window.showToast("Invalid credentials. Please try again.", "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = oldBtnText;
                passwordInput.value = '';
                passwordInput.focus();
            } else {
                if (rememberMe) {
                    localStorage.setItem('goride_user_email', emailVal);
                } else {
                    localStorage.removeItem('goride_user_email');
                }
                
                window.showToast("Login Successful! Redirecting to booking portal...", "success");
                
                setTimeout(() => {
                    window.location.href = 'booking.html';
                }, 1000);
            }
        }, 1500);
    });

    // Populate email if remember me was used in previous sessions
    const savedEmail = localStorage.getItem('goride_user_email');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
    }
});
