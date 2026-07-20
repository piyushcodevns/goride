"use strict";

(function() {
    // ----------------------------------------------------
    // FARE CONFIGURATION CONSTANTS
    // ----------------------------------------------------
    const FARE_MATRIX = {
        bike: { base: 40, perKm: 8 },
        auto: { base: 50, perKm: 10 },
        mini: { base: 70, perKm: 12 },
        sedan: { base: 100, perKm: 16 },
        suv: { base: 150, perKm: 20 }
    };

    // ----------------------------------------------------
    // DOM SELECTORS
    // ----------------------------------------------------
    const bookingForm = document.getElementById('booking-form');
    const pickupInput = document.getElementById('pickup-input');
    const dropoffInput = document.getElementById('dropoff-input');
    const dateInput = document.getElementById('booking-date');
    const timeInput = document.getElementById('booking-time');
    const passengerInput = document.getElementById('passenger-count');
    const decPassengerBtn = document.getElementById('dec-passengers');
    const incPassengerBtn = document.getElementById('inc-passengers');
    const confirmBookingBtn = document.getElementById('confirm-booking-btn');
    const currentLocationBtn = document.querySelector('.current-location-btn');
    const toggleButtons = document.querySelectorAll('.booking-toggle-row .toggle-btn');
    const vehicleItems = document.querySelectorAll('.vehicles-list .vehicle-item');
    const paymentOptions = document.querySelectorAll('.payment-option input[type="radio"]');
    const couponInput = document.getElementById('coupon-input');
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const couponMessage = document.getElementById('coupon-message');

    // Fare Card elements
    const distanceVal = document.getElementById('distance-val');
    const etaVal = document.getElementById('eta-val');
    const baseFareVal = document.getElementById('base-fare-val');
    const distanceFareVal = document.getElementById('distance-fare-val');
    const taxesVal = document.getElementById('taxes-val');
    const totalFareVal = document.getElementById('total-fare-val');

    // Modals & Overlays
    const loadingOverlay = document.getElementById('loading-overlay');
    const successModal = document.getElementById('success-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const progressFill = document.querySelector('.loader-progress-fill');
    const bookingIdVal = document.getElementById('booking-id-val');

    // State Variables
    let currentDistance = 0; // in km
    let appliedDiscount = 0; // in rupees
    let selectedVehicleType = 'bike'; // default

    // ----------------------------------------------------
    // SINGLE RESPONSIBILITY HELPER FUNCTIONS
    // ----------------------------------------------------

    // Sanitize string - remove multiple inner spaces and leading/trailing spaces
    function sanitizeInput(str) {
        return str.replace(/\s+/g, ' ').trim();
    }

    // Set today and max 90 days boundary dates in picker
    function initDateLimits() {
        const today = new Date();
        const minStr = today.toISOString().split('T')[0];
        dateInput.value = minStr;
        dateInput.min = minStr;

        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 90);
        const maxStr = maxDate.toISOString().split('T')[0];
        dateInput.max = maxStr;

        // Init time
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }

    // Calculate dynamic fare based on matrix rules
    window.calculateFare = function(distance, rideType) {
        const config = FARE_MATRIX[rideType] || FARE_MATRIX.bike;
        const base = config.base;
        const distFare = distance * config.perKm;
        const tax = Math.round((base + distFare) * 0.08); // 8% tax
        const total = base + distFare + tax;
        
        return {
            base: base,
            distanceFare: distFare,
            taxes: tax,
            total: total
        };
    };

    // Calculate dynamic ETA based on distance (assuming avg speed 40km/h + 2 min default delay)
    window.calculateETA = function(distance) {
        if (distance === 0) return 0;
        return Math.round((distance / 40) * 60 + 2);
    };

    // Generate random timestamped duplicate-safe Booking ID
    window.generateBookingID = function() {
        const now = new Date();
        const datePart = now.getFullYear() + 
                         String(now.getMonth() + 1).padStart(2, '0') + 
                         String(now.getDate()).padStart(2, '0');
        const timePart = now.getTime().toString().slice(-4);
        const randPart = Math.floor(1000 + Math.random() * 9000); // 4 digit random
        return `GR-${datePart}-${timePart}${randPart}`;
    };

    // Toggle full screen matching spinner
    window.toggleLoading = function(show) {
        if (show) {
            loadingOverlay.classList.add('active');
            loadingOverlay.setAttribute('aria-hidden', 'false');
            confirmBookingBtn.disabled = true;
            confirmBookingBtn.innerHTML = `<span>⏳</span> Booking...`;
            confirmBookingBtn.style.pointerEvents = 'none';
            confirmBookingBtn.style.cursor = 'not-allowed';
        } else {
            loadingOverlay.classList.remove('active');
            loadingOverlay.setAttribute('aria-hidden', 'true');
            confirmBookingBtn.disabled = false;
            confirmBookingBtn.innerHTML = `Confirm Booking`;
            confirmBookingBtn.style.pointerEvents = '';
            confirmBookingBtn.style.cursor = '';
        }
    };

    // Render numbers in dynamic estimated breakdown card
    window.updateFareCard = function() {
        const fare = window.calculateFare(currentDistance, selectedVehicleType);
        const eta = window.calculateETA(currentDistance);

        // Update list placeholders as well
        vehicleItems.forEach(item => {
            const type = item.dataset.type;
            const itemFare = window.calculateFare(currentDistance, type);
            const priceSpan = item.querySelector('.price');
            if (priceSpan) {
                if (currentDistance > 0) {
                    priceSpan.innerText = `₹${Math.round(itemFare.total)}`;
                } else {
                    priceSpan.innerText = `₹ --`;
                }
            }
        });

        // Update main breakdown card
        distanceVal.innerText = `${currentDistance.toFixed(1)} KM`;
        etaVal.innerText = `${eta} Mins`;
        baseFareVal.innerText = `₹${fare.base.toFixed(2)}`;
        distanceFareVal.innerText = `₹${fare.distanceFare.toFixed(2)}`;
        taxesVal.innerText = `₹${fare.taxes.toFixed(2)}`;

        const finalTotal = Math.max(0, fare.total - appliedDiscount);
        totalFareVal.innerText = `₹${finalTotal.toFixed(2)}`;
    };

    // Update validate booking and handle disabled submit state
    function performLiveValidation() {
        const sanitizePickup = sanitizeInput(pickupInput.value);
        const sanitizeDrop = sanitizeInput(dropoffInput.value);

        const data = {
            pickup: sanitizePickup,
            drop: sanitizeDrop,
            date: dateInput.value,
            time: timeInput.value,
            passengers: passengerInput.value,
            rideType: selectedVehicleType
        };

        const result = window.validateBooking(data);
        if (result.valid) {
            confirmBookingBtn.disabled = false;
        } else {
            confirmBookingBtn.disabled = true;
        }
    }

    // Reset inputs, indicators and totals
    window.resetBooking = function() {
        bookingForm.reset();
        couponInput.value = "";
        couponMessage.innerText = "";
        appliedDiscount = 0;
        currentDistance = 0;
        selectedVehicleType = 'bike';

        // Reset vehicles classes
        vehicleItems.forEach((v, index) => {
            if (index === 0) {
                v.classList.add('active');
                v.setAttribute('aria-checked', 'true');
            } else {
                v.classList.remove('active');
                v.setAttribute('aria-checked', 'false');
            }
        });

        initDateLimits();
        updateFareCard();
        performLiveValidation();
    };

    // Calculate distance based on pickup and drop length hashes (Demo estimate)
    function refreshDistance() {
        const pLen = sanitizeInput(pickupInput.value).length;
        const dLen = sanitizeInput(dropoffInput.value).length;
        
        if (pLen > 3 && dLen > 3) {
            // Generate a hash-like deterministic mock distance between 3.5 and 28.5 km
            currentDistance = parseFloat((((pLen + dLen) * 7) % 25 + 3.5).toFixed(1));
        } else {
            currentDistance = 0;
        }
        updateFareCard();
    }

    // ----------------------------------------------------
    // INITIALIZATION & EVENT LISTENERS
    // ----------------------------------------------------
    initDateLimits();
    updateFareCard();

    // Geolocation Emulator
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', () => {
            currentLocationBtn.classList.add('loading');
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        pickupInput.value = "My Current Location (New Delhi)";
                        currentLocationBtn.classList.remove('loading');
                        window.showToast("Current location detected!", "success");
                        refreshDistance();
                        performLiveValidation();
                    },
                    (error) => {
                        pickupInput.value = "Connaught Place, New Delhi";
                        currentLocationBtn.classList.remove('loading');
                        window.showToast("Permission denied. Falling back to default address.", "info");
                        refreshDistance();
                        performLiveValidation();
                    }
                );
            } else {
                pickupInput.value = "Connaught Place, New Delhi";
                currentLocationBtn.classList.remove('loading');
                window.showToast("Geolocation not supported.", "error");
                refreshDistance();
                performLiveValidation();
            }
        });
    }

    // Live validation and distance updates
    pickupInput.addEventListener('input', () => {
        refreshDistance();
        performLiveValidation();
    });
    dropoffInput.addEventListener('input', () => {
        refreshDistance();
        performLiveValidation();
    });
    dateInput.addEventListener('input', performLiveValidation);
    timeInput.addEventListener('input', performLiveValidation);

    // Ride Mode Toggles
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            window.showToast(`Booking mode: ${btn.innerText}`, "info");
        });
    });

    // Passengers Counter Event Listeners
    decPassengerBtn.addEventListener('click', () => {
        let current = parseInt(passengerInput.value, 10);
        if (current > 1) {
            passengerInput.value = current - 1;
            performLiveValidation();
        }
    });

    incPassengerBtn.addEventListener('click', () => {
        let current = parseInt(passengerInput.value, 10);
        if (current < 6) {
            passengerInput.value = current + 1;
            performLiveValidation();
        }
    });

    // Ride Type Items Selection
    vehicleItems.forEach(item => {
        item.addEventListener('click', () => {
            selectVehicle(item);
        });

        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectVehicle(item);
            }
        });
    });

    function selectVehicle(item) {
        vehicleItems.forEach(v => {
            v.classList.remove('active');
            v.setAttribute('aria-checked', 'false');
        });
        item.classList.add('active');
        item.setAttribute('aria-checked', 'true');
        selectedVehicleType = item.dataset.type;
        
        updateFareCard();
        performLiveValidation();
    }

    // Payment Selection Highlights
    paymentOptions.forEach(opt => {
        opt.addEventListener('change', () => {
            paymentOptions.forEach(o => {
                o.closest('.payment-option').classList.remove('active');
            });
            if (opt.checked) {
                opt.closest('.payment-option').classList.add('active');
            }
        });
    });

    // Coupon Apply logic
    applyCouponBtn.addEventListener('click', () => {
        const code = sanitizeInput(couponInput.value).toUpperCase();
        couponMessage.className = "coupon-msg";
        
        if (code === "") {
            couponMessage.innerText = "Please enter a coupon code.";
            couponMessage.classList.add('error');
            return;
        }

        const fare = window.calculateFare(currentDistance, selectedVehicleType);

        if (code === "GORIDE20") {
            appliedDiscount = Math.round(fare.total * 0.2);
            couponMessage.innerText = `Promo code GORIDE20 applied! Saved ₹${appliedDiscount}.`;
            couponMessage.classList.add('success');
            window.showToast("20% promo code applied successfully!", "success");
        } else if (code === "WELCOME50") {
            appliedDiscount = 50;
            couponMessage.innerText = "Welcome promo applied! Saved flat ₹50.";
            couponMessage.classList.add('success');
            window.showToast("₹50 promo discount applied!", "success");
        } else {
            appliedDiscount = 0;
            couponMessage.innerText = "Invalid promo code. Try GORIDE20.";
            couponMessage.classList.add('error');
            window.showToast("Invalid promo code.", "error");
        }
        
        updateFareCard();
    });

    // ----------------------------------------------------
    // FORM SUBMISSION (DOUBLE-SUBMIT PROTECTED)
    // ----------------------------------------------------
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Sanitize inputs prior to validation
        const sanitizedPickup = sanitizeInput(pickupInput.value);
        const sanitizedDrop = sanitizeInput(dropoffInput.value);
        
        pickupInput.value = sanitizedPickup;
        dropoffInput.value = sanitizedDrop;

        const data = {
            pickup: sanitizedPickup,
            drop: sanitizedDrop,
            date: dateInput.value,
            time: timeInput.value,
            passengers: passengerInput.value,
            rideType: selectedVehicleType
        };

        // 2. Validate booking inputs
        const result = window.validateBooking(data);

        if (!result.valid) {
            window.showToast(result.message, "error");
            
            // Focus invalid field
            if (result.field === 'pickup') pickupInput.focus();
            else if (result.field === 'drop') dropoffInput.focus();
            else if (result.field === 'date') dateInput.focus();
            else if (result.field === 'time') timeInput.focus();
            return;
        }

        // TODO: Google Places API - resolve pickup/dropoff coordinates
        // TODO: Distance Matrix API - fetch actual route distance/duration
        // TODO: Payment Gateway - trigger pre-authorization check

        // 3. Trigger Loader Overlay
        window.toggleLoading(true);
        progressFill.style.width = '0%';

        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            progressFill.style.width = `${progress}%`;

            if (progress >= 100) {
                clearInterval(interval);

                // TODO: Booking API - submit final ride details to DB in V2
                
                // Hide Loader
                window.toggleLoading(false);

                // Populate success modal
                const bookingId = window.generateBookingID();
                bookingIdVal.innerText = bookingId;

                successModal.classList.add('active');
                successModal.setAttribute('aria-hidden', 'false');
                window.showToast("Ride Booked Successfully!", "success");
            }
        }, 200); // 1000ms minimum duration loader
    });

    // Close Modal Reset
    closeModalBtn.addEventListener('click', () => {
        successModal.classList.remove('active');
        successModal.setAttribute('aria-hidden', 'true');
        window.resetBooking();
    });
})();
