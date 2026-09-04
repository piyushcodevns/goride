const { z } = require("zod");

/**
 * Analytics date field.
 *
 * HTTP query parameters arrive as strings.
 * Valid date strings are converted into Date instances.
 */
const analyticsDate = z
  .string()
  .trim()
  .min(1, "Date cannot be empty.")
  .refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    "Invalid date format."
  )
  .transform((value) => new Date(value))
  .optional();

/**
 * Common date range validation.
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
 * Common analytics query fields.
 *
 * Dates are optional because the service provides a safe default
 * analytics period when the client does not supply them.
 */
const analyticsQueryBase = {
  fromDate: analyticsDate,
  toDate: analyticsDate,
};

/**
 * Growth Analytics Query Schema.
 */
const growthAnalyticsQuerySchema = z.object({
  query: z
    .object(analyticsQueryBase)
    .superRefine(refineDateRange),
});

/**
 * Time-series Analytics Query Schema.
 */
const timeSeriesAnalyticsQuerySchema = z.object({
  query: z
    .object({
      ...analyticsQueryBase,
      granularity: z
        .enum(["daily", "weekly", "monthly"])
        .default("daily"),
    })
    .superRefine(refineDateRange),
});

/**
 * Vehicle Analytics Query Schema.
 */
const vehicleAnalyticsQuerySchema = z.object({
  query: z
    .object(analyticsQueryBase)
    .superRefine(refineDateRange),
});

/**
 * Heatmap Analytics Query Schema.
 */
const heatmapAnalyticsQuerySchema = z.object({
  query: z
    .object({
      ...analyticsQueryBase,
      type: z
        .enum(["pickup", "destination"])
        .default("pickup"),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(10000)
        .default(10000),
    })
    .superRefine(refineDateRange),
});

/**
 * Retention Analytics Query Schema.
 */
const retentionAnalyticsQuerySchema = z.object({
  query: z
    .object(analyticsQueryBase)
    .superRefine(refineDateRange),
});

/**
 * City Analytics Query Schema.
 */
const cityAnalyticsQuerySchema = z.object({
  query: z
    .object(analyticsQueryBase)
    .superRefine(refineDateRange),
});

module.exports = {
  growthAnalyticsQuerySchema,
  timeSeriesAnalyticsQuerySchema,
  vehicleAnalyticsQuerySchema,
  heatmapAnalyticsQuerySchema,
  retentionAnalyticsQuerySchema,
  cityAnalyticsQuerySchema,
};
