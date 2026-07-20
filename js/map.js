"use strict";

(function() {
    let map = null;
    let activeAbortController = null;

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

        // Photon Search API fetch with Varanasi bias (Phase 2)
        search: function(query, inputEl, listEl, onSelect) {
            if (activeAbortController) {
                activeAbortController.abort();
            }

            activeAbortController = new AbortController();
            const signal = activeAbortController.signal;

            // Show Loading Spinner / Searching text
            listEl.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--muted); font-size: 0.85rem; display: flex; align-items: center;">⏳ Searching locations...</li>';
            listEl.style.display = 'block';

            // Photon API Query with Varanasi constraint bias
            const searchQuery = `${query.trim()}, Varanasi`;
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5`;

            fetch(url, { signal })
                .then(res => res.json())
                .then(data => {
                    renderSuggestionsList(data.features, inputEl, listEl, onSelect);
                })
                .catch(err => {
                    if (err.name === 'AbortError') return;
                    console.error("Photon autocomplete failed:", err);
                    listEl.innerHTML = '<li class="info-item error-item" style="padding: 10px; color: var(--accent); font-size: 0.85rem;">⚠️ Unable to fetch locations.</li>';
                });
        },

        drawRoute: function(pickupCoords, dropCoords) {
            // Stubbed for Phase 3
        },

        clearRoute: function() {
            // Stubbed for Phase 3
        },

        validateServiceArea: function(coords) {
            // Stubbed for Phase 3
            return true;
        },

        registerRouteCalculated: function(callback) {
            // Stubbed for Phase 3
        },

        registerRouteCleared: function(callback) {
            // Stubbed for Phase 3
        }
    };

    // Render suggestion elements into dropdown
    function renderSuggestionsList(features, inputEl, listEl, onSelect) {
        listEl.innerHTML = '';
        if (!features || features.length === 0) {
            listEl.innerHTML = '<li class="info-item" style="padding: 10px; color: var(--muted); font-size: 0.85rem;">No locations found.</li>';
            return;
        }

        features.forEach((feature, idx) => {
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

            const props = feature.properties;
            const mainText = props.name;
            const secText = [props.street, props.city, props.state].filter(Boolean).join(', ') || "Varanasi, Uttar Pradesh";

            li.innerHTML = `
                <span style="margin-right:10px; font-size:1rem;">📍</span>
                <div style="text-align: left;">
                    <strong style="font-size:0.88rem; color:var(--text);">${mainText}</strong><br>
                    <small style="color:var(--muted); font-size:0.75rem;">${secText}</small>
                </div>
            `;

            li.addEventListener('click', () => {
                const lng = feature.geometry.coordinates[0];
                const lat = feature.geometry.coordinates[1];
                onSelect({
                    placeId: `photon-${feature.properties.osm_id || Math.random()}`,
                    name: mainText,
                    address: `${mainText}, ${secText}`,
                    lat: parseFloat(lat),
                    lng: parseFloat(lng)
                });
                listEl.style.display = 'none';
            });
            listEl.appendChild(li);
        });

        listEl.style.display = 'block';
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
