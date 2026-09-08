const { z } = require("zod");

const vehicleTypes = ["BIKE", "AUTO", "CAR", "SUV"];
const vehicleCategories = ["ECONOMY", "PREMIUM", "LUXURY"];
const vehicleStatuses = ["PENDING", "APPROVED", "REJECTED"];

const vehicleIdParamSchema = z.object({
  id: z.string().trim().min(1, "Vehicle ID is required."),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const getVehiclesQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),

  vehicleType: z
    .enum(vehicleTypes)
    .optional(),

  category: z
    .enum(vehicleCategories)
    .optional(),

  status: z
    .enum(vehicleStatuses)
    .optional(),

  sortBy: z
    .enum([
      "createdAt",
      "updatedAt",
      "vehicleNumber",
      "brand",
      "model",
    ])
    .default("createdAt"),

  sortOrder: z
    .enum(["asc", "desc"])
    .default("desc"),
});

const updateVehicleSchema = z
  .object({
    vehicleNumber: z
      .string()
      .trim()
      .min(6, "Vehicle number is required.")
      .max(20, "Vehicle number is too long.")
      .optional(),

    vehicleType: z
      .enum(vehicleTypes, {
        message: "Invalid vehicle type.",
      })
      .optional(),

    category: z
      .enum(vehicleCategories, {
        message: "Invalid vehicle category.",
      })
      .optional(),

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
      .coerce
      .number()
      .int("Seats must be an integer.")
      .min(1, "Seats must be at least 1.")
      .max(8, "Seats cannot exceed 8.")
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field is required for update.",
    },
  );

const rejectVehicleSchema = z
  .object({
    rejectionReason: z
      .string()
      .trim()
      .min(3, "Rejection reason is required.")
      .max(500, "Rejection reason is too long."),
  })
  .strict();

const documentIdParamSchema = z.object({
  id: z.string().trim().min(1, "Document ID is required."),
});

const documentRejectBodySchema = z.object({
  reason: z.string().trim().min(3, "Rejection reason is required.").max(500, "Rejection reason is too long."),
});

module.exports = {
  vehicleIdParamSchema,
  paginationSchema,
  getVehiclesQuerySchema,
  updateVehicleSchema,
  rejectVehicleSchema,
  documentIdParamSchema,
  documentRejectBodySchema,
};
