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
        const setFieldError = (input, message) => {
            if (!input) return;
            input.classList.add("input-error");
            input.setAttribute("aria-invalid", "true");
            let errorEl = input.parentElement.querySelector(".field-error");
            if (!errorEl) {
                errorEl = document.createElement("div");
                errorEl.className = "field-error";
                input.parentElement.appendChild(errorEl);
            }
            errorEl.textContent = message;
        };

        const clearFieldErrors = () => {
            passwordForm.querySelectorAll(".input-error").forEach((el) => {
                el.classList.remove("input-error");
                el.removeAttribute("aria-invalid");
            });
            passwordForm.querySelectorAll(".field-error").forEach((el) => el.remove());
        };

        [currentPassInput, newPassInput, confirmPassInput].forEach((input) => {
            if (!input) return;
            input.addEventListener("input", () => {
                input.classList.remove("input-error");
                input.removeAttribute("aria-invalid");
                const err = input.parentElement.querySelector(".field-error");
                if (err) err.remove();
            });
        });

        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearFieldErrors();

            const currentPassword = currentPassInput.value;
            const newPassword = newPassInput.value;
            const confirmPassword = confirmPassInput.value;

            if (!currentPassword) {
                setFieldError(currentPassInput, "Current password is required.");
                ui.showToast("Please enter your current password.", "error");
                currentPassInput.focus();
                return;
            }

            if (newPassword.length < 8) {
                setFieldError(newPassInput, "New password must be at least 8 characters long.");
                ui.showToast("New password must be at least 8 characters long.", "error");
                newPassInput.focus();
                return;
            }

            if (newPassword !== confirmPassword) {
                setFieldError(confirmPassInput, "New passwords do not match.");
                ui.showToast("New passwords do not match.", "error");
                confirmPassInput.focus();
                return;
            }

            changePassBtn.disabled = true;
            changePassBtn.textContent = "Updating...";

            try {
                await api.post("/api/auth/change-password", {
                    currentPassword,
                    newPassword,
                    confirmPassword
                });

                clearFieldErrors();
                ui.showToast("Password changed successfully!", "success");
                passwordForm.reset();
            } catch (err) {
                const rawMsg = (err && err.message) || "";

                if (rawMsg.includes("Current password is incorrect")) {
                    setFieldError(currentPassInput, "Current password is incorrect.");
                    ui.showToast("Current password is incorrect. Please try again.", "error");
                    currentPassInput.focus();
                } else if (rawMsg.includes("different from current password")) {
                    setFieldError(newPassInput, "New password must be different from current password.");
                    ui.showToast("New password must be different from current password.", "error");
                    newPassInput.focus();
                } else if (rawMsg.includes("do not match")) {
                    setFieldError(confirmPassInput, "New passwords do not match.");
                    ui.showToast("New passwords do not match.", "error");
                    confirmPassInput.focus();
                } else if (rawMsg.includes("uppercase, lowercase, number")) {
                    setFieldError(newPassInput, "Password must contain uppercase, lowercase, number, and special character.");
                    ui.showToast("Please choose a stronger password.", "error");
                    newPassInput.focus();
                } else {
                    let handledZod = false;
                    try {
                        if (rawMsg.startsWith("[") && rawMsg.endsWith("]")) {
                            const parsed = JSON.parse(rawMsg);
                            if (Array.isArray(parsed)) {
                                parsed.forEach((issue) => {
                                    const path = Array.isArray(issue.path) ? issue.path[0] : "";
                                    if (path === "currentPassword") {
                                        setFieldError(currentPassInput, "Current password is required.");
                                    } else if (path === "newPassword") {
                                        setFieldError(newPassInput, "Password must be at least 8 characters with uppercase, lowercase, number, and special character.");
                                    } else if (path === "confirmPassword") {
                                        setFieldError(confirmPassInput, "Password confirmation is required.");
                                    }
                                });
                                ui.showToast("Please correct the errors in the form.", "error");
                                handledZod = true;
                            }
                        }
                    } catch {
                        // ignore JSON parse failure
                    }

                    if (!handledZod) {
                        const cleanMsg = (rawMsg && !rawMsg.startsWith("{") && !rawMsg.startsWith("["))
                            ? rawMsg
                            : "Failed to change password. Please try again.";
                        ui.showToast(cleanMsg, "error");
                    }
                }
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
