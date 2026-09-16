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
    let onMapClickedCallback = null;

    // DOM Elements
    const mapLoader = document.getElementById('map-loader');
    const mapRetry = document.getElementById('map-retry');
    const mapOffline = document.getElementById('map-offline');

    // Varanasi search aliases and alternate terms for common localities/landmarks
    const VARANASI_SEARCH_ALIASES = [
        { pattern: /\b(babatpur\s+airport|varanasi\s+airport|banaras\s+airport|airport\s+babatpur)\b/i, alias: "Lal Bahadur Shastri International Airport" },
        { pattern: /\b(cantt\s+station|varanasi\s+cantt|cantt\s+railway\s+station|banaras\s+cantt)\b/i, alias: "Varanasi Junction railway station" },
        { pattern: /\b(manduadih\s+station|manduwadih)\b/i, alias: "Banaras railway station" },
        { pattern: /\b(ddu\s+station|ddu\s+junction|mughalsarai\s+station|mughalsarai\s+junction)\b/i, alias: "Pt. Deen Dayal Upadhyaya Junction" },
        { pattern: /\b(kashi\s+vishwanath\s+mandir|kashi\s+vishwanath\s+temple|vishwanath\s+temple|vishwanath\s+mandir)\b/i, alias: "Shri Kashi Vishwanath Temple" },
        { pattern: /\b(bhu\s+gate|bhu\s+main\s+gate|lanka\s+bhu)\b/i, alias: "Lanka Gate, BHU" },
        { pattern: /\b(sankat\s+mochan\s+temple|sankat\s+mochan\s+mandir)\b/i, alias: "Sankat Mochan Hanuman Temple" },
        { pattern: /\b(namo\s+ghat|khidkiya\s+ghat)\b/i, alias: "Namo Ghat" },
        { pattern: /\b(assi\s+ghat)\b/i, alias: "Assi Ghat Road" },
        { pattern: /\b(dashashwamedh\s+ghat)\b/i, alias: "Dashashwamedh Ghat" },
        { pattern: /\b(godowlia\s+crossing|godowlia\s+chowk)\b/i, alias: "Godowlia" }
    ];

    function normalizeSearchQuery(query) {
        if (!query) return "";
        let trimmed = query.trim();
        for (const item of VARANASI_SEARCH_ALIASES) {
            if (item.pattern.test(trimmed)) {
                return trimmed.replace(item.pattern, item.alias);
            }
        }
        return trimmed;
    }

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

            // Map Click Listener for custom pin placement
            map.on('click', function(e) {
                if (onMapClickedCallback) {
                    onMapClickedCallback(e.latlng.lat, e.latlng.lng);
                }
            });

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

        // Photon Search API fetch with adaptive spatial bias, query normalization, deduplication, and waterway deprioritization
        searchPlaces: function(query, callback, options) {
            if (activeAbortController) {
                activeAbortController.abort();
            }

            activeAbortController = new AbortController();
            const signal = activeAbortController.signal;

            const trimmedQuery = (query || "").trim();
            if (!trimmedQuery) {
                callback(null, []);
                return;
            }

            // Apply query normalization & alias mapping
            const normalizedQuery = normalizeSearchQuery(trimmedQuery);

            // Proximity bias: prioritize proximity from caller (e.g. pickup location, current user location, or active map center)
            let biasPoint = (window.APP_CONFIG && window.APP_CONFIG.MAP_CENTER) || { lat: 25.3176, lng: 82.9739 };
            if (options && typeof options.lat === 'number' && typeof options.lng === 'number') {
                biasPoint = { lat: options.lat, lng: options.lng };
            } else if (options && options.proximity && typeof options.proximity.lat === 'number' && typeof options.proximity.lng === 'number') {
                biasPoint = { lat: options.proximity.lat, lng: options.proximity.lng };
            } else if (map) {
                try {
                    const c = map.getCenter();
                    if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
                        biasPoint = { lat: c.lat, lng: c.lng };
                    }
                } catch (_) {}
            }

            const bounds = (window.APP_CONFIG && window.APP_CONFIG.MAP_BOUNDS) || { south: 25.12, west: 82.72, north: 25.52, east: 83.22 };
            const candidateLimit = (window.APP_CONFIG && window.APP_CONFIG.API && window.APP_CONFIG.API.SEARCH_CANDIDATE_LIMIT) || 20;
            const maxDisplay = (window.APP_CONFIG && window.APP_CONFIG.API && window.APP_CONFIG.API.MAX_SUGGESTIONS) || 6;
            const bboxParam = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;

            const processFeatures = (rawFeatures) => {
                const candidateItems = rawFeatures.map((feature, idx) => {
                    const props = feature.properties || {};
                    const lat = parseFloat(feature.geometry?.coordinates?.[1]);
                    const lng = parseFloat(feature.geometry?.coordinates?.[0]);

                    const displayName = props.name ||
                        (props.street ? (props.housenumber ? `${props.housenumber}, ${props.street}` : props.street) : null) ||
                        props.district ||
                        props.suburb ||
                        props.locality ||
                        "Varanasi Location";

                    const addressParts = [
                        props.street,
                        props.district || props.suburb,
                        props.city || "Varanasi",
                        props.state || "Uttar Pradesh"
                    ].filter(Boolean);

                    const secondaryAddress = addressParts
                        .filter(part => part.toLowerCase() !== displayName.toLowerCase())
                        .join(', ') || "Varanasi, Uttar Pradesh";

                    const isWaterway = props.osm_key === 'waterway';

                    return {
                        placeId: `osm-${props.osm_type || 'W'}-${props.osm_id || (Date.now() + '_' + idx)}`,
                        osmId: props.osm_id,
                        osmType: props.osm_type,
                        osmKey: props.osm_key,
                        osmValue: props.osm_value,
                        name: displayName,
                        address: `${displayName}, ${secondaryAddress}`,
                        lat,
                        lng,
                        isWaterway,
                        district: props.district || props.suburb || ''
                    };
                }).filter(item => !isNaN(item.lat) && !isNaN(item.lng));

                // Prioritize navigable transportation & destinations over waterways/drains
                candidateItems.sort((a, b) => {
                    if (a.isWaterway && !b.isWaterway) return 1;
                    if (!a.isWaterway && b.isWaterway) return -1;
                    return 0;
                });

                // Smart deduplication
                const deduplicated = [];
                for (const item of candidateItems) {
                    const isDuplicate = deduplicated.some(existing => {
                        if (existing.placeId === item.placeId) return true;
                        if (existing.name.toLowerCase() === item.name.toLowerCase()) {
                            const dist = calculateHaversineDistance(
                                { lat: existing.lat, lng: existing.lng },
                                { lat: item.lat, lng: item.lng }
                            );
                            if (dist < 1.0 || existing.isWaterway || item.isWaterway) {
                                return true;
                            }
                        }
                        return false;
                    });

                    if (!isDuplicate) {
                        deduplicated.push(item);
                        if (deduplicated.length >= maxDisplay) break;
                    }
                }
                return deduplicated;
            };

            const fetchUrl = `${window.APP_CONFIG.API.PHOTON}?q=${encodeURIComponent(normalizedQuery)}&lat=${biasPoint.lat}&lon=${biasPoint.lng}&bbox=${bboxParam}&limit=${candidateLimit}`;

            fetch(fetchUrl, { signal })
                .then(res => res.json())
                .then(data => {
                    let results = processFeatures(data.features || []);

                    // Fallback search: if 0 results returned and query has multiple words, try primary keyword
                    if (results.length === 0 && trimmedQuery.includes(' ')) {
                        const words = trimmedQuery.split(/\s+/).filter(w => w.length > 2);
                        const fallbackKeyword = words[0];
                        if (fallbackKeyword && fallbackKeyword.toLowerCase() !== normalizedQuery.toLowerCase()) {
                            const fallbackUrl = `${window.APP_CONFIG.API.PHOTON}?q=${encodeURIComponent(fallbackKeyword)}&lat=${biasPoint.lat}&lon=${biasPoint.lng}&bbox=${bboxParam}&limit=${candidateLimit}`;
                            return fetch(fallbackUrl, { signal })
                                .then(r => r.json())
                                .then(fallbackData => {
                                    const fallbackResults = processFeatures(fallbackData.features || []);
                                    callback(null, fallbackResults);
                                });
                        }
                    }

                    callback(null, results);
                })
                .catch(err => {
                    if (err.name === 'AbortError') return;
                    console.error("Photon autocomplete failed:", err);
                    callback(err, null);
                });
        },

        // Add Marker on map with draggable pin support
        addMarker: function(lat, lng, type) {
            if (!map) return;

            // Custom Leaflet Marker icon html
            const iconHtml = type === 'pickup' 
                ? `<div style="background:#22C55E; width:14px; height:14px; border:2px solid #FFF; border-radius:50%; box-shadow:0 0 6px rgba(0,0,0,0.4);"></div>`
                : `<div style="background:#EF4444; width:14px; height:14px; border:2px solid #FFF; border-radius:50%; box-shadow:0 0 6px rgba(0,0,0,0.4);"></div>`;

            const markerIcon = L.divIcon({
                className: `custom-leaflet-marker ${type}`,
                html: iconHtml,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });

            if (type === 'pickup') {
                if (pickupMarker) map.removeLayer(pickupMarker);
                pickupMarker = L.marker([lat, lng], { icon: markerIcon, draggable: true }).addTo(map);
                pickupMarker.on('dragend', function(e) {
                    const pos = e.target.getLatLng();
                    if (onMapClickedCallback) {
                        onMapClickedCallback(pos.lat, pos.lng, 'pickup');
                    }
                });
            } else {
                if (dropoffMarker) map.removeLayer(dropoffMarker);
                dropoffMarker = L.marker([lat, lng], { icon: markerIcon, draggable: true }).addTo(map);
                dropoffMarker.on('dragend', function(e) {
                    const pos = e.target.getLatLng();
                    if (onMapClickedCallback) {
                        onMapClickedCallback(pos.lat, pos.lng, 'dropoff');
                    }
                });
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
        },

        registerMapClicked: function(callback) {
            onMapClickedCallback = callback;
        },

        getCenter: function() {
            if (map) {
                try {
                    const c = map.getCenter();
                    return { lat: c.lat, lng: c.lng };
                } catch (_) {}
            }
            return (window.APP_CONFIG && window.APP_CONFIG.MAP_CENTER) || { lat: 25.3176, lng: 82.9739 };
        },

        invalidateSize: function() {
            if (map) {
                map.invalidateSize();
            }
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
