const { z } = require("zod");

const createPaymentSchema = z.object({
  body: z.object({
    rideId: z.string().cuid("Invalid ride ID."),

    paymentMethod: z.enum([
      "CASH",
      "UPI",
      "CARD",
      "WALLET",
    ]),

    gateway: z.string().optional(),
  }),
});

const updatePaymentStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      "PENDING",
      "PROCESSING",
      "SUCCESS",
      "FAILED",
      "REFUNDED",
    ]),

    transactionId: z.string().optional(),
  }),
});

module.exports = {
  createPaymentSchema,
  updatePaymentStatusSchema,
};