const express = require("express");

const router = express.Router();

const { getFareAudit } = require("../controllers/fareAudit.controller");

const { authenticate } = require("../middleware/auth.middleware");


/**
 * @swagger
 * /api/fare-audit/{rideId}:
 *   get:
 *     summary: Get fare audit details for a ride
 *     tags: [Fare]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fare audit fetched successfully
 *       403:
 *         description: Forbidden - only rider or assigned driver can access
 *       404:
 *         description: Fare audit not found
 */
router.get(
  "/:rideId",
  authenticate,
  getFareAudit
);


module.exports = router;