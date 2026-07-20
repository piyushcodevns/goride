"use strict";

(function() {
    // ----------------------------------------------------
    // MAP CONFIGURATION CONSTANTS
    // ----------------------------------------------------
    const CONFIG = {
        DEFAULT_CENTER: [28.6139, 77.2090], // Delhi NCR
        DEFAULT_ZOOM: 12,
        NOMINATIM_URL: "https://nominatim.openstreetmap.org/search",
        OSRM_URL: "https://router.project-osrm.org/route/v1/driving",
        MAX_SUGGESTIONS: 5,
        DEBOUNCE_DELAY: 500,
        MIN_CHARS: 3,
        MIN_REQUEST_INTERVAL: 1000 // Rate-limit: max 1 request per second
    };

    // ----------------------------------------------------
    // INTERNAL STATE VARIABLES
    // ----------------------------------------------------
    let mapInstance = null;
    let pickupMarker = null;
    let dropoffMarker = null;
    let routePolyline = null;

    // Cache stores
    const locationCache = {};
    const routeCache = {};

    // Abort Controllers for pending fetches
    let autocompleteAbortController = null;
    let routingAbortController = null;

    // Throttling timestamp tracker
    let lastRequestTime = 0;

    // DOM Overlays
    const mapLoader = document.getElementById('map-loader');
    const mapRetry = document.getElementById('map-retry');
    const mapRetryBtn = document.getElementById('map-retry-btn');
    const mapOffline = document.getElementById('map-offline');

    // Callback listeners registered by booking.js
    let onRouteCalculatedCallback = null;
    let onRouteClearedCallback = null;

    // Last routing parameters (used for retries)
    let lastRouteParams = null;

    // ----------------------------------------------------
    // ACCESSIBILITY & SUGGESTIONS ELEMENTS BINDING
    // ----------------------------------------------------
    function setupKeyboardAutocomplete(inputEl, listEl, onSelect) {
        let activeIndex = -1;

        const items = () => listEl.querySelectorAll('li[role="option"]');

        const setActive = (index) => {
            const listItems = items();
            listItems.forEach((item, idx) => {
                if (idx === index) {
                    item.classList.add('focused');
                    item.setAttribute('aria-selected', 'true');
                    inputEl.setAttribute('aria-activedescendant', item.id);
                    item.scrollIntoView({ block: 'nearest' });
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

        // Reset index when input changes
        inputEl.addEventListener('input', () => {
            activeIndex = -1;
            inputEl.removeAttribute('aria-activedescendant');
        });
    }

    // ----------------------------------------------------
    // MAP PROVIDER IMPLEMENTATION (OSRM & LEAFLET)
    // ----------------------------------------------------
    window.MapProvider = {
        // Search Location Autocomplete Interface
        searchLocation: function(query, inputEl, listEl, onSelect) {
            // Check character minimums
            const cleanedQuery = query.trim();
            if (cleanedQuery.length < CONFIG.MIN_CHARS) {
                listEl.innerHTML = '';
                listEl.style.display = 'none';
                return;
            }

            // Check Cache first
            if (locationCache[cleanedQuery]) {
                renderSuggestions(locationCache[cleanedQuery], inputEl, listEl, onSelect);
                return;
            }

            // Rate Limit Guard: restrict network fetches to max 1 per second
            const now = Date.now();
            if (now - lastRequestTime < CONFIG.MIN_REQUEST_INTERVAL) {
                return; // skip request to prevent spamming Nominatim
            }

            // Abort previous autocomplete fetches
            if (autocompleteAbortController) {
                autocompleteAbortController.abort();
            }
            autocompleteAbortController = new AbortController();

            lastRequestTime = now;
            listEl.innerHTML = '<li class="info-item" aria-live="polite">Searching locations...</li>';
            listEl.style.display = 'block';

            const url = `${CONFIG.NOMINATIM_URL}?format=json&q=${encodeURIComponent(cleanedQuery)}&limit=${CONFIG.MAX_SUGGESTIONS}&countrycodes=in`;

            fetch(url, { signal: autocompleteAbortController.signal })
                .then(response => {
                    if (!response.ok) throw new Error("Network response not ok");
                    return response.json();
                })
                .then(data => {
                    // Cache the results
                    locationCache[cleanedQuery] = data;
                    renderSuggestions(data, inputEl, listEl, onSelect);
                })
                .catch(error => {
                    if (error.name === 'AbortError') return;
                    listEl.innerHTML = '<li class="error-item" aria-live="assertive">Unable to fetch locations. Please try again.</li>';
                });
        },

        // Fetch Driving Route and Draw Line
        getRoute: function(pickupCoords, dropCoords) {
            // Check if Offline first
            if (!navigator.onLine) {
                toggleOverlay(mapOffline, true);
                return;
            }

            // Create unique cache key for route
            const cacheKey = `${pickupCoords.lat},${pickupCoords.lng}|${dropCoords.lat},${dropCoords.lng}`;
            
            lastRouteParams = { pickupCoords, dropCoords };

            // Check route cache
            if (routeCache[cacheKey]) {
                renderRouteOnMap(routeCache[cacheKey]);
                return;
            }

            // Abort previous routing fetches
            if (routingAbortController) {
                routingAbortController.abort();
            }
            routingAbortController = new AbortController();

            toggleOverlay(mapLoader, true);
            toggleOverlay(mapRetry, false);
            toggleOverlay(mapOffline, false);

            // TODO: Replace OSRM URL with Google Directions API endpoint
            const url = `${CONFIG.OSRM_URL}/${pickupCoords.lng},${pickupCoords.lat};${dropCoords.lng},${dropCoords.lat}?overview=full&geometries=geojson`;

            fetch(url, { signal: routingAbortController.signal })
                .then(response => {
                    if (!response.ok) throw new Error("OSRM router error");
                    return response.json();
                })
                .then(data => {
                    toggleOverlay(mapLoader, false);
                    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                        throw new Error("No route found");
                    }

                    const route = data.routes[0];
                    // Cache driving route details
                    routeCache[cacheKey] = route;
                    renderRouteOnMap(route);
                })
                .catch(error => {
                    if (error.name === 'AbortError') return;
                    toggleOverlay(mapLoader, false);
                    toggleOverlay(mapRetry, true);
                    window.showToast("Failed to calculate driving route.", "error");
                });
        },

        // Clear markers, polylines and center map
        clearRoute: function() {
            if (routePolyline) {
                mapInstance.removeLayer(routePolyline);
                routePolyline = null;
            }
            if (pickupMarker) {
                mapInstance.removeLayer(pickupMarker);
                pickupMarker = null;
            }
            if (dropoffMarker) {
                mapInstance.removeLayer(dropoffMarker);
                dropoffMarker = null;
            }

            // Hide overlays
            toggleOverlay(mapLoader, false);
            toggleOverlay(mapRetry, false);

            // Reset back to default center
            mapInstance.setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);

            if (onRouteClearedCallback) {
                onRouteClearedCallback();
            }
        },

        // Register callbacks
        registerRouteCalculated: function(callback) {
            onRouteCalculatedCallback = callback;
        },

        registerRouteCleared: function(callback) {
            onRouteClearedCallback = callback;
        }
    };

    // ----------------------------------------------------
    // INTERNAL LEAFLET DRAWING HELPER FUNCTIONS
    // ----------------------------------------------------
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

    function renderSuggestions(data, inputEl, listEl, onSelect) {
        listEl.innerHTML = '';
        if (data.length === 0) {
            listEl.innerHTML = '<li class="info-item">No locations found.</li>';
            return;
        }

        data.forEach((item, idx) => {
            const li = document.createElement('li');
            li.role = "option";
            li.id = `${inputEl.id}-opt-${idx}`;
            li.className = 'suggestion-item';
            
            // Clean display name
            const shortName = item.display_name.split(',').slice(0, 3).join(',');
            li.innerHTML = `<span>📍</span> ${shortName}`;
            
            li.addEventListener('click', () => {
                inputEl.value = shortName;
                listEl.style.display = 'none';
                
                const coords = {
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon)
                };
                
                onSelect(coords);
            });
            listEl.appendChild(li);
        });

        listEl.style.display = 'block';
    }

    function renderRouteOnMap(route) {
        // Remove old routes
        if (routePolyline) {
            mapInstance.removeLayer(routePolyline);
        }

        // Draw smooth blue driving line (similar to Ola/Uber)
        routePolyline = L.geoJSON(route.geometry, {
            style: {
                color: '#2563EB', // Brand Primary Blue
                weight: 6,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round'
            }
        }).addTo(mapInstance);

        // Place custom SVG markers
        const pickupCoords = lastRouteParams.pickupCoords;
        const dropCoords = lastRouteParams.dropCoords;

        if (pickupMarker) mapInstance.removeLayer(pickupMarker);
        if (dropoffMarker) mapInstance.removeLayer(dropoffMarker);

        // Custom green circle pickup marker SVG icon
        const pickupIcon = L.divIcon({
            html: `<div style="background:#22C55E;width:14px;height:14px;border:3px solid #FFF;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.3);"></div>`,
            className: 'custom-pickup-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        // Custom red circle dropoff marker SVG icon
        const dropoffIcon = L.divIcon({
            html: `<div style="background:#EF4444;width:14px;height:14px;border:3px solid #FFF;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.3);"></div>`,
            className: 'custom-dropoff-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        pickupMarker = L.marker([pickupCoords.lat, pickupCoords.lng], { icon: pickupIcon }).addTo(mapInstance);
        dropoffMarker = L.marker([dropCoords.lat, dropCoords.lng], { icon: dropoffIcon }).addTo(mapInstance);

        // Auto zoom and fit bounds with padding to prevent margins cutoff
        const bounds = L.latLngBounds([
            [pickupCoords.lat, pickupCoords.lng],
            [dropCoords.lat, dropCoords.lng]
        ]);
        mapInstance.fitBounds(bounds, { padding: [50, 50] });

        // Convert OSRM distance (meters) to KM and duration (seconds) to Minutes
        const distKm = parseFloat((route.distance / 1000).toFixed(1));
        const durationMin = Math.round(route.duration / 60);

        if (onRouteCalculatedCallback) {
            onRouteCalculatedCallback(distKm, durationMin);
        }
    }

    // Initialize Map on Page Load
    function initLeafletMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Create Leaflet map centered on default location
        mapInstance = L.map('map', {
            zoomControl: false, // Position custom controls in css later
            attributionControl: true
        }).setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);

        // Add standard OpenStreetMap CartoDB Tiles (minimalist, clean design)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance);

        // Standard zoom control reposition
        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);
    }

    // ----------------------------------------------------
    // INITIALIZATION & LISTENERS SETUP
    // ----------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        initLeafletMap();

        // Bind Autocomplete Suggestion Listeners
        const pickupInput = document.getElementById('pickup-input');
        const pickupSuggestions = document.getElementById('pickup-suggestions');
        const dropoffInput = document.getElementById('dropoff-input');
        const dropoffSuggestions = document.getElementById('dropoff-suggestions');

        if (pickupInput && pickupSuggestions) {
            setupKeyboardAutocomplete(pickupInput, pickupSuggestions, (coords) => {
                pickupInput.dataset.lat = coords.lat;
                pickupInput.dataset.lng = coords.lng;
                
                // Dispatch event to trigger recalculation in booking.js
                pickupInput.dispatchEvent(new Event('change'));
            });
        }

        if (dropoffInput && dropoffSuggestions) {
            setupKeyboardAutocomplete(dropoffInput, dropoffSuggestions, (coords) => {
                dropoffInput.dataset.lat = coords.lat;
                dropoffInput.dataset.lng = coords.lng;
                
                // Dispatch event to trigger recalculation in booking.js
                dropoffInput.dispatchEvent(new Event('change'));
            });
        }

        // Retry Button Listener
        if (mapRetryBtn) {
            mapRetryBtn.addEventListener('click', () => {
                if (lastRouteParams) {
                    window.MapProvider.getRoute(lastRouteParams.pickupCoords, lastRouteParams.dropCoords);
                }
            });
        }

        // Online / Offline Status Checkers
        window.addEventListener('online', () => {
            toggleOverlay(mapOffline, false);
            if (lastRouteParams && !routePolyline) {
                window.MapProvider.getRoute(lastRouteParams.pickupCoords, lastRouteParams.dropCoords);
            }
        });

        window.addEventListener('offline', () => {
            toggleOverlay(mapOffline, true);
        });

        // Initialize status check
        if (!navigator.onLine) {
            toggleOverlay(mapOffline, true);
        }
    });
})();
