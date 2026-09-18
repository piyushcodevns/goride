const { z } = require("zod");

const MAX_ANALYTICS_RANGE_DAYS = 366;

const analyticsDate = z
  .string()
  .trim()
  .min(1, "Date cannot be empty.")
  .refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    "Invalid date format.",
  )
  .transform((value) => new Date(value))
  .optional();

const refineDateRange = (data, ctx) => {
  if (!data.fromDate || !data.toDate) {
    return;
  }

  if (data.fromDate >= data.toDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toDate"],
      message: "toDate must be greater than fromDate.",
    });

    return;
  }

  const rangeDays =
    (data.toDate.getTime() - data.fromDate.getTime()) /
    (24 * 60 * 60 * 1000);

  if (rangeDays > MAX_ANALYTICS_RANGE_DAYS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toDate"],
      message: `Analytics date range cannot exceed ${MAX_ANALYTICS_RANGE_DAYS} days.`,
    });
  }
};

const analyticsQueryBase = {
  fromDate: analyticsDate,
  toDate: analyticsDate,
};

const growthAnalyticsQuerySchema = z.object({
  query: z.object(analyticsQueryBase).superRefine(refineDateRange),
});

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

const vehicleAnalyticsQuerySchema = z.object({
  query: z.object(analyticsQueryBase).superRefine(refineDateRange),
});

const heatmapAnalyticsQuerySchema = z.object({
  query: z
    .object({
      ...analyticsQueryBase,
      type: z.enum(["pickup", "destination"]).default("pickup"),
      limit: z.coerce.number().int().min(1).max(10000).default(10000),
    })
    .superRefine(refineDateRange),
});

const retentionAnalyticsQuerySchema = z.object({
  query: z.object(analyticsQueryBase).superRefine(refineDateRange),
});

const cityAnalyticsQuerySchema = z.object({
  query: z.object(analyticsQueryBase).superRefine(refineDateRange),
});

const analyticsExportQuerySchema = z.object({
  query: z
    .object({
      ...analyticsQueryBase,
      type: z.enum([
        "growth",
        "users",
        "drivers",
        "revenue",
        "rides",
        "vehicles",
        "heatmap",
        "retention",
        "cities",
      ]),
      granularity: z
        .enum(["daily", "weekly", "monthly"])
        .default("daily"),
      limit: z.coerce.number().int().min(1).max(10000).default(10000),
    })
    .superRefine(refineDateRange),
});

module.exports = {
  MAX_ANALYTICS_RANGE_DAYS,
  growthAnalyticsQuerySchema,
  timeSeriesAnalyticsQuerySchema,
  vehicleAnalyticsQuerySchema,
  heatmapAnalyticsQuerySchema,
  retentionAnalyticsQuerySchema,
  cityAnalyticsQuerySchema,
  analyticsExportQuerySchema,
};