"use strict";

(function() {
    // ----------------------------------------------------
    // INTERNAL STATE VARIABLES
    // ----------------------------------------------------
    let mapInstance = null;
    let pickupMarker = null;
    let dropoffMarker = null;
    
    // Google Maps Services references
    let autocompleteService = null;
    let placesService = null;
    let directionsService = null;
    let directionsRenderer = null;

    // Cache stores
    const searchCache = {};
    const routeCache = {};

    // Abort Controllers for search cancellation
    let currentSearchAbort = null;
    let throttleTimeout = null;
    let lastSearchTime = 0;

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

    // Indicator for Google API Status
    let isGoogleLoaded = false;
    let isDemoMode = false;

    // ----------------------------------------------------
    // LOCAL MOCK GEODATABASE FOR VARANASI (DEMO MODE FALLBACK)
    // ----------------------------------------------------
    const VARANASI_MOCK_DB = [
        { name: "Pandeypur", address: "Pandeypur, Varanasi, Uttar Pradesh", lat: 25.3421, lng: 82.9972 },
        { name: "Lahartara", address: "Lahartara, Varanasi, Uttar Pradesh", lat: 25.3134, lng: 82.9691 },
        { name: "Sigra", address: "Sigra, Varanasi, Uttar Pradesh", lat: 25.3195, lng: 82.9845 },
        { name: "Lanka", address: "Lanka, Varanasi, Uttar Pradesh", lat: 25.2798, lng: 83.0016 },
        { name: "Assi", address: "Assi, Varanasi, Uttar Pradesh", lat: 25.2891, lng: 83.0076 },
        { name: "Banaras Hindu University", address: "Banaras Hindu University, Varanasi, Uttar Pradesh", lat: 25.2677, lng: 82.9913 },
        { name: "BHU", address: "Banaras Hindu University, Varanasi, Uttar Pradesh", lat: 25.2677, lng: 82.9913 },
        { name: "Varanasi Junction", address: "Varanasi Cantt, Varanasi, Uttar Pradesh", lat: 25.3263, lng: 82.9866 },
        { name: "Cantt", address: "Varanasi Cantt, Varanasi, Uttar Pradesh", lat: 25.3263, lng: 82.9866 },
        { name: "Orderly Bazar", address: "Orderly Bazar, Varanasi, Uttar Pradesh", lat: 25.3375, lng: 82.9782 },
        { name: "Nadesar", address: "Nadesar, Varanasi, Uttar Pradesh", lat: 25.3301, lng: 82.9819 },
        { name: "Shivpur", address: "Shivpur, Varanasi, Uttar Pradesh", lat: 25.3621, lng: 82.9654 },
        { name: "Sarnath", address: "Sarnath, Varanasi, Uttar Pradesh", lat: 25.3762, lng: 83.0227 },
        { name: "Ramnagar", address: "Ramnagar Fort, Varanasi, Uttar Pradesh", lat: 25.2684, lng: 83.0289 },
        { name: "Mahmoorganj", address: "Mahmoorganj, Varanasi, Uttar Pradesh", lat: 25.3092, lng: 82.9765 },
        { name: "Bhelupur", address: "Bhelupur, Varanasi, Uttar Pradesh", lat: 25.3005, lng: 82.9961 },
        { name: "Maidagin", address: "Maidagin, Varanasi, Uttar Pradesh", lat: 25.3184, lng: 83.0112 },
        { name: "Nai Basti", address: "Nai Basti, Varanasi, Uttar Pradesh", lat: 25.3248, lng: 83.0031 },
        { name: "Chauk", address: "Chauk, Chowk, Varanasi, Uttar Pradesh", lat: 25.3116, lng: 83.0129 },
        { name: "Godowlia", address: "Godowlia Crossing, Varanasi, Uttar Pradesh", lat: 25.3101, lng: 83.0089 },
        { name: "Chetganj", address: "Chetganj, Varanasi, Uttar Pradesh", lat: 25.3168, lng: 82.9934 },
        { name: "Luxa", address: "Luxa Road, Varanasi, Uttar Pradesh", lat: 25.3087, lng: 83.0012 },
        { name: "Kabir Chaura", address: "Kabir Chaura, Varanasi, Uttar Pradesh", lat: 25.3198, lng: 83.0028 },
        { name: "Bhojuveer", address: "Bhojuveer Crossing, Varanasi, Uttar Pradesh", lat: 25.3489, lng: 82.9745 },
        { name: "Paharia", address: "Paharia, Varanasi, Uttar Pradesh", lat: 25.3578, lng: 83.0125 },
        { name: "DLW", address: "Diesel Locomotive Works, Varanasi, Uttar Pradesh", lat: 25.2912, lng: 82.9641 },
        { name: "Manduadih", address: "Manduadih, Varanasi, Uttar Pradesh", lat: 25.2991, lng: 82.9602 },
        { name: "Lohta", address: "Lohta, Varanasi, Uttar Pradesh", lat: 25.3098, lng: 82.9152 },
        { name: "Rohania", address: "Rohania, Varanasi, Uttar Pradesh", lat: 25.2758, lng: 82.9234 },
        { name: "Ashapur", address: "Ashapur Crossing, Varanasi, Uttar Pradesh", lat: 25.3582, lng: 83.0319 },
        { name: "Rajatalab", address: "Rajatalab, Varanasi, Uttar Pradesh", lat: 25.2711, lng: 82.8689 }
    ];

    // ----------------------------------------------------
    // MAP PROVIDER IMPLEMENTATION (GOOGLE MAPS)
    // ----------------------------------------------------
    window.MapProvider = {
        resolveFirstMatch: function(query) {
            const cleaned = query.trim().toLowerCase();
            const match = VARANASI_MOCK_DB.find(place => 
                place.name.toLowerCase().includes(cleaned) ||
                place.address.toLowerCase().includes(cleaned)
            );
            if (match) {
                return {
                    placeId: `mock-id-${match.name.replace(/\s+/g, '-')}`,
                    name: match.name,
                    address: match.address,
                    lat: match.lat,
                    lng: match.lng
                };
            }
            return null;
        },
        // Initialize Google Maps SDK and Render Viewport
        init: function() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // Check if Offline
            if (!navigator.onLine) {
                toggleOverlay(mapOffline, true);
                return;
            }

            // Check if API Key is placeholder -> run Demo Mode
            const apiKey = window.APP_CONFIG.API.KEY;
            if (apiKey === "YOUR_API_KEY" || apiKey.trim() === "") {
                console.warn("Go Ride Warning: Google Maps API Key is the default placeholder. Running in interactive Demo Mode.");
                isDemoMode = true;
                initDemoMap();
                return;
            }

            // Inject Google Script tag dynamically
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                isGoogleLoaded = true;
                initRealMap();
            };
            script.onerror = () => {
                console.error("Failed to load Google Maps SDK. Falling back to Demo Mode.");
                isDemoMode = true;
                initDemoMap();
            };
            document.head.appendChild(script);
        },

        // Strict-biased Autocomplete search query handler
        search: function(query, inputEl, listEl, onSelect) {
            const cleanedQuery = query.trim();
            if (cleanedQuery.length < window.APP_CONFIG.API.MIN_CHARS) {
                listEl.innerHTML = '';
                listEl.style.display = 'none';
                return;
            }

            // Check Autocomplete searchCache first
            if (searchCache[cleanedQuery]) {
                renderSuggestionsList(searchCache[cleanedQuery], inputEl, listEl, onSelect);
                return;
            }

            // Rate-limiting check
            const now = Date.now();
            if (now - lastSearchTime < window.APP_CONFIG.API.THROTTLE_INTERVAL) {
                return; // skip execution
            }
            lastSearchTime = now;

            // Loader inline indicator
            listEl.innerHTML = '<li class="info-item" aria-live="polite">Searching locations...</li>';
            listEl.style.display = 'block';

            // ------------------ DEMO MODE AUTOTEXT ------------------
            if (isDemoMode) {
                setTimeout(() => {
                    const matches = VARANASI_MOCK_DB.filter(place => 
                        place.name.toLowerCase().includes(cleanedQuery.toLowerCase()) ||
                        place.address.toLowerCase().includes(cleanedQuery.toLowerCase())
                    ).slice(0, window.APP_CONFIG.API.MAX_SUGGESTIONS);

                    const data = matches.map(match => ({
                        description: match.address,
                        place_id: `mock-id-${match.name.replace(/\s+/g, '-')}`,
                        structured_formatting: {
                            main_text: match.name,
                            secondary_text: "Varanasi, Uttar Pradesh"
                        }
                    }));

                    searchCache[cleanedQuery] = data;
                    renderSuggestionsList(data, inputEl, listEl, onSelect);
                }, 300);
                return;
            }

            // ------------------ REAL GOOGLE PLACES ------------------
            if (autocompleteService) {
                const varanasiBounds = new google.maps.LatLngBounds(
                    new google.maps.LatLng(window.APP_CONFIG.MAP_BOUNDS.south, window.APP_CONFIG.MAP_BOUNDS.west),
                    new google.maps.LatLng(window.APP_CONFIG.MAP_BOUNDS.north, window.APP_CONFIG.MAP_BOUNDS.east)
                );

                autocompleteService.getPlacePredictions({
                    input: cleanedQuery,
                    bounds: varanasiBounds,
                    strictBounds: true, // Strict restriction to Varanasi boundaries!
                    componentRestrictions: { country: window.APP_CONFIG.COUNTRY.toLowerCase() }
                }, (predictions, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                        searchCache[cleanedQuery] = predictions;
                        renderSuggestionsList(predictions, inputEl, listEl, onSelect);
                    } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                        listEl.innerHTML = '<li class="info-item">No locations found.</li>';
                    } else {
                        console.error("Autocomplete failure state:", status);
                        listEl.innerHTML = '<li class="error-item" aria-live="assertive">Unable to fetch locations. Please try again.</li>';
                    }
                });
            }
        },

        // Resolve Place Details by Place ID
        selectPlace: function(placeId, callback) {
            // ------------------ DEMO MODE RESOLVER ------------------
            if (isDemoMode) {
                const name = placeId.replace('mock-id-', '').replace(/-/g, ' ');
                const match = VARANASI_MOCK_DB.find(place => place.name.toLowerCase() === name.toLowerCase());
                if (match) {
                    callback({
                        placeId: placeId,
                        name: match.name,
                        address: match.address,
                        lat: match.lat,
                        lng: match.lng
                    });
                } else {
                    window.showToast("Failed to resolve location details.", "error");
                }
                return;
            }

            // ------------------ REAL GOOGLE DETAILS ------------------
            if (placesService) {
                placesService.getDetails({
                    placeId: placeId,
                    fields: ['geometry', 'formatted_address', 'name']
                }, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
                        callback({
                            placeId: placeId,
                            name: place.name,
                            address: place.formatted_address,
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                        });
                    } else {
                        console.error("Place details resolve failed:", status);
                        window.showToast("Unable to geocode selected address.", "error");
                    }
                });
            }
        },

        // Draw driving polyline route
        drawRoute: function(pickupCoords, dropCoords) {
            // Validate geofence boundaries (25km service area limit check)
            const pickupValid = this.validateServiceArea(pickupCoords);
            const dropValid = this.validateServiceArea(dropCoords);

            if (!pickupValid || !dropValid) {
                window.showToast("Currently we only operate inside Varanasi.", "error");
                this.clearRoute();
                return;
            }

            const cacheKey = `${pickupCoords.lat},${pickupCoords.lng}|${dropCoords.lat},${dropCoords.lng}`;
            lastRouteParams = { pickupCoords, dropCoords };

            // Check Route Cache
            if (routeCache[cacheKey]) {
                const cachedRoute = routeCache[cacheKey];
                renderRoute(cachedRoute);
                return;
            }

            toggleOverlay(mapLoader, true);
            toggleOverlay(mapRetry, false);

            // ------------------ DEMO MODE ROUTING ------------------
            if (isDemoMode) {
                setTimeout(() => {
                    // Compute mock Haversine distance for path line rendering
                    const distance = calculateHaversineDistance(pickupCoords, dropCoords);
                    const duration = Math.round((distance / 35) * 60 + 2); // 35km/h avg speed + 2 min delay
                    
                    const mockRoute = {
                        distanceKm: distance,
                        durationMinutes: duration,
                        encodedPolyline: null, // no polyline in demo fallback
                        pickup: pickupCoords,
                        drop: dropCoords
                    };

                    routeCache[cacheKey] = mockRoute;
                    toggleOverlay(mapLoader, false);
                    renderRoute(mockRoute);
                }, 800);
                return;
            }

            // ------------------ REAL GOOGLE DIRECTIONS ------------------
            if (directionsService && directionsRenderer) {
                // TODO: Replace with Real directions request
                directionsService.route({
                    origin: new google.maps.LatLng(pickupCoords.lat, pickupCoords.lng),
                    destination: new google.maps.LatLng(dropCoords.lat, dropCoords.lng),
                    travelMode: google.maps.TravelMode.DRIVING
                }, (response, status) => {
                    toggleOverlay(mapLoader, false);
                    if (status === google.maps.DirectionsStatus.OK) {
                        const leg = response.routes[0].legs[0];
                        const routeData = {
                            distanceKm: parseFloat((leg.distance.value / 1000).toFixed(1)),
                            durationMinutes: Math.round(leg.duration.value / 60),
                            encodedPolyline: response.routes[0].overview_polyline,
                            pickup: pickupCoords,
                            drop: dropCoords,
                            directionsResult: response // full object
                        };

                        routeCache[cacheKey] = routeData;
                        renderRoute(routeData);
                    } else {
                        console.error("Directions route failed:", status);
                        toggleOverlay(mapRetry, true);
                        window.showToast("Failed to fetch directions route.", "error");
                    }
                });
            }
        },

        // Clear markers, polyline overlays
        clearRoute: function() {
            // Hide loaders/retry cards
            toggleOverlay(mapLoader, false);
            toggleOverlay(mapRetry, false);

            if (isDemoMode) {
                clearDemoRoute();
                return;
            }

            if (directionsRenderer) {
                directionsRenderer.setDirections({ routes: [] });
            }
            if (pickupMarker) {
                pickupMarker.setMap(null);
                pickupMarker = null;
            }
            if (dropoffMarker) {
                dropoffMarker.setMap(null);
                dropoffMarker = null;
            }

            if (mapInstance) {
                mapInstance.setCenter(window.APP_CONFIG.MAP_CENTER);
                mapInstance.setZoom(window.APP_CONFIG.DEFAULT_MAP_ZOOM);
            }

            if (onRouteClearedCallback) {
                onRouteClearedCallback();
            }
        },

        // Service Area coordinates check (Haversine formula validation)
        validateServiceArea: function(coords) {
            const distance = calculateHaversineDistance(window.APP_CONFIG.MAP_CENTER, coords);
            // TODO: Replace radius validation with GeoJSON polygon service area in next sprint
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
    // KEYBOARD NAVIGATION AUTOCOMPLETE SETUP
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

        inputEl.addEventListener('input', () => {
            activeIndex = -1;
            inputEl.removeAttribute('aria-activedescendant');
        });
    }

    // ----------------------------------------------------
    // GEOLOCATION HAVERSINE DISTANCE MATHS
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

    // ----------------------------------------------------
    // REAL GOOGLE MAP INITIALIZATION
    // ----------------------------------------------------
    function initRealMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer || !google.maps) return;

        mapInstance = new google.maps.Map(mapContainer, {
            center: window.APP_CONFIG.MAP_CENTER,
            zoom: window.APP_CONFIG.DEFAULT_MAP_ZOOM,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_BOTTOM
            },
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: [
                {
                    featureType: "all",
                    elementType: "geometry.fill",
                    stylers: [{ weight: "2.00" }]
                }
            ]
        });

        // Initialize Services
        autocompleteService = new google.maps.places.AutocompleteService();
        placesService = new google.maps.places.PlacesService(mapInstance);
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: mapInstance,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#2563EB', // Ola Blue
                strokeWeight: 6,
                strokeOpacity: 0.85,
                strokeLineCap: 'round',
                strokeLineJoin: 'round'
            }
        });
    }

    // Render Real / Demo route polyline geometries
    function renderRoute(routeData) {
        if (isDemoMode) {
            // Draw a mock polyline path on leaflet canvas fallback
            drawDemoPolyline(routeData.pickup, routeData.drop);
            if (onRouteCalculatedCallback) {
                onRouteCalculatedCallback(routeData.distanceKm, routeData.durationMinutes);
            }
            return;
        }

        if (directionsRenderer && routeData.directionsResult) {
            directionsRenderer.setDirections(routeData.directionsResult);
            
            // Set custom map marker SVGs
            setGoogleMarkers(routeData.pickup, routeData.drop);

            if (onRouteCalculatedCallback) {
                onRouteCalculatedCallback(routeData.distanceKm, routeData.durationMinutes);
            }
        }
    }

    function setGoogleMarkers(pickup, drop) {
        if (pickupMarker) pickupMarker.setMap(null);
        if (dropoffMarker) dropoffMarker.setMap(null);

        pickupMarker = new google.maps.Marker({
            position: new google.maps.LatLng(pickup.lat, pickup.lng),
            map: mapInstance,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#22C55E', // Green circle
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3,
                scale: 8
            }
        });

        dropoffMarker = new google.maps.Marker({
            position: new google.maps.LatLng(drop.lat, drop.lng),
            map: mapInstance,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#EF4444', // Red circle
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3,
                scale: 8
            }
        });
    }

    // ----------------------------------------------------
    // GRACEFUL MOCK MAP INITIALIZATION (DEMO MODE ENGINE)
    // ----------------------------------------------------
    let demoSvgRoute = null;
    let demoPickupIcon = null;
    let demoDropIcon = null;

    function initDemoMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Render an elegant vector grid dashboard to represent Varanasi Cantt Service area
        mapContainer.innerHTML = `
            <div class="demo-map-panel" style="width:100%;height:100%;background:#F8FAFC;position:relative;overflow:hidden;box-sizing:border-box;">
                <!-- Varanasi grid layout vectors -->
                <div style="position:absolute;inset:0;background-size:24px 24px;background-image:linear-gradient(to right, #E2E8F0 1px, transparent 1px), linear-gradient(to bottom, #E2E8F0 1px, transparent 1px);"></div>
                
                <!-- Floating landmarks across full map -->
                <div style="position:absolute;left:20%;top:30%;font-size:0.7rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">📍 Cantt</div>
                <div style="position:absolute;left:75%;top:20%;font-size:0.7rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">📍 Pandeypur</div>
                <div style="position:absolute;left:45%;top:65%;font-size:0.7rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">📍 Sigra</div>
                <div style="position:absolute;left:55%;top:40%;font-size:0.7rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">📍 Lahartara</div>
                <div style="position:absolute;left:30%;top:80%;font-size:0.7rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">📍 Lanka</div>
                <div style="position:absolute;left:80%;top:75%;font-size:0.7rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">📍 Sarnath</div>

                <!-- SVG Overlay for drawing route paths -->
                <svg id="demo-svg-path" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;">
                    <path id="demo-path-line" d="" fill="none" stroke="#2563EB" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1000" stroke-dashoffset="1000" style="transition: stroke-dashoffset 1s ease-in-out;"></path>
                </svg>

                <!-- Custom Marker Pins overlays -->
                <div id="demo-pickup-pin" style="position:absolute;display:none;width:14px;height:14px;background:#22C55E;border:3px solid #FFF;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.3);transform:translate(-50%, -50%);z-index:3;"></div>
                <div id="demo-drop-pin" style="position:absolute;display:none;width:14px;height:14px;background:#EF4444;border:3px solid #FFF;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.3);transform:translate(-50%, -50%);z-index:3;"></div>

                <!-- Header overlay message for API status -->
                <div style="position:absolute;top:12px;left:12px;right:12px;background:rgba(255,255,255,0.92);backdrop-filter:blur(2px);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.6rem 0.8rem;z-index:4;font-size:0.8rem;box-shadow:var(--shadow-sm);">
                    <div style="font-weight:bold;color:var(--primary);margin-bottom:2px;">Varanasi Service Area Map (Demo Mode)</div>
                    <div style="color:var(--muted);font-size:0.72rem;line-height:1.25;">Enter an API key in <code>js/config.js</code> to connect Google Maps API. Geofences active.</div>
                </div>

                <!-- Footer Status -->
                <div style="position:absolute;bottom:12px;left:12px;background:rgba(255,255,255,0.9);padding:4px 8px;border-radius:4px;font-size:0.65rem;font-weight:600;color:#22C55E;border:1px solid var(--border);z-index:4;">
                    ● Dynamic Geocoding Active
                </div>
            </div>
        `;

        demoSvgRoute = mapContainer.querySelector('#demo-path-line');
        demoPickupIcon = mapContainer.querySelector('#demo-pickup-pin');
        demoDropIcon = mapContainer.querySelector('#demo-drop-pin');
    }

    function drawDemoPolyline(pickup, drop) {
        if (!demoSvgRoute || !demoPickupIcon || !demoDropIcon) return;

        // Map coordinates to local canvas coordinate ratios
        // Bounds center on Varanasi Cantt coordinates [25.3176, 82.9739]
        const latRange = window.APP_CONFIG.MAP_BOUNDS.north - window.APP_CONFIG.MAP_BOUNDS.south;
        const lngRange = window.APP_CONFIG.MAP_BOUNDS.east - window.APP_CONFIG.MAP_BOUNDS.west;

        const getCanvasPercent = (lat, lng) => {
            const x = ((lng - window.APP_CONFIG.MAP_BOUNDS.west) / lngRange) * 100;
            const y = (1 - (lat - window.APP_CONFIG.MAP_BOUNDS.south) / latRange) * 100;
            return { x, y };
        };

        const pPercent = getCanvasPercent(pickup.lat, pickup.lng);
        const dPercent = getCanvasPercent(drop.lat, drop.lng);

        // Position pins
        demoPickupIcon.style.left = `${pPercent.x}%`;
        demoPickupIcon.style.top = `${pPercent.y}%`;
        demoPickupIcon.style.display = 'block';

        demoDropIcon.style.left = `${dPercent.x}%`;
        demoDropIcon.style.top = `${dPercent.y}%`;
        demoDropIcon.style.display = 'block';

        // Draw line curve path inside SVG canvas - reading actual dimensions dynamically
        const svgEl = document.getElementById('demo-svg-path');
        const w = svgEl ? (svgEl.clientWidth || svgEl.getBoundingClientRect().width || 380) : 380;
        const h = svgEl ? (svgEl.clientHeight || svgEl.getBoundingClientRect().height || 420) : 420;
        
        const px = (pPercent.x / 100) * w;
        const py = (pPercent.y / 100) * h;
        const dx = (dPercent.x / 100) * w;
        const dy = (dPercent.y / 100) * h;

        // SVG quadratic curve
        const mx = (px + dx) / 2;
        const my = (py + dy) / 2 - 20;

        const pathD = `M ${px} ${py} Q ${mx} ${my} ${dx} ${dy}`;
        demoSvgRoute.setAttribute('d', pathD);

        // Trigger trace animation
        demoSvgRoute.style.strokeDashoffset = '1000';
        setTimeout(() => {
            demoSvgRoute.style.strokeDashoffset = '0';
        }, 50);
    }

    function clearDemoRoute() {
        if (demoSvgRoute) demoSvgRoute.setAttribute('d', '');
        if (demoPickupIcon) demoPickupIcon.style.display = 'none';
        if (demoDropIcon) demoDropIcon.style.display = 'none';
    }

    function renderSuggestionsList(predictions, inputEl, listEl, onSelect) {
        listEl.innerHTML = '';
        if (predictions.length === 0) {
            listEl.innerHTML = '<li class="info-item">No locations found.</li>';
            return;
        }

        predictions.forEach((item, idx) => {
            const li = document.createElement('li');
            li.role = "option";
            li.id = `${inputEl.id}-opt-${idx}`;
            li.className = 'suggestion-item';

            const mainText = item.structured_formatting ? item.structured_formatting.main_text : item.description.split(',')[0];
            const secText = item.structured_formatting ? item.structured_formatting.secondary_text : "Varanasi, Uttar Pradesh";

            li.innerHTML = `<span>📍</span> <div><strong>${mainText}</strong><br><small style="color:var(--muted);font-size:0.75rem;">${secText}</small></div>`;

            li.addEventListener('click', () => {
                inputEl.value = `${mainText}, ${secText}`;
                listEl.style.display = 'none';

                // Fetch details coordinates
                window.MapProvider.selectPlace(item.place_id, (details) => {
                    onSelect(details);
                });
            });
            listEl.appendChild(li);
        });

        listEl.style.display = 'block';
    }

    // Initialize MapProvider on DOM content ready
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize MapProvider
        window.MapProvider.init();

        const pickupInput = document.getElementById('pickup-input');
        const pickupSuggestions = document.getElementById('pickup-suggestions');
        const dropoffInput = document.getElementById('dropoff-input');
        const dropoffSuggestions = document.getElementById('dropoff-suggestions');

        if (pickupInput && pickupSuggestions) {
            setupKeyboardAutocomplete(pickupInput, pickupSuggestions, (details) => {
                pickupInput.dataset.placeId = details.placeId;
                pickupInput.dataset.lat = details.lat;
                pickupInput.dataset.lng = details.lng;
                pickupInput.dataset.address = details.address;
                pickupInput.value = details.name;

                pickupInput.dispatchEvent(new Event('change'));
            });
        }

        if (dropoffInput && dropoffSuggestions) {
            setupKeyboardAutocomplete(dropoffInput, dropoffSuggestions, (details) => {
                dropoffInput.dataset.placeId = details.placeId;
                dropoffInput.dataset.lat = details.lat;
                dropoffInput.dataset.lng = details.lng;
                dropoffInput.dataset.address = details.address;
                dropoffInput.value = details.name;

                dropoffInput.dispatchEvent(new Event('change'));
            });
        }

        // Retry Button Listener
        if (mapRetryBtn) {
            mapRetryBtn.addEventListener('click', () => {
                if (lastRouteParams) {
                    window.MapProvider.drawRoute(lastRouteParams.pickupCoords, lastRouteParams.dropCoords);
                }
            });
        }

        // Offline event bindings
        window.addEventListener('online', () => {
            toggleOverlay(mapOffline, false);
            if (lastRouteParams && !isGoogleLoaded && !isDemoMode) {
                window.MapProvider.init();
            }
        });

        window.addEventListener('offline', () => {
            toggleOverlay(mapOffline, true);
        });

        if (!navigator.onLine) {
            toggleOverlay(mapOffline, true);
        }
    });
})();
