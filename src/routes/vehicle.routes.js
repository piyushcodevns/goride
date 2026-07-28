  const express = require("express");
  const router = express.Router();

  const { authenticate } = require("../middleware/auth.middleware");

  const {
    registerVehicle,
    getMyVehicle,
    updateMyVehicleController,
    deleteMyVehicleController,
  } = require("../controllers/vehicle.controller");

  // Register Vehicle
  router.post("/", authenticate, registerVehicle);

  // Get My Vehicle
  router.get("/", authenticate, getMyVehicle);

  // Update My Vehicle
  router.patch("/", authenticate, updateMyVehicleController);

  // Delete My Vehicle
  router.delete("/", authenticate, deleteMyVehicleController);

  module.exports = router;