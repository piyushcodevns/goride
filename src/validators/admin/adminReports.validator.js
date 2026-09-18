const { z } = require("zod");

/**
 * Common date range schema refinement.
 */
const refineDateRange = (data, ctx) => {
  if (data.fromDate && data.toDate && data.fromDate > data.toDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toDate"],
      message: "toDate must be greater than or equal to fromDate.",
    });
  }
};

/**
 * Overview Report Query Schema.
 */
const overviewQuerySchema = z.object({
  query: z
    .object({
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
    })
    .superRefine(refineDateRange),
});

/**
 * Revenue Report Query Schema.
 */
const revenueReportQuerySchema = z.object({
  query: z
    .object({
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
      vehicleType: z.enum(["BIKE", "AUTO", "CAR", "SUV"]).optional(),
      city: z.string().trim().min(1).optional(),
      interval: z.enum(["daily", "weekly", "monthly"]).default("daily"),
    })
    .superRefine(refineDateRange),
});

/**
 * Ride Report Query Schema.
 */
const rideReportQuerySchema = z.object({
  query: z
    .object({
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
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
    })
    .superRefine(refineDateRange),
});

/**
 * User Report Query Schema.
 */
const userReportQuerySchema = z.object({
  query: z
    .object({
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
    })
    .superRefine(refineDateRange),
});

/**
 * Driver Report Query Schema.
 */
const driverReportQuerySchema = z.object({
  query: z
    .object({
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
      status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
      availability: z.enum(["OFFLINE", "AVAILABLE", "BUSY"]).optional(),
    })
    .superRefine(refineDateRange),
});

/**
 * Vehicle Report Query Schema.
 */
const vehicleReportQuerySchema = z.object({
  query: z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    vehicleType: z.enum(["BIKE", "AUTO", "CAR", "SUV"]).optional(),
    category: z.enum(["ECONOMY", "PREMIUM", "LUXURY"]).optional(),
  }),
});

/**
 * Payment Report Query Schema.
 */
const paymentReportQuerySchema = z.object({
  query: z
    .object({
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
      status: z
        .enum(["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REFUNDED"])
        .optional(),
      paymentMethod: z.enum(["CASH", "UPI", "CARD", "WALLET"]).optional(),
    })
    .superRefine(refineDateRange),
});

/**
 * Coupon Report Query Schema.
 */
const couponReportQuerySchema = z.object({
  query: z
    .object({
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
    })
    .superRefine(refineDateRange),
});

/**
 * Operations Report Query Schema.
 */
const operationsReportQuerySchema = z.object({
  query: z
    .object({
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
    })
    .superRefine(refineDateRange),
});

module.exports = {
  overviewQuerySchema,
  revenueReportQuerySchema,
  rideReportQuerySchema,
  userReportQuerySchema,
  driverReportQuerySchema,
  vehicleReportQuerySchema,
  paymentReportQuerySchema,
  couponReportQuerySchema,
  operationsReportQuerySchema,
};
