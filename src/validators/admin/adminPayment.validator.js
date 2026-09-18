const { z } = require("zod");

/**
 * Payment ID parameter.
 */
const paymentIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Payment ID is required."),
  }),
});

/**
 * Pagination query.
 */
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Admin payment list filters.
 */
const paymentFiltersSchema = paginationQuerySchema
  .extend({
    search: z.string().trim().min(1).optional(),

    status: z
      .enum(["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REFUNDED"])
      .optional(),

    paymentMethod: z.enum(["CASH", "UPI", "CARD", "WALLET"]).optional(),

    gateway: z.string().trim().min(1).optional(),

    userId: z.string().trim().min(1).optional(),

    rideId: z.string().trim().min(1).optional(),

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
 * Admin payment list query.
 */
const getPaymentsQuerySchema = z.object({
  query: paymentFiltersSchema,
});

/**
 * Revenue report query.
 */
const revenueReportSchema = z
  .object({
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
 * Revenue report query wrapper.
 */
const revenueReportQuerySchema = z.object({
  query: revenueReportSchema,
});

/**
 * Payment status update body.
 */
const paymentStatusSchema = z
  .object({
    status: z.enum(["PROCESSING", "SUCCESS", "FAILED", "REFUNDED"]),

    transactionId: z
      .string()
      .trim()
      .min(1, "Transaction ID cannot be empty.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "SUCCESS" && !data.transactionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transactionId"],
        message: "Transaction ID is required when payment is successful.",
      });
    }
  });

/**
 * Payment status update body wrapper.
 */
const updatePaymentStatusSchema = z.object({
  body: paymentStatusSchema,
});

module.exports = {
  paymentIdParamSchema,
  paginationSchema: paginationQuerySchema,
  getPaymentsQuerySchema,
  revenueReportQuerySchema,
  updatePaymentStatusSchema,
};
