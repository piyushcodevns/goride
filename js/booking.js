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
    const findRidesBtn = document.getElementById('find-rides-btn');
    const confirmBookingBtn = document.getElementById('confirm-booking-btn');
    const currentLocationBtn = document.querySelector('.current-location-btn');
    const toggleButtons = document.querySelectorAll('.booking-toggle-row .toggle-btn');
    const vehicleItems = document.querySelectorAll('.vehicles-list .vehicle-item');
    const paymentOptions = document.querySelectorAll('.payment-option input[type="radio"]');
    const couponInput = document.getElementById('coupon-input');
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    const couponMessage = document.getElementById('coupon-message');

    // Fare Card elements
    const fareStatusBadge = document.getElementById('fare-status-badge');
    const distanceVal = document.getElementById('distance-val');
    const etaVal = document.getElementById('eta-val');
    const baseFareVal = document.getElementById('base-fare-val');
    const distanceFareVal = document.getElementById('distance-fare-val');
    const taxesVal = document.getElementById('taxes-val');
    const discountFareRow = document.getElementById('discount-fare-row');
    const discountVal = document.getElementById('discount-val');
    const totalFareVal = document.getElementById('total-fare-val');

    // Modals & Overlays
    const loadingOverlay = document.getElementById('loading-overlay');
    const successModal = document.getElementById('success-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const progressFill = document.querySelector('.loader-progress-fill');
    const bookingIdVal = document.getElementById('booking-id-val');
    const trackRideBtn = document.getElementById('track-ride-btn');

    // ----------------------------------------------------
    // STATE VARIABLES
    // ----------------------------------------------------
    let currentDistance = null; // in km
    let currentDuration = null; // in mins
    let currentServerFare = null; // object from backend /api/fare/calculate
    let appliedDiscount = 0; // in rupees
    let appliedCouponCode = "";
    let hasCouponError = false;
    let selectedVehicleType = 'bike'; // 'bike', 'auto', 'mini', 'sedan', 'suv'
    let bookingMode = 'now'; // 'now' or 'schedule'
    let fareRequestId = 0;
    let fareAbortController = null;
    let isSubmitting = false;

    // Deduplication, in-flight tracking & fare preview caching (UI only; booking remains authoritative on backend)
    const fareCache = new Map(); // key -> server fare response object
    const inFlightFarePromises = new Map(); // key -> Promise
    let lastCalculatedRouteCoords = null;
    let isFareRateLimited = false;

    // Mapping frontend vehicle types to backend VehicleType enum (BIKE, AUTO, CAR, SUV)
    const VEHICLE_MAP = {
        bike: "BIKE",
        auto: "AUTO",
        mini: "CAR",
        sedan: "CAR",
        suv: "SUV"
    };

    // List of unique backend vehicle types to fetch in parallel for any route
    const UNIQUE_BACKEND_VEHICLE_TYPES = ["BIKE", "AUTO", "CAR", "SUV"];

    // Namespace for utils
    window.GoRide = window.GoRide || {};
    window.GoRide.utils = window.GoRide.utils || {};

    // ----------------------------------------------------
    // HELPER FUNCTIONS
    // ----------------------------------------------------
    function sanitizeInput(str) {
        if (!str) return '';
        return str.replace(/\s+/g, ' ').trim();
    }

    function getRouteKey() {
        const plat = pickupInput?.dataset?.lat;
        const plng = pickupInput?.dataset?.lng;
        const dlat = dropoffInput?.dataset?.lat;
        const dlng = dropoffInput?.dataset?.lng;
        if (!plat || !plng || !dlat || !dlng) return null;
        const pLatNum = parseFloat(plat);
        const pLngNum = parseFloat(plng);
        const dLatNum = parseFloat(dlat);
        const dLngNum = parseFloat(dlng);
        if (isNaN(pLatNum) || isNaN(pLngNum) || isNaN(dLatNum) || isNaN(dLngNum)) return null;
        return `${pLatNum.toFixed(5)},${pLngNum.toFixed(5)}->${dLatNum.toFixed(5)},${dLngNum.toFixed(5)}`;
    }

    function initDateLimits() {
        if (!dateInput || !timeInput) return;
        const today = new Date();
        const minStr = today.toISOString().split('T')[0];
        dateInput.value = minStr;
        dateInput.min = minStr;

        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 90);
        const maxStr = maxDate.toISOString().split('T')[0];
        dateInput.max = maxStr;

        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }

    // Toggle full screen matching spinner
    window.GoRide.utils.toggleLoading = function(show) {
        if (!loadingOverlay || !confirmBookingBtn) return;
        if (show) {
            loadingOverlay.classList.add('active');
            loadingOverlay.setAttribute('aria-hidden', 'false');
            confirmBookingBtn.disabled = true;
            confirmBookingBtn.innerHTML = `<span>⏳</span> Confirming Ride...`;
            confirmBookingBtn.style.pointerEvents = 'none';
        } else {
            loadingOverlay.classList.remove('active');
            loadingOverlay.setAttribute('aria-hidden', 'true');
            confirmBookingBtn.disabled = false;
            confirmBookingBtn.innerHTML = `Confirm Booking`;
            confirmBookingBtn.style.pointerEvents = '';
        }
    };

    // ----------------------------------------------------
    // FARE CARD RENDERING (NO FAKE / DEFAULT VALUES)
    // ----------------------------------------------------
    function renderFareCard(state, message) {
        if (!distanceVal || !etaVal || !baseFareVal || !distanceFareVal || !taxesVal || !totalFareVal) {
            return;
        }

        if (state === 'placeholder') {
            isFareRateLimited = false;
            distanceVal.innerText = '—';
            etaVal.innerText = '—';
            baseFareVal.innerText = '—';
            distanceFareVal.innerText = '—';
            taxesVal.innerText = '—';
            totalFareVal.innerText = '—';
            if (discountFareRow) discountFareRow.style.display = 'none';
            if (fareStatusBadge) fareStatusBadge.innerText = 'Select Route for Live Fare';

            vehicleItems.forEach(item => {
                const priceSpan = item.querySelector('.price');
                if (priceSpan) priceSpan.innerText = '₹ --';
            });
            return;
        }

        if (state === 'calculating') {
            isFareRateLimited = false;
            if (fareStatusBadge) fareStatusBadge.innerText = '⏳ Calculating Server Fare...';
            totalFareVal.innerText = 'Calculating...';
            return;
        }

        if (state === 'error') {
            distanceVal.innerText = currentDistance ? `${currentDistance.toFixed(1)} KM` : '—';
            etaVal.innerText = currentDuration ? `${Math.ceil(currentDuration)} Mins` : '—';
            baseFareVal.innerText = '—';
            distanceFareVal.innerText = '—';
            taxesVal.innerText = '—';
            totalFareVal.innerText = '—';
            if (fareStatusBadge) fareStatusBadge.innerText = message || '⚠️ Fare Unavailable';
            return;
        }

        if (state === 'ready' && currentServerFare) {
            isFareRateLimited = false;
            distanceVal.innerText = `${currentDistance.toFixed(1)} KM`;
            etaVal.innerText = `${Math.ceil(currentDuration)} Mins`;
            baseFareVal.innerText = `₹${Number(currentServerFare.baseFare || 0).toFixed(2)}`;
            distanceFareVal.innerText = `₹${Number(currentServerFare.distanceFare || 0).toFixed(2)}`;

            // Taxes & fees include GST + platform fee + booking fee
            const feesAndTaxes = Number(currentServerFare.gstAmount || 0) +
                                 Number(currentServerFare.platformFee || 0) +
                                 Number(currentServerFare.bookingFee || 0);
            taxesVal.innerText = `₹${feesAndTaxes.toFixed(2)}`;

            if (appliedDiscount > 0) {
                if (discountFareRow) discountFareRow.style.display = 'flex';
                if (discountVal) discountVal.innerText = `-₹${appliedDiscount.toFixed(2)}`;
            } else {
                if (discountFareRow) discountFareRow.style.display = 'none';
            }

            const finalCalculated = Math.max(0, (currentServerFare.finalFare || 0) - appliedDiscount);
            totalFareVal.innerText = `₹${finalCalculated.toFixed(2)}`;
            if (fareStatusBadge) fareStatusBadge.innerText = '✓ Live Server Pricing';
        }
    }

    // ----------------------------------------------------
    // REAL AUTHORITATIVE SERVER FARE CALCULATION
    // ----------------------------------------------------

    // Helper to ensure a vehicle card is selected
    function ensureVehicleSelection() {
        let activeItem = document.querySelector('.vehicles-list .vehicle-item.active');
        if (!activeItem && vehicleItems.length > 0) {
            activeItem = vehicleItems[0];
            activeItem.classList.add('active');
            activeItem.setAttribute('aria-checked', 'true');
        }
        if (activeItem) {
            selectedVehicleType = activeItem.dataset.type || 'bike';
        }
    }

    // Calculate fare for a specific backend vehicle type (BIKE, AUTO, CAR, SUV)
    function calculateVehicleFare(backendType, plat, plng, dlat, dlng, routeKey) {
        const requestKey = `${routeKey}:${backendType}`;

        // Deduplication 1: Cache Hit Check
        if (fareCache.has(requestKey)) {
            const cachedData = fareCache.get(requestKey);
            const currentSelectedBackend = VEHICLE_MAP[selectedVehicleType] || "CAR";
            if (currentSelectedBackend === backendType) {
                currentServerFare = cachedData;
                isFareRateLimited = false;
                renderFareCard('ready');
                if (appliedCouponCode) {
                    revalidateAppliedCoupon();
                }
            }
            return Promise.resolve(cachedData);
        }

        // Deduplication 2: In-Flight Request Check
        if (inFlightFarePromises.has(requestKey)) {
            return inFlightFarePromises.get(requestKey);
        }

        const thisRequestId = ++fareRequestId;

        const reqPromise = (async () => {
            try {
                const api = (window.GoRide && window.GoRide.api);
                const endpoint = "/api/fare/calculate";
                const payload = {
                    city: (window.APP_CONFIG && window.APP_CONFIG.BACKEND_CITY) || "DEFAULT",
                    vehicleType: backendType,
                    pickupLatitude: parseFloat(plat),
                    pickupLongitude: parseFloat(plng),
                    destinationLatitude: parseFloat(dlat),
                    destinationLongitude: parseFloat(dlng)
                };

                const response = await api.request(endpoint, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                if (response && response.success && response.data) {
                    fareCache.set(requestKey, response.data);
                    isFareRateLimited = false;

                    // Immediately update vehicle cards matching this backend type
                    vehicleItems.forEach(item => {
                        const type = item.dataset.type;
                        if ((VEHICLE_MAP[type] || "CAR") === backendType) {
                            const priceSpan = item.querySelector('.price');
                            if (priceSpan) {
                                priceSpan.innerText = `₹${Math.round(response.data.finalFare || response.data.estimatedFare || 0)}`;
                            }
                        }
                    });

                    // If this corresponds to the currently selected vehicle, update active fare breakdown
                    const currentSelectedBackend = VEHICLE_MAP[selectedVehicleType] || "CAR";
                    if (currentSelectedBackend === backendType) {
                        currentServerFare = response.data;
                        renderFareCard('ready');
                        if (appliedCouponCode) {
                            await revalidateAppliedCoupon();
                        }
                    }
                    return response.data;
                } else {
                    throw new Error((response && response.message) || "Fare calculation error");
                }
            } catch (err) {
                console.error(`Authoritative server fare calculation failed for ${backendType}:`, err);
                const isRateLimit = err.status === 429 || (err.message && err.message.toLowerCase().includes('too many'));
                if (isRateLimit) {
                    isFareRateLimited = true;
                }
                const currentSelectedBackend = VEHICLE_MAP[selectedVehicleType] || "CAR";
                if (currentSelectedBackend === backendType) {
                    currentServerFare = null;
                    const userMessage = isRateLimit
                        ? "Fare estimates are temporarily limited. Please wait a moment and try again."
                        : (err.message || 'Fare calculation unavailable');
                    renderFareCard('error', userMessage);
                }
                throw err;
            } finally {
                inFlightFarePromises.delete(requestKey);
                performLiveValidation();
            }
        })();

        inFlightFarePromises.set(requestKey, reqPromise);
        return reqPromise;
    }

    // Fast parallel fare fetching for all vehicle types on the current route
    async function calculateAllVehicleFares() {
        const plat = pickupInput?.dataset?.lat;
        const plng = pickupInput?.dataset?.lng;
        const dlat = dropoffInput?.dataset?.lat;
        const dlng = dropoffInput?.dataset?.lng;

        if (!plat || !plng || !dlat || !dlng || currentDistance === null || currentDistance <= 0) {
            currentServerFare = null;
            renderFareCard('placeholder');
            performLiveValidation();
            return;
        }

        const routeKey = getRouteKey();
        if (!routeKey) {
            currentServerFare = null;
            renderFareCard('placeholder');
            performLiveValidation();
            return;
        }

        ensureVehicleSelection();

        // Show pending indicator on cards that do not yet have cached prices
        vehicleItems.forEach(item => {
            const type = item.dataset.type;
            const bType = VEHICLE_MAP[type] || "CAR";
            const key = `${routeKey}:${bType}`;
            const priceSpan = item.querySelector('.price');
            if (priceSpan) {
                if (fareCache.has(key)) {
                    const cached = fareCache.get(key);
                    priceSpan.innerText = `₹${Math.round(cached.finalFare || cached.estimatedFare || 0)}`;
                } else {
                    priceSpan.innerText = '₹ ...';
                }
            }
        });

        const activeBackend = VEHICLE_MAP[selectedVehicleType] || "CAR";
        const activeKey = `${routeKey}:${activeBackend}`;
        if (fareCache.has(activeKey)) {
            currentServerFare = fareCache.get(activeKey);
            isFareRateLimited = false;
            renderFareCard('ready');
        } else {
            renderFareCard('calculating');
        }

        // Controlled parallel execution using Promise.allSettled across unique backend vehicle types
        const requests = UNIQUE_BACKEND_VEHICLE_TYPES.map(bType =>
            calculateVehicleFare(bType, plat, plng, dlat, dlng, routeKey)
        );

        await Promise.allSettled(requests);
        updateVehicleListPrices();
        performLiveValidation();
    }

    // Authoritative single-vehicle fare recalculation (instant cache lookup or targeted request)
    async function calculateServerFare() {
        const plat = pickupInput?.dataset?.lat;
        const plng = pickupInput?.dataset?.lng;
        const dlat = dropoffInput?.dataset?.lat;
        const dlng = dropoffInput?.dataset?.lng;

        if (!plat || !plng || !dlat || !dlng || currentDistance === null || currentDistance <= 0) {
            currentServerFare = null;
            renderFareCard('placeholder');
            performLiveValidation();
            return;
        }

        const routeKey = getRouteKey();
        if (!routeKey) {
            currentServerFare = null;
            renderFareCard('placeholder');
            performLiveValidation();
            return;
        }

        const backendVehicle = VEHICLE_MAP[selectedVehicleType] || "CAR";
        const requestKey = `${routeKey}:${backendVehicle}`;

        if (fareCache.has(requestKey)) {
            currentServerFare = fareCache.get(requestKey);
            isFareRateLimited = false;
            renderFareCard('ready');
            updateVehicleListPrices();
            if (appliedCouponCode) {
                await revalidateAppliedCoupon();
            }
            performLiveValidation();
            return;
        }

        return calculateVehicleFare(backendVehicle, plat, plng, dlat, dlng, routeKey);
    }

    // Update displayed prices on vehicle cards from cache or active fare (0 network requests)
    function updateVehicleListPrices() {
        const routeKey = getRouteKey();
        if (!routeKey) return;

        vehicleItems.forEach(item => {
            const type = item.dataset.type;
            const bType = VEHICLE_MAP[type] || "CAR";
            const itemKey = `${routeKey}:${bType}`;
            const priceSpan = item.querySelector('.price');
            if (priceSpan) {
                if (fareCache.has(itemKey)) {
                    const cachedFare = fareCache.get(itemKey);
                    priceSpan.innerText = `₹${Math.round(cachedFare.finalFare || cachedFare.estimatedFare || 0)}`;
                } else if (item.classList.contains('active') && currentServerFare) {
                    priceSpan.innerText = `₹${Math.round(currentServerFare.finalFare || currentServerFare.estimatedFare || 0)}`;
                } else if (inFlightFarePromises.has(itemKey)) {
                    priceSpan.innerText = '₹ ...';
                } else {
                    priceSpan.innerText = '₹ --';
                }
            }
        });
    }

    // ----------------------------------------------------
    // REAL COUPON VALIDATION WITH BACKEND (AUTHORITATIVE SERVER-SIDE)
    // ----------------------------------------------------
    async function validateAndApplyCoupon() {
        const code = sanitizeInput(couponInput.value).toUpperCase();
        couponMessage.className = "coupon-msg";

        // CASE E: Apply with empty field -> Do NOT call coupon API. Show no error. Coupon remains optional.
        if (!code) {
            hasCouponError = false;
            appliedDiscount = 0;
            appliedCouponCode = "";
            couponMessage.innerText = "";
            couponMessage.className = "coupon-msg";
            renderFareCard('ready');
            performLiveValidation();
            return;
        }

        if (!currentServerFare) {
            hasCouponError = true;
            couponMessage.innerText = "Please select a pickup and drop-off route first.";
            couponMessage.classList.add('error');
            performLiveValidation();
            return;
        }

        const api = (window.GoRide && window.GoRide.api);
        if (!api || !api.isAuthenticated()) {
            hasCouponError = true;
            couponMessage.innerText = "Please sign in to apply coupon discounts.";
            couponMessage.classList.add('error');
            window.GoRide.showToast("Please log in to apply promo codes.", "info");
            performLiveValidation();
            return;
        }

        try {
            applyCouponBtn.disabled = true;
            applyCouponBtn.innerText = "Checking...";

            const res = await api.post("/api/coupons/validate", {
                code: code,
                rideFare: Number(currentServerFare.finalFare || currentServerFare.estimatedFare || 0)
            });

            if (res && res.success && res.data) {
                appliedDiscount = Math.round(res.data.discountAmount || 0);
                appliedCouponCode = code;
                hasCouponError = false;
                couponMessage.innerText = `✓ Promo ${code} applied! Saved ₹${appliedDiscount}.`;
                couponMessage.classList.add('success');
                window.GoRide.showToast(`Coupon ${code} applied successfully!`, "success");
                renderFareCard('ready');
            } else {
                throw new Error((res && res.message) || "Invalid coupon code.");
            }
        } catch (err) {
            // CASE C: Invalid coupon -> show error and block booking while invalid coupon remains active
            appliedDiscount = 0;
            appliedCouponCode = "";
            hasCouponError = true;
            const msg = err.message || "Invalid promo code.";
            couponMessage.innerText = msg;
            couponMessage.classList.add('error');
            window.GoRide.showToast(msg, "error");
            renderFareCard('ready');
        } finally {
            applyCouponBtn.disabled = false;
            applyCouponBtn.innerText = "Apply";
            performLiveValidation();
        }
    }

    async function revalidateAppliedCoupon() {
        if (!appliedCouponCode || !currentServerFare) return;
        const api = (window.GoRide && window.GoRide.api);
        if (!api || !api.isAuthenticated()) {
            appliedDiscount = 0;
            appliedCouponCode = "";
            hasCouponError = false;
            return;
        }

        try {
            const res = await api.post("/api/coupons/validate", {
                code: appliedCouponCode,
                rideFare: Number(currentServerFare.finalFare || 0)
            });
            if (res && res.success && res.data) {
                appliedDiscount = Math.round(res.data.discountAmount || 0);
                hasCouponError = false;
            } else {
                appliedDiscount = 0;
                appliedCouponCode = "";
                hasCouponError = true;
                couponMessage.innerText = "Coupon no longer applies to this updated route.";
                couponMessage.className = "coupon-msg error";
            }
        } catch (e) {
            appliedDiscount = 0;
            appliedCouponCode = "";
            hasCouponError = true;
            couponMessage.innerText = e.message || "Coupon no longer valid.";
            couponMessage.className = "coupon-msg error";
        } finally {
            performLiveValidation();
        }
    }

    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', validateAndApplyCoupon);
    }

    if (couponInput) {
        couponInput.addEventListener('input', () => {
            const currentVal = couponInput.value.trim().toUpperCase();
            // CASE D: User clears or modifies the coupon -> immediately clear error and restore normal booking
            if (!currentVal) {
                hasCouponError = false;
                appliedDiscount = 0;
                appliedCouponCode = "";
                couponMessage.innerText = "";
                couponMessage.className = "coupon-msg";
                renderFareCard('ready');
                performLiveValidation();
            } else if (appliedCouponCode && currentVal !== appliedCouponCode) {
                appliedDiscount = 0;
                appliedCouponCode = "";
                hasCouponError = false;
                couponMessage.innerText = "";
                couponMessage.className = "coupon-msg";
                renderFareCard('ready');
                performLiveValidation();
            } else if (hasCouponError) {
                hasCouponError = false;
                couponMessage.innerText = "";
                couponMessage.className = "coupon-msg";
                performLiveValidation();
            }
        });

        // Allow pressing Enter in coupon input to trigger Apply
        couponInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                validateAndApplyCoupon();
            }
        });
    }

    // Connect Find Available Rides button
    if (findRidesBtn) {
        findRidesBtn.addEventListener('click', () => {
            const plat = pickupInput?.dataset?.lat;
            const dlat = dropoffInput?.dataset?.lat;
            if (!plat || !dlat) {
                window.GoRide.showToast("Please select both pickup and drop-off locations.", "info");
                if (!plat) pickupInput.focus();
                else dropoffInput.focus();
                return;
            }
            checkAndTriggerRoute();
            const vehicleSec = document.querySelector('.vehicle-selection-container');
            if (vehicleSec) {
                vehicleSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // ----------------------------------------------------
    // LIVE VALIDATION & BUTTON STATE
    // ----------------------------------------------------
    function performLiveValidation() {
        const sanitizePickup = sanitizeInput(pickupInput.value);
        const sanitizeDrop = sanitizeInput(dropoffInput.value);
        const api = (window.GoRide && window.GoRide.api);
        const isAuth = Boolean(api && api.isAuthenticated());

        const plat = pickupInput.dataset.lat;
        const plng = pickupInput.dataset.lng;
        const dlat = dropoffInput.dataset.lat;
        const dlng = dropoffInput.dataset.lng;

        const hasValidCoords = Boolean(plat && plng && dlat && dlng);
        const hasValidRoute = Boolean(currentDistance && currentDistance > 0 && currentDuration !== null);
        const hasValidFare = Boolean(currentServerFare && currentServerFare.finalFare > 0);
        const hasSelectedVehicle = Boolean(selectedVehicleType && VEHICLE_MAP[selectedVehicleType]);
        const selectedPayment = document.querySelector('input[name="payment"]:checked')?.value;
        const hasValidPayment = Boolean(selectedPayment);

        // In "Ride Now" mode, keep date and time inputs fresh to avoid past-time validation failures during user interaction
        if (bookingMode === 'now' && dateInput && timeInput) {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            dateInput.value = `${yyyy}-${mm}-${dd}`;
            timeInput.value = `${hh}:${min}`;
        }

        const data = {
            pickup: sanitizePickup,
            drop: sanitizeDrop,
            date: dateInput.value,
            time: timeInput.value,
            passengers: passengerInput.value,
            rideType: selectedVehicleType,
            pickupCoords: hasValidCoords ? { lat: parseFloat(plat), lng: parseFloat(plng) } : null,
            dropCoords: hasValidCoords ? { lat: parseFloat(dlat), lng: parseFloat(dlng) } : null
        };

        const result = window.GoRide.validateBooking ? window.GoRide.validateBooking(data) : { valid: true };

        // Confirm booking requirements strictly enforced:
        // Authenticated + valid pickup & drop + valid coords + valid route + vehicle selected + valid server fare + payment selected + valid form
        // NOTE: Coupon is 100% OPTIONAL. A user without coupon can book normally.
        // Booking is only blocked if an INVALID coupon is actively entered.
        const isAllReady = isAuth &&
                           hasValidCoords &&
                           hasValidRoute &&
                           hasSelectedVehicle &&
                           hasValidFare &&
                           hasValidPayment &&
                           result.valid &&
                           !hasCouponError &&
                           !isFareRateLimited;

        if (!isAuth) {
            confirmBookingBtn.disabled = true;
            confirmBookingBtn.innerHTML = `<span>🔒</span> Log In to Confirm Booking`;
        } else if (hasCouponError) {
            confirmBookingBtn.disabled = true;
            confirmBookingBtn.innerHTML = `Invalid Promo Code Entered`;
        } else if (isFareRateLimited) {
            confirmBookingBtn.disabled = true;
            confirmBookingBtn.innerHTML = `Please Wait Before Retrying`;
        } else if (isAllReady) {
            confirmBookingBtn.disabled = false;
            confirmBookingBtn.innerHTML = `<span>✓</span> Confirm Booking`;
        } else {
            confirmBookingBtn.disabled = true;
            if (!hasValidCoords || !hasValidRoute) {
                confirmBookingBtn.innerHTML = `Select Route to Continue`;
            } else if (!hasSelectedVehicle) {
                confirmBookingBtn.innerHTML = `Select a Vehicle`;
            } else if (!hasValidFare) {
                confirmBookingBtn.innerHTML = `Calculating Fare...`;
            } else if (!hasValidPayment) {
                confirmBookingBtn.innerHTML = `Select Payment Method`;
            } else if (!result.valid) {
                confirmBookingBtn.innerHTML = result.message || `Complete Booking Details`;
            } else {
                confirmBookingBtn.innerHTML = `<span>✓</span> Confirm Booking`;
            }
        }
        updateStepper();
    }

    function updateStepper() {
        const plat = pickupInput?.dataset?.lat;
        const dlat = dropoffInput?.dataset?.lat;
        const steps = document.querySelectorAll('.booking-stepper .step-item');
        if (!steps || steps.length < 3) return;

        steps.forEach(s => s.classList.remove('active', 'completed'));

        if (currentServerFare && currentServerFare.finalFare > 0) {
            steps[0].classList.add('completed');
            steps[1].classList.add('completed');
            steps[2].classList.add('active');
        } else if (plat && dlat) {
            steps[0].classList.add('completed');
            steps[1].classList.add('active');
        } else {
            steps[0].classList.add('active');
        }
    }

    // ----------------------------------------------------
    // ROUTE TRIGGER & MAP INTEGRATION
    // ----------------------------------------------------
    function checkAndTriggerRoute() {
        const plat = pickupInput.dataset.lat;
        const plng = pickupInput.dataset.lng;
        const dlat = dropoffInput.dataset.lat;
        const dlng = dropoffInput.dataset.lng;

        if (plat && plng && dlat && dlng) {
            const coordKey = `${plat},${plng}->${dlat},${dlng}`;
            // If already routed for these exact coordinates and we have a route, don't re-draw
            if (lastCalculatedRouteCoords === coordKey && currentDistance && currentDistance > 0) {
                if (currentServerFare || inFlightFarePromises.size > 0) {
                    performLiveValidation();
                    return;
                }
            }
            lastCalculatedRouteCoords = coordKey;
            fareCache.clear();
            inFlightFarePromises.clear();
            const pickupCoords = { lat: parseFloat(plat), lng: parseFloat(plng) };
            const dropCoords = { lat: parseFloat(dlat), lng: parseFloat(dlng) };
            if (window.MapProvider && window.MapProvider.drawRoute) {
                window.MapProvider.drawRoute(pickupCoords, dropCoords);
            }
        } else {
            lastCalculatedRouteCoords = null;
            fareCache.clear();
            inFlightFarePromises.clear();
            currentDistance = null;
            currentDuration = null;
            currentServerFare = null;
            renderFareCard('placeholder');
            if (window.MapProvider && window.MapProvider.clearRoute) {
                window.MapProvider.clearRoute();
            }
            performLiveValidation();
        }
    }

    // Reset inputs, indicators and totals
    window.GoRide.utils.resetBooking = function() {
        bookingForm.reset();
        couponInput.value = "";
        couponMessage.innerText = "";
        couponMessage.className = "coupon-msg";
        appliedDiscount = 0;
        appliedCouponCode = "";
        hasCouponError = false;
        fareCache.clear();
        inFlightFarePromises.clear();
        lastCalculatedRouteCoords = null;
        isFareRateLimited = false;
        currentDistance = null;
        currentDuration = null;
        currentServerFare = null;
        selectedVehicleType = 'bike';
        bookingMode = 'now';

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

        // Reset booking toggle
        toggleButtons.forEach((b, index) => {
            if (index === 0) {
                b.classList.add('active');
                b.setAttribute('aria-selected', 'true');
            } else {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            }
        });

        initDateLimits();
        renderFareCard('placeholder');

        const summaryPickup = document.getElementById('summary-pickup-text');
        if (summaryPickup) summaryPickup.textContent = 'Select pickup point';
        const summaryDrop = document.getElementById('summary-dropoff-text');
        if (summaryDrop) summaryDrop.textContent = 'Select destination';

        performLiveValidation();

        if (window.MapProvider && window.MapProvider.clearRoute) {
            window.MapProvider.clearRoute();
        }
    };

    // Debounce wrapper
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
        if (window.MapProvider && window.MapProvider.init) {
            window.MapProvider.init();
        }
        initDateLimits();
        renderFareCard('placeholder');
        performLiveValidation();
    });

    // Register map callbacks
    if (window.MapProvider) {
        window.MapProvider.registerRouteCalculated((distance, duration) => {
            currentDistance = distance;
            currentDuration = duration;
            if (window.MapProvider.invalidateSize) {
                window.MapProvider.invalidateSize();
            }
            ensureVehicleSelection();
            calculateAllVehicleFares();
        });

        window.MapProvider.registerRouteCleared(() => {
            currentDistance = null;
            currentDuration = null;
            currentServerFare = null;
            renderFareCard('placeholder');
            performLiveValidation();
        });

        window.addEventListener('resize', debounce(() => {
            if (window.MapProvider.invalidateSize) {
                window.MapProvider.invalidateSize();
            }
        }, 200));
    }

    // Current Location Geolocation Handler
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', () => {
            currentLocationBtn.classList.add('loading');
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        
                        pickupInput.value = "Current Location";
                        pickupInput.dataset.lat = lat;
                        pickupInput.dataset.lng = lng;
                        pickupInput.dataset.address = "My Current Location, Varanasi";
                        pickupInput.dataset.placeId = `geoloc-${Date.now()}`;

                        currentLocationBtn.classList.remove('loading');
                        window.GoRide.showToast("Current location detected!", "success");

                        if (window.MapProvider && window.MapProvider.addMarker) {
                            window.MapProvider.addMarker(lat, lng, 'pickup');
                        }

                        const summaryPickup = document.getElementById('summary-pickup-text');
                        if (summaryPickup) summaryPickup.textContent = pickupInput.value;

                        checkAndTriggerRoute();
                        performLiveValidation();
                    },
                    (error) => {
                        // Fallback Varanasi Cantt Junction
                        pickupInput.value = "Varanasi Junction, Varanasi";
                        pickupInput.dataset.lat = 25.3263;
                        pickupInput.dataset.lng = 82.9866;
                        pickupInput.dataset.address = "Varanasi Junction, Cantt, Varanasi, Uttar Pradesh";
                        pickupInput.dataset.placeId = "cantt-fallback";

                        currentLocationBtn.classList.remove('loading');
                        window.GoRide.showToast("Location access denied. Using Varanasi Cantt.", "info");

                        if (window.MapProvider && window.MapProvider.addMarker) {
                            window.MapProvider.addMarker(25.3263, 82.9866, 'pickup');
                        }

                        const summaryPickup = document.getElementById('summary-pickup-text');
                        if (summaryPickup) summaryPickup.textContent = pickupInput.value;

                        checkAndTriggerRoute();
                        performLiveValidation();
                    }
                );
            } else {
                currentLocationBtn.classList.remove('loading');
                window.GoRide.showToast("Geolocation is not supported by your browser.", "error");
            }
        });
    }

    // Autocomplete dropdown UI
    function showSuggestions(results, inputEl, listEl) {
        listEl.innerHTML = '';
        if (!results || results.length === 0) {
            listEl.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--color-text-secondary); font-size: 0.85rem;">No locations found.</li>';
            listEl.style.display = 'block';
            return;
        }

        results.forEach((item, idx) => {
            const li = document.createElement('li');
            li.role = "option";
            li.id = `${inputEl.id}-opt-${idx}`;
            li.className = 'suggestion-item';

            li.innerHTML = `
                <span style="margin-right:8px; font-size:1rem; flex-shrink:0; line-height:1.2;">📍</span>
                <div style="text-align: left; min-width:0; flex:1; overflow:hidden;">
                    <strong style="font-size:0.88rem; color:var(--color-text-primary); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</strong>
                    <small style="color:var(--color-text-secondary); font-size:0.75rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.35; margin-top:2px;">${item.address}</small>
                </div>
            `;

            li.addEventListener('click', () => {
                selectPlace(item, inputEl, listEl);
            });
            listEl.appendChild(li);
        });

        listEl.style.display = 'block';
    }

    function selectPlace(item, inputEl, listEl) {
        inputEl.dataset.lat = item.lat;
        inputEl.dataset.lng = item.lng;
        inputEl.dataset.placeId = item.placeId;
        inputEl.dataset.address = item.address;
        inputEl.value = item.name;

        listEl.style.display = 'none';

        const type = inputEl.id === 'pickup-input' ? 'pickup' : 'dropoff';
        if (window.MapProvider && window.MapProvider.addMarker) {
            window.MapProvider.addMarker(item.lat, item.lng, type);
        }

        if (type === 'pickup') {
            const summaryPickup = document.getElementById('summary-pickup-text');
            if (summaryPickup) summaryPickup.textContent = item.name || item.address;
        } else {
            const summaryDrop = document.getElementById('summary-dropoff-text');
            if (summaryDrop) summaryDrop.textContent = item.name || item.address;
        }

        checkAndTriggerRoute();
        performLiveValidation();
    }

    // Autocomplete keyboard support
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

    if (pickupInput && pickupSuggestions) setupKeyboardAutocomplete(pickupInput, pickupSuggestions);
    if (dropoffInput && dropoffSuggestions) setupKeyboardAutocomplete(dropoffInput, dropoffSuggestions);

    // Debounced searches
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
            return;
        }

        pickupSuggestions.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--color-text-secondary); font-size: 0.85rem;">⏳ Searching locations...</li>';
        pickupSuggestions.style.display = 'block';

        if (window.MapProvider && window.MapProvider.searchPlaces) {
            window.MapProvider.searchPlaces(query, (err, results) => {
                if (err) {
                    pickupSuggestions.innerHTML = '<li class="info-item" style="padding: 10px; color: #DC2626; font-size: 0.85rem;">⚠️ Unable to fetch locations.</li>';
                    return;
                }
                showSuggestions(results, pickupInput, pickupSuggestions);
            });
        }
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
            return;
        }

        dropoffSuggestions.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--color-text-secondary); font-size: 0.85rem;">⏳ Searching locations...</li>';
        dropoffSuggestions.style.display = 'block';

        if (window.MapProvider && window.MapProvider.searchPlaces) {
            window.MapProvider.searchPlaces(query, (err, results) => {
                if (err) {
                    dropoffSuggestions.innerHTML = '<li class="info-item" style="padding: 10px; color: #DC2626; font-size: 0.85rem;">⚠️ Unable to fetch locations.</li>';
                    return;
                }
                showSuggestions(results, dropoffInput, dropoffSuggestions);
            });
        }
    }, 300);

    pickupInput.addEventListener('input', triggerPickupSearch);
    dropoffInput.addEventListener('input', triggerDropoffSearch);

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (pickupSuggestions && e.target !== pickupInput) pickupSuggestions.style.display = 'none';
        if (dropoffSuggestions && e.target !== dropoffInput) dropoffSuggestions.style.display = 'none';
    });

    // Pickers Validation trigger
    dateInput.addEventListener('input', performLiveValidation);
    timeInput.addEventListener('input', performLiveValidation);

    // Booking Mode Toggles (Ride Now vs Schedule)
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            bookingMode = btn.dataset.type || 'now';
            window.GoRide.showToast(`Booking mode: ${btn.innerText}`, "info");
            performLiveValidation();
        });
    });

    // Passengers Counter
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
        item.addEventListener('click', () => selectVehicle(item));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectVehicle(item);
            }
        });
    });

    // Debounced vehicle selection to prevent request storms on rapid clicks (250ms)
    const debouncedCalculateServerFare = debounce(() => {
        calculateServerFare();
    }, 250);

    function selectVehicle(item) {
        vehicleItems.forEach(v => {
            v.classList.remove('active');
            v.setAttribute('aria-checked', 'false');
        });
        item.classList.add('active');
        item.setAttribute('aria-checked', 'true');
        selectedVehicleType = item.dataset.type;

        const routeKey = getRouteKey();
        const backendVehicle = VEHICLE_MAP[selectedVehicleType] || "CAR";
        const requestKey = routeKey ? `${routeKey}:${backendVehicle}` : null;

        // If this vehicle fare is already cached, apply immediately with 0 delay (0 network calls)!
        if (requestKey && fareCache.has(requestKey)) {
            currentServerFare = fareCache.get(requestKey);
            isFareRateLimited = false;
            renderFareCard('ready');
            updateVehicleListPrices();
            if (appliedCouponCode) {
                revalidateAppliedCoupon();
            }
            performLiveValidation();
        } else if (requestKey && inFlightFarePromises.has(requestKey)) {
            renderFareCard('calculating');
            performLiveValidation();
        } else if (routeKey && currentDistance && currentDistance > 0) {
            renderFareCard('calculating');
            debouncedCalculateServerFare();
        } else {
            renderFareCard('placeholder');
            performLiveValidation();
        }
    }

    // Payment Selection Highlights
    paymentOptions.forEach(opt => {
        opt.addEventListener('change', () => {
            paymentOptions.forEach(o => {
                const parent = o.closest('.payment-option');
                if (parent) parent.classList.remove('active');
            });
            if (opt.checked) {
                const parent = opt.closest('.payment-option');
                if (parent) parent.classList.add('active');
            }
            performLiveValidation();
        });
    });

    // ----------------------------------------------------
    // REAL BOOKING SUBMISSION TO BACKEND
    // ----------------------------------------------------
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        const api = (window.GoRide && window.GoRide.api);
        if (!api || !api.isAuthenticated()) {
            window.GoRide.showToast("Please log in to confirm your ride.", "error");
            setTimeout(() => {
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `login.html?returnUrl=${returnUrl}`;
            }, 1000);
            return;
        }

        const sanitizedPickup = sanitizeInput(pickupInput.value);
        const sanitizedDrop = sanitizeInput(dropoffInput.value);
        pickupInput.value = sanitizedPickup;
        dropoffInput.value = sanitizedDrop;

        const plat = pickupInput.dataset.lat;
        const plng = pickupInput.dataset.lng;
        const dlat = dropoffInput.dataset.lat;
        const dlng = dropoffInput.dataset.lng;

        if (!plat || !plng || !dlat || !dlng) {
            window.GoRide.showToast("Please select valid pickup and drop-off locations from the suggestions.", "error");
            return;
        }

        if (!currentServerFare || currentDistance === null || currentDistance <= 0) {
            window.GoRide.showToast("Please wait for the route and live fare to be calculated.", "error");
            return;
        }

        const pickupCoords = { lat: parseFloat(plat), lng: parseFloat(plng) };
        const dropCoords = { lat: parseFloat(dlat), lng: parseFloat(dlng) };

        const isSchedule = bookingMode === 'schedule';
        let scheduledForIso = null;

        if (isSchedule) {
            const scheduledDateTime = new Date(`${dateInput.value}T${timeInput.value}`);
            const minScheduleTime = new Date(Date.now() + 15 * 60 * 1000); // min 15 mins
            if (scheduledDateTime < minScheduleTime) {
                window.GoRide.showToast("Scheduled rides must be at least 15 minutes in advance.", "error");
                timeInput.focus();
                return;
            }
            scheduledForIso = scheduledDateTime.toISOString();
        }

        const backendVehicle = VEHICLE_MAP[selectedVehicleType] || "CAR";

        isSubmitting = true;
        window.GoRide.utils.toggleLoading(true);
        if (progressFill) progressFill.style.width = '30%';

        try {
            const ridePayload = {
                pickup: sanitizedPickup,
                pickupLatitude: pickupCoords.lat,
                pickupLongitude: pickupCoords.lng,
                destination: sanitizedDrop,
                destinationLatitude: dropCoords.lat,
                destinationLongitude: dropCoords.lng,
                vehicleType: backendVehicle,
                city: (window.APP_CONFIG && window.APP_CONFIG.BACKEND_CITY) || "DEFAULT",
                couponCode: appliedCouponCode ? appliedCouponCode : null,
                isScheduled: isSchedule,
                scheduledFor: scheduledForIso
            };

            if (progressFill) progressFill.style.width = '70%';

            const res = await api.post("/api/rides", ridePayload);

            if (res && res.success && res.data) {
                if (progressFill) progressFill.style.width = '100%';
                const createdRide = res.data;

                // Stop loader
                window.GoRide.utils.toggleLoading(false);

                // Populate real authoritative Booking ID
                const shortId = `GR-${String(createdRide.id).slice(-8).toUpperCase()}`;
                if (bookingIdVal) bookingIdVal.innerText = shortId;

                // Track ride button links directly to real ride tracking page
                if (trackRideBtn) {
                    trackRideBtn.href = `ride.html?id=${encodeURIComponent(createdRide.id)}`;
                }

                // Save record for dataset ML learning
                if (window.saveBookingRecord) {
                    window.saveBookingRecord({
                        bookingId: createdRide.id,
                        pickup: sanitizedPickup,
                        drop: sanitizedDrop,
                        pickupCoords,
                        dropCoords,
                        distance: currentDistance,
                        duration: currentDuration,
                        vehicle: backendVehicle,
                        fare: currentServerFare.finalFare,
                        discount: appliedDiscount,
                        date: dateInput.value,
                        time: timeInput.value
                    });
                }

                successModal.classList.add('active');
                successModal.setAttribute('aria-hidden', 'false');
                window.GoRide.showToast("Ride Booked Successfully!", "success");
            } else {
                throw new Error((res && res.message) || "Unable to confirm booking.");
            }
        } catch (err) {
            window.GoRide.utils.toggleLoading(false);
            console.error("Booking error:", err);
            const msg = err.message || "Failed to create ride. Please check your details and try again.";
            window.GoRide.showToast(msg, "error");
        } finally {
            isSubmitting = false;
        }
    });

    // Close Modal Reset
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            successModal.classList.remove('active');
            successModal.setAttribute('aria-hidden', 'true');
            window.GoRide.utils.resetBooking();
        });
    }
})();
