const { z } = require("zod");

const vehicleTypes = ["BIKE", "AUTO", "CAR"];

const createVehicleSchema = z.object({
  vehicleNumber: z
    .string()
    .trim()
    .min(6, "Vehicle number is required.")
    .max(20, "Vehicle number is too long."),

  vehicleType: z.enum(vehicleTypes, {
    message: "Invalid vehicle type.",
  }),

  brand: z
    .string()
    .trim()
    .min(2, "Brand is required.")
    .max(50, "Brand is too long."),

  model: z
    .string()
    .trim()
    .min(1, "Model is required.")
    .max(50, "Model is too long."),

  color: z
    .string()
    .trim()
    .min(2, "Color is required.")
    .max(30, "Color is too long."),

  seats: z
    .number({
      required_error: "Seats are required.",
      invalid_type_error: "Seats must be a number.",
    })
    .int("Seats must be an integer.")
    .min(1, "Seats must be at least 1.")
    .max(8, "Seats cannot exceed 8."),
});

const updateVehicleSchema = z.object({
  vehicleType: z.enum(vehicleTypes).optional(),

  brand: z
    .string()
    .trim()
    .min(2, "Brand is required.")
    .max(50, "Brand is too long.")
    .optional(),

  model: z
    .string()
    .trim()
    .min(1, "Model is required.")
    .max(50, "Model is too long.")
    .optional(),

  color: z
    .string()
    .trim()
    .min(2, "Color is required.")
    .max(30, "Color is too long.")
    .optional(),

  seats: z
    .number({
      invalid_type_error: "Seats must be a number.",
    })
    .int("Seats must be an integer.")
    .min(1, "Seats must be at least 1.")
    .max(8, "Seats cannot exceed 8.")
    .optional(),
});

module.exports = {
  createVehicleSchema,
  updateVehicleSchema,
};