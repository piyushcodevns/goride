document.addEventListener('DOMContentLoaded', () => {
    const verifyForm = document.getElementById('verify-email-form');
    if (!verifyForm) return;

    const otpInputs = Array.from(document.querySelectorAll('.otp-digit'));
    const submitBtn = document.getElementById('verify-submit-btn');
    const resendBtn = document.getElementById('resend-code-btn');
    const resendTimer = document.getElementById('resend-timer');
    const emailDisplayContainer = document.getElementById('email-display-container');
    const targetEmailSpan = document.getElementById('target-email');
    const otpError = document.getElementById('otp-error');
    const expirationTimerVal = document.getElementById('expiration-timer-val');
    const expirationTimerContainer = document.getElementById('otp-expiration-timer');
    const verifyMainView = document.getElementById('verify-main-view');
    const verifySuccessView = document.getElementById('verify-success-view');

    // Extract email from query parameter safely
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = (urlParams.get('email') || '').trim();

    if (emailParam && targetEmailSpan) {
        targetEmailSpan.textContent = emailParam;
        if (emailDisplayContainer) {
            emailDisplayContainer.style.display = 'flex';
        }
    }

    const toastFn = (window.GoRide && window.GoRide.showToast) || window.showToast;

    let isCodeExpired = false;
    let expirationInterval = null;
    let cooldownInterval = null;

    // Helper functions for state
    const getOtpValue = () => otpInputs.map(input => input.value).join('');

    const updateSubmitState = () => {
        const otpVal = getOtpValue();
        if (submitBtn) {
            submitBtn.disabled = (otpVal.length !== 6 || isCodeExpired);
        }
    };

    const showError = (msg) => {
        if (otpError) {
            otpError.textContent = msg;
            otpError.style.display = 'block';
            otpError.style.color = '#DC2626';
            otpError.style.fontSize = '0.82rem';
            otpError.style.marginTop = '0.5rem';
        }
        otpInputs.forEach(input => {
            input.classList.add('input-error');
            input.setAttribute('aria-invalid', 'true');
        });
    };

    const clearError = () => {
        if (otpError) {
            otpError.textContent = '';
            otpError.style.display = 'none';
        }
        otpInputs.forEach(input => {
            input.classList.remove('input-error');
            input.removeAttribute('aria-invalid');
        });
    };

    // ----------------------------------------------------
    // 15-Minute Expiration Countdown (900 seconds)
    // ----------------------------------------------------
    const formatTime = (totalSec) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const startExpirationTimer = () => {
        if (expirationInterval) clearInterval(expirationInterval);
        isCodeExpired = false;
        let remainingSeconds = 900; // 15 minutes

        if (expirationTimerContainer) {
            expirationTimerContainer.classList.remove('timer-warning', 'timer-expired');
            expirationTimerContainer.innerHTML = `<span>⏱️</span> Code expires in <strong id="expiration-timer-val">${formatTime(remainingSeconds)}</strong>`;
        }

        const timerValEl = () => document.getElementById('expiration-timer-val');

        expirationInterval = setInterval(() => {
            remainingSeconds--;

            if (remainingSeconds <= 0) {
                clearInterval(expirationInterval);
                expirationInterval = null;
                isCodeExpired = true;

                if (expirationTimerContainer) {
                    expirationTimerContainer.classList.remove('timer-warning');
                    expirationTimerContainer.classList.add('timer-expired');
                    expirationTimerContainer.innerHTML = `<span>⚠️</span> <strong>Code has expired</strong>`;
                }

                showError("This verification code has expired. Please request a new code below.");
                updateSubmitState();
            } else {
                const el = timerValEl();
                if (el) el.textContent = formatTime(remainingSeconds);

                if (remainingSeconds <= 60 && expirationTimerContainer) {
                    expirationTimerContainer.classList.add('timer-warning');
                }
            }
        }, 1000);
    };

    // Start initial 15-minute countdown on page load
    startExpirationTimer();

    // ----------------------------------------------------
    // 6-Digit OTP Input Handlers (Auto-focus, Backspace, Paste)
    // ----------------------------------------------------
    otpInputs.forEach((input, index) => {
        // Handle direct input
        input.addEventListener('input', (e) => {
            clearError();
            const rawVal = e.target.value.replace(/\D/g, '');

            if (rawVal.length > 0) {
                // If single or multiple digits entered via keyboard or mobile autocomplete
                e.target.value = rawVal.charAt(rawVal.length - 1);
                e.target.classList.add('has-value');

                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                    otpInputs[index + 1].select();
                }
            } else {
                e.target.value = '';
                e.target.classList.remove('has-value');
            }

            updateSubmitState();
        });

        // Handle navigation and backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                clearError();
                if (input.value !== '') {
                    input.value = '';
                    input.classList.remove('has-value');
                    updateSubmitState();
                    e.preventDefault();
                } else if (index > 0) {
                    const prevInput = otpInputs[index - 1];
                    prevInput.focus();
                    prevInput.value = '';
                    prevInput.classList.remove('has-value');
                    updateSubmitState();
                    e.preventDefault();
                }
            } else if (e.key === 'ArrowLeft') {
                if (index > 0) {
                    otpInputs[index - 1].focus();
                    otpInputs[index - 1].select();
                    e.preventDefault();
                }
            } else if (e.key === 'ArrowRight') {
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                    otpInputs[index + 1].select();
                    e.preventDefault();
                }
            } else if (e.key === 'Delete') {
                input.value = '';
                input.classList.remove('has-value');
                updateSubmitState();
            }
        });

        // Auto-select text on focus
        input.addEventListener('focus', () => {
            input.select();
        });

        // Paste distribution across all 6 boxes
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            clearError();

            const pastedText = (e.clipboardData || window.clipboardData).getData('text') || '';
            const digits = pastedText.replace(/\D/g, '').slice(0, 6);

            if (digits.length === 0) return;

            digits.split('').forEach((char, idx) => {
                if (idx < otpInputs.length) {
                    otpInputs[idx].value = char;
                    otpInputs[idx].classList.add('has-value');
                }
            });

            // Focus the next empty box or the last box
            if (digits.length >= otpInputs.length) {
                otpInputs[otpInputs.length - 1].focus();
            } else {
                otpInputs[digits.length].focus();
            }

            updateSubmitState();
        });
    });

    // ----------------------------------------------------
    // Verification Form Submission
    // ----------------------------------------------------
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const otpVal = getOtpValue();

        if (isCodeExpired) {
            showError("This code has expired. Please request a new code below.");
            if (toastFn) toastFn("Verification code has expired.", "error");
            return;
        }

        if (!/^\d{6}$/.test(otpVal)) {
            showError("Please enter all 6 digits of the verification code.");
            if (toastFn) toastFn("Please enter all 6 digits.", "error");
            const firstEmpty = otpInputs.find(input => !input.value) || otpInputs[0];
            firstEmpty.focus();
            return;
        }

        // Loading State
        const oldBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Verifying...`;
        otpInputs.forEach(i => i.disabled = true);

        try {
            const api = window.GoRide && window.GoRide.api;
            if (!api) {
                throw new Error("API service unavailable.");
            }

            const response = await api.post("/api/auth/verify-email", {
                otp: otpVal
            });

            if (response && response.success) {
                const msg = response.message || "Email verified successfully.";
                if (toastFn) toastFn(msg, "success");

                // Tasteful Success State Transition
                if (verifyMainView && verifySuccessView) {
                    verifyMainView.style.display = 'none';
                    verifySuccessView.style.display = 'flex';
                }

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1600);
            } else {
                throw new Error(response.message || "Verification failed.");
            }
        } catch (err) {
            const errorMsg = err.message || "Invalid or expired verification code.";
            showError(errorMsg);
            if (toastFn) toastFn(errorMsg, "error");

            otpInputs.forEach(i => i.disabled = false);
            submitBtn.disabled = false;
            submitBtn.innerHTML = oldBtnText;

            // Highlight all and focus box 1
            otpInputs[0].focus();
            otpInputs[0].select();
        }
    });

    // ----------------------------------------------------
    // Resend Verification Code with 30s Cooldown
    // ----------------------------------------------------
    const startCooldown = (seconds) => {
        let remaining = seconds;
        resendBtn.style.display = 'none';
        resendTimer.style.display = 'inline-flex';
        resendTimer.textContent = `Resend code in ${remaining}s`;

        if (cooldownInterval) clearInterval(cooldownInterval);
        cooldownInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(cooldownInterval);
                cooldownInterval = null;
                resendTimer.style.display = 'none';
                resendBtn.style.display = 'inline-block';
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend Code';
            } else {
                resendTimer.textContent = `Resend code in ${remaining}s`;
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
            resendBtn.textContent = "Sending...";

            try {
                const api = window.GoRide && window.GoRide.api;
                if (!api) {
                    throw new Error("API service unavailable.");
                }

                const res = await api.post("/api/auth/resend-verification", {
                    email: emailToUse
                });

                const msg = res.message || "A fresh 6-digit code has been sent to your email.";
                if (toastFn) toastFn(msg, "success");

                // Reset OTP inputs and focus box 1
                otpInputs.forEach(i => {
                    i.value = '';
                    i.classList.remove('has-value', 'input-error');
                    i.disabled = false;
                });
                clearError();
                updateSubmitState();

                // Reset and restart the 15-minute countdown
                startExpirationTimer();

                // Focus box 1
                otpInputs[0].focus();

                // Start 30 second resend cooldown
                startCooldown(30);
            } catch (err) {
                resendBtn.disabled = false;
                resendBtn.textContent = "Resend Code";
                const errText = err.message || "Failed to resend code. Please wait before retrying.";
                if (toastFn) toastFn(errText, "error");
            }
        });
    }

    // Auto focus box 1 on load and sync submit button state
    updateSubmitState();
    if (otpInputs.length > 0) {
        otpInputs[0].focus();
    }

    // Cleanup timers on unload
    window.addEventListener('beforeunload', () => {
        if (expirationInterval) clearInterval(expirationInterval);
        if (cooldownInterval) clearInterval(cooldownInterval);
    });
});
