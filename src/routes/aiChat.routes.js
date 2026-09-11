const express = require("express");
const router = express.Router();

const { chat } = require("../controllers/aiChat.controller");
const { optionalAuthenticate } = require("../middleware/auth.middleware");
const { aiLimiter } = require("../middleware/rateLimit.middleware");

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     tags:
 *       - AI Assistant
 *     summary: Chat with GoRide Customer Support AI Assistant
 *     description: >
 *       Conversational AI assistant powered by Google Gemini. Provides instant guidance on
 *       GoRide vehicle categories, booking procedures, fare estimates, policies, safety, and Varanasi
 *       service areas. Supports both guest visitors and authenticated riders.
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: User query or prompt for the assistant
 *                 example: "What vehicle types are available in Varanasi and how do I book?"
 *                 maxLength: 1000
 *               history:
 *                 type: array
 *                 description: Optional prior conversation turns for multi-turn context (max 10 items)
 *                 items:
 *                   type: object
 *                   required:
 *                     - role
 *                     - content
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, model, assistant]
 *                       example: user
 *                     content:
 *                       type: string
 *                       example: "Hello GoRide"
 *                       maxLength: 2000
 *     responses:
 *       200:
 *         description: AI assistant response successfully generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reply:
 *                       type: string
 *                       example: "Welcome to GoRide! In Varanasi, we offer 5 vehicle categories: GoRide Bike, Auto, Mini, Prime Sedan, and Prime SUV. To book, open our booking page, enter your pickup and destination, select your ride, and click Confirm Booking!"
 *                     role:
 *                       type: string
 *                       example: model
 *                     model:
 *                       type: string
 *                       example: gemini-3.6-flash
 *       400:
 *         description: Validation failure (empty message, oversized text, or invalid history format)
 *       429:
 *         description: Too many requests (exceeded 15 requests per minute)
 *       502:
 *         description: Upstream AI API or network failure
 *       503:
 *         description: AI Assistant service temporarily unavailable or unconfigured
 */
router.post("/chat", optionalAuthenticate, aiLimiter, chat);

module.exports = router;
