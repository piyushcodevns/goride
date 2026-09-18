const express = require("express");

const controller = require("../../controllers/admin/adminMaps.controller");

const {
  createCitySchema,
  updateCitySchema,
  createZoneSchema,
  updateZoneSchema,
} = require("../../validators/mapZone.validator");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");

const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * tags:
 *   name: Admin Maps Management
 *   description: Admin service area cities, polygonal geofence zones, and boundary check APIs
 */

/**
 * @swagger
 * /api/admin/maps/cities:
 *   post:
 *     summary: Register a new operational city
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code, centerLatitude, centerLongitude]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               centerLatitude: { type: number }
 *               centerLongitude: { type: number }
 *     responses:
 *       201: { description: City created successfully. }
 */
router.post(
  "/cities",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  validateBody(createCitySchema),
  controller.createCity,
);

/**
 * @swagger
 * /api/admin/maps/cities:
 *   get:
 *     summary: List all registered operational cities
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Cities retrieved successfully. }
 */
router.get(
  "/cities",
  adminAuthMiddleware,
  requirePermission("map:view"),
  controller.getCities,
);

/**
 * @swagger
 * /api/admin/maps/cities/{id}:
 *   get:
 *     summary: Get operational city details by ID
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: City details retrieved successfully. }
 *       404: { description: City not found. }
 */
router.get(
  "/cities/:id",
  adminAuthMiddleware,
  requirePermission("map:view"),
  controller.getCityById,
);

/**
 * @swagger
 * /api/admin/maps/cities/{id}:
 *   patch:
 *     summary: Update operational city configuration
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: City updated successfully. }
 */
router.patch(
  "/cities/:id",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  validateBody(updateCitySchema),
  controller.updateCity,
);

/**
 * @swagger
 * /api/admin/maps/cities/{id}:
 *   delete:
 *     summary: Delete an operational city
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: City deleted successfully. }
 */
router.delete(
  "/cities/:id",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  controller.deleteCity,
);

/**
 * @swagger
 * /api/admin/maps/zones:
 *   post:
 *     summary: Create a polygonal geofence zone
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cityId, name, coordinates]
 *             properties:
 *               cityId: { type: string }
 *               name: { type: string }
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     latitude: { type: number }
 *                     longitude: { type: number }
 *     responses:
 *       201: { description: Zone created successfully. }
 */
router.post(
  "/zones",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  validateBody(createZoneSchema),
  controller.createZone,
);

/**
 * @swagger
 * /api/admin/maps/zones:
 *   get:
 *     summary: List all geofence zones
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Zones retrieved successfully. }
 */
router.get(
  "/zones",
  adminAuthMiddleware,
  requirePermission("map:view"),
  controller.getZones,
);

/**
 * @swagger
 * /api/admin/maps/zones/{id}:
 *   get:
 *     summary: Get geofence zone by ID
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Zone retrieved successfully. }
 *       404: { description: Zone not found. }
 */
router.get(
  "/zones/:id",
  adminAuthMiddleware,
  requirePermission("map:view"),
  controller.getZoneById,
);

/**
 * @swagger
 * /api/admin/maps/zones/{id}:
 *   patch:
 *     summary: Update geofence zone coordinates or name
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Zone updated successfully. }
 */
router.patch(
  "/zones/:id",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  validateBody(updateZoneSchema),
  controller.updateZone,
);

/**
 * @swagger
 * /api/admin/maps/zones/{id}:
 *   delete:
 *     summary: Delete a geofence zone
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Zone deleted successfully. }
 */
router.delete(
  "/zones/:id",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  controller.deleteZone,
);

/**
 * @swagger
 * /api/admin/maps/geofence/check:
 *   get:
 *     summary: Check if coordinate point is within an active operational zone
 *     tags: [Admin Maps Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200: { description: Point geofence check result returned. }
 */
router.get(
  "/geofence/check",
  adminAuthMiddleware,
  requirePermission("map:view"),
  controller.checkPoint,
);

module.exports = router;
