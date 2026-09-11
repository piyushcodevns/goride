document.addEventListener('DOMContentLoaded', () => {
    const verifyForm = document.getElementById('verify-email-form');
    if (!verifyForm) return;

    const otpInput = document.getElementById('otp-input');
    const submitBtn = document.getElementById('verify-submit-btn');
    const resendBtn = document.getElementById('resend-code-btn');
    const resendTimer = document.getElementById('resend-timer');
    const emailDisplayContainer = document.getElementById('email-display-container');
    const targetEmailSpan = document.getElementById('target-email');
    const otpError = document.getElementById('otp-error');

    // Extract email from query parameter safely
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = (urlParams.get('email') || '').trim();

    if (emailParam && targetEmailSpan) {
        targetEmailSpan.textContent = emailParam;
        if (emailDisplayContainer) {
            emailDisplayContainer.style.display = 'block';
        }
    }

    const toastFn = (window.GoRide && window.GoRide.showToast) || window.showToast;

    // Helper functions for error handling
    const showError = (msg) => {
        if (otpError) {
            otpError.textContent = msg;
            otpError.style.display = 'block';
            otpError.style.color = '#DC2626';
            otpError.style.fontSize = '0.8rem';
            otpError.style.marginTop = '0.35rem';
        }
        if (otpInput) {
            otpInput.classList.add('input-error');
            otpInput.style.borderColor = '#DC2626';
            otpInput.setAttribute('aria-invalid', 'true');
        }
    };

    const clearError = () => {
        if (otpError) {
            otpError.textContent = '';
            otpError.style.display = 'none';
        }
        if (otpInput) {
            otpInput.classList.remove('input-error');
            otpInput.style.borderColor = '';
            otpInput.removeAttribute('aria-invalid');
        }
    };

    // Filter non-digit keystrokes and enforce 6-digit limit
    otpInput.addEventListener('input', () => {
        clearError();
        otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
    });

    // ----------------------------------------------------
    // Verification Submission
    // ----------------------------------------------------
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const otpVal = (otpInput.value || '').trim();
        if (!/^\d{6}$/.test(otpVal)) {
            showError("Please enter a valid 6-digit verification code.");
            if (toastFn) toastFn("Please enter a valid 6-digit verification code.", "error");
            otpInput.focus();
            return;
        }

        const oldBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Verifying...`;

        try {
            const api = window.GoRide && window.GoRide.api;
            if (!api) {
                throw new Error("API service unavailable.");
            }

            const response = await api.post("/api/auth/verify-email", {
                otp: otpVal
            });

            if (response && response.success) {
                submitBtn.disabled = true;
                submitBtn.style.background = "linear-gradient(135deg, #10B981 0%, #059669 100%)";
                submitBtn.innerHTML = `<span>✓</span> Email Verified!`;

                const msg = response.message || "Email verified successfully.";
                if (toastFn) toastFn(msg, "success");

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1200);
            } else {
                throw new Error(response.message || "Verification failed.");
            }
        } catch (err) {
            const errorMsg = err.message || "Invalid or expired verification code.";
            showError(errorMsg);
            if (toastFn) toastFn(errorMsg, "error");

            submitBtn.disabled = false;
            submitBtn.style.background = '';
            submitBtn.innerHTML = oldBtnText;
            otpInput.focus();
        }
    });

    // ----------------------------------------------------
    // Resend Verification Code with Cooldown
    // ----------------------------------------------------
    let cooldownInterval = null;

    const startCooldown = (seconds) => {
        let remaining = seconds;
        resendBtn.style.display = 'none';
        resendTimer.style.display = 'inline';
        resendTimer.textContent = `Resend available in ${remaining}s`;

        if (cooldownInterval) clearInterval(cooldownInterval);
        cooldownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(cooldownInterval);
                cooldownInterval = null;
                resendTimer.style.display = 'none';
                resendBtn.style.display = 'inline';
                resendBtn.disabled = false;
            } else {
                resendTimer.textContent = `Resend available in ${remaining}s`;
            }
        }, 1000);
    };

    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            let emailToUse = emailParam;
            if (!emailToUse) {
                emailToUse = prompt("Please enter your email address to resend the code:");
                if (emailToUse) {
                    emailToUse = emailToUse.trim().toLowerCase();
                }
            }

            if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
                if (toastFn) toastFn("Please provide a valid email address.", "error");
                return;
            }

            resendBtn.disabled = true;
            const origText = resendBtn.textContent;
            resendBtn.textContent = "Sending...";

            try {
                const api = window.GoRide && window.GoRide.api;
                if (!api) {
                    throw new Error("API service unavailable.");
                }

                const res = await api.post("/api/auth/resend-verification", {
                    email: emailToUse
                });

                const msg = res.message || "Verification code sent to your email.";
                if (toastFn) toastFn(msg, "success");

                // Start 30 second cooldown
                startCooldown(30);
            } catch (err) {
                resendBtn.disabled = false;
                resendBtn.textContent = origText;
                const errText = err.message || "Failed to resend code. Please wait before retrying.";
                if (toastFn) toastFn(errText, "error");
            }
        });
    }

    // Auto focus on page load
    if (otpInput) {
        otpInput.value = '';
        otpInput.focus();
    }
});
