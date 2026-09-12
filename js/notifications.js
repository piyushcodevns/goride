"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const api = window.GoRide && window.GoRide.api;
    const ui = window.GoRide && window.GoRide.ui;
    const toast = (window.GoRide && window.GoRide.showToast) || window.showToast;

    const authGate = document.getElementById("notif-auth-gate");
    const authSection = document.getElementById("notif-authenticated-section");
    const notifLoading = document.getElementById("notif-loading");
    const notifEmpty = document.getElementById("notif-empty");
    const notifList = document.getElementById("notif-list");
    const unreadCounterBadge = document.getElementById("unread-counter-badge");
    const markAllReadBtn = document.getElementById("mark-all-read-btn");
    const paginationEl = document.getElementById("notif-pagination");
    const prevPageBtn = document.getElementById("prev-page-btn");
    const nextPageBtn = document.getElementById("next-page-btn");
    const pageIndicator = document.getElementById("page-indicator");
    const filterTabs = document.querySelectorAll(".filter-tabs .tab-btn");

    if (!api || !api.isAuthenticated()) {
        if (authGate) authGate.style.display = "block";
        if (authSection) authSection.style.display = "none";
        return;
    }

    if (authGate) authGate.style.display = "none";
    if (authSection) authSection.style.display = "block";

    let currentPage = 1;
    const limit = 10;
    let totalPages = 1;
    let currentFilter = "all";
    let cachedNotifications = [];

    const getNotificationIcon = (type) => {
        switch (type) {
            case "RIDE_BOOKED":
            case "RIDE_ACCEPTED":
            case "RIDE_STARTED":
            case "RIDE_COMPLETED":
                return "🚗";
            case "RIDE_CANCELLED":
                return "❌";
            case "PAYMENT_SUCCESS":
            case "PAYMENT_REFUND":
                return "💳";
            case "PROMOTIONAL":
                return "🏷️";
            case "SAFETY":
            case "ALERT":
                return "⚠️";
            default:
                return "🔔";
        }
    };

    const updateUnreadCount = async () => {
        try {
            const res = await api.get("/api/notifications/unread-count");
            const count = (res && res.data && res.data.unreadCount) || 0;
            if (unreadCounterBadge) {
                unreadCounterBadge.textContent = count;
            }
            const navBadge = document.getElementById("nav-unread-badge");
            if (navBadge) {
                if (count > 0) {
                    navBadge.textContent = count > 99 ? "99+" : count;
                    navBadge.style.display = "inline-flex";
                } else {
                    navBadge.style.display = "none";
                }
            }
            return count;
        } catch (e) {
            return 0;
        }
    };

    const escapeHtml = (str) => {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const renderNotifications = (items) => {
        if (!notifList) return;
        notifList.innerHTML = "";

        const filtered = currentFilter === "unread"
            ? items.filter(n => n.status !== "READ")
            : items;

        if (filtered.length === 0) {
            if (notifEmpty) notifEmpty.style.display = "block";
            if (paginationEl) paginationEl.style.display = "none";
            return;
        }

        if (notifEmpty) notifEmpty.style.display = "none";

        filtered.forEach(item => {
            const isUnread = item.status !== "READ";
            const card = document.createElement("div");
            card.className = `notif-card ${isUnread ? "is-unread" : ""}`;
            card.setAttribute("data-id", item.id);

            const icon = getNotificationIcon(item.type);
            const timeStr = ui && ui.formatDate ? ui.formatDate(item.createdAt) : new Date(item.createdAt).toLocaleString();

            card.innerHTML = `
                <div class="notif-icon" aria-hidden="true">${icon}</div>
                <div class="notif-content">
                    <div class="notif-header">
                        <h4 class="notif-title">
                            ${escapeHtml(item.title || "Notification")}
                            ${isUnread ? '<span class="unread-indicator" title="Unread"></span>' : ''}
                        </h4>
                        <span class="notif-time">${timeStr}</span>
                    </div>
                    <p class="notif-message">${escapeHtml(item.message || "")}</p>
                    <div class="notif-actions">
                        ${isUnread ? `<button type="button" class="notif-action-btn mark-read-btn" data-id="${item.id}">Mark as read</button>` : ''}
                        <button type="button" class="notif-action-btn delete-btn" data-id="${item.id}">Delete</button>
                    </div>
                </div>
            `;

            notifList.appendChild(card);
        });

        notifList.querySelectorAll(".mark-read-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                await handleMarkAsRead(id);
            });
        });

        notifList.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-id");
                await handleDeleteNotification(id);
            });
        });
    };

    const loadNotifications = async (page = 1) => {
        currentPage = page;
        if (notifLoading) notifLoading.style.display = "block";
        if (notifList) notifList.innerHTML = "";
        if (notifEmpty) notifEmpty.style.display = "none";

        try {
            const query = `/api/notifications?page=${currentPage}&limit=${limit}`;
            const res = await api.get(query);

            if (res && res.success) {
                cachedNotifications = res.data || [];
                totalPages = (res.pagination && res.pagination.totalPages) || 1;

                renderNotifications(cachedNotifications);
                await updateUnreadCount();

                if (paginationEl) {
                    if (totalPages > 1 && currentFilter === "all") {
                        paginationEl.style.display = "flex";
                        if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
                        if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
                        if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
                    } else {
                        paginationEl.style.display = "none";
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load notifications:", err);
            if (toast) toast(err.message || "Failed to load notifications.", "error");
            if (notifEmpty) {
                notifEmpty.style.display = "block";
                notifEmpty.querySelector("h3").textContent = "Unable to load notifications";
                notifEmpty.querySelector("p").textContent = err.message || "Please check your network and try again.";
            }
        } finally {
            if (notifLoading) notifLoading.style.display = "none";
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await api.patch(`/api/notifications/${id}/read`);
            const item = cachedNotifications.find(n => n.id === id);
            if (item) {
                item.status = "READ";
                item.readAt = new Date().toISOString();
            }
            renderNotifications(cachedNotifications);
            await updateUnreadCount();
            if (toast) toast("Notification marked as read.", "success");
        } catch (err) {
            if (toast) toast(err.message || "Failed to mark notification as read.", "error");
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!markAllReadBtn) return;
        const origText = markAllReadBtn.innerHTML;
        markAllReadBtn.disabled = true;
        markAllReadBtn.innerHTML = `<span>⏳</span> Updating...`;

        try {
            await api.patch("/api/notifications/read-all");
            cachedNotifications.forEach(n => {
                n.status = "READ";
                n.readAt = new Date().toISOString();
            });
            renderNotifications(cachedNotifications);
            await updateUnreadCount();
            if (toast) toast("All notifications marked as read.", "success");
        } catch (err) {
            if (toast) toast(err.message || "Failed to mark all as read.", "error");
        } finally {
            markAllReadBtn.disabled = false;
            markAllReadBtn.innerHTML = origText;
        }
    };

    const handleDeleteNotification = async (id) => {
        try {
            await api.delete(`/api/notifications/${id}`);
            cachedNotifications = cachedNotifications.filter(n => n.id !== id);
            renderNotifications(cachedNotifications);
            await updateUnreadCount();
            if (toast) toast("Notification deleted.", "info");
        } catch (err) {
            if (toast) toast(err.message || "Failed to delete notification.", "error");
        }
    };

    filterTabs.forEach(btn => {
        btn.addEventListener("click", () => {
            filterTabs.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.getAttribute("data-filter") || "all";
            renderNotifications(cachedNotifications);
            if (paginationEl && currentFilter !== "all") {
                paginationEl.style.display = "none";
            } else if (paginationEl && totalPages > 1) {
                paginationEl.style.display = "flex";
            }
        });
    });

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener("click", handleMarkAllAsRead);
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener("click", () => {
            if (currentPage > 1) loadNotifications(currentPage - 1);
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener("click", () => {
            if (currentPage < totalPages) loadNotifications(currentPage + 1);
        });
    }

    await loadNotifications(1);
});
