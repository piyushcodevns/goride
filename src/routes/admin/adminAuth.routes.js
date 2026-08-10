const express = require("express");

const router = express.Router();

const {
  login,
  createAdminController,
  refreshToken,
  logout,
  changeAdminPasswordController,
  forgotAdminPasswordController,
  resetAdminPasswordController,
} = require("../../controllers/admin/adminAuth.controller");
const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");

// =========================
// ADMIN AUTH ROUTES
// =========================

router.post("/login", login);

router.post("/create", createAdminController);

router.post("/refresh", refreshToken);

router.post(
  "/logout",
  adminAuthMiddleware,
  logout,
);

router.post(
  "/change-password",
  adminAuthMiddleware,
  changeAdminPasswordController,
);

router.post(
  "/forgot-password",
  forgotAdminPasswordController,
);

router.post(
  "/reset-password",
  resetAdminPasswordController,
);

module.exports = router;
