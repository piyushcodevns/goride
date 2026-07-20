"use strict";

(function() {
    // ----------------------------------------------------
    // CENTRALIZED APP CONFIGURATION CONSTANTS (V6)
    // ----------------------------------------------------
    window.APP_CONFIG = {
        CITY: "Varanasi",
        COUNTRY: "IN",
        
        // Varanasi Cantt Center coordinates
        MAP_CENTER: {
            lat: 25.3176,
            lng: 82.9739
        },
        
        DEFAULT_MAP_ZOOM: 13,
        SERVICE_RADIUS_KM: 25, // 25 km geofence radius
        
        // Strict boundary coordinates for Varanasi service area
        MAP_BOUNDS: {
            south: 25.22,
            west: 82.85,
            north: 25.40,
            east: 83.10
        },
        
        // Consolidated Fare Matrix
        FARE: {
            bike: { base: 40, perKm: 8 },
            auto: { base: 50, perKm: 10 },
            mini: { base: 70, perKm: 12 },
            sedan: { base: 100, perKm: 16 },
            suv: { base: 150, perKm: 20 }
        },
        
        // Google Maps API credentials & properties
        API: {
            KEY: "YOUR_API_KEY", // Configurable placeholder for Google Cloud API Key
            DEBOUNCE_DELAY: 500,
            MIN_CHARS: 3,
            MAX_SUGGESTIONS: 5,
            THROTTLE_INTERVAL: 1000 // 1 req/sec limit
        },
        
        // UI Constants
        UI: {
            TRANSITION_SPEED: 300, // in ms (.3s ease)
            MIN_LOADER_DELAY: 1000 // min matching loader delay
        }
    };
})();
