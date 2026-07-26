const express = require("express");

const router = express.Router();

const {
  register,
  login,
  profile,
  forgotPasswordController,
  resetPasswordController,
  changePasswordController,
} = require("../controllers/auth.controller");

const { authenticate } = require("../middleware/auth.middleware");

// Public Routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);

// Protected Routes
router.get("/profile", authenticate, profile);
router.post("/change-password", authenticate, changePasswordController);

module.exports = router;