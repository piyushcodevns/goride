"use strict";

(function() {
    // Helper to check if string contains only whitespace
    function isSpacesOnly(str) {
        return str.trim().length === 0;
    }

    // Helper to validate date format and boundaries (Min: Today, Max: 90 days)
    function validateDateBounds(dateVal) {
        if (!dateVal) return { valid: false, message: "Date is required." };
        
        const selectedDate = new Date(dateVal);
        // Clear time for date-only comparison
        selectedDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 90);
        maxDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            return { valid: false, message: "Past dates are not allowed." };
        }
        if (selectedDate > maxDate) {
            return { valid: false, message: "Bookings are allowed up to 90 days in advance only." };
        }
        return { valid: true };
    }

    // Helper to validate time is not past today's current time
    function validateTimeBounds(dateVal, timeVal) {
        if (!timeVal) return { valid: false, message: "Time is required." };

        const today = new Date();
        const todayDateStr = today.toISOString().split('T')[0];

        // If date is today, check if time is past
        if (dateVal === todayDateStr) {
            const selectedTimeParts = timeVal.split(':');
            const selectedHour = parseInt(selectedTimeParts[0], 10);
            const selectedMin = parseInt(selectedTimeParts[1], 10);

            const currentHour = today.getHours();
            const currentMin = today.getMinutes();

            if (selectedHour < currentHour || (selectedHour === currentHour && selectedMin < currentMin)) {
                return { valid: false, message: "Past times are not allowed for today's date." };
            }
        }
        return { valid: true };
    }

    window.validateBooking = function(data) {
        const pickup = data.pickup || '';
        const drop = data.drop || '';
        const date = data.date || '';
        const time = data.time || '';
        const passengers = data.passengers;
        const rideType = data.rideType;

        // 1. Required and spaces-only checks
        if (isSpacesOnly(pickup)) {
            return { valid: false, field: 'pickup', message: "Pickup location is required." };
        }
        if (isSpacesOnly(drop)) {
            return { valid: false, field: 'drop', message: "Destination location is required." };
        }

        // 2. Case-insensitive equality check
        if (pickup.trim().toLowerCase() === drop.trim().toLowerCase()) {
            return { valid: false, field: 'drop', message: "Pickup and Drop locations cannot be the same." };
        }

        // 3. Date limits validation
        const dateCheck = validateDateBounds(date);
        if (!dateCheck.valid) {
            return { valid: false, field: 'date', message: dateCheck.message };
        }

        // 4. Time limits validation
        const timeCheck = validateTimeBounds(date, time);
        if (!timeCheck.valid) {
            return { valid: false, field: 'time', message: timeCheck.message };
        }

        // 5. Passengers check
        const passNum = parseInt(passengers, 10);
        if (isNaN(passNum) || passNum < 1 || passNum > 6) {
            return { valid: false, field: 'passengers', message: "Passengers count must be between 1 and 6." };
        }

        // 6. Ride Type check
        if (!rideType) {
            return { valid: false, field: 'rideType', message: "Please select a ride type." };
        }

        // 7. Varanasi Service Area Bounds Validation (Radius check)
        if (data.pickupCoords && window.MapProvider && !window.MapProvider.validateServiceArea(data.pickupCoords)) {
            return { valid: false, field: 'pickup', message: "Currently we only operate inside Varanasi." };
        }
        if (data.dropCoords && window.MapProvider && !window.MapProvider.validateServiceArea(data.dropCoords)) {
            return { valid: false, field: 'drop', message: "Currently we only operate inside Varanasi." };
        }

        return { valid: true };
    };
})();
