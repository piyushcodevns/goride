"use strict";

(function() {
    // ----------------------------------------------------
    // CENTRALIZED APP CONFIGURATION CONSTANTS
    // Authoritative pricing is always calculated by backend /api/fare/calculate
    // ----------------------------------------------------
    window.APP_CONFIG = {
        API_BASE_URL: "https://goride-production-20a0.up.railway.app",
        CITY: "Varanasi",
        BACKEND_CITY: "VARANASI",
        COUNTRY: "IN",
        
        // Varanasi Cantt Center coordinates
        MAP_CENTER: {
            lat: 25.3176,
            lng: 82.9739
        },
        
        DEFAULT_MAP_ZOOM: 13,
        SERVICE_RADIUS_KM: 25, // 25 km geofence service area
        
        // Operational boundary coordinates for full 25km Varanasi service area (including Babatpur Airport & Mughalsarai)
        MAP_BOUNDS: {
            south: 25.12,
            west: 82.72,
            north: 25.52,
            east: 83.22
        },
        
        // External Geocoding & Routing Providers
        API: {
            PHOTON: "https://photon.komoot.io/api",
            NOMINATIM: "https://nominatim.openstreetmap.org",
            OSRM: "https://router.project-osrm.org/route/v1/driving",
            DEBOUNCE_DELAY: 300,
            MIN_CHARS: 2,
            SEARCH_CANDIDATE_LIMIT: 20,
            MAX_SUGGESTIONS: 6
        },
        
        // UI Constants
        UI: {
            TRANSITION_SPEED: 300, // ms (.3s ease)
            MIN_LOADER_DELAY: 800  // matching loader overlay
        }
    };
})();
