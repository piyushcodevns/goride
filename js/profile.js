"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const api = window.GoRide && window.GoRide.api;
    const ui = window.GoRide && window.GoRide.ui;

    // Check authentication
    if (!api || !api.isAuthenticated()) {
        window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        return;
    }

    // DOM Elements - Profile Tab
    const displayName = document.getElementById("display-name");
    const displayRole = document.getElementById("display-role");
    const userAvatar = document.getElementById("user-avatar");
    const profileForm = document.getElementById("profile-form");
    const nameInput = document.getElementById("profile-name");
    const emailInput = document.getElementById("profile-email");
    const phoneInput = document.getElementById("profile-phone");
    const genderSelect = document.getElementById("profile-gender");
    const saveBtn = document.getElementById("save-profile-btn");
    const rideHistoryList = document.getElementById("ride-history-list");

    // DOM Elements - Security Tab
    const passwordForm = document.getElementById("change-password-form");
    const currentPassInput = document.getElementById("current-password");
    const newPassInput = document.getElementById("new-password");
    const confirmPassInput = document.getElementById("confirm-new-password");
    const changePassBtn = document.getElementById("change-password-btn");

    // DOM Elements - Notifications Tab
    const notificationsList = document.getElementById("notifications-list");
    const badgeCountElem = document.getElementById("notification-badge-count");
    const markAllReadBtn = document.getElementById("mark-all-read-btn");

    // Tab buttons & contents
    const tabButtons = document.querySelectorAll(".account-tabs .account-tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    // ----------------------------------------------------
    // Tab Navigation
    // ----------------------------------------------------
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const targetId = btn.dataset.tab;
            tabContents.forEach(content => {
                content.style.display = (content.id === targetId) ? "block" : "none";
            });

            if (targetId === "tab-notifications") {
                loadNotifications();
            }
        });
    });

    // ----------------------------------------------------
    // Load Profile Details
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
            ui.showToast(err.message || "Failed to load profile.", "error");
        }
    }

    // ----------------------------------------------------
    // Update Profile
    // ----------------------------------------------------
    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const newName = nameInput.value.trim();
            const newGender = genderSelect.value || null;

            if (newName.length < 3) {
                ui.showToast("Full name must be at least 3 characters.", "error");
                return;
            }

            const oldText = saveBtn.textContent;
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
                    ui.showToast("Profile details updated successfully!", "success");
                    ui.updateNavbar();
                }
            } catch (err) {
                ui.showToast(err.message || "Failed to update profile.", "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = oldText;
            }
        });
    }

    // ----------------------------------------------------
    // Change Password
    // ----------------------------------------------------
    if (passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const currentPassword = currentPassInput.value;
            const newPassword = newPassInput.value;
            const confirmPassword = confirmPassInput.value;

            if (newPassword.length < 8) {
                ui.showToast("New password must be at least 8 characters long.", "error");
                return;
            }

            if (newPassword !== confirmPassword) {
                ui.showToast("New passwords do not match.", "error");
                return;
            }

            changePassBtn.disabled = true;
            changePassBtn.textContent = "Updating...";

            try {
                await api.post("/api/auth/change-password", {
                    currentPassword,
                    newPassword
                });

                ui.showToast("Password changed successfully!", "success");
                passwordForm.reset();
            } catch (err) {
                ui.showToast(err.message || "Failed to change password.", "error");
            } finally {
                changePassBtn.disabled = false;
                changePassBtn.textContent = "Update Password";
            }
        });
    }

    // ----------------------------------------------------
    // Load Recent Rides
    // ----------------------------------------------------
    async function loadRecentRides() {
        if (!rideHistoryList) return;

        try {
            const res = await api.get("/api/rides/my-rides");
            const rides = (res && Array.isArray(res.data)) ? res.data : [];

            if (rides.length === 0) {
                rideHistoryList.innerHTML = `
                    <li style="text-align: center; padding: 24px; color: var(--color-text-secondary);">
                        No rides booked yet.<br>
                        <a href="booking.html" style="color: var(--color-primary); font-weight: 600; display: inline-block; margin-top: 8px;">Book your first ride</a>
                    </li>
                `;
                return;
            }

            rideHistoryList.innerHTML = "";
            rides.slice(0, 5).forEach(ride => {
                const item = document.createElement("li");
                item.style.cssText = "padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface);";

                const statusInfo = ui.formatStatus(ride.status);
                const fare = Number(ride.finalFare) || Number(ride.fare) || 0;

                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 0.82rem; color: var(--color-text-secondary);">${ui.formatDate(ride.createdAt)}</span>
                        <span class="status-indicator ${statusInfo.className}" style="font-size: 0.75rem; padding: 2px 8px;">${statusInfo.label}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--color-text-primary); font-weight: 500; margin-bottom: 6px;">
                        📍 ${escapeHtml(ride.destination || "Destination")}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: var(--color-primary);">${ui.formatCurrency(fare)}</span>
                        <a href="ride.html?id=${encodeURIComponent(ride.id)}" style="font-size: 0.85rem; color: var(--color-primary); text-decoration: none; font-weight: 600;">Track →</a>
                    </div>
                `;
                rideHistoryList.appendChild(item);
            });
        } catch (e) {
            rideHistoryList.innerHTML = `<li style="text-align: center; color: #DC2626; padding: 16px;">Unable to load recent rides.</li>`;
        }
    }

    // ----------------------------------------------------
    // Load Notifications
    // ----------------------------------------------------
    async function loadNotifications() {
        if (!notificationsList) return;

        try {
            const res = await api.get("/api/notifications");
            const notifications = (res && Array.isArray(res.data)) ? res.data : [];

            if (notifications.length === 0) {
                notificationsList.innerHTML = `<li style="text-align: center; padding: 24px; color: var(--color-text-secondary);">No notifications found.</li>`;
                return;
            }

            notificationsList.innerHTML = "";
            notifications.forEach(notif => {
                const li = document.createElement("li");
                const isUnread = !notif.isRead;
                li.className = `notification-item ${isUnread ? "unread" : ""}`;

                li.innerHTML = `
                    <div style="flex: 1;">
                        <h4>${escapeHtml(notif.title || "Notification")}</h4>
                        <p>${escapeHtml(notif.message || "")}</p>
                        <span class="notification-time">${ui.formatDate(notif.createdAt)}</span>
                    </div>
                    ${isUnread ? `<button type="button" class="mark-read-btn" data-id="${notif.id}">Mark read</button>` : ""}
                `;
                notificationsList.appendChild(li);
            });

            // Wire individual mark read buttons
            notificationsList.querySelectorAll(".mark-read-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.dataset.id;
                    try {
                        await api.patch(`/api/notifications/${encodeURIComponent(id)}/read`);
                        loadNotifications();
                        updateUnreadCount();
                    } catch (err) {
                        ui.showToast("Failed to mark notification as read.", "error");
                    }
                });
            });
        } catch (err) {
            notificationsList.innerHTML = `<li style="text-align: center; color: #DC2626; padding: 16px;">Failed to load notifications.</li>`;
        }
    }

    // Unread count
    async function updateUnreadCount() {
        if (!badgeCountElem) return;
        try {
            const res = await api.get("/api/notifications/unread-count");
            const count = (res && typeof res.data === "number") ? res.data : (res && res.count) || 0;
            if (count > 0) {
                badgeCountElem.textContent = count;
                badgeCountElem.style.display = "inline";
            } else {
                badgeCountElem.style.display = "none";
            }
        } catch (e) {
            badgeCountElem.style.display = "none";
        }
    }

    // Mark all read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener("click", async () => {
            try {
                await api.patch("/api/notifications/read-all");
                ui.showToast("All notifications marked as read.", "success");
                loadNotifications();
                updateUnreadCount();
            } catch (err) {
                ui.showToast("Failed to mark all as read.", "error");
            }
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

    // Initial loads
    await Promise.all([loadProfile(), loadRecentRides(), updateUnreadCount()]);
});
