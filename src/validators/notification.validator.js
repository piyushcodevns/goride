const { z } = require("zod");

const notificationIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Notification ID is required"),
  }),
});

const notificationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    sort: z.enum(["asc", "desc"]).optional(),
    status: z
      .enum(["PENDING", "PROCESSING", "SENT", "FAILED", "READ"])
      .optional(),
    type: z
      .enum(["SYSTEM", "ACCOUNT", "SECURITY", "RIDE", "PAYMENT", "PROMOTION"])
      .optional(),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
    search: z.string().trim().max(100).optional(),
  }),
});

module.exports = {
  notificationIdSchema,
  notificationQuerySchema,
};
