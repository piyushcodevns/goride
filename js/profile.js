"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const api = (window.GoRide && window.GoRide.api);
    const toastFn = (window.GoRide && window.GoRide.showToast) || window.showToast;

    // Check authentication
    if (!api || !api.isAuthenticated()) {
        if (toastFn) toastFn("Please sign in to view your profile.", "info");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 800);
        return;
    }

    const displayName = document.getElementById("display-name");
    const displayRole = document.getElementById("display-role");
    const userAvatar = document.getElementById("user-avatar");
    const profileForm = document.getElementById("profile-form");
    const nameInput = document.getElementById("profile-name");
    const emailInput = document.getElementById("profile-email");
    const phoneInput = document.getElementById("profile-phone");
    const genderSelect = document.getElementById("profile-gender");
    const saveBtn = document.getElementById("save-profile-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const rideHistoryList = document.getElementById("ride-history-list");

    // ----------------------------------------------------
    // Load User Profile (GET /api/users/me)
    // ----------------------------------------------------
    async function loadProfile() {
        try {
            const res = await api.get("/api/users/me");
            if (res && res.data) {
                const user = res.data;
                api.setCurrentUser(user);

                displayName.textContent = user.fullName || "User";
                displayRole.textContent = (user.role || "CUSTOMER").toUpperCase();
                userAvatar.textContent = (user.fullName || "U").charAt(0).toUpperCase();

                nameInput.value = user.fullName || "";
                emailInput.value = user.email || "";
                phoneInput.value = user.phone || "";
                genderSelect.value = user.gender || "";
            }
        } catch (err) {
            if (err.status === 401) {
                api.clearAuth();
                window.location.href = "login.html";
                return;
            }
            if (toastFn) toastFn("Failed to load profile details.", "error");
        }
    }

    // ----------------------------------------------------
    // Update User Profile (PUT /api/users/me)
    // ----------------------------------------------------
    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const newName = nameInput.value.trim();
            const newGender = genderSelect.value || null;

            if (newName.length < 3) {
                if (toastFn) toastFn("Name must be at least 3 characters.", "error");
                return;
            }

            const oldBtnText = saveBtn.textContent;
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";

            try {
                const res = await api.put("/api/users/me", {
                    fullName: newName,
                    gender: newGender
                });

                if (res && res.data) {
                    api.setCurrentUser(res.data);
                    displayName.textContent = res.data.fullName || newName;
                    userAvatar.textContent = (res.data.fullName || newName).charAt(0).toUpperCase();
                    if (toastFn) toastFn("Profile updated successfully!", "success");
                }
            } catch (err) {
                const msg = err.message || "Failed to update profile.";
                if (toastFn) toastFn(msg, "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = oldBtnText;
            }
        });
    }

    // ----------------------------------------------------
    // Load Ride History (GET /api/rides/my-rides)
    // ----------------------------------------------------
    async function loadRideHistory() {
        if (!rideHistoryList) return;

        try {
            const res = await api.get("/api/rides/my-rides");
            const rides = (res && res.data) || [];

            if (!Array.isArray(rides) || rides.length === 0) {
                rideHistoryList.innerHTML = `
                    <li class="empty-history">
                        No rides booked yet.<br>
                        <a href="booking.html" style="color: #2563EB; font-weight: 500; display: inline-block; margin-top: 8px;">Book your first ride</a>
                    </li>`;
                return;
            }

            rideHistoryList.innerHTML = "";
            rides.slice(0, 15).forEach((ride) => {
                const item = document.createElement("li");
                item.className = "ride-history-item";

                const dateStr = ride.createdAt
                    ? new Date(ride.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    })
                    : "Recent";

                const fareDisplay = (ride.fare !== undefined && ride.fare !== null)
                    ? `₹${Number(ride.fare).toFixed(2)}`
                    : (ride.estimatedFare ? `₹${Number(ride.estimatedFare).toFixed(2)}` : "—");

                const status = ride.status || "REQUESTED";

                item.innerHTML = `
                    <div class="ride-history-header">
                        <span style="color: #64748B;">${dateStr}</span>
                        <span class="ride-badge badge-${status}">${status}</span>
                    </div>
                    <div class="ride-locations">
                        <div><strong>From:</strong> ${escapeHtml(ride.pickup || "Pickup Location")}</div>
                        <div><strong>To:</strong> ${escapeHtml(ride.destination || "Destination")}</div>
                    </div>
                    <div class="ride-meta">
                        <span>Vehicle: <strong>${escapeHtml(ride.vehicleType || "Ride")}</strong></span>
                        <span style="color: #2563EB; font-weight: 600;">${fareDisplay}</span>
                    </div>
                `;
                rideHistoryList.appendChild(item);
            });
        } catch (err) {
            rideHistoryList.innerHTML = `<li class="empty-history" style="color: #DC2626;">Unable to load ride history.</li>`;
        }
    }

    // ----------------------------------------------------
    // Logout Handler
    // ----------------------------------------------------
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            api.clearAuth();
            if (toastFn) toastFn("Logged out successfully.", "success");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 600);
        });
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    await Promise.all([loadProfile(), loadRideHistory()]);
});
