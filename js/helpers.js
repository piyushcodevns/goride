"use strict";

(function() {
    // Default API base URL: current origin if served together, or http://localhost:5000 in dev
    const DEFAULT_API_BASE = (window.location.protocol.startsWith("http") && window.location.port !== "" && window.location.port !== "5000")
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : "";

    window.GoRide = window.GoRide || {};

    const ApiHelper = {
        BASE_URL: (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || DEFAULT_API_BASE,

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

        delete: function(endpoint, headers = {}) {
            return this.request(endpoint, { method: "DELETE", headers });
        }
    };

    window.GoRide.api = ApiHelper;
})();
