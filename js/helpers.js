"use strict";

(function() {
    // Determine API Base URL intelligently
    let defaultBase = "http://localhost:5000";
    if (window.location.protocol.startsWith("http")) {
        if (window.location.port === "5000") {
            defaultBase = "";
        } else if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            defaultBase = `${window.location.protocol}//${window.location.hostname}:5000`;
        }
    }

    window.GoRide = window.GoRide || {};

    const ApiHelper = {
        BASE_URL: (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || defaultBase,

        getToken: function() {
            return localStorage.getItem("goride_token") || "";
        },

        setToken: function(token) {
            if (token) {
                localStorage.setItem("goride_token", token);
            } else {
                localStorage.removeItem("goride_token");
            }
        },

        getCurrentUser: function() {
            try {
                const user = localStorage.getItem("goride_user");
                return user ? JSON.parse(user) : null;
            } catch (e) {
                return null;
            }
        },

        setCurrentUser: function(user) {
            if (user) {
                localStorage.setItem("goride_user", JSON.stringify(user));
            } else {
                localStorage.removeItem("goride_user");
            }
        },

        clearAuth: function() {
            localStorage.removeItem("goride_token");
            localStorage.removeItem("goride_user");
        },

        isAuthenticated: function() {
            return Boolean(this.getToken());
        },

        request: async function(endpoint, options = {}) {
            const url = endpoint.startsWith("http") ? endpoint : `${this.BASE_URL}${endpoint}`;
            const headers = Object.assign(
                {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                options.headers || {}
            );

            const token = this.getToken();
            if (token && !headers["Authorization"]) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const fetchOptions = {
                ...options,
                headers
            };

            try {
                const response = await fetch(url, fetchOptions);
                let data = null;
                const contentType = response.headers.get("content-type") || "";

                if (contentType.includes("application/json")) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    data = { message: text };
                }

                if (!response.ok) {
                    let errMsg = (data && data.message) || (data && data.error) || `Request failed with status ${response.status}`;
                    if (data && data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                        errMsg = data.errors[0].message || errMsg;
                    }

                    if (response.status === 401) {
                        if (token) {
                            this.clearAuth();
                        }
                    }

                    const err = new Error(errMsg);
                    err.status = response.status;
                    err.data = data;
                    throw err;
                }

                return data;
            } catch (error) {
                throw error;
            }
        },

        get: function(endpoint, headers = {}) {
            return this.request(endpoint, { method: "GET", headers });
        },

        post: function(endpoint, body, headers = {}) {
            return this.request(endpoint, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });
        },

        put: function(endpoint, body, headers = {}) {
            return this.request(endpoint, {
                method: "PUT",
                headers,
                body: JSON.stringify(body)
            });
        },

        patch: function(endpoint, body, headers = {}) {
            return this.request(endpoint, {
                method: "PATCH",
                headers,
                body: body ? JSON.stringify(body) : undefined
            });
        },

        delete: function(endpoint, headers = {}) {
            return this.request(endpoint, { method: "DELETE", headers });
        }
    };

    // UI Formatting and navigation helpers
    const UIHelpers = {
        formatCurrency: function(amount) {
            const val = Number(amount) || 0;
            return `₹${val.toFixed(2)}`;
        },

        formatDate: function(dateStr) {
            if (!dateStr) return "N/A";
            try {
                const d = new Date(dateStr);
                return d.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                });
            } catch (e) {
                return dateStr;
            }
        },

        formatStatus: function(status) {
            if (!status) return { label: "UNKNOWN", className: "badge-secondary" };
            const map = {
                "REQUESTED": { label: "Requested", className: "badge-warning" },
                "SEARCHING": { label: "Searching Driver", className: "badge-info" },
                "DRIVER_ASSIGNED": { label: "Driver Assigned", className: "badge-info" },
                "ACCEPTED": { label: "Accepted", className: "badge-primary" },
                "ARRIVED": { label: "Driver Arrived", className: "badge-primary" },
                "STARTED": { label: "On Trip", className: "badge-primary" },
                "COMPLETED": { label: "Completed", className: "badge-success" },
                "CANCELLED": { label: "Cancelled", className: "badge-danger" },
                "REJECTED": { label: "Rejected", className: "badge-secondary" },
                "PENDING": { label: "Pending", className: "badge-warning" },
                "SUCCESS": { label: "Success", className: "badge-success" },
                "FAILED": { label: "Failed", className: "badge-danger" },
                "REFUNDED": { label: "Refunded", className: "badge-secondary" }
            };
            return map[status] || { label: status, className: "badge-secondary" };
        },

        showToast: function(message, type = "info") {
            if (window.GoRide && typeof window.GoRide.showToast === "function" && window.GoRide.showToast !== UIHelpers.showToast) {
                window.GoRide.showToast(message, type);
                return;
            }
            let container = document.getElementById("toast-container");
            if (!container) {
                container = document.createElement("div");
                container.id = "toast-container";
                container.className = "toast-container";
                document.body.appendChild(container);
            }
            const toast = document.createElement("div");
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => {
                toast.classList.add("fade-out");
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        updateNavbar: function() {
            const navButtons = document.querySelector(".nav-buttons");
            const navLinks = document.querySelector(".nav-links");
            const isAuth = ApiHelper.isAuthenticated();
            const user = ApiHelper.getCurrentUser();

            if (navButtons) {
                if (isAuth && user) {
                    const firstName = (user.fullName || "Account").split(" ")[0];
                    navButtons.innerHTML = `
                        <a href="notifications.html" class="nav-btn nav-btn-outline nav-btn-notif" title="Notifications" style="position: relative;">
                            <span>🔔</span>
                            <span id="nav-unread-badge" class="nav-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #DC2626; color: #fff; font-size: 0.68rem; font-weight: 700; border-radius: 999px; padding: 2px 6px; min-width: 16px; text-align: center; line-height: 1.1;">0</span>
                        </a>
                        <a href="rides.html" class="nav-btn nav-btn-outline" title="My Rides">
                            <span>🚗 My Rides</span>
                        </a>
                        <a href="profile.html" class="nav-btn nav-btn-profile" title="Profile">
                            <span class="user-avatar-mini">${firstName.charAt(0).toUpperCase()}</span>
                            <span>${firstName}</span>
                        </a>
                        <button type="button" id="nav-logout-btn" class="nav-btn nav-btn-logout" title="Log Out">Logout</button>
                    `;

                    // Fetch unread count for badge
                    ApiHelper.get("/api/notifications/unread-count").then(res => {
                        const count = (res && res.data && res.data.unreadCount) || 0;
                        const badge = document.getElementById("nav-unread-badge");
                        if (badge) {
                            if (count > 0) {
                                badge.textContent = count > 99 ? "99+" : count;
                                badge.style.display = "inline-block";
                            } else {
                                badge.style.display = "none";
                            }
                        }
                    }).catch(() => {});

                    const logoutBtn = document.getElementById("nav-logout-btn");
                    if (logoutBtn) {
                        logoutBtn.addEventListener("click", () => {
                            ApiHelper.clearAuth();
                            UIHelpers.showToast("Logged out successfully.", "info");
                            setTimeout(() => {
                                window.location.href = "index.html";
                            }, 500);
                        });
                    }
                } else {
                    navButtons.innerHTML = `
                        <a href="login.html" class="login-btn">Login</a>
                        <a href="booking.html" class="book-btn">Book Ride</a>
                    `;
                }
            }

            if (navLinks && isAuth) {
                const becomeDriver = navLinks.querySelector('a[href="driver-signup.html"]');
                const targetParent = becomeDriver ? becomeDriver.parentElement : null;

                const existingRidesLink = navLinks.querySelector('a[href="rides.html"]');
                if (!existingRidesLink) {
                    const li = document.createElement("li");
                    li.innerHTML = '<a class="nav-link" href="rides.html">My Rides</a>';
                    if (targetParent) {
                        navLinks.insertBefore(li, targetParent);
                    } else {
                        navLinks.appendChild(li);
                    }
                }

                const existingNotifLink = navLinks.querySelector('a[href="notifications.html"]');
                if (!existingNotifLink) {
                    const li = document.createElement("li");
                    li.innerHTML = '<a class="nav-link" href="notifications.html">Notifications</a>';
                    if (targetParent) {
                        navLinks.insertBefore(li, targetParent);
                    } else {
                        navLinks.appendChild(li);
                    }
                }
            }
        }
    };

    window.GoRide.api = ApiHelper;
    window.GoRide.ui = UIHelpers;
    window.GoRide.showToast = UIHelpers.showToast;

    // Run updateNavbar on DOMContentLoaded
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", UIHelpers.updateNavbar);
    } else {
        UIHelpers.updateNavbar();
    }
})();
