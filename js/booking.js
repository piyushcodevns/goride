"use strict";

(function() {
    // ----------------------------------------------------
    // DOM SELECTORS
    // ----------------------------------------------------
    const bookingForm = document.getElementById('booking-form');
    const pickupInput = document.getElementById('pickup-input');
    const dropoffInput = document.getElementById('dropoff-input');
    const pickupSuggestions = document.getElementById('pickup-suggestions');
    const dropoffSuggestions = document.getElementById('dropoff-suggestions');
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
    let currentDuration = 0; // in mins
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

    // Calculate dynamic fare based on matrix rules in config.js
    window.calculateFare = function(distance, rideType) {
        const fareConfig = window.APP_CONFIG.FARE;
        const config = fareConfig[rideType] || fareConfig.bike;
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

    // Calculate dynamic ETA based on distance
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
        etaVal.innerText = `${currentDuration} Mins`;
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
            rideType: selectedVehicleType,
            pickupCoords: (pickupInput.dataset.lat && pickupInput.dataset.lng) ? {
                lat: parseFloat(pickupInput.dataset.lat),
                lng: parseFloat(pickupInput.dataset.lng)
            } : null,
            dropCoords: (dropoffInput.dataset.lat && dropoffInput.dataset.lng) ? {
                lat: parseFloat(dropoffInput.dataset.lat),
                lng: parseFloat(dropoffInput.dataset.lng)
            } : null
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
        currentDuration = 0;
        selectedVehicleType = 'bike';

        // Clear dataset coordinates
        delete pickupInput.dataset.lat;
        delete pickupInput.dataset.lng;
        delete pickupInput.dataset.placeId;
        delete pickupInput.dataset.address;
        
        delete dropoffInput.dataset.lat;
        delete dropoffInput.dataset.lng;
        delete dropoffInput.dataset.placeId;
        delete dropoffInput.dataset.address;

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

        // Clear Map Route
        if (window.MapProvider) {
            window.MapProvider.clearRoute();
        }
    };

    // Trigger Directions calculations if both coordinates exist
    function checkAndTriggerRoute() {
        const plat = pickupInput.dataset.lat;
        const plng = pickupInput.dataset.lng;
        const dlat = dropoffInput.dataset.lat;
        const dlng = dropoffInput.dataset.lng;

        if (plat && plng && dlat && dlng) {
            const pickupCoords = { lat: parseFloat(plat), lng: parseFloat(plng) };
            const dropCoords = { lat: parseFloat(dlat), lng: parseFloat(dlng) };
            window.MapProvider.drawRoute(pickupCoords, dropCoords);
        } else {
            // Clear route if either is missing coordinates
            window.MapProvider.clearRoute();
        }
    }

    // Debounce wrapper helper
    function debounce(callback, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                callback.apply(context, args);
            }, delay);
        };
    }

    // ----------------------------------------------------
    // INITIALIZATION & EVENT LISTENERS
    // ----------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        if (window.MapProvider) {
            window.MapProvider.init();
        }
        initDateLimits();
        checkAndTriggerRoute();
        updateFareCard();
        performLiveValidation();
    });

    // Register map callbacks
    if (window.MapProvider) {
        window.MapProvider.registerRouteCalculated((distance, duration) => {
            currentDistance = distance;
            currentDuration = duration;
            updateFareCard();
            performLiveValidation();
        });

        window.MapProvider.registerRouteCleared(() => {
            currentDistance = 0;
            currentDuration = 0;
            updateFareCard();
            performLiveValidation();
        });
    }

    // Geolocation Emulator (Centering Varanasi)
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', () => {
            currentLocationBtn.classList.add('loading');
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        
                        pickupInput.value = "My Current Location (Varanasi)";
                        pickupInput.dataset.lat = lat;
                        pickupInput.dataset.lng = lng;
                        pickupInput.dataset.address = "My Current Location, Varanasi, Uttar Pradesh";
                        pickupInput.dataset.placeId = "geolocation-pickup-id";

                        currentLocationBtn.classList.remove('loading');
                        window.showToast("Current location detected!", "success");
                        
                        checkAndTriggerRoute();
                        performLiveValidation();
                    },
                    (error) => {
                        // Fallback Varanasi Junction
                        pickupInput.value = "Varanasi Junction, Varanasi";
                        pickupInput.dataset.lat = 25.3263;
                        pickupInput.dataset.lng = 82.9866;
                        pickupInput.dataset.address = "Varanasi Junction, Cantt, Varanasi, Uttar Pradesh";
                        pickupInput.dataset.placeId = "fallback-cantt-id";

                        currentLocationBtn.classList.remove('loading');
                        window.showToast("Permission denied. Fallback address loaded.", "info");

                        checkAndTriggerRoute();
                        performLiveValidation();
                    }
                );
            } else {
                pickupInput.value = "Varanasi Junction, Varanasi";
                pickupInput.dataset.lat = 25.3263;
                pickupInput.dataset.lng = 82.9866;
                pickupInput.dataset.address = "Varanasi Junction, Cantt, Varanasi, Uttar Pradesh";
                pickupInput.dataset.placeId = "fallback-cantt-id";

                currentLocationBtn.classList.remove('loading');
                window.showToast("Geolocation not supported.", "error");

                checkAndTriggerRoute();
                performLiveValidation();
            }
        });
    }

    // Render suggestion items inside UI list box
    function showSuggestions(results, inputEl, listEl) {
        listEl.innerHTML = '';
        if (!results || results.length === 0) {
            listEl.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--muted); font-size: 0.85rem;">No locations found.</li>';
            return;
        }

        results.forEach((item, idx) => {
            const li = document.createElement('li');
            li.role = "option";
            li.id = `${inputEl.id}-opt-${idx}`;
            li.className = 'suggestion-item';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.padding = '8px 12px';
            li.style.cursor = 'pointer';
            li.style.transition = 'background var(--transition)';
            li.style.borderTop = '1px solid var(--border)';

            li.innerHTML = `
                <span style="margin-right:10px; font-size:1rem;">📍</span>
                <div style="text-align: left;">
                    <strong style="font-size:0.88rem; color:var(--text);">${item.name}</strong><br>
                    <small style="color:var(--muted); font-size:0.75rem;">${item.address}</small>
                </div>
            `;

            li.addEventListener('click', () => {
                selectPlace(item, inputEl, listEl);
            });
            listEl.appendChild(li);
        });

        listEl.style.display = 'block';
    }

    // Handle suggestion selections (Step 4)
    function selectPlace(item, inputEl, listEl) {
        inputEl.dataset.lat = item.lat;
        inputEl.dataset.lng = item.lng;
        inputEl.dataset.placeId = item.placeId;
        inputEl.dataset.address = item.address;
        inputEl.value = item.name;

        listEl.style.display = 'none';

        // Add Marker on map
        const type = inputEl.id === 'pickup-input' ? 'pickup' : 'dropoff';
        if (window.MapProvider && window.MapProvider.addMarker) {
            window.MapProvider.addMarker(item.lat, item.lng, type);
        }

        checkAndTriggerRoute();
        performLiveValidation();
    }

    // Keyboard controls handler
    function setupKeyboardAutocomplete(inputEl, listEl) {
        let activeIndex = -1;

        const items = () => listEl.querySelectorAll('.suggestion-item');

        const setActive = (index) => {
            const listItems = items();
            listItems.forEach((item, idx) => {
                if (idx === index) {
                    item.classList.add('focused');
                    item.setAttribute('aria-selected', 'true');
                    inputEl.setAttribute('aria-activedescendant', item.id);
                } else {
                    item.classList.remove('focused');
                    item.setAttribute('aria-selected', 'false');
                }
            });
        };

        inputEl.addEventListener('keydown', (e) => {
            const listItems = items();
            const open = listEl.style.display === 'block';

            if (!open || listItems.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % listItems.length;
                setActive(activeIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + listItems.length) % listItems.length;
                setActive(activeIndex);
            } else if (e.key === 'Enter') {
                if (activeIndex >= 0 && activeIndex < listItems.length) {
                    e.preventDefault();
                    listItems[activeIndex].click();
                    listEl.style.display = 'none';
                    activeIndex = -1;
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                listEl.style.display = 'none';
                activeIndex = -1;
                inputEl.removeAttribute('aria-activedescendant');
            }
        });
    }

    // Bind keydown events on inputs
    setupKeyboardAutocomplete(pickupInput, pickupSuggestions);
    setupKeyboardAutocomplete(dropoffInput, dropoffSuggestions);

    // Debounced Autocomplete inputs searches (300ms delay)
    const triggerPickupSearch = debounce(() => {
        const query = pickupInput.value;
        if (query.trim().length === 0) {
            delete pickupInput.dataset.lat;
            delete pickupInput.dataset.lng;
            delete pickupInput.dataset.placeId;
            delete pickupInput.dataset.address;
            pickupSuggestions.style.display = 'none';
            checkAndTriggerRoute();
            performLiveValidation();
            
            // Clear marker on map
            if (window.MapProvider && window.MapProvider.clearRoute) {
                window.MapProvider.clearRoute();
            }
            return;
        }

        // Show loading spinner indicator (Phase 2)
        pickupSuggestions.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--muted); font-size: 0.85rem;">⏳ Searching locations...</li>';
        pickupSuggestions.style.display = 'block';

        window.MapProvider.searchPlaces(query, (err, results) => {
            if (err) {
                pickupSuggestions.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--accent); font-size: 0.85rem;">⚠️ Unable to fetch locations.</li>';
                return;
            }
            showSuggestions(results, pickupInput, pickupSuggestions);
        });
    }, 300);

    const triggerDropoffSearch = debounce(() => {
        const query = dropoffInput.value;
        if (query.trim().length === 0) {
            delete dropoffInput.dataset.lat;
            delete dropoffInput.dataset.lng;
            delete dropoffInput.dataset.placeId;
            delete dropoffInput.dataset.address;
            dropoffSuggestions.style.display = 'none';
            checkAndTriggerRoute();
            performLiveValidation();

            // Clear marker on map
            if (window.MapProvider && window.MapProvider.clearRoute) {
                window.MapProvider.clearRoute();
            }
            return;
        }

        // Show loading spinner indicator (Phase 2)
        dropoffSuggestions.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--muted); font-size: 0.85rem;">⏳ Searching locations...</li>';
        dropoffSuggestions.style.display = 'block';

        window.MapProvider.searchPlaces(query, (err, results) => {
            if (err) {
                dropoffSuggestions.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--accent); font-size: 0.85rem;">⚠️ Unable to fetch locations.</li>';
                return;
            }
            showSuggestions(results, dropoffInput, dropoffSuggestions);
        });
    }, 300);

    // Typing Listeners
    pickupInput.addEventListener('input', triggerPickupSearch);
    dropoffInput.addEventListener('input', triggerDropoffSearch);

    // Coordinate state changes
    pickupInput.addEventListener('change', () => {
        checkAndTriggerRoute();
        performLiveValidation();
    });
    dropoffInput.addEventListener('change', () => {
        checkAndTriggerRoute();
        performLiveValidation();
    });

    // Hide suggestions list when clicking outside
    document.addEventListener('click', (e) => {
        const pickupSuggestions = document.getElementById('pickup-suggestions');
        const dropoffSuggestions = document.getElementById('dropoff-suggestions');
        if (pickupSuggestions && e.target !== pickupInput) {
            pickupSuggestions.style.display = 'none';
        }
        if (dropoffSuggestions && e.target !== dropoffInput) {
            dropoffSuggestions.style.display = 'none';
        }
    });

    // Pickers Validation trigger
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

        const pickupCoords = (pickupInput.dataset.lat && pickupInput.dataset.lng) ? {
            lat: parseFloat(pickupInput.dataset.lat),
            lng: parseFloat(pickupInput.dataset.lng)
        } : null;
        
        const dropCoords = (dropoffInput.dataset.lat && dropoffInput.dataset.lng) ? {
            lat: parseFloat(dropoffInput.dataset.lat),
            lng: parseFloat(dropoffInput.dataset.lng)
        } : null;

        const data = {
            pickup: sanitizedPickup,
            drop: sanitizedDrop,
            date: dateInput.value,
            time: timeInput.value,
            passengers: passengerInput.value,
            rideType: selectedVehicleType,
            pickupCoords: pickupCoords,
            dropCoords: dropCoords
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

        // 3. Trigger Loader Overlay
        window.toggleLoading(true);
        progressFill.style.width = '0%';

        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            progressFill.style.width = `${progress}%`;

            if (progress >= 100) {
                clearInterval(interval);

                // Hide Loader
                window.toggleLoading(false);

                // Populate success modal
                const bookingId = window.generateBookingID();
                bookingIdVal.innerText = bookingId;

                // Assemble the consolidated structured booking object (V6)
                const fareCalculation = window.calculateFare(currentDistance, selectedVehicleType);
                const bookingObject = {
                    pickup: {
                        placeId: pickupInput.dataset.placeId || "mock-pickup-id",
                        name: pickupInput.value,
                        address: pickupInput.dataset.address || pickupInput.value,
                        lat: pickupCoords?.lat ?? null,
                        lng: pickupCoords?.lng ?? null
                    },
                    drop: {
                        placeId: dropoffInput.dataset.placeId || "mock-dropoff-id",
                        name: dropoffInput.value,
                        address: dropoffInput.dataset.address || dropoffInput.value,
                        lat: dropCoords?.lat ?? null,
                        lng: dropCoords?.lng ?? null
                    },
                    route: {
                        distanceKm: currentDistance,
                        durationMinutes: currentDuration,
                        encodedPolyline: "" // populated dynamically in production from Directions response
                    },
                    fare: {
                        vehicle: selectedVehicleType,
                        amount: fareCalculation.total
                    }
                };

                // Output ready-to-use backend object in console logs
                console.log("Go Ride Booking Object Ready for Backend API Insertion:", bookingObject);
                // TODO: Booking API - submit final ride details (bookingObject) to DB in V2
                
                // Save record for ML dataset
                if (window.saveBookingRecord) {
                    const recordData = { ...data, ...bookingObject };
                    window.saveBookingRecord(recordData);
                }

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
