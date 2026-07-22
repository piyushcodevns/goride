"use strict";

(function() {
    let map = null;
    let pickupMarker = null;
    let dropoffMarker = null;
    let polylineRoute = null;
    let activeAbortController = null;
    let routingAbortController = null;

    // Callback listeners registered by booking.js
    let onRouteCalculatedCallback = null;
    let onRouteClearedCallback = null;

    // DOM Elements
    const mapLoader = document.getElementById('map-loader');
    const mapRetry = document.getElementById('map-retry');
    const mapOffline = document.getElementById('map-offline');

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

            // Register keyboard autocomplete selectors
            const pickupInput = document.getElementById('pickup-input');
            const pickupSuggestions = document.getElementById('pickup-suggestions');
            const dropoffInput = document.getElementById('dropoff-input');
            const dropoffSuggestions = document.getElementById('dropoff-suggestions');

            if (pickupInput && pickupSuggestions) {
                setupKeyboardAutocomplete(pickupInput, pickupSuggestions);
            }
            if (dropoffInput && dropoffSuggestions) {
                setupKeyboardAutocomplete(dropoffInput, dropoffSuggestions);
            }
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

        // Fetch Driving Route from OSRM and Draw Polyline
        drawRoute: function(pickupCoords, dropCoords) {
            // Validate geofence boundaries (25km service area geofence)
            const pickupValid = this.validateServiceArea(pickupCoords);
            const dropValid = this.validateServiceArea(dropCoords);

            if (!pickupValid || !dropValid) {
                window.showToast("Currently we only operate inside Varanasi.", "error");
                this.clearRoute();
                return;
            }

            if (routingAbortController) {
                routingAbortController.abort();
            }

            routingAbortController = new AbortController();
            const signal = routingAbortController.signal;

            toggleOverlay(mapLoader, true);
            toggleOverlay(mapRetry, false);
            toggleOverlay(mapOffline, false);

            // OSRM expects: {longitude},{latitude};{longitude},{latitude}
            const url = `${window.APP_CONFIG.API.OSRM}/${pickupCoords.lng},${pickupCoords.lat};${dropCoords.lng},${dropCoords.lat}?overview=full&geometries=geojson`;

            fetch(url, { signal })
                .then(res => res.json())
                .then(data => {
                    toggleOverlay(mapLoader, false);
                    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
                        const durationMins = Math.round(route.duration / 60);
                        
                        // Map GeoJSON [lng, lat] coordinates to Leaflet [lat, lng] format
                        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

                        // Render polyline driving line overlay
                        if (polylineRoute) map.removeLayer(polylineRoute);
                        polylineRoute = L.polyline(coordinates, {
                            color: '#2563EB', // Blue route line color
                            weight: 6,
                            opacity: 0.85,
                            lineCap: 'round',
                            lineJoin: 'round'
                        }).addTo(map);

                        // Fit map bounds to show route path
                        map.fitBounds(polylineRoute.getBounds(), { padding: [50, 50] });

                        // Trigger distance/duration change callbacks
                        if (onRouteCalculatedCallback) {
                            onRouteCalculatedCallback(distanceKm, durationMins);
                        }
                    } else {
                        console.error("OSRM Route response failed:", data.code);
                        toggleOverlay(mapRetry, true);
                        window.showToast("Unable to calculate route.", "error");
                    }
                })
                .catch(err => {
                    if (err.name === 'AbortError') return;
                    toggleOverlay(mapLoader, false);
                    console.error("OSRM Routing failed:", err);
                    toggleOverlay(mapRetry, true);
                    window.showToast("Unable to calculate route.", "error");
                });
        },

        // Clear route polyline layers and markers
        clearRoute: function() {
            toggleOverlay(mapLoader, false);
            toggleOverlay(mapRetry, false);

            if (pickupMarker) {
                map.removeLayer(pickupMarker);
                pickupMarker = null;
            }
            if (dropoffMarker) {
                map.removeLayer(dropoffMarker);
                dropoffMarker = null;
            }
            if (polylineRoute) {
                map.removeLayer(polylineRoute);
                polylineRoute = null;
            }

            if (map) {
                map.setView([
                    window.APP_CONFIG.MAP_CENTER.lat,
                    window.APP_CONFIG.MAP_CENTER.lng
                ], window.APP_CONFIG.DEFAULT_MAP_ZOOM);
            }

            if (onRouteClearedCallback) {
                onRouteClearedCallback();
            }
        },

        // Geofence Service Area validation check
        validateServiceArea: function(coords) {
            if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return false;
            const distance = calculateHaversineDistance(window.APP_CONFIG.MAP_CENTER, coords);
            return distance <= window.APP_CONFIG.SERVICE_RADIUS_KM;
        },

        registerRouteCalculated: function(callback) {
            onRouteCalculatedCallback = callback;
        },

        registerRouteCleared: function(callback) {
            onRouteClearedCallback = callback;
        }
    };

    // ----------------------------------------------------
    // INTERNAL UTILITY MATHS
    // ----------------------------------------------------
    function calculateHaversineDistance(coords1, coords2) {
        const R = 6371; // Earth's radius in km
        const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
        const dLon = (coords2.lng - coords1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Toggle full height alert spinner boxes
    function toggleOverlay(el, show) {
        if (!el) return;
        if (show) {
            el.classList.add('active');
            el.setAttribute('aria-hidden', 'false');
        } else {
            el.classList.remove('active');
            el.setAttribute('aria-hidden', 'true');
        }
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
})();
