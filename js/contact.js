document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    // Clone form to clear any existing anonymous submit listeners from main.js
    const cleanForm = contactForm.cloneNode(true);
    contactForm.parentNode.replaceChild(cleanForm, contactForm);

    // Get input elements from the clean form
    const nameInput = cleanForm.querySelector('#contact-name');
    const emailInput = cleanForm.querySelector('#contact-email');
    const phoneInput = cleanForm.querySelector('#contact-phone');
    const subjectInput = cleanForm.querySelector('#contact-subject');
    const inquirySelect = cleanForm.querySelector('#contact-inquiry');
    const messageInput = cleanForm.querySelector('#contact-message');
    const submitBtn = cleanForm.querySelector('button[type="submit"]');

    // Helper: Show error state
    const showError = (input, message) => {
        const group = input.closest('.input-group') || input.parentElement;
        let errorEl = group.querySelector('.error-msg');
        
        if (!errorEl) {
            errorEl = document.createElement('small');
            errorEl.className = 'error-msg';
            errorEl.style.color = '#DC2626';
            errorEl.style.fontSize = '0.8rem';
            errorEl.style.marginTop = '0.25rem';
            errorEl.style.display = 'block';
            group.appendChild(errorEl);
        }
        
        errorEl.innerText = message;
        input.style.borderColor = '#DC2626';
        input.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.12)';
        return false;
    };

    // Helper: Show success/valid state
    const showSuccess = (input) => {
        const group = input.closest('.input-group') || input.parentElement;
        const errorEl = group.querySelector('.error-msg');
        if (errorEl) {
            errorEl.remove();
        }
        input.style.borderColor = 'var(--accent)';
        input.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.12)';
        return true;
    };

    // Helper: Clear validation style
    const clearValidation = (input) => {
        const group = input.closest('.input-group') || input.parentElement;
        const errorEl = group.querySelector('.error-msg');
        if (errorEl) {
            errorEl.remove();
        }
        input.style.borderColor = '';
        input.style.boxShadow = '';
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
    cleanForm.addEventListener('submit', (e) => {
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

        // Simulate Form Submission (API call)
        const oldBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳</span> Sending...`;

        const emailVal = emailInput.value.trim().toLowerCase();

        setTimeout(() => {
            if (emailVal === 'error@goride.com') {
                // Simulate an API error response
                window.showToast("Server error: Unable to deliver message. Try again later.", "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = oldBtnText;
            } else {
                // Simulate successful response
                window.showToast("Message sent successfully! We will contact you soon.", "success");
                cleanForm.reset();
                submitBtn.disabled = false;
                submitBtn.innerHTML = oldBtnText;
                
                // Save record for ML dataset
                if (window.saveBookingRecord) {
                    const recordData = { pickup: 'Contact Form Inquiry', drop: inquirySelect.value, fare: { vehicle: 'support' } };
                    window.saveBookingRecord(recordData);
                }

                // Clear validation styles
                clearValidation(nameInput);
                clearValidation(emailInput);
                clearValidation(phoneInput);
                clearValidation(subjectInput);
                clearValidation(inquirySelect);
                clearValidation(messageInput);
            }
        }, 1500);
    });
});
