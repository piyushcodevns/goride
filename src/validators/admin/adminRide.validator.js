const { z } = require("zod");

/**
 * Ride ID parameter.
 */
const rideIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Ride ID is required."),
  }),
});

/**
 * User ID parameter + pagination.
 */
const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().trim().min(1, "User ID is required."),
  }),
});

/**
 * Driver ID parameter + pagination.
 */
const driverIdParamSchema = z.object({
  params: z.object({
    driverId: z.string().trim().min(1, "Driver ID is required."),
  }),
});

/**
 * Pagination.
 */
const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

/**
 * User rides parameter + pagination.
 */
const getUserRidesSchema = z.object({
  params: z.object({
    userId: z.string().trim().min(1, "User ID is required."),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

/**
 * Driver rides parameter + pagination.
 */
const getDriverRidesSchema = z.object({
  params: z.object({
    driverId: z.string().trim().min(1, "Driver ID is required."),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

/**
 * Admin ride list filters.
 */
const getRidesQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),

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
    }),
});

/**
 * Admin ride status update.
 */
const updateRideStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      "REQUESTED",
      "ACCEPTED",
      "ARRIVED",
      "STARTED",
      "COMPLETED",
      "CANCELLED",
    ]),
  }),
});

/**
 * Assign driver.
 */
const assignDriverSchema = z.object({
  body: z.object({
    driverId: z.string().trim().min(1, "Driver ID is required."),
  }),
});

/**
 * Reassign driver.
 */
const reassignDriverSchema = z.object({
  body: z.object({
    driverId: z.string().trim().min(1, "Driver ID is required."),
  }),
});

module.exports = {
  rideIdParamSchema,
  userIdParamSchema,
  driverIdParamSchema,
  paginationSchema,
  getUserRidesSchema,
  getDriverRidesSchema,
  getRidesQuerySchema,
  updateRideStatusSchema,
  assignDriverSchema,
  reassignDriverSchema,
};
