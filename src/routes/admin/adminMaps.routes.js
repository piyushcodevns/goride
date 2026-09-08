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

router.post(
  "/cities",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  validateBody(createCitySchema),
  controller.createCity,
);

router.get(
  "/cities",
  adminAuthMiddleware,
  requirePermission("map:view"),
  controller.getCities,
);

router.get(
  "/cities/:id",
  adminAuthMiddleware,
  requirePermission("map:view"),
  controller.getCityById,
);

router.patch(
  "/cities/:id",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  validateBody(updateCitySchema),
  controller.updateCity,
);

router.delete(
  "/cities/:id",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  controller.deleteCity,
);

router.post(
  "/zones",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  validateBody(createZoneSchema),
  controller.createZone,
);

router.get(
  "/zones",
  adminAuthMiddleware,
  requirePermission("map:view"),
  controller.getZones,
);

router.get(
  "/zones/:id",
  adminAuthMiddleware,
  requirePermission("map:view"),
  controller.getZoneById,
);

router.patch(
  "/zones/:id",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  validateBody(updateZoneSchema),
  controller.updateZone,
);

router.delete(
  "/zones/:id",
  adminAuthMiddleware,
  requirePermission("map:manage"),
  controller.deleteZone,
);

router.get(
  "/geofence/check",
  adminAuthMiddleware,
  requirePermission("map:view"),
  controller.checkPoint,
);

module.exports = router;
