const express = require("express");

const router = express.Router();

const { getFareAudit } = require("../controllers/fareAudit.controller");

const { authenticate } = require("../middleware/auth.middleware");


/**
 * @route   GET /api/fare-audit/:rideId
 * @desc    Get fare audit by ride id
 * @access  Private
 */
router.get(
  "/:rideId",
  authenticate,
  getFareAudit
);


module.exports = router;