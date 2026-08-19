const { z } = require("zod");

const addressSchema = z
  .string({
    required_error: "Address is required.",
    invalid_type_error: "Address must be a string.",
  })
  .trim()
  .min(1, "Address is required.")
  .max(255, "Address is too long.");

const coordinateSchema = z
  .number({
    required_error: "Coordinate is required.",
    invalid_type_error: "Coordinate must be a number.",
  })
  .finite();

const geocodeSchema = z
  .object({
    address: addressSchema,
  })
  .strict();

const routeCoordinateSchema = z
  .object({
    latitude: coordinateSchema
      .min(-90, "Invalid latitude.")
      .max(90, "Invalid latitude."),

    longitude: coordinateSchema
      .min(-180, "Invalid longitude.")
      .max(180, "Invalid longitude."),
  })
  .strict();

const routeSchema = z
  .object({
    pickup: routeCoordinateSchema,
    destination: routeCoordinateSchema,
  })
  .strict();

module.exports = {
  geocodeSchema,
  routeSchema,
  routeCoordinateSchema,
};  