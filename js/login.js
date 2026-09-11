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
        input.classList.add('input-error');
        input.setAttribute('aria-invalid', 'true');
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
        input.classList.remove('input-error');
        input.removeAttribute('aria-invalid');
        return true;
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
    emailInput.addEventListener('input', () => { clearError(emailInput); validateEmail(); });
    passwordInput.addEventListener('input', () => { clearError(passwordInput); validatePassword(); });

    // ----------------------------------------------------
    // Form Submit Handler
    // ----------------------------------------------------
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEmailOk = validateEmail();
        const isPasswordOk = validatePassword();

        if (!isEmailOk || !isPasswordOk) {
            const toastFn = (window.GoRide && window.GoRide.showToast) || window.showToast;
            if (toastFn) toastFn("Please enter valid credentials.", "error");
            if (!isEmailOk) emailInput.focus();
            else passwordInput.focus();
            return;
        }

        // Show Loading State
        const oldBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Signing In...`;

        const emailVal = emailInput.value.trim().toLowerCase();
        const passwordVal = passwordInput.value;
        const rememberMe = rememberCheckbox.checked;
        const toastFn = (window.GoRide && window.GoRide.showToast) || window.showToast;

        try {
            const api = (window.GoRide && window.GoRide.api);
            if (!api) {
                throw new Error("API helper not loaded.");
            }

            const response = await api.post("/api/auth/login", {
                email: emailVal,
                password: passwordVal
            });

            if (response && response.data && response.data.token) {
                api.setToken(response.data.token);
                api.setCurrentUser(response.data.user);

                // Explicitly ensure no credentials or personal emails persist in localStorage
                localStorage.removeItem('goride_user_email');

                // Visual button success state
                submitBtn.disabled = true;
                submitBtn.style.background = "linear-gradient(135deg, #10B981 0%, #059669 100%)";
                submitBtn.innerHTML = `<span>✓</span> Login successful.`;

                if (toastFn) toastFn("Login successful.", "success");

                setTimeout(() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const returnUrl = urlParams.get('returnUrl') || 'booking.html';
                    window.location.href = returnUrl;
                }, 1000);
            } else {
                throw new Error(response.message || "Login failed.");
            }
        } catch (err) {
            const msg = err.message || "Invalid email or password.";
            if (toastFn) toastFn(msg, "error");
            showError(passwordInput, msg);
            submitBtn.disabled = false;
            submitBtn.style.background = '';
            submitBtn.innerHTML = oldBtnText;
            passwordInput.value = '';

            if (msg.toLowerCase().includes("verify your email")) {
                let noticeCard = document.getElementById('login-unverified-notice');
                if (!noticeCard) {
                    noticeCard = document.createElement('div');
                    noticeCard.id = 'login-unverified-notice';
                    noticeCard.className = 'unverified-notice-card';
                    loginForm.parentNode.insertBefore(noticeCard, loginForm.nextSibling);
                }
                const encodedEmail = encodeURIComponent(emailVal);
                noticeCard.innerHTML = `
                    <div class="unverified-notice-header">
                        <span>⚠️</span>
                        <span>Email Verification Required</span>
                    </div>
                    <p class="unverified-notice-msg">
                        Your account is not verified yet. Please enter the 6-digit verification code to activate your account.
                    </p>
                    <a href="verify-email.html?email=${encodedEmail}" class="unverified-notice-btn">
                        Verify Email Now →
                    </a>
                `;

                setTimeout(() => {
                    window.location.href = `verify-email.html?email=${encodedEmail}`;
                }, 2500);
            } else {
                const existingNotice = document.getElementById('login-unverified-notice');
                if (existingNotice) existingNotice.remove();
                passwordInput.focus();
            }
        }
    });

    // Ensure initial login inputs start strictly empty on page load
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (rememberCheckbox) rememberCheckbox.checked = false;
    localStorage.removeItem('goride_user_email');

    // Stale authentication state check:
    // If the user has a token, verify if it is genuinely valid with the server.
    // If expired/invalid, clear it immediately so user does not appear falsely authenticated.
    // If genuinely valid, redirect to returnUrl or booking.html without breaking valid session.
    const api = (window.GoRide && window.GoRide.api);
    if (api && api.isAuthenticated()) {
        api.get("/api/auth/profile")
            .then((res) => {
                if (res && res.success && res.data) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const returnUrl = urlParams.get('returnUrl') || 'booking.html';
                    window.location.href = returnUrl;
                } else {
                    api.clearAuth();
                }
            })
            .catch(() => {
                api.clearAuth();
            });
    }
});
