const express = require("express");

const rideController = require("../controllers/ride.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", authenticate, rideController.createRide);

router.get("/my-rides", authenticate, rideController.getMyRides);
router.get("/available", authenticate, rideController.getAvailableRides);
router.get(
  "/driver/current",
  authenticate,
  rideController.getDriverCurrentRide,
);
router.get("/:id", authenticate, rideController.getRideById);

router.patch("/:id/assign-driver", authenticate, rideController.assignDriver);

router.patch("/:id/reject", authenticate, rideController.rejectRide);

router.patch("/:id/status", authenticate, rideController.updateRideStatus);

/**
 * Cancel Ride
 */
router.patch("/:id/cancel", authenticate, rideController.cancelRide);

module.exports = router;
