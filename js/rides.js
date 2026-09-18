"use strict";

(function() {
    const loadingElem = document.getElementById("rides-loading");
    const emptyElem = document.getElementById("rides-empty");
    const listElem = document.getElementById("rides-list");
    const emptyMessage = document.getElementById("empty-message");
    const tabButtons = document.querySelectorAll(".filter-tabs .tab-btn");

    let allRides = [];
    let currentFilter = "ALL";

    // Check auth
    const api = window.GoRide.api;
    const ui = window.GoRide.ui;

    if (!api || !api.isAuthenticated()) {
        window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        return;
    }

    // Render single ride card
    function createRideCard(ride) {
        const shortId = `GR-${String(ride.id).slice(-8).toUpperCase()}`;
        const statusMeta = ui.formatStatus(ride.status);
        const fare = Number(ride.finalFare) || Number(ride.fare) || 0;
        const vehicle = ride.vehicleType || "CAR";

        const card = document.createElement("div");
        card.className = "ride-history-card";

        const isTerminal = (ride.status === "COMPLETED" || ride.status === "CANCELLED" || ride.status === "REJECTED");
        const actionText = isTerminal ? "View Details" : "Track Live Ride 🔴";

        card.innerHTML = `
            <div class="card-top-meta">
                <div>
                    <span class="booking-tag">${shortId}</span>
                    <span class="booking-date">• ${ui.formatDate(ride.createdAt)}</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="badge-secondary" style="font-size: 0.78rem; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: #F1F5F9; color: #334155;">${vehicle}</span>
                    <span class="status-indicator ${statusMeta.className}" style="font-size: 0.8rem; padding: 2px 10px;">
                        ${statusMeta.label}
                    </span>
                </div>
            </div>
            <div class="card-route-info">
                <div>
                    <div class="route-stop">
                        <span class="route-stop-icon">🟢</span>
                        <span class="route-stop-text"><strong>Pickup:</strong> ${ride.pickup || "Pickup Location"}</span>
                    </div>
                    <div class="route-stop">
                        <span class="route-stop-icon">🔴</span>
                        <span class="route-stop-text"><strong>Drop-off:</strong> ${ride.destination || "Destination"}</span>
                    </div>
                </div>
                <div class="card-price-action">
                    <span class="price-tag">${ui.formatCurrency(fare)}</span>
                    <a href="ride.html?id=${encodeURIComponent(ride.id)}" class="primary-btn" style="padding: 0.45rem 1rem; font-size: 0.85rem; text-decoration: none; border-radius: var(--radius-full);">
                        ${actionText}
                    </a>
                </div>
            </div>
        `;

        return card;
    }

    // Filter and render list
    function filterAndRender() {
        listElem.innerHTML = "";

        let filtered = allRides;

        if (currentFilter === "ACTIVE") {
            filtered = allRides.filter(r =>
                r.status === "REQUESTED" ||
                r.status === "SEARCHING" ||
                r.status === "DRIVER_ASSIGNED" ||
                r.status === "ACCEPTED" ||
                r.status === "ARRIVED" ||
                r.status === "STARTED"
            );
        } else if (currentFilter === "COMPLETED") {
            filtered = allRides.filter(r => r.status === "COMPLETED");
        } else if (currentFilter === "CANCELLED") {
            filtered = allRides.filter(r => r.status === "CANCELLED" || r.status === "REJECTED");
        }

        if (filtered.length === 0) {
            listElem.style.display = "none";
            emptyElem.style.display = "block";
            if (currentFilter === "ACTIVE") {
                emptyMessage.textContent = "You have no ongoing trips right now.";
            } else if (currentFilter === "COMPLETED") {
                emptyMessage.textContent = "No completed trips found in your account.";
            } else if (currentFilter === "CANCELLED") {
                emptyMessage.textContent = "No cancelled trips found.";
            } else {
                emptyMessage.textContent = "You haven't taken any rides yet. Ready for your first journey?";
            }
        } else {
            emptyElem.style.display = "none";
            listElem.style.display = "flex";
            filtered.forEach(ride => {
                listElem.appendChild(createRideCard(ride));
            });
        }
    }

    // Fetch rides from backend
    async function loadRides() {
        loadingElem.style.display = "block";
        emptyElem.style.display = "none";
        listElem.style.display = "none";

        try {
            const res = await api.get("/api/rides/my-rides");
            loadingElem.style.display = "none";

            if (res && Array.isArray(res.data)) {
                // Sort descending by createdAt
                allRides = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                filterAndRender();
            } else {
                allRides = [];
                filterAndRender();
            }
        } catch (err) {
            loadingElem.style.display = "none";
            emptyElem.style.display = "block";
            emptyMessage.textContent = err.message || "Unable to load your rides. Please try again later.";
        }
    }

    // Setup filter tab clicks
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter || "ALL";
            filterAndRender();
        });
    });

    loadRides();
})();
