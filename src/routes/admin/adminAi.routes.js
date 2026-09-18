const express = require("express");
const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const { requirePermission } = require("../../middleware/admin/adminRbac.middleware");
const { validate } = require("../../middleware/validate.middleware");
const controller = require("../../controllers/admin/adminAi.controller");
const schemas = require("../../validators/admin/adminAi.validator");

const router = express.Router();
const access = [adminAuthMiddleware, requirePermission("ai:view")];

/**
 * @swagger
 * tags:
 *   - name: Admin AI
 *     description: Read-only AI intelligence for administrators.
 * @swagger
 * /api/admin/ai/status:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get AI capability status
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: AI status returned. } }
 * /api/admin/ai/demand:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get demand forecast
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Demand forecast returned. } }
 * /api/admin/ai/pricing:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get pricing signal
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Pricing signal returned. } }
 * /api/admin/ai/fare:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get fare intelligence
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Fare intelligence returned. } }
 * /api/admin/ai/drivers/performance:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get driver performance
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Driver performance returned. } }
 * /api/admin/ai/drivers/{driverId}/performance:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get one driver's performance
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: driverId, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Driver performance returned. } }
 * /api/admin/ai/drivers/recommendations:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get driver recommendations
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Driver recommendations returned. } }
 * /api/admin/ai/supply:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get supply forecast
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Supply forecast returned. } }
 * /api/admin/ai/vehicle:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get vehicle recommendation
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Vehicle recommendation returned. } }
 * /api/admin/ai/rating:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get rating prediction
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Rating prediction returned. } }
 * /api/admin/ai/cancellation:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get cancellation prediction
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Cancellation prediction returned. } }
 * /api/admin/ai/churn:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get churn prediction
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Churn prediction returned. } }
 * /api/admin/ai/revenue:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get revenue forecast
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Revenue forecast returned. } }
 * /api/admin/ai/weather:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get weather effect intelligence
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Weather effect returned. } }
 * /api/admin/ai/fraud:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get fraud risk intelligence
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Fraud intelligence returned. } }
 * /api/admin/ai/business:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get business recommendations
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Business recommendations returned. } }
 * /api/admin/ai/eta:
 *   get:
 *     tags: [Admin AI]
 *     summary: Get ETA prediction status
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: ETA capability response returned. } }
 */
router.get("/status", ...access, controller.getStatus);
router.get("/demand", ...access, validate(schemas.demandQuerySchema), controller.getDemand);
router.get("/pricing", ...access, validate(schemas.pricingQuerySchema), controller.getPricing);
router.get("/fare", ...access, validate(schemas.fareQuerySchema), controller.getFare);
router.get("/drivers/performance", ...access, validate(schemas.performanceQuerySchema), controller.getDriverPerformance);
router.get("/drivers/:driverId/performance", ...access, validate(schemas.adminAiDriverPerformanceSchema), controller.getDriverPerformanceById);
router.get("/drivers/recommendations", ...access, validate(schemas.recommendationQuerySchema), controller.getDriverRecommendations);
router.get("/supply", ...access, validate(schemas.businessQuerySchema), controller.getSupply);
router.get("/vehicle", ...access, validate(schemas.vehicleQuerySchema), controller.getVehicle);
router.get("/rating", ...access, validate(schemas.ratingQuerySchema), controller.getRating);
router.get("/cancellation", ...access, validate(schemas.forecastQuerySchema), controller.getCancellation);
router.get("/churn", ...access, validate(schemas.churnQuerySchema), controller.getChurn);
router.get("/revenue", ...access, validate(schemas.forecastQuerySchema), controller.getRevenue);
router.get("/weather", ...access, validate(schemas.forecastQuerySchema), controller.getWeather);
router.get("/fraud", ...access, validate(schemas.fraudQuerySchema), controller.getFraud);
router.get("/business", ...access, validate(schemas.businessQuerySchema), controller.getBusiness);
router.get("/eta", ...access, validate(schemas.etaQuerySchema), controller.getEta);

module.exports = router;