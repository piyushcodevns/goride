const express = require("express");

const router = express.Router();

const {
  register,
  login,
  profile,
  forgotPasswordController,
  resetPasswordController,
  changePasswordController,
  sendVerificationEmailController,
  verifyEmailController,
} = require("../controllers/auth.controller");

const { authenticate } = require("../middleware/auth.middleware");

// Public Routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);
router.post("/verify-email", verifyEmailController);

// Protected Routes
router.get("/profile", authenticate, profile);
router.post("/change-password", authenticate, changePasswordController);
router.post("/send-verification-email", authenticate, sendVerificationEmailController);

module.exports = router;