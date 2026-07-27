const express = require("express");
const router = express.Router();

const {
  register,
  getProfile,
  updateProfile,
  updateAvailabilityController,
} = require("../controllers/driver.controller");

const { authenticate } = require("../middleware/auth.middleware");

// Driver Registration
router.post("/register", authenticate, register);

// Driver Profile
router.get("/profile", authenticate, getProfile);

// Update Driver Profile
router.patch("/profile", authenticate, updateProfile);

// Update Driver Availability
router.patch("/availability", authenticate, updateAvailabilityController);

module.exports = router;