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

const verifyPaymentSchema = z.object({
  body: z.object({
    rideId: z.string().min(1, "Ride ID is required."),
    razorpayOrderId: z.string().trim().min(1, "Razorpay order ID is required."),
    razorpayPaymentId: z.string().trim().min(1, "Razorpay payment ID is required."),
    razorpaySignature: z.string().trim().min(1, "Razorpay signature is required."),
  }),
});

const initiatePaymentSchema = z.object({
  body: z.object({
    rideId: z.string().min(1, "Ride ID is required."),
  }),
});

module.exports = {
  createPaymentSchema,
  updatePaymentStatusSchema,
  verifyPaymentSchema,
  initiatePaymentSchema,
};
