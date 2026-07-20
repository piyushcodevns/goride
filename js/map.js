"use strict";

(function() {
    let map = null;
    let pickupMarker = null;
    let dropoffMarker = null;
    let activeAbortController = null;

    // Callback listeners registered by booking.js
    let onRouteCalculatedCallback = null;
    let onRouteClearedCallback = null;

    window.MapProvider = {
        // Initialize Leaflet Map centered on Varanasi (Step 7)
        init: function() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // Clear any setup warning or previous content
            mapContainer.innerHTML = '';

            map = L.map("map").setView([
                window.APP_CONFIG.MAP_CENTER.lat,
                window.APP_CONFIG.MAP_CENTER.lng
            ], window.APP_CONFIG.DEFAULT_MAP_ZOOM);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);
        },

        // Photon Search API fetch with Varanasi bias (Step 2)
        searchPlaces: function(query, callback) {
            if (activeAbortController) {
                activeAbortController.abort();
            }

            activeAbortController = new AbortController();
            const signal = activeAbortController.signal;

            // Photon API Query with Varanasi constraint bias
            const searchQuery = `${query.trim()}, Varanasi`;
            const url = `${window.APP_CONFIG.API.PHOTON}?q=${encodeURIComponent(searchQuery)}&limit=${window.APP_CONFIG.API.MAX_SUGGESTIONS}`;

            fetch(url, { signal })
                .then(res => res.json())
                .then(data => {
                    const results = (data.features || []).map(feature => {
                        const props = feature.properties;
                        const mainText = props.name;
                        const secText = [props.street, props.city, props.state].filter(Boolean).join(', ') || "Varanasi, Uttar Pradesh";
                        
                        return {
                            placeId: `photon-${props.osm_id || Math.random()}`,
                            name: mainText,
                            address: `${mainText}, ${secText}`,
                            lat: parseFloat(feature.geometry.coordinates[1]),
                            lng: parseFloat(feature.geometry.coordinates[0])
                        };
                    });
                    callback(null, results);
                })
                .catch(err => {
                    if (err.name === 'AbortError') return;
                    console.error("Photon autocomplete failed:", err);
                    callback(err, null);
                });
        },

        // Add Marker on map (Step 2)
        addMarker: function(lat, lng, type) {
            if (!map) return;

            // Custom Leaflet Marker icon html
            const iconHtml = type === 'pickup' 
                ? `<div style="background:#22C55E; width:12px; height:12px; border:2px solid #FFF; border-radius:50%; box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>`
                : `<div style="background:#EF4444; width:12px; height:12px; border:2px solid #FFF; border-radius:50%; box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>`;

            const markerIcon = L.divIcon({
                className: `custom-leaflet-marker ${type}`,
                html: iconHtml,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            if (type === 'pickup') {
                if (pickupMarker) map.removeLayer(pickupMarker);
                pickupMarker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
            } else {
                if (dropoffMarker) map.removeLayer(dropoffMarker);
                dropoffMarker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
            }

            // Adjust view to fit bounds
            const group = [];
            if (pickupMarker) group.push(pickupMarker.getLatLng());
            if (dropoffMarker) group.push(dropoffMarker.getLatLng());

            if (group.length === 1) {
                map.setView(group[0], 14);
            } else if (group.length > 1) {
                map.fitBounds(L.latLngBounds(group), { padding: [50, 50] });
            }
        },

        // Fetch Driving Route and Draw Polyline
        drawRoute: function(pickupCoords, dropCoords) {
            // Stubbed for Phase 3
        },

        // Clear route polyline layers and markers
        clearRoute: function() {
            if (!map) return;

            if (pickupMarker) {
                map.removeLayer(pickupMarker);
                pickupMarker = null;
            }
            if (dropoffMarker) {
                map.removeLayer(dropoffMarker);
                dropoffMarker = null;
            }

            map.setView([
                window.APP_CONFIG.MAP_CENTER.lat,
                window.APP_CONFIG.MAP_CENTER.lng
            ], window.APP_CONFIG.DEFAULT_MAP_ZOOM);

            if (onRouteClearedCallback) {
                onRouteClearedCallback();
            }
        },

        // Geofence Service Area validation check
        validateServiceArea: function(coords) {
            // Stubbed for Phase 3
            return true;
        },

        registerRouteCalculated: function(callback) {
            onRouteCalculatedCallback = callback;
        },

        registerRouteCleared: function(callback) {
            onRouteClearedCallback = callback;
        }
    };
})();
