document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    // Get input elements from the clean form
    const nameInput = contactForm.querySelector('#contact-name');
    const emailInput = contactForm.querySelector('#contact-email');
    const phoneInput = contactForm.querySelector('#contact-phone');
    const subjectInput = contactForm.querySelector('#contact-subject');
    const inquirySelect = contactForm.querySelector('#contact-inquiry');
    const messageInput = contactForm.querySelector('#contact-message');
    const submitBtn = contactForm.querySelector('button[type="submit"]');

    // Helper: Show error state
    const showError = (input, message) => {
        const group = input.closest('.input-group') || input.parentElement;
        let errorEl = group.querySelector('.error-msg');
        
        if (!errorEl) {
            errorEl = document.createElement('small');
            errorEl.className = 'error-msg';
            group.appendChild(errorEl);
        }
        errorEl.innerText = message;
        group.classList.add('has-error');
        group.classList.remove('has-success');
        return false;
    };

    // Helper: Show success/valid state
    const showSuccess = (input) => {
        const group = input.closest('.input-group') || input.parentElement;
        const errorEl = group.querySelector('.error-msg');
        if (errorEl) {
            errorEl.remove();
        }
        group.classList.add('has-success');
        group.classList.remove('has-error');
        return true;
    };

    // Helper: Clear validation style
    const clearValidation = (input) => {
        const group = input.closest('.input-group') || input.parentElement;
        const errorEl = group.querySelector('.error-msg');
        if (errorEl) {
            errorEl.remove();
        }
        group.classList.remove('has-error', 'has-success');
    };

    // Individual validators
    const validateName = () => {
        const val = nameInput.value.trim();
        if (val === '') {
            return showError(nameInput, "Name is required.");
        }
        if (val.length < 3) {
            return showError(nameInput, "Name must be at least 3 characters.");
        }
        return showSuccess(nameInput);
    };

    const validateEmail = () => {
        const val = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (val === '') {
            return showError(emailInput, "Email is required.");
        }
        if (!emailRegex.test(val)) {
            return showError(emailInput, "Please enter a valid email address.");
        }
        return showSuccess(emailInput);
    };

    const validatePhone = () => {
        const val = phoneInput.value.trim().replace(/[\s\-+()]/g, '');
        const phoneRegex = /^[0-9]{10,12}$/;
        if (val === '') {
            return showError(phoneInput, "Phone number is required.");
        }
        if (!phoneRegex.test(val)) {
            return showError(phoneInput, "Enter a valid 10-12 digit phone number.");
        }
        return showSuccess(phoneInput);
    };

    const validateSubject = () => {
        const val = subjectInput.value.trim();
        if (val === '') {
            return showError(subjectInput, "Subject is required.");
        }
        return showSuccess(subjectInput);
    };

    const validateInquiry = () => {
        const val = inquirySelect.value;
        if (val === '' || val === 'Select Inquiry Type') {
            return showError(inquirySelect, "Please select an inquiry type.");
        }
        return showSuccess(inquirySelect);
    };

    const validateMessage = () => {
        const val = messageInput.value.trim();
        if (val === '') {
            return showError(messageInput, "Message is required.");
        }
        if (val.length < 15) {
            return showError(messageInput, "Message must be at least 15 characters.");
        }
        return showSuccess(messageInput);
    };

    // Real-time Validation Triggers
    nameInput.addEventListener('input', validateName);
    emailInput.addEventListener('input', validateEmail);
    phoneInput.addEventListener('input', validatePhone);
    subjectInput.addEventListener('input', validateSubject);
    inquirySelect.addEventListener('change', validateInquiry);
    messageInput.addEventListener('input', validateMessage);

    // Form Submit logic
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Run all validators
        const isNameValid = validateName();
        const isEmailValid = validateEmail();
        const isPhoneValid = validatePhone();
        const isSubjectValid = validateSubject();
        const isInquiryValid = validateInquiry();
        const isMessageValid = validateMessage();

        const isFormValid = isNameValid && isEmailValid && isPhoneValid && isSubjectValid && isInquiryValid && isMessageValid;

        if (!isFormValid) {
            window.showToast("Please correct the errors in the form.", "error");
            // Focus on first invalid element
            if (!isNameValid) nameInput.focus();
            else if (!isEmailValid) emailInput.focus();
            else if (!isPhoneValid) phoneInput.focus();
            else if (!isSubjectValid) subjectInput.focus();
            else if (!isInquiryValid) inquirySelect.focus();
            else if (!isMessageValid) messageInput.focus();
            return;
        }

        // Form Submission
        const oldBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Sending Message...`;

        setTimeout(() => {
            const toastFn = (window.GoRide && window.GoRide.showToast) || window.showToast;
            if (toastFn) {
                toastFn("Thank you! Your message has been received. Our team will contact you shortly.", "success");
            }
            contactForm.reset();
            submitBtn.disabled = false;
            submitBtn.innerHTML = oldBtnText;

            // Clear validation styles
            clearValidation(nameInput);
            clearValidation(emailInput);
            clearValidation(phoneInput);
            clearValidation(subjectInput);
            clearValidation(inquirySelect);
            clearValidation(messageInput);
        }, 600);
    });
});
