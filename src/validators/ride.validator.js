const { z } = require("zod");

const coordinateSchema = z
  .number({
    required_error: "Coordinate is required.",
    invalid_type_error: "Coordinate must be a number.",
  })
  .finite();

const createRideSchema = z
  .object({
    pickup: z
      .string({
        required_error: "Pickup location is required.",
        invalid_type_error: "Pickup location must be a string.",
      })
      .trim()
      .min(1, "Pickup location is required.")
      .max(255, "Pickup location is too long."),

    pickupLatitude: coordinateSchema
      .min(-90, "Invalid pickup latitude.")
      .max(90, "Invalid pickup latitude."),

    pickupLongitude: coordinateSchema
      .min(-180, "Invalid pickup longitude.")
      .max(180, "Invalid pickup longitude."),

    destination: z
      .string({
        required_error: "Destination is required.",
        invalid_type_error: "Destination must be a string.",
      })
      .trim()
      .min(1, "Destination is required.")
      .max(255, "Destination is too long."),

    destinationLatitude: coordinateSchema
      .min(-90, "Invalid destination latitude.")
      .max(90, "Invalid destination latitude."),

    destinationLongitude: coordinateSchema
      .min(-180, "Invalid destination longitude.")
      .max(180, "Invalid destination longitude."),

    vehicleType: z.enum(["BIKE", "AUTO", "CAR"], {
      required_error: "Vehicle type is required.",
      invalid_type_error: "Invalid vehicle type.",
    }),
  })
  .strict();

module.exports = {
  createRideSchema,
};