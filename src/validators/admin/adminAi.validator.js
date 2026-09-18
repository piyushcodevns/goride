const { z } = require("zod");

const dateField = z
  .string()
  .trim()
  .min(1, "Date cannot be empty.")
  .refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    "Invalid date format."
  )
  .transform((value) => new Date(value))
  .optional();

const dateRange = {
  fromDate: dateField,
  toDate: dateField,
};

const withDateRange = (shape = {}) =>
  z
    .object({
      ...dateRange,
      ...shape,
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

const vehicleType = z
  .enum(["BIKE", "AUTO", "CAR", "SUV"])
  .optional();

const positiveNumber = z.coerce.number().finite().min(0);

const demandQuerySchema = z.object({
  query: withDateRange({
    targetDate: dateField,
    historyDays: z.coerce.number().int().min(1).max(365).optional(),
  }),
});

const pricingQuerySchema = z.object({
  query: z.object({
    historyDays: z.coerce.number().int().min(1).max(365).optional(),
    targetDate: dateField,
    targetHour: z.coerce.number().int().min(0).max(23).optional(),
  }),
});

const fareQuerySchema = z.object({
  query: withDateRange({
    historyDays: z.coerce.number().int().min(1).max(365).optional(),
    targetDate: dateField,
  }),
});

const performanceQuerySchema = z.object({
  query: withDateRange({
    driverId: z.string().trim().min(1).optional(),
  }),
});

const adminAiDriverPerformanceSchema = z.object({
  params: z.object({
    driverId: z.string().trim().min(1, "driverId is required."),
  }),
  query: withDateRange(),
});

const recommendationQuerySchema = z.object({
  query: withDateRange({
    rideId: z.string().trim().min(1, "rideId is required."),
    limit: z.coerce.number().int().min(1).max(100).default(5),
  }),
});

const vehicleQuerySchema = z.object({
  query: z.object({
    requestedDistance: positiveNumber.refine(
      (value) => value > 0,
      "requestedDistance must be greater than 0."
    ),
    historyDays: z.coerce.number().int().min(1).max(365).optional(),
  }),
});

const ratingQuerySchema = z.object({
  query: z.object({
    vehicleType,
    distance: positiveNumber.optional(),
    duration: positiveNumber.optional(),
    historyDays: z.coerce.number().int().min(1).max(365).optional(),
  }),
});

const forecastQuerySchema = z.object({
  query: withDateRange({
    historyDays: z.coerce.number().int().min(1).max(365).optional(),
    targetDate: dateField,
    forecastDays: z.coerce.number().int().min(1).max(30).optional(),
    vehicleType,
    distance: positiveNumber.optional(),
    duration: positiveNumber.optional(),
    isScheduled: z
      .preprocess((value) => {
        if (typeof value === "boolean") return value;
        if (typeof value !== "string") return value;

        const normalized = value.trim().toLowerCase();

        if (normalized === "true") return true;
        if (normalized === "false") return false;

        return value;
      }, z.boolean())
      .optional(),
  }),
});

const churnQuerySchema = z.object({
  query: withDateRange({
    targetDate: dateField,
  }),
});

const fraudQuerySchema = z.object({
  query: withDateRange(),
});

/*
 * Business recommendations are read-only intelligence.
 * The predictor requires already-computed AI signals.
 * We intentionally do NOT manufacture those signals from query values.
 */
const businessQuerySchema = z.object({
  query: z.object({}),
});

const etaQuerySchema = z.object({
  query: z.object({}),
});

module.exports = {
  demandQuerySchema,
  pricingQuerySchema,
  fareQuerySchema,
  performanceQuerySchema,
  adminAiDriverPerformanceSchema,
  recommendationQuerySchema,
  vehicleQuerySchema,
  ratingQuerySchema,
  forecastQuerySchema,
  churnQuerySchema,
  fraudQuerySchema,
  businessQuerySchema,
  etaQuerySchema,
};
