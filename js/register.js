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
        const wrapper = input.parentElement;
        let errorEl = wrapper.nextElementSibling;
        
        // Account for strength meter element spacing
        if (input === passwordInput) {
            const group = input.closest('.input-group');
            errorEl = group.querySelector('.error-msg');
            if (!errorEl) {
                errorEl = document.createElement('small');
                errorEl.className = 'error-msg';
                errorEl.style.color = '#DC2626';
                errorEl.style.fontSize = '0.78rem';
                errorEl.style.marginTop = '0.25rem';
                errorEl.style.display = 'block';
                group.appendChild(errorEl);
            }
            errorEl.innerText = message;
            input.style.borderColor = '#DC2626';
            input.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.12)';
            return false;
        }

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
        let errorEl = wrapper.nextElementSibling;
        
        if (input === passwordInput) {
            const group = input.closest('.input-group');
            errorEl = group.querySelector('.error-msg');
            if (errorEl) errorEl.remove();
        } else if (errorEl && errorEl.classList.contains('error-msg')) {
            errorEl.remove();
        }
        
        input.style.borderColor = '';
        input.style.boxShadow = '';
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
            return showError(emailInput, "Please enter a valid email address.");
        }
        return clearError(emailInput);
    };

    const validatePhone = () => {
        const val = phoneInput.value.trim().replace(/[\s\-+()]/g, '');
        const phoneRegex = /^[0-9]{10,12}$/;
        if (val === '') {
            return showError(phoneInput, "Phone number is required.");
        }
        if (!phoneRegex.test(val)) {
            return showError(phoneInput, "Please enter a valid 10-12 digit phone number.");
        }
        return clearError(phoneInput);
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
    nameInput.addEventListener('input', validateName);
    emailInput.addEventListener('input', validateEmail);
    phoneInput.addEventListener('input', validatePhone);
    passwordInput.addEventListener('input', validatePassword);

    // ----------------------------------------------------
    // Form Submit Handler
    // ----------------------------------------------------
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const isNameOk = validateName();
        const isEmailOk = validateEmail();
        const isPhoneOk = validatePhone();
        const isPasswordOk = validatePassword();
        const agreeTerms = agreeCheckbox.checked;

        if (!agreeTerms) {
            window.showToast("Please agree to the Terms & Conditions.", "error");
            return;
        }

        if (!isNameOk || !isEmailOk || !isPhoneOk || !isPasswordOk) {
            window.showToast("Please correct the errors in the registration form.", "error");
            return;
        }

        // Show Loading State
        const oldBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Creating Account...`;

        setTimeout(() => {
            const emailVal = emailInput.value.trim().toLowerCase();
            
            if (emailVal === 'error@goride.com') {
                window.showToast("Email address already registered.", "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = oldBtnText;
                emailInput.focus();
            } else {
                window.showToast("Account created successfully! Redirecting to Sign In...", "success");
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
        }, 1500);
    });
});
