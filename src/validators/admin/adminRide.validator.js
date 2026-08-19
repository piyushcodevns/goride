const { z } = require("zod");

/**
 * Ride ID parameter.
 */
const rideIdParamSchema = z.object({
  id: z.string().trim().min(1, "Ride ID is required."),
});

/**
 * User ID parameter.
 */
const userIdParamSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required."),
});

/**
 * Driver ID parameter.
 */
const driverIdParamSchema = z.object({
  driverId: z.string().trim().min(1, "Driver ID is required."),
});

/**
 * Pagination.
 */
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Admin ride list filters.
 */
const getRidesQuerySchema = paginationSchema
  .extend({
    search: z.string().trim().min(1).optional(),

    status: z
      .enum([
        "REQUESTED",
        "ACCEPTED",
        "ARRIVED",
        "STARTED",
        "COMPLETED",
        "CANCELLED",
      ])
      .optional(),

    vehicleType: z.enum(["BIKE", "AUTO", "CAR", "SUV"]).optional(),

    isScheduled: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),

    userId: z.string().trim().min(1).optional(),

    driverId: z.string().trim().min(1).optional(),

    fromDate: z.coerce.date().optional(),

    toDate: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fromDate && data.toDate && data.fromDate > data.toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toDate"],
        message: "toDate must be greater than or equal to fromDate.",
      });
    }
  });

/**
 * Admin ride status update.
 */
const updateRideStatusSchema = z.object({
  status: z.enum([
    "REQUESTED",
    "ACCEPTED",
    "ARRIVED",
    "STARTED",
    "COMPLETED",
    "CANCELLED",
  ]),
});

module.exports = {
  rideIdParamSchema,
  userIdParamSchema,
  driverIdParamSchema,
  paginationSchema,
  getRidesQuerySchema,
  updateRideStatusSchema,
};
