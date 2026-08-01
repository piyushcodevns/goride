const { z } = require("zod");

const createPaymentSchema = z.object({
  body: z.object({
    rideId: z.string().cuid("Invalid ride ID."),

    paymentMethod: z.enum(["CASH", "UPI", "CARD", "WALLET"]),

    gateway: z.string().trim().min(1, "Gateway cannot be empty.").optional(),
  }),
});

const updatePaymentStatusSchema = z.object({
  body: z
    .object({
      status: z.enum([
        "PENDING",
        "PROCESSING",
        "SUCCESS",
        "FAILED",
        "REFUNDED",
      ]),

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
    }),
});

module.exports = {
  createPaymentSchema,
  updatePaymentStatusSchema,
};
