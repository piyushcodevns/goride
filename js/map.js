"use strict";

(function() {
    // ----------------------------------------------------
    // INTERNAL STATE VARIABLES
    // ----------------------------------------------------
    let mapInstance = null;
    let pickupMarker = null;
    let dropoffMarker = null;
    
    // Google Maps Services references
    let directionsService = null;
    let directionsRenderer = null;
    let pickupAutocomplete = null;
    let dropoffAutocomplete = null;

    // Cache store for routes
    const routeCache = {};

    // DOM Elements
    const mapLoader = document.getElementById('map-loader');
    const mapRetry = document.getElementById('map-retry');
    const mapRetryBtn = document.getElementById('map-retry-btn');
    const mapOffline = document.getElementById('map-offline');

    // Callback listeners registered by booking.js
    let onRouteCalculatedCallback = null;
    let onRouteClearedCallback = null;

    // Last routing parameters (used for retries)
    let lastRouteParams = null;

    // Google API load status flag
    let isGoogleLoaded = false;

    // ----------------------------------------------------
    // MAP PROVIDER IMPLEMENTATION (OFFICIAL GOOGLE MAPS)
    // ----------------------------------------------------
    window.MapProvider = {
        // Initialize Google Maps SDK
        init: function() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // Check if Offline
            if (!navigator.onLine) {
                toggleOverlay(mapOffline, true);
                return;
            }

            const apiKey = window.APP_CONFIG.API.KEY;

            // If API Key is missing or invalid placeholder, show clear setup warning
            if (apiKey === "YOUR_API_KEY" || apiKey.trim() === "") {
                console.warn("Go Ride Warning: Google Maps API Key is the default placeholder.");
                mapContainer.innerHTML = `
                    <div class="api-setup-warning" style="width:100%;height:100%;background:#FFF1F2;border:1px solid #FECDD3;border-radius:var(--radius-sm);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center;box-sizing:border-box;color:#9F1239;font-family:'Poppins',sans-serif;height:100%;min-height:420px;">
                        <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
                        <h3 style="margin:0 0 0.5rem 0;font-size:1.15rem;font-weight:700;">Google Maps API Key Required</h3>
                        <p style="margin:0;font-size:0.82rem;line-height:1.5;max-width:300px;color:#BE123C;">Please configure a valid Google Maps API Key in <code>js/config.js</code> to enable the interactive map, places search, and directions routing.</p>
                    </div>
                `;
                return;
            }

            // Inject Google Script tag dynamically
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                isGoogleLoaded = true;
                initGoogleMapObjects();
            };
            script.onerror = () => {
                console.error("Failed to load Google Maps SDK.");
                mapContainer.innerHTML = `
                    <div class="api-setup-warning" style="width:100%;height:100%;background:#FFF1F2;border:1px solid #FECDD3;border-radius:var(--radius-sm);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center;box-sizing:border-box;color:#9F1239;font-family:'Poppins',sans-serif;height:100%;min-height:420px;">
                        <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
                        <h3 style="margin:0 0 0.5rem 0;font-size:1.15rem;font-weight:700;">SDK Load Failure</h3>
                        <p style="margin:0;font-size:0.82rem;line-height:1.5;max-width:300px;color:#BE123C;">Failed to load Google Maps SDK. Please check your network connection or API Key restrictions.</p>
                    </div>
                `;
            };
            document.head.appendChild(script);
        },

        // Fetch Driving Route and Draw Polyline
        drawRoute: function(pickupCoords, dropCoords) {
            // Validate geofence boundaries (Layer 3 Check)
            const pickupValid = this.validateServiceArea(pickupCoords);
            const dropValid = this.validateServiceArea(dropCoords);

            if (!pickupValid || !dropValid) {
                window.showToast("Currently we only operate inside Varanasi.", "error");
                this.clearRoute();
                return;
            }

            const cacheKey = `${pickupCoords.lat},${pickupCoords.lng}|${dropCoords.lat},${dropCoords.lng}`;
            lastRouteParams = { pickupCoords, dropCoords };

            // Check route cache
            if (routeCache[cacheKey]) {
                renderGoogleRoute(routeCache[cacheKey]);
                return;
            }

            toggleOverlay(mapLoader, true);
            toggleOverlay(mapRetry, false);
            toggleOverlay(mapOffline, false);

            if (directionsService && directionsRenderer) {
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
                            directionsResult: response
                        };

                        routeCache[cacheKey] = routeData;
                        renderGoogleRoute(routeData);
                    } else {
                        console.error("Directions route failed:", status);
                        toggleOverlay(mapRetry, true);
                        window.showToast("Failed to calculate driving route.", "error");
                    }
                });
            }
        },

        // Clear route polyline layers and center map
        clearRoute: function() {
            toggleOverlay(mapLoader, false);
            toggleOverlay(mapRetry, false);

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
    // INTERNAL GOOGLE MAPS DRAWING HELPERS
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

    function initGoogleMapObjects() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer || !google.maps) return;

        // Initialize Real Map object centered in Varanasi Cantt
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
                    featureType: "poi",
                    stylers: [{ visibility: "off" }]
                }
            ]
        });

        // Initialize Directions Services
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

        // Initialize Places Autocomplete Widgets on input fields
        const pickupInput = document.getElementById('pickup-input');
        const dropoffInput = document.getElementById('dropoff-input');

        if (pickupInput && dropoffInput) {
            const varanasiBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(window.APP_CONFIG.MAP_BOUNDS.south, window.APP_CONFIG.MAP_BOUNDS.west),
                new google.maps.LatLng(window.APP_CONFIG.MAP_BOUNDS.north, window.APP_CONFIG.MAP_BOUNDS.east)
            );

            const autocompleteOptions = {
                bounds: varanasiBounds,
                strictBounds: true, // Hard geofence restriction to Varanasi!
                componentRestrictions: { country: window.APP_CONFIG.COUNTRY.toLowerCase() },
                fields: ["place_id", "geometry", "formatted_address", "name"]
            };

            pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput, autocompleteOptions);
            dropoffAutocomplete = new google.maps.places.Autocomplete(dropoffInput, autocompleteOptions);

            // Bind selection listeners
            pickupAutocomplete.addListener("place_changed", () => {
                const place = pickupAutocomplete.getPlace();
                if (place && place.geometry) {
                    pickupInput.dataset.placeId = place.place_id;
                    pickupInput.dataset.lat = place.geometry.location.lat();
                    pickupInput.dataset.lng = place.geometry.location.lng();
                    pickupInput.dataset.address = place.formatted_address;
                    pickupInput.value = place.name;

                    pickupInput.dispatchEvent(new Event('change'));
                }
            });

            dropoffAutocomplete.addListener("place_changed", () => {
                const place = dropoffAutocomplete.getPlace();
                if (place && place.geometry) {
                    dropoffInput.dataset.placeId = place.place_id;
                    dropoffInput.dataset.lat = place.geometry.location.lat();
                    dropoffInput.dataset.lng = place.geometry.location.lng();
                    dropoffInput.dataset.address = place.formatted_address;
                    dropoffInput.value = place.name;

                    dropoffInput.dispatchEvent(new Event('change'));
                }
            });
        }
    }

    function renderGoogleRoute(routeData) {
        if (directionsRenderer && routeData.directionsResult) {
            directionsRenderer.setDirections(routeData.directionsResult);
            
            // Set Pickup and Destination Markers
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
                fillColor: '#22C55E', // Green Pickup Circle
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
                fillColor: '#EF4444', // Red Dropoff Circle
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3,
                scale: 8
            }
        });
    }

    // Initialize Map on page load
    document.addEventListener('DOMContentLoaded', () => {
        window.MapProvider.init();

        // Retry Button Listener
        if (mapRetryBtn) {
            mapRetryBtn.addEventListener('click', () => {
                if (lastRouteParams) {
                    window.MapProvider.drawRoute(lastRouteParams.pickupCoords, lastRouteParams.dropCoords);
                }
            });
        }

        // Online/Offline status check
        window.addEventListener('online', () => {
            toggleOverlay(mapOffline, false);
            if (lastRouteParams && !isGoogleLoaded) {
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
