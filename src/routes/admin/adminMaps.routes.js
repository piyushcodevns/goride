const express = require("express");

const controller = require("../../controllers/admin/adminMaps.controller");

const {
  createCitySchema,
  updateCitySchema,
  createZoneSchema,
  updateZoneSchema,
} = require("../../validators/mapZone.validator");

const router = express.Router();

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Supported Cities
 */

router.post(
  "/cities",
  validateBody(createCitySchema),
  controller.createCity,
);

router.get(
  "/cities",
  controller.getCities,
);

router.get(
  "/cities/:id",
  controller.getCityById,
);

router.patch(
  "/cities/:id",
  validateBody(updateCitySchema),
  controller.updateCity,
);

router.delete(
  "/cities/:id",
  controller.deleteCity,
);

/**
 * Map Zones
 */

router.post(
  "/zones",
  validateBody(createZoneSchema),
  controller.createZone,
);

router.get(
  "/zones",
  controller.getZones,
);

router.get(
  "/zones/:id",
  controller.getZoneById,
);

router.patch(
  "/zones/:id",
  validateBody(updateZoneSchema),
  controller.updateZone,
);

router.delete(
  "/zones/:id",
  controller.deleteZone,
);

/**
 * Geofence
 */

router.get(
  "/geofence/check",
  controller.checkPoint,
);

module.exports = router;
