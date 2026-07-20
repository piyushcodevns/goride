"use strict";

(function() {
    let map = null;

    window.MapProvider = {
        // Initialize Leaflet Map centered on Varanasi (Step 7)
        init: function() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // Clear any setup warning or previous content
            mapContainer.innerHTML = '';

            map = L.map("map").setView([25.3176, 82.9739], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);
        },

        drawRoute: function(pickupCoords, dropCoords) {
            // Stubbed for Step 8
        },

        clearRoute: function() {
            // Stubbed for Step 8
        },

        validateServiceArea: function(coords) {
            // Stubbed for Step 8
            return true;
        },

        registerRouteCalculated: function(callback) {
            // Stubbed for Step 8
        },

        registerRouteCleared: function(callback) {
            // Stubbed for Step 8
        }
    };
})();
