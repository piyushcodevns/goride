const express = require("express");

const router = express.Router();

const {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
} = require("../controllers/user.controller");

const { authenticate } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

router.get("/me", authenticate, getMyProfile);

router.put("/me", authenticate, updateMyProfile);

router.patch(
  "/me/avatar",
  authenticate,
  upload.single("avatar"),
  uploadProfileImage
);

module.exports = router;