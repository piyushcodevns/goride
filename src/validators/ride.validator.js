const { z } = require("zod");

const createRideSchema = z.object({
  pickup: z
    .string({
      required_error: "Pickup location is required.",
      invalid_type_error: "Pickup location must be a string.",
    })
    .trim()
    .min(1, "Pickup location is required."),

  destination: z
    .string({
      required_error: "Destination is required.",
      invalid_type_error: "Destination must be a string.",
    })
    .trim()
    .min(1, "Destination is required."),

  vehicleType: z
    .string({
      required_error: "Vehicle type is required.",
      invalid_type_error: "Vehicle type must be a string.",
    })
    .trim()
    .min(1, "Vehicle type is required."),
});

module.exports = {
  createRideSchema,
};