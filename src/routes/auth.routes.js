const express = require("express");

const router = express.Router();

const {
  register,
  login,
  profile,
  forgotPasswordController,
  resetPasswordController,
} = require("../controllers/auth.controller");

const { authenticate } = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);
router.get("/profile", authenticate, profile);

module.exports = router;