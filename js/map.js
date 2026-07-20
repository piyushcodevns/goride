"use strict";

(function() {
    // ----------------------------------------------------
    // BANARAS LOCAL GEOCALLS DATABASE (51 Popular Places)
    // ----------------------------------------------------
    const VARANASI_MOCK_DB = [
        { name: "Pandeypur", address: "Pandeypur Chauraha, Varanasi, UP, 221002", lat: 25.3475, lng: 82.9961 },
        { name: "Sigra", address: "Sigra Crossroad, Varanasi, UP, 221010", lat: 25.3195, lng: 82.9845 },
        { name: "Varanasi Junction (Cantt)", address: "Varanasi Cantt Station, Varanasi, UP, 221002", lat: 25.3263, lng: 82.9866 },
        { name: "Banaras Hindu University (BHU)", address: "BHU Main Gate, Lanka, Varanasi, UP, 221005", lat: 25.2677, lng: 82.9913 },
        { name: "Lanka", address: "Lanka Chauraha, Varanasi, UP, 221005", lat: 25.2785, lng: 82.9992 },
        { name: "Assi Ghat", address: "Assi Ghat Road, Varanasi, UP, 221005", lat: 25.2882, lng: 83.0084 },
        { name: "Sarnath", address: "Sarnath Archeological Site, Varanasi, UP, 221007", lat: 25.3762, lng: 83.0227 },
        { name: "Shivpur", address: "Shivpur Road, Varanasi, UP, 221003", lat: 25.3670, lng: 82.9660 },
        { name: "Mahmoorganj", address: "Mahmoorganj, Varanasi, UP, 221010", lat: 25.3108, lng: 82.9754 },
        { name: "Lahartara", address: "Lahartara Chauraha, Varanasi, UP, 221002", lat: 25.3162, lng: 82.9645 },
        { name: "Orderly Bazar", address: "Orderly Bazar, Varanasi, UP, 221002", lat: 25.3418, lng: 82.9780 },
        { name: "Nadesar", address: "Nadesar Road, Cantt, Varanasi, UP, 221002", lat: 25.3340, lng: 82.9820 },
        { name: "Maidagin", address: "Maidagin Chauraha, Varanasi, UP, 221001", lat: 25.3210, lng: 83.0070 },
        { name: "Godowlia", address: "Godowlia Chauraha, Varanasi, UP, 221001", lat: 25.3105, lng: 83.0104 },
        { name: "Luxa", address: "Luxa Road, Varanasi, UP, 221001", lat: 25.3100, lng: 83.0010 },
        { name: "Kabir Chaura", address: "Kabir Chaura, Varanasi, UP, 221001", lat: 25.3180, lng: 83.0060 },
        { name: "Bhojuveer", address: "Bhojuveer Chauraha, Varanasi, UP, 221002", lat: 25.3480, lng: 82.9710 },
        { name: "DLW (Diesel Locomotive Works)", address: "DLW Ground, Manduadih, Varanasi, UP, 221004", lat: 25.2930, lng: 82.9560 },
        { name: "Manduadih", address: "Manduadih Station, Varanasi, UP, 221010", lat: 25.3020, lng: 82.9600 },
        { name: "Lohta", address: "Lohta Market, Varanasi, UP, 221107", lat: 25.3080, lng: 82.9150 },
        { name: "Rohania", address: "Rohania Chauraha, Varanasi, UP, 221108", lat: 25.2810, lng: 82.9230 },
        { name: "Rajatalab", address: "Rajatalab Market, Varanasi, UP, 221311", lat: 25.2680, lng: 82.8530 },
        { name: "Chetganj", address: "Chetganj Chauraha, Varanasi, UP, 221001", lat: 25.3150, lng: 83.0000 },
        { name: "Paharia", address: "Paharia Chauraha, Varanasi, UP, 221007", lat: 25.3580, lng: 83.0180 },
        { name: "Ashapur", address: "Ashapur Crossing, Varanasi, UP, 221007", lat: 25.3610, lng: 83.0330 },
        { name: "Chowk", address: "Chowk Bazar, Varanasi, UP, 221001", lat: 25.3120, lng: 83.0130 },
        { name: "Dashashwamedh Ghat", address: "Dashashwamedh Ghat Road, Varanasi, UP, 221001", lat: 25.3078, lng: 83.0101 },
        { name: "Harishchandra Ghat", address: "Harishchandra Ghat, Varanasi, UP, 221001", lat: 25.2990, lng: 83.0080 },
        { name: "Manikarnika Ghat", address: "Manikarnika Ghat Road, Varanasi, UP, 221001", lat: 25.3115, lng: 83.0135 },
        { name: "Tulsi Ghat", address: "Tulsi Ghat, Varanasi, UP, 221005", lat: 25.2860, lng: 83.0070 },
        { name: "Durga Kund Temple", address: "Durga Kund, Varanasi, UP, 221005", lat: 25.2970, lng: 83.0030 },
        { name: "Sankat Mochan Temple", address: "Sankat Mochan Road, Varanasi, UP, 221005", lat: 25.2890, lng: 83.0010 },
        { name: "Kashi Vishwanath Temple", address: "Vishwanath Gali, Chowk, Varanasi, UP, 221001", lat: 25.3109, lng: 83.0105 },
        { name: "Gyanvapi", address: "Gyanvapi Compound, Chowk, Varanasi, UP, 221001", lat: 25.3110, lng: 83.0100 },
        { name: "IP Sigra Mall", address: "Sigra Road, Varanasi, UP, 221010", lat: 25.3190, lng: 82.9850 },
        { name: "JHV Mall Cantt", address: "Mall Road, Cantt, Varanasi, UP, 221002", lat: 25.3370, lng: 82.9810 },
        { name: "Babatpur Airport", address: "Lal Bahadur Shastri Airport, Babatpur, UP, 221006", lat: 25.4490, lng: 82.8610 },
        { name: "Phulwaria", address: "Phulwaria Village Road, Varanasi, UP, 221002", lat: 25.3370, lng: 82.9640 },
        { name: "Kakarmatta", address: "Kakarmatta Crossing, Varanasi, UP, 221004", lat: 25.3050, lng: 82.9680 },
        { name: "Chitaipur", address: "Chitaipur Chauraha, Varanasi, UP, 221005", lat: 25.2830, lng: 82.9580 },
        { name: "Akhari", address: "Akhari Crossing, Varanasi, UP, 221005", lat: 25.2580, lng: 82.9460 },
        { name: "Dafi", address: "Dafi Bypass Road, Varanasi, UP, 221011", lat: 25.2520, lng: 82.9880 },
        { name: "Ramnagar Fort", address: "Ramnagar Road, Varanasi, UP, 221008", lat: 25.2680, lng: 83.0270 },
        { name: "Kashi Railway Station", address: "Kashi Station Road, Rajghat, Varanasi, UP, 221001", lat: 25.3280, lng: 83.0330 },
        { name: "Rajghat", address: "Rajghat Bridge, Varanasi, UP, 221001", lat: 25.3290, lng: 83.0300 },
        { name: "Adkeshav Ghat", address: "Adkeshav Ghat Road, Varanasi, UP, 221001", lat: 25.3370, lng: 83.0360 },
        { name: "Bhelupur", address: "Bhelupur Crossing, Varanasi, UP, 221005", lat: 25.2990, lng: 82.9960 },
        { name: "Sonarpura", address: "Sonarpura Road, Varanasi, UP, 221001", lat: 25.3000, lng: 83.0020 },
        { name: "Manduadih Crossing", address: "Manduadih crossing, Varanasi, UP, 221010", lat: 25.3030, lng: 82.9620 },
        { name: "Cholapur", address: "Cholapur Chauraha, Varanasi, UP, 221101", lat: 25.4370, lng: 83.0230 },
        { name: "Harahua", address: "Harahua Crossing, Varanasi, UP, 221105", lat: 25.3780, lng: 82.9150 }
    ];

    // ----------------------------------------------------
    // INTERNAL STATE VARIABLES
    // ----------------------------------------------------
    let demoSvgRoute = null;
    let demoPickupIcon = null;
    let demoDropIcon = null;

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

    // ----------------------------------------------------
    // MAP PROVIDER IMPLEMENTATION (DEMO MOCK ENGINE)
    // ----------------------------------------------------
    window.MapProvider = {
        // Expose resolveFirstMatch for blur handler auto-selection
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

        // Initialize Varanasi Vector Grid Map
        init: function() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // Render Varanasi grid layout vectors directly
            mapContainer.innerHTML = `
                <div class="demo-map-panel" style="width:100%;height:100%;background:#F8FAFC;position:relative;overflow:hidden;box-sizing:border-box;height:100%;min-height:420px;border-radius:var(--radius-sm);border:1px solid var(--border);">
                    <!-- Varanasi grid layout vectors -->
                    <div style="position:absolute;inset:0;background-size:24px 24px;background-image:linear-gradient(to right, #E2E8F0 1px, transparent 1px), linear-gradient(to bottom, #E2E8F0 1px, transparent 1px);"></div>
                    
                    <!-- Floating landmarks across Varanasi map -->
                    <div style="position:absolute;left:18%;top:32%;font-size:0.65rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);pointer-events:none;">📍 Cantt</div>
                    <div style="position:absolute;left:75%;top:20%;font-size:0.65rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);pointer-events:none;">📍 Pandeypur</div>
                    <div style="position:absolute;left:42%;top:65%;font-size:0.65rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);pointer-events:none;">📍 Sigra</div>
                    <div style="position:absolute;left:55%;top:40%;font-size:0.65rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);pointer-events:none;">📍 Lahartara</div>
                    <div style="position:absolute;left:28%;top:82%;font-size:0.65rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);pointer-events:none;">📍 Lanka</div>
                    <div style="position:absolute;left:80%;top:75%;font-size:0.65rem;font-weight:600;color:var(--muted);background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;border:1px solid var(--border);pointer-events:none;">📍 Sarnath</div>

                    <!-- SVG Overlay for drawing route paths -->
                    <svg id="demo-svg-path" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;">
                        <path id="demo-path-line" d="" fill="none" stroke="#2563EB" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1000" stroke-dashoffset="1000" style="transition: stroke-dashoffset 1s ease-in-out;"></path>
                    </svg>

                    <!-- Custom Marker Pins overlays -->
                    <div id="demo-pickup-pin" style="position:absolute;display:none;width:14px;height:14px;background:#22C55E;border:3px solid #FFF;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.3);transform:translate(-50%, -50%);z-index:3;"></div>
                    <div id="demo-drop-pin" style="position:absolute;display:none;width:14px;height:14px;background:#EF4444;border:3px solid #FFF;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.3);transform:translate(-50%, -50%);z-index:3;"></div>

                    <!-- Header overlay message for API status -->
                    <div style="position:absolute;top:12px;left:12px;right:12px;background:rgba(255,255,255,0.92);backdrop-filter:blur(2px);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.6rem 0.8rem;z-index:4;font-size:0.8rem;box-shadow:var(--shadow-sm);">
                        <div style="font-weight:bold;color:var(--primary);margin-bottom:2px;">Varanasi Service Area (Development Demo Mode)</div>
                        <div style="color:var(--muted);font-size:0.72rem;line-height:1.25;">Interactive map running locally. Varanasi coordinates, route rendering, and geofencing active.</div>
                    </div>

                    <!-- Footer Status -->
                    <div style="position:absolute;bottom:12px;left:12px;background:rgba(255,255,255,0.9);padding:4px 8px;border-radius:4px;font-size:0.65rem;font-weight:600;color:#22C55E;border:1px solid var(--border);z-index:4;">
                        ● Varanasi Demo Grid Active
                    </div>
                </div>
            `;

            demoSvgRoute = mapContainer.querySelector('#demo-path-line');
            demoPickupIcon = mapContainer.querySelector('#demo-pickup-pin');
            demoDropIcon = mapContainer.querySelector('#demo-drop-pin');

            // Setup custom dropdown keyboards and listeners
            setupDemoInputAutocomplete();
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
                const cachedRoute = routeCache[cacheKey];
                renderDemoRoute(cachedRoute);
                return;
            }

            toggleOverlay(mapLoader, true);
            toggleOverlay(mapRetry, false);
            toggleOverlay(mapOffline, false);

            setTimeout(() => {
                const distance = calculateHaversineDistance(pickupCoords, dropCoords);
                const duration = Math.round((distance / 35) * 60 + 2); // 35km/h avg speed + 2 min delay
                
                const routeData = {
                    distanceKm: parseFloat(distance.toFixed(1)),
                    durationMinutes: duration,
                    encodedPolyline: null,
                    pickup: pickupCoords,
                    drop: dropCoords
                };

                routeCache[cacheKey] = routeData;
                toggleOverlay(mapLoader, false);
                renderDemoRoute(routeData);
            }, 500); // 500ms loader delay
        },

        // Clear route polyline layers and center map
        clearRoute: function() {
            toggleOverlay(mapLoader, false);
            toggleOverlay(mapRetry, false);

            if (demoSvgRoute) demoSvgRoute.setAttribute('d', '');
            if (demoPickupIcon) demoPickupIcon.style.display = 'none';
            if (demoDropIcon) demoDropIcon.style.display = 'none';

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
    // INTERNAL MAP DRAWING HELPERS
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

    function renderDemoRoute(routeData) {
        if (!demoSvgRoute || !demoPickupIcon || !demoDropIcon) return;

        // Map coordinates to local canvas coordinate ratios
        const latRange = window.APP_CONFIG.MAP_BOUNDS.north - window.APP_CONFIG.MAP_BOUNDS.south;
        const lngRange = window.APP_CONFIG.MAP_BOUNDS.east - window.APP_CONFIG.MAP_BOUNDS.west;

        const getCanvasPercent = (lat, lng) => {
            const x = ((lng - window.APP_CONFIG.MAP_BOUNDS.west) / lngRange) * 100;
            const y = (1 - (lat - window.APP_CONFIG.MAP_BOUNDS.south) / latRange) * 100;
            return { x, y };
        };

        const pPercent = getCanvasPercent(routeData.pickup.lat, routeData.pickup.lng);
        const dPercent = getCanvasPercent(routeData.drop.lat, routeData.drop.lng);

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

        if (onRouteCalculatedCallback) {
            onRouteCalculatedCallback(routeData.distanceKm, routeData.durationMinutes);
        }
    }

    // ----------------------------------------------------
    // CUSTOM AUTOCOMPLETE DROPDOWN AND KEYBOARD MANAGEMENT
    // ----------------------------------------------------
    function setupDemoInputAutocomplete() {
        const pickupInput = document.getElementById('pickup-input');
        const pickupSuggestions = document.getElementById('pickup-suggestions');
        const dropoffInput = document.getElementById('dropoff-input');
        const dropoffSuggestions = document.getElementById('dropoff-suggestions');

        if (pickupInput && pickupSuggestions) {
            bindAutocomplete(pickupInput, pickupSuggestions, (details) => {
                pickupInput.dataset.placeId = details.placeId;
                pickupInput.dataset.lat = details.lat;
                pickupInput.dataset.lng = details.lng;
                pickupInput.dataset.address = details.address;
                pickupInput.value = details.name;

                pickupInput.dispatchEvent(new Event('change'));
            });
        }

        if (dropoffInput && dropoffSuggestions) {
            bindAutocomplete(dropoffInput, dropoffSuggestions, (details) => {
                dropoffInput.dataset.placeId = details.placeId;
                dropoffInput.dataset.lat = details.lat;
                dropoffInput.dataset.lng = details.lng;
                dropoffInput.dataset.address = details.address;
                dropoffInput.value = details.name;

                dropoffInput.dispatchEvent(new Event('change'));
            });
        }
    }

    function bindAutocomplete(inputEl, listEl, onSelect) {
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

        // Typings Filter
        inputEl.addEventListener('input', () => {
            const query = inputEl.value.trim().toLowerCase();
            activeIndex = -1;
            inputEl.removeAttribute('aria-activedescendant');

            if (query.length < window.APP_CONFIG.API.MIN_CHARS) {
                listEl.innerHTML = '';
                listEl.style.display = 'none';
                return;
            }

            // Filter popular Varanasi places
            const matches = VARANASI_MOCK_DB.filter(place => 
                place.name.toLowerCase().includes(query) ||
                place.address.toLowerCase().includes(query)
            ).slice(0, 5); // Limit 5 predictions

            listEl.innerHTML = '';
            if (matches.length === 0) {
                listEl.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--muted); font-size: 0.85rem;">No locations operating in Varanasi found.</li>';
                listEl.style.display = 'block';
                return;
            }

            matches.forEach((item, idx) => {
                const li = document.createElement('li');
                li.role = "option";
                li.id = `${inputEl.id}-opt-${idx}`;
                li.className = 'suggestion-item';
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.padding = '8px 12px';
                li.style.cursor = 'pointer';
                li.style.transition = 'background var(--transition)';
                li.style.borderTop = '1px solid var(--border)';

                li.innerHTML = `
                    <span style="margin-right:10px; font-size:1rem;">📍</span>
                    <div>
                        <strong style="font-size:0.88rem; color:var(--text);">${item.name}</strong><br>
                        <small style="color:var(--muted); font-size:0.75rem;">${item.address}</small>
                    </div>
                `;

                li.addEventListener('click', () => {
                    onSelect({
                        placeId: `mock-id-${item.name.replace(/\s+/g, '-')}`,
                        name: item.name,
                        address: item.address,
                        lat: item.lat,
                        lng: item.lng
                    });
                    listEl.style.display = 'none';
                });

                listEl.appendChild(li);
            });

            listEl.style.display = 'block';
        });

        // Key traversals
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

        // Hide dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            const pickupSuggestions = document.getElementById('pickup-suggestions');
            const dropoffSuggestions = document.getElementById('dropoff-suggestions');
            const pickupInput = document.getElementById('pickup-input');
            const dropoffInput = document.getElementById('dropoff-input');

            if (pickupSuggestions && e.target !== pickupInput) {
                pickupSuggestions.style.display = 'none';
            }
            if (dropoffSuggestions && e.target !== dropoffInput) {
                dropoffSuggestions.style.display = 'none';
            }
        });

        // Online/Offline status check
        window.addEventListener('online', () => {
            toggleOverlay(mapOffline, false);
        });

        window.addEventListener('offline', () => {
            toggleOverlay(mapOffline, true);
        });

        if (!navigator.onLine) {
            toggleOverlay(mapOffline, true);
        }
    });
})();
