document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    if (!registerForm) return;

    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const phoneInput = document.getElementById('reg-phone');
    const passwordInput = document.getElementById('reg-password');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const agreeCheckbox = document.getElementById('agree-terms');
    const submitBtn = document.getElementById('register-submit-btn');

    // Strength Meter elements
    const strengthBarFill = document.querySelector('.strength-bar-fill');
    const strengthText = document.getElementById('strength-text');

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
    // Password Strength Meter Logic
    // ----------------------------------------------------
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        strengthBarFill.className = 'strength-bar-fill'; // reset classes
        
        if (val.length === 0) {
            strengthBarFill.style.width = '0%';
            strengthText.innerHTML = "Password Strength: <strong>Too Short</strong>";
            return;
        }

        if (val.length < 6) {
            strengthBarFill.classList.add('strength-weak');
            strengthBarFill.style.width = '33.3%';
            strengthText.innerHTML = "Password Strength: <strong style='color:#DC2626'>Too Short</strong>";
            return;
        }

        // Calculate complexity score
        let score = 0;
        if (/[A-Z]/.test(val)) score++;
        if (/[a-z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        if (score <= 1) {
            strengthBarFill.classList.add('strength-weak');
            strengthBarFill.style.width = '33.3%';
            strengthText.innerHTML = "Password Strength: <strong style='color:#DC2626'>Weak</strong>";
        } else if (score >= 2 && score <= 3) {
            strengthBarFill.classList.add('strength-medium');
            strengthBarFill.style.width = '66.6%';
            strengthText.innerHTML = "Password Strength: <strong style='color:#EAB308'>Medium</strong>";
        } else {
            strengthBarFill.classList.add('strength-strong');
            strengthBarFill.style.width = '100%';
            strengthText.innerHTML = "Password Strength: <strong style='color:var(--accent)'>Strong</strong>";
        }
    });

    // ----------------------------------------------------
    // Validation Helpers
    // ----------------------------------------------------
    const showError = (input, message) => {
        const group = input.closest('.input-group');
        let errorEl = group.querySelector('.error-msg');
        if (!errorEl) {
            errorEl = document.createElement('small');
            errorEl.className = 'error-msg';
            // Insert after input wrapper or after strength meter for password
            const meter = group.querySelector('.password-strength-meter');
            if (meter) {
                meter.insertAdjacentElement('afterend', errorEl);
            } else {
                group.appendChild(errorEl);
            }
        }
        errorEl.innerText = message;
        errorEl.style.display = 'block';
        group.classList.add('has-error');
        input.classList.add('input-error');
        input.setAttribute('aria-invalid', 'true');
        return false;
    };

    const clearError = (input) => {
        const group = input.closest('.input-group');
        const errorEl = group.querySelector('.error-msg');
        if (errorEl) {
            errorEl.remove();
        }
        group.classList.remove('has-error');
        input.classList.remove('input-error');
        input.removeAttribute('aria-invalid');
        return true;
    };

    const validateName = () => {
        const val = nameInput.value.trim();
        if (val === '') {
            return showError(nameInput, "Full name is required.");
        }
        if (val.length < 3) {
            return showError(nameInput, "Name must be at least 3 characters.");
        }
        return clearError(nameInput);
    };

    const validateEmail = () => {
        const val = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (val === '') {
            return showError(emailInput, "Email address is required.");
        }
        if (!emailRegex.test(val)) {
            return showError(emailInput, "Invalid email address.");
        }
        return clearError(emailInput);
    };

    const validatePhone = () => {
        const val = phoneInput.value.trim().replace(/[\s\-+()]/g, '');
        const phoneRegex = /^[6-9]\d{9}$/;
        if (val === '') {
            return showError(phoneInput, "Phone number is required.");
        }
        if (!phoneRegex.test(val)) {
            return showError(phoneInput, "Enter a valid 10-digit Indian phone number starting with 6-9.");
        }
        return clearError(phoneInput);
    };

    const validatePassword = () => {
        const val = passwordInput.value;
        const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).+$/;
        if (val === '') {
            return showError(passwordInput, "Password is required.");
        }
        if (val.length < 8) {
            return showError(passwordInput, "Password must be at least 8 characters.");
        }
        if (!pwdRegex.test(val)) {
            return showError(passwordInput, "Must include uppercase, lowercase, number and special char (@$!%*?&#).");
        }
        return clearError(passwordInput);
    };

    // Real-time events
    nameInput.addEventListener('input', () => { clearError(nameInput); validateName(); });
    emailInput.addEventListener('input', () => { clearError(emailInput); validateEmail(); });
    phoneInput.addEventListener('input', () => { clearError(phoneInput); validatePhone(); });
    passwordInput.addEventListener('input', () => { clearError(passwordInput); validatePassword(); });

    // ----------------------------------------------------
    // Form Submit Handler
    // ----------------------------------------------------
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isNameOk = validateName();
        const isEmailOk = validateEmail();
        const isPhoneOk = validatePhone();
        const isPasswordOk = validatePassword();
        const agreeTerms = agreeCheckbox.checked;
        const toastFn = (window.GoRide && window.GoRide.showToast) || window.showToast;

        if (!agreeTerms) {
            if (toastFn) toastFn("Please agree to the Terms & Conditions.", "error");
            return;
        }

        if (!isNameOk || !isEmailOk || !isPhoneOk || !isPasswordOk) {
            if (toastFn) toastFn("Please correct the errors in the registration form.", "error");
            return;
        }

        // Show Loading State
        const oldBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Creating Account...`;

        const nameVal = nameInput.value.trim();
        const emailVal = emailInput.value.trim().toLowerCase();
        const phoneVal = phoneInput.value.trim().replace(/[\s\-+()]/g, '');
        const passwordVal = passwordInput.value;

        try {
            const api = (window.GoRide && window.GoRide.api);
            if (!api) {
                throw new Error("API helper not loaded.");
            }

            const response = await api.post("/api/auth/register", {
                fullName: nameVal,
                email: emailVal,
                phone: phoneVal,
                password: passwordVal
            });

            if (response && response.success) {
                // Visual button success state
                submitBtn.disabled = true;
                submitBtn.style.background = "linear-gradient(135deg, #10B981 0%, #059669 100%)";
                submitBtn.innerHTML = `<span>✓</span> Account created. Please verify email...`;

                const successMsg = response.message || "Account created. Please verify your email to continue.";
                if (toastFn) toastFn(successMsg, "success");

                setTimeout(() => {
                    window.location.href = `verify-email.html?email=${encodeURIComponent(emailVal)}`;
                }, 1200);
            } else {
                throw new Error(response.message || "Registration failed.");
            }
        } catch (err) {
            let msg = err.message || "Failed to create account. Please try again.";
            if (typeof msg === 'string' && msg.trim().startsWith('[') && msg.trim().endsWith(']')) {
                try {
                    const parsed = JSON.parse(msg);
                    if (Array.isArray(parsed) && parsed[0] && parsed[0].message) {
                        msg = parsed[0].message;
                    }
                } catch (_) {}
            }
            if (toastFn) toastFn(msg, "error");
            submitBtn.disabled = false;
            submitBtn.style.background = '';
            submitBtn.innerHTML = oldBtnText;
            if (msg.toLowerCase().includes("email")) {
                showError(emailInput, "This email already exists.");
                emailInput.focus();
            } else if (msg.toLowerCase().includes("phone")) {
                showError(phoneInput, "This phone number already exists.");
                phoneInput.focus();
            }
        }
    });

    // Ensure registration form inputs start strictly empty on page load
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (agreeCheckbox) agreeCheckbox.checked = false;
});
