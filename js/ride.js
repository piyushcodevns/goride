"use strict";

(function() {
    // ----------------------------------------------------
    // STATE & DOM ELEMENTS
    // ----------------------------------------------------
    const urlParams = new URLSearchParams(window.location.search);
    const rideId = urlParams.get("id");

    const loadingElem = document.getElementById("tracking-loading");
    const errorElem = document.getElementById("tracking-error");
    const contentElem = document.getElementById("tracking-content");

    const bookingIdHeader = document.getElementById("ride-booking-id-header");
    const statusBadge = document.getElementById("ride-status-badge");
    const statusText = document.getElementById("ride-status-text");
    const statusHeadline = document.getElementById("status-headline");
    const statusDescription = document.getElementById("status-description");
    const vehicleTypeBadge = document.getElementById("ride-vehicle-type");

    const pickupAddressElem = document.getElementById("pickup-address");
    const destinationAddressElem = document.getElementById("destination-address");

    const driverCard = document.getElementById("driver-card");
    const driverAvatar = document.getElementById("driver-avatar");
    const driverNameElem = document.getElementById("driver-name");
    const driverRatingElem = document.getElementById("driver-rating-val");
    const driverRidesElem = document.getElementById("driver-rides-count");
    const driverVehicleElem = document.getElementById("driver-vehicle-details");

    const fareAmountElem = document.getElementById("fare-amount");
    const discountRow = document.getElementById("discount-row");
    const discountAmountElem = document.getElementById("discount-amount");
    const finalFareAmountElem = document.getElementById("final-fare-amount");
    const paymentBadge = document.getElementById("payment-badge");

    const cancelBtn = document.getElementById("cancel-ride-btn");
    const payNowBtn = document.getElementById("pay-now-btn");
    const rateRideBtn = document.getElementById("rate-ride-btn");

    // Modals
    const paymentModal = document.getElementById("payment-modal");
    const modalPayAmount = document.getElementById("modal-pay-amount");
    const confirmPayBtn = document.getElementById("confirm-pay-btn");
    const closePayBtn = document.getElementById("close-pay-btn");

    const reviewModal = document.getElementById("review-modal");
    const reviewDriverName = document.getElementById("review-driver-name");
    const starContainer = document.getElementById("star-container");
    const reviewComment = document.getElementById("review-comment");
    const submitReviewBtn = document.getElementById("submit-review-btn");
    const closeReviewBtn = document.getElementById("close-review-btn");

    let currentRide = null;
    let pollInterval = null;
    let leafletMap = null;
    let routeLayer = null;
    let selectedRating = 5;

    // ----------------------------------------------------
    // MAP INITIALIZATION
    // ----------------------------------------------------
    function initMap(pickupLat, pickupLng, destLat, destLng) {
        if (!window.L) return;

        const mapContainer = document.getElementById("ride-map");
        if (!mapContainer) return;

        if (leafletMap) {
            leafletMap.remove();
            leafletMap = null;
        }

        const centerLat = (pickupLat + destLat) / 2 || 25.3176;
        const centerLng = (pickupLng + destLng) / 2 || 82.9739;

        leafletMap = window.L.map("ride-map").setView([centerLat, centerLng], 13);

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap contributors"
        }).addTo(leafletMap);

        const markers = [];

        if (pickupLat && pickupLng) {
            const pickupMarker = window.L.marker([pickupLat, pickupLng], {
                title: "Pickup"
            }).addTo(leafletMap).bindPopup("<b>Pickup Location</b>").openPopup();
            markers.push(pickupMarker);
        }

        if (destLat && destLng) {
            const destMarker = window.L.marker([destLat, destLng], {
                title: "Destination"
            }).addTo(leafletMap).bindPopup("<b>Destination</b>");
            markers.push(destMarker);
        }

        if (pickupLat && pickupLng && destLat && destLng) {
            const latlngs = [
                [pickupLat, pickupLng],
                [destLat, destLng]
            ];
            routeLayer = window.L.polyline(latlngs, { color: "#2563EB", weight: 5, opacity: 0.8 }).addTo(leafletMap);
            leafletMap.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });
        }
    }

    // ----------------------------------------------------
    // RIDE DETAILS RENDERING
    // ----------------------------------------------------
    function renderRideDetails(ride) {
        currentRide = ride;
        const api = window.GoRide.api;
        const ui = window.GoRide.ui;

        loadingElem.style.display = "none";
        errorElem.style.display = "none";
        contentElem.style.display = "grid";

        // Header booking ID
        const shortId = `GR-${String(ride.id).slice(-8).toUpperCase()}`;
        bookingIdHeader.textContent = `Booking ID: ${shortId} • Placed on ${ui.formatDate(ride.createdAt)}`;

        // Status headline & subtext
        statusText.textContent = ride.status;
        vehicleTypeBadge.textContent = ride.vehicleType || "CAR";

        const statusInfo = ui.formatStatus(ride.status);
        statusBadge.className = `status-indicator ${statusInfo.className}`;

        switch (ride.status) {
            case "REQUESTED":
            case "SEARCHING":
                statusHeadline.textContent = "Looking for Nearby Drivers";
                statusDescription.textContent = "We are matching your ride request with the nearest available drivers.";
                cancelBtn.style.display = "block";
                payNowBtn.style.display = "none";
                rateRideBtn.style.display = "none";
                break;
            case "DRIVER_ASSIGNED":
            case "ACCEPTED":
                statusHeadline.textContent = "Driver Accepted Your Ride!";
                statusDescription.textContent = "Your driver is heading towards your pickup location.";
                cancelBtn.style.display = "block";
                payNowBtn.style.display = "none";
                rateRideBtn.style.display = "none";
                break;
            case "ARRIVED":
                statusHeadline.textContent = "Driver Has Arrived!";
                statusDescription.textContent = "Your driver is waiting at the pickup point.";
                cancelBtn.style.display = "none";
                payNowBtn.style.display = "none";
                rateRideBtn.style.display = "none";
                break;
            case "STARTED":
                statusHeadline.textContent = "Trip in Progress";
                statusDescription.textContent = "Enjoy your ride! Sit back and track your destination live.";
                cancelBtn.style.display = "none";
                payNowBtn.style.display = "none";
                rateRideBtn.style.display = "none";
                break;
            case "COMPLETED":
                statusHeadline.textContent = "Trip Completed Successfully 🎉";
                statusDescription.textContent = "Thank you for riding with Go Ride. Hope you had a pleasant trip!";
                cancelBtn.style.display = "none";
                rateRideBtn.style.display = "block";
                break;
            case "CANCELLED":
                statusHeadline.textContent = "Ride Cancelled";
                statusDescription.textContent = "This ride was cancelled.";
                cancelBtn.style.display = "none";
                payNowBtn.style.display = "none";
                rateRideBtn.style.display = "none";
                break;
            default:
                statusHeadline.textContent = `Ride Status: ${ride.status}`;
                statusDescription.textContent = "Tracking active updates.";
                break;
        }

        // Driver details
        if (ride.driver && ride.driver.user) {
            driverCard.style.display = "block";
            const driverUser = ride.driver.user;
            driverNameElem.textContent = driverUser.fullName || "Assigned Driver";
            driverAvatar.textContent = (driverUser.fullName || "D").charAt(0).toUpperCase();

            const rating = Number(ride.driver.rating);
            if (!isNaN(rating) && rating > 0) {
                driverRatingElem.textContent = rating.toFixed(1);
            } else {
                driverRatingElem.textContent = "New";
            }

            if (ride.driver.totalRides !== undefined && ride.driver.totalRides !== null) {
                driverRidesElem.textContent = `(${ride.driver.totalRides} rides)`;
            } else {
                driverRidesElem.textContent = "(Verified Partner)";
            }

            if (ride.driver.vehicle) {
                const v = ride.driver.vehicle;
                const vehicleParts = [];
                if (v.make || v.model) vehicleParts.push(`${v.make || ''} ${v.model || ''}`.trim());
                if (v.licensePlate) vehicleParts.push(v.licensePlate);
                driverVehicleElem.textContent = vehicleParts.join(" • ") || `${ride.vehicleType || 'Vehicle'} • Verified Partner`;
            } else {
                driverVehicleElem.textContent = `${ride.vehicleType || 'Vehicle'} • Verified Partner`;
            }

            if (reviewDriverName) {
                reviewDriverName.textContent = driverUser.fullName || "your driver";
            }
        } else {
            driverCard.style.display = "none";
        }

        // Route timeline
        pickupAddressElem.textContent = ride.pickup || "Pickup address";
        destinationAddressElem.textContent = ride.destination || "Destination address";

        // Fare calculation
        const fare = Number(ride.fare) || 0;
        const discount = Number(ride.discountAmount) || 0;
        const finalFare = Number(ride.finalFare) || Math.max(0, fare - discount);

        fareAmountElem.textContent = ui.formatCurrency(fare);
        if (discount > 0) {
            discountRow.style.display = "flex";
            discountAmountElem.textContent = `-${ui.formatCurrency(discount)}`;
        } else {
            discountRow.style.display = "none";
        }
        finalFareAmountElem.textContent = ui.formatCurrency(finalFare);

        // Payment status
        if (ride.paymentStatus === "COMPLETED" || ride.paymentStatus === "SUCCESS" || ride.paymentStatus === "PAID") {
            paymentBadge.className = "payment-status-badge badge-success";
            paymentBadge.textContent = "✓ Paid";
            payNowBtn.style.display = "none";
        } else {
            paymentBadge.className = "payment-status-badge badge-warning";
            paymentBadge.textContent = "Payment Pending";
            if (ride.status === "COMPLETED") {
                payNowBtn.style.display = "block";
                modalPayAmount.textContent = ui.formatCurrency(finalFare);
            }
        }

        // Initialize / update map
        if (!leafletMap && ride.pickupLatitude && ride.pickupLongitude) {
            initMap(
                Number(ride.pickupLatitude),
                Number(ride.pickupLongitude),
                Number(ride.destinationLatitude),
                Number(ride.destinationLongitude)
            );
        }
    }

    // ----------------------------------------------------
    // FETCH RIDE DATA
    // ----------------------------------------------------
    async function fetchRide() {
        if (!rideId) {
            loadingElem.style.display = "none";
            errorElem.style.display = "block";
            document.getElementById("error-title").textContent = "No Ride Specified";
            document.getElementById("error-message").textContent = "Please provide a valid ride ID in the URL.";
            return;
        }

        const api = window.GoRide.api;
        if (!api.isAuthenticated()) {
            window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
            return;
        }

        try {
            const res = await api.get(`/api/rides/${encodeURIComponent(rideId)}`);
            if (res && res.data) {
                renderRideDetails(res.data);

                // Stop polling if ride has reached terminal state
                if (res.data.status === "COMPLETED" || res.data.status === "CANCELLED" || res.data.status === "REJECTED") {
                    if (pollInterval) {
                        clearInterval(pollInterval);
                        pollInterval = null;
                    }
                }
            } else {
                throw new Error("Ride details not found.");
            }
        } catch (err) {
            console.warn("Failed to fetch ride status:", err.message);
            if (!currentRide) {
                loadingElem.style.display = "none";
                errorElem.style.display = "block";
                document.getElementById("error-message").textContent = err.message || "Failed to load ride details.";
            }
        }
    }

    // ----------------------------------------------------
    // ACTION HANDLERS
    // ----------------------------------------------------

    // Cancel Ride
    if (cancelBtn) {
        cancelBtn.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to cancel this ride?")) return;

            const api = window.GoRide.api;
            cancelBtn.disabled = true;
            cancelBtn.textContent = "Cancelling...";

            try {
                const res = await api.patch(`/api/rides/${encodeURIComponent(rideId)}/cancel`, {
                    reason: "Cancelled by rider"
                });
                window.GoRide.showToast("Ride cancelled successfully.", "info");
                fetchRide();
            } catch (err) {
                window.GoRide.showToast(err.message || "Unable to cancel ride.", "error");
                cancelBtn.disabled = false;
                cancelBtn.textContent = "Cancel Ride";
            }
        });
    }

    // Pay Now Modal Controls
    if (payNowBtn) {
        payNowBtn.addEventListener("click", () => {
            paymentModal.classList.add("active");
            paymentModal.setAttribute("aria-hidden", "false");
        });
    }

    if (closePayBtn) {
        closePayBtn.addEventListener("click", () => {
            paymentModal.classList.remove("active");
            paymentModal.setAttribute("aria-hidden", "true");
        });
    }

    if (confirmPayBtn) {
        confirmPayBtn.addEventListener("click", async () => {
            const methodInput = document.querySelector('input[name="modal-pay-method"]:checked');
            const paymentMethod = methodInput ? methodInput.value : "UPI";
            const api = window.GoRide.api;

            confirmPayBtn.disabled = true;
            confirmPayBtn.textContent = "Processing...";

            try {
                await api.post("/api/payments/create", {
                    rideId: rideId,
                    paymentMethod: paymentMethod
                });

                window.GoRide.showToast("Payment processed successfully!", "success");
                paymentModal.classList.remove("active");
                paymentModal.setAttribute("aria-hidden", "true");
                fetchRide();
            } catch (err) {
                window.GoRide.showToast(err.message || "Payment failed.", "error");
            } finally {
                confirmPayBtn.disabled = false;
                confirmPayBtn.textContent = "Confirm & Pay";
            }
        });
    }

    // Rating & Review Controls
    if (rateRideBtn) {
        rateRideBtn.addEventListener("click", () => {
            reviewModal.classList.add("active");
            reviewModal.setAttribute("aria-hidden", "false");
        });
    }

    if (closeReviewBtn) {
        closeReviewBtn.addEventListener("click", () => {
            reviewModal.classList.remove("active");
            reviewModal.setAttribute("aria-hidden", "true");
        });
    }

    // Star Selection
    if (starContainer) {
        const stars = starContainer.querySelectorAll(".rating-star");
        stars.forEach(star => {
            star.addEventListener("click", () => {
                selectedRating = parseInt(star.dataset.rating, 10) || 5;
                stars.forEach(s => {
                    const r = parseInt(s.dataset.rating, 10);
                    if (r <= selectedRating) {
                        s.classList.add("selected");
                    } else {
                        s.classList.remove("selected");
                    }
                });
            });
        });
    }

    if (submitReviewBtn) {
        submitReviewBtn.addEventListener("click", async () => {
            const api = window.GoRide.api;
            const comment = (reviewComment.value || "").trim();

            submitReviewBtn.disabled = true;
            submitReviewBtn.textContent = "Submitting...";

            const reviewPayload = {
                rating: selectedRating
            };
            if (comment) {
                reviewPayload.review = comment;
            }

            try {
                await api.post(`/api/ride-reviews/${encodeURIComponent(rideId)}`, reviewPayload);

                window.GoRide.showToast("Thank you for your rating!", "success");
                reviewModal.classList.remove("active");
                reviewModal.setAttribute("aria-hidden", "true");
                rateRideBtn.style.display = "none";
            } catch (err) {
                window.GoRide.showToast(err.message || "Failed to submit review.", "error");
            } finally {
                submitReviewBtn.disabled = false;
                submitReviewBtn.textContent = "Submit Review";
            }
        });
    }

    // ----------------------------------------------------
    // INITIALIZATION & POLLING
    // ----------------------------------------------------
    fetchRide();

    // Start 5-second polling while viewing active ride
    pollInterval = setInterval(fetchRide, 5000);

    // Pause polling when document is not visible to conserve resources
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        } else {
            if (!pollInterval && currentRide && currentRide.status !== "COMPLETED" && currentRide.status !== "CANCELLED") {
                fetchRide();
                pollInterval = setInterval(fetchRide, 5000);
            }
        }
    });
})();
