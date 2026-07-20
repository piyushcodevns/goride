document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // DOM Selectors
    // ----------------------------------------------------
    const bookingForm = document.getElementById('booking-form');
    const pickupInput = document.getElementById('pickup-input');
    const dropoffInput = document.getElementById('dropoff-input');
    const pickupSuggestions = document.getElementById('pickup-suggestions');
    const dropoffSuggestions = document.getElementById('dropoff-suggestions');
    const dateInput = document.getElementById('booking-date');
    const timeInput = document.getElementById('booking-time');
    const toggleButtons = document.querySelectorAll('.booking-toggle-row .toggle-btn');
    const vehicleItems = document.querySelectorAll('.vehicles-list .vehicle-item');
    const paymentOptions = document.querySelectorAll('.payment-option input[type="radio"]');
    const couponInput = document.getElementById('coupon-input');
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const couponMessage = document.getElementById('coupon-message');
    const confirmBookingBtn = document.getElementById('confirm-booking-btn');
    const currentLocationBtn = document.querySelector('.current-location-btn');
    
    // Fare values
    const baseFareVal = document.getElementById('base-fare-val');
    const distanceFareVal = document.getElementById('distance-fare-val');
    const taxesVal = document.getElementById('taxes-val');
    const totalFareVal = document.getElementById('total-fare-val');
    
    // Modals
    const loadingOverlay = document.getElementById('loading-overlay');
    const successModal = document.getElementById('success-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const progressFill = document.querySelector('.loader-progress-fill');
    
    // Driver Details in Modal
    const driverNameEl = document.getElementById('matched-driver-name');
    const driverRatingEl = document.getElementById('matched-driver-rating');
    const vehicleTypeEl = document.getElementById('matched-vehicle-type');
    const vehiclePlateEl = document.getElementById('matched-vehicle-plate');

    // ----------------------------------------------------
    // Mock Data
    // ----------------------------------------------------
    const mockAddresses = [
        "Indira Gandhi International Airport (DEL), Delhi",
        "Connaught Place, New Delhi, Delhi",
        "Cyber City, Sector 24, Gurugram, Haryana",
        "Noida Sector 62, Noida, Uttar Pradesh",
        "Hauz Khas Village, New Delhi, Delhi",
        "Aerocity, New Delhi, Delhi",
        "Saket Metro Station, New Delhi, Delhi",
        "Rajiv Chowk, New Delhi, Delhi",
        "Noida Electronic City, Noida, Uttar Pradesh"
    ];

    const mockDrivers = [
        { name: "Vikram Singh", rating: "⭐ 4.9 (120+ rides)", vehicle: "Swift Dzire", plate: "DL 3C AB 1234" },
        { name: "Amit Kumar", rating: "⭐ 4.8 (85+ rides)", vehicle: "Wagon R", plate: "HR 26 CD 5678" },
        { name: "Rajesh Yadav", rating: "⭐ 4.7 (210+ rides)", vehicle: "Splendor Plus", plate: "UP 16 XY 9999" },
        { name: "Suresh Gupta", rating: "⭐ 4.9 (50+ rides)", vehicle: "Ertiga", plate: "DL 1C EF 4321" }
    ];

    // State parameters
    let currentDistance = 0; // in km
    let appliedDiscount = 0; // in rupees
    let selectedVehicle = null;

    // Initialize Date/Time values
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    dateInput.value = dateString;
    
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;

    // ----------------------------------------------------
    // Helper Functions
    // ----------------------------------------------------
    const updateValidation = () => {
        const isPickupOk = pickupInput.value.trim().length > 3;
        const isDropoffOk = dropoffInput.value.trim().length > 3;
        const isDateOk = dateInput.value !== '';
        const isTimeOk = timeInput.value !== '';
        const isVehicleOk = document.querySelector('.vehicle-item.active') !== null;
        
        if (isPickupOk && isDropoffOk && isDateOk && isTimeOk && isVehicleOk) {
            confirmBookingBtn.disabled = false;
        } else {
            confirmBookingBtn.disabled = true;
        }
    };

    const calculateDistance = () => {
        const pLen = pickupInput.value.trim().length;
        const dLen = dropoffInput.value.trim().length;
        if (pLen > 0 && dLen > 0) {
            // Generate a deterministic mock distance based on string lengths
            currentDistance = Math.max(3, (pLen + dLen) % 25 + 2);
        } else {
            currentDistance = 0;
        }
        updateFareSummary();
    };

    const updateFareSummary = () => {
        const activeItem = document.querySelector('.vehicle-item.active');
        if (!activeItem) return;
        
        selectedVehicle = activeItem.dataset.type;
        const baseFare = parseFloat(activeItem.dataset.baseFare);
        const perKm = parseFloat(activeItem.dataset.perKm);
        
        const distanceFare = currentDistance * perKm;
        const taxes = Math.round((baseFare + distanceFare) * 0.08); // 8% tax
        
        let total = baseFare + distanceFare + taxes;
        let finalTotal = Math.max(0, total - appliedDiscount);
        
        // Update DOM values
        baseFareVal.innerText = `₹${baseFare.toFixed(2)}`;
        distanceFareVal.innerText = `₹${distanceFare.toFixed(2)}`;
        taxesVal.innerText = `₹${taxes.toFixed(2)}`;
        totalFareVal.innerText = `₹${finalTotal.toFixed(2)}`;
    };

    // ----------------------------------------------------
    // Event Handlers
    // ----------------------------------------------------

    // Geolocation Simulator
    currentLocationBtn.addEventListener('click', () => {
        currentLocationBtn.classList.add('loading');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    pickupInput.value = "My Current Location (Delhi NCR)";
                    currentLocationBtn.classList.remove('loading');
                    window.showToast("Current location detected!", "success");
                    calculateDistance();
                    updateValidation();
                },
                (error) => {
                    // Fallback to mock address
                    pickupInput.value = mockAddresses[1];
                    currentLocationBtn.classList.remove('loading');
                    window.showToast("Location permission denied. Used fallback address.", "info");
                    calculateDistance();
                    updateValidation();
                }
            );
        } else {
            pickupInput.value = mockAddresses[1];
            currentLocationBtn.classList.remove('loading');
            window.showToast("Geolocation not supported by browser.", "error");
            calculateDistance();
            updateValidation();
        }
    });

    // Autocomplete Search lists
    const showSuggestions = (input, listEl) => {
        const query = input.value.trim().toLowerCase();
        listEl.innerHTML = '';
        if (query.length < 2) {
            listEl.style.display = 'none';
            return;
        }
        
        const filtered = mockAddresses.filter(addr => addr.toLowerCase().includes(query));
        if (filtered.length === 0) {
            listEl.style.display = 'none';
            return;
        }

        filtered.forEach(addr => {
            const li = document.createElement('li');
            li.role = "option";
            li.innerHTML = `<span>📍</span> ${addr}`;
            li.addEventListener('click', () => {
                input.value = addr;
                listEl.style.display = 'none';
                calculateDistance();
                updateValidation();
                window.showToast("Location updated!", "success");
            });
            listEl.appendChild(li);
        });
        listEl.style.display = 'block';
    };

    pickupInput.addEventListener('input', () => showSuggestions(pickupInput, pickupSuggestions));
    dropoffInput.addEventListener('input', () => showSuggestions(dropoffInput, dropoffSuggestions));

    // Hide suggestions list when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== pickupInput) pickupSuggestions.style.display = 'none';
        if (e.target !== dropoffInput) dropoffSuggestions.style.display = 'none';
    });

    // Inputs Validation trigger
    pickupInput.addEventListener('blur', () => {
        setTimeout(calculateDistance, 100);
        setTimeout(updateValidation, 150);
    });
    dropoffInput.addEventListener('blur', () => {
        setTimeout(calculateDistance, 100);
        setTimeout(updateValidation, 150);
    });
    dateInput.addEventListener('change', updateValidation);
    timeInput.addEventListener('change', updateValidation);

    // Ride Mode Toggle buttons
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            const isSchedule = btn.dataset.type === 'schedule';
            window.showToast(isSchedule ? "Switch to Schedule Later mode" : "Switch to Ride Now mode", "info");
        });
    });

    // Vehicle Select radio items
    vehicleItems.forEach(item => {
        // Click listener
        item.addEventListener('click', () => {
            selectVehicle(item);
        });

        // Keyboard listener (A11y)
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectVehicle(item);
            }
        });
    });

    const selectVehicle = (item) => {
        vehicleItems.forEach(v => {
            v.classList.remove('active');
            v.setAttribute('aria-checked', 'false');
        });
        item.classList.add('active');
        item.setAttribute('aria-checked', 'true');
        
        updateFareSummary();
        updateValidation();
        window.showToast(`Selected ${item.querySelector('h4').innerText} ride option`, "info");
    };

    // Payment Selection buttons
    paymentOptions.forEach(opt => {
        opt.addEventListener('change', () => {
            paymentOptions.forEach(o => {
                o.closest('.payment-option').classList.remove('active');
            });
            if (opt.checked) {
                opt.closest('.payment-option').classList.add('active');
                window.showToast(`Payment method: ${opt.value.toUpperCase()}`, "info");
            }
        });
    });

    // Coupon Code Apply button
    applyCouponBtn.addEventListener('click', () => {
        const code = couponInput.value.trim().toUpperCase();
        couponMessage.className = "coupon-msg";
        
        if (code === "") {
            couponMessage.innerText = "Please enter a promo code.";
            couponMessage.classList.add('error');
            return;
        }

        if (code === "GORIDE20") {
            // Apply 20% discount (simulate discount cap of ₹100)
            const activeItem = document.querySelector('.vehicle-item.active');
            if (activeItem) {
                const base = parseFloat(activeItem.dataset.baseFare);
                const perKm = parseFloat(activeItem.dataset.perKm);
                const rawTotal = base + (currentDistance * perKm);
                appliedDiscount = Math.round(rawTotal * 0.2);
                couponMessage.innerText = `Promo code GORIDE20 applied! Saved ₹${appliedDiscount}.`;
                couponMessage.classList.add('success');
                window.showToast("Promo discount applied!", "success");
            }
        } else if (code === "WELCOME50") {
            appliedDiscount = 50;
            couponMessage.innerText = "Welcome promo applied! Flat ₹50 discount.";
            couponMessage.classList.add('success');
            window.showToast("Promo discount applied!", "success");
        } else {
            appliedDiscount = 0;
            couponMessage.innerText = "Invalid promo code. Please try again.";
            couponMessage.classList.add('error');
            window.showToast("Invalid coupon code", "error");
        }
        
        updateFareSummary();
    });

    // ----------------------------------------------------
    // Booking Form Submit (Matching Workflow)
    // ----------------------------------------------------
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Final sanity check
        if (confirmBookingBtn.disabled) return;
        
        // Show Loading Overlay
        loadingOverlay.classList.add('active');
        loadingOverlay.setAttribute('aria-hidden', 'false');
        
        // Simulated progress bar filler
        let progress = 0;
        progressFill.style.width = '0%';
        
        const interval = setInterval(() => {
            progress += 10;
            progressFill.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                
                // Hide Loader
                loadingOverlay.classList.remove('active');
                loadingOverlay.setAttribute('aria-hidden', 'true');
                
                // Select a random driver matching vehicle type
                const matchedDriver = mockDrivers[Math.floor(Math.random() * mockDrivers.length)];
                const selectedVehicleName = document.querySelector('.vehicle-item.active h4').innerText;
                
                // Populate Success Modal
                driverNameEl.innerText = matchedDriver.name;
                driverRatingEl.innerText = matchedDriver.rating;
                vehicleTypeEl.innerText = `${selectedVehicleName} (${matchedDriver.vehicle})`;
                vehiclePlateEl.innerText = matchedDriver.plate;
                
                // Show Success Modal
                successModal.classList.add('active');
                successModal.setAttribute('aria-hidden', 'false');
                window.showToast("Booking Successful!", "success");
            }
        }, 300);
    });

    // Close Modal Redirect
    closeModalBtn.addEventListener('click', () => {
        successModal.classList.remove('active');
        successModal.setAttribute('aria-hidden', 'true');
        
        // Reset form details
        bookingForm.reset();
        couponInput.value = "";
        couponMessage.innerText = "";
        appliedDiscount = 0;
        currentDistance = 0;
        
        // Re-initialize dates
        dateInput.value = dateString;
        timeInput.value = `${hours}:${minutes}`;
        
        // Select first vehicle as active again
        vehicleItems.forEach((v, index) => {
            if (index === 0) {
                v.classList.add('active');
                v.setAttribute('aria-checked', 'true');
            } else {
                v.classList.remove('active');
                v.setAttribute('aria-checked', 'false');
            }
        });
        
        updateFareSummary();
        updateValidation();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
