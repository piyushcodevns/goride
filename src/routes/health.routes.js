const express = require("express");
const router = express.Router();
const {
  getLiveness,
  getReadiness,
  getHealth,
} = require("../controllers/health.controller");

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get overall application health summary
 *     tags: [Health & Monitoring]
 *     responses:
 *       200:
 *         description: Health summary including checks and metrics
 */
router.get("/", getHealth);

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Application liveness probe
 *     tags: [Health & Monitoring]
 *     responses:
 *       200:
 *         description: Application process is alive
 */
router.get("/live", getLiveness);

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Application readiness probe
 *     tags: [Health & Monitoring]
 *     responses:
 *       200:
 *         description: Application dependencies are ready
 *       503:
 *         description: Critical dependency is unavailable
 */
router.get("/ready", getReadiness);

module.exports = router;
