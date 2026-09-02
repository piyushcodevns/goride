const express = require("express");

const mapsController = require("../controllers/maps.controller");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Maps
 *   description: OpenRouteService Maps Integration APIs
 */

/**
 * @swagger
 * /api/maps/geocode:
 *   get:
 *     summary: Convert address into coordinates
 *     tags: [Maps]
 *     parameters:
 *       - in: query
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         example: Lucknow Railway Station
 *     responses:
 *       200:
 *         description: Coordinates fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Coordinates fetched successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                       example: 26.821399
 *                     longitude:
 *                       type: number
 *                       example: 80.924186
 *                     formattedAddress:
 *                       type: string
 *                       example: Lucknow Railway Station
 */
router.get("/geocode", mapsController.getCoordinates);

/**
 * @swagger
 * /api/maps/reverse-geocode:
 *   get:
 *     summary: Convert coordinates into address
 *     tags: [Maps]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         example: 26.821399
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         example: 80.924186
 *     responses:
 *       200:
 *         description: Address fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Address fetched successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: Lucknow Railway Station
 *                     latitude:
 *                       type: number
 *                       example: 26.821399
 *                     longitude:
 *                       type: number
 *                       example: 80.924186
 */
router.get("/reverse-geocode", mapsController.getAddress);

module.exports = router;