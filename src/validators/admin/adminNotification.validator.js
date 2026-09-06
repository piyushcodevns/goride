const { z } = require("zod");

const userIds = z.array(z.string().trim().min(1)).min(1).max(10000);
const messageFields = {
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(1000),
  userIds,
};

const createSmsCampaignSchema = z.object({
  body: z.object({
    ...messageFields,
    scheduledAt: z.string().datetime().optional(),
  }).strict(),
});

const campaignIdSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
});

const pushNotificationSchema = z.object({
  body: z.object({
    ...messageFields,
    scheduledAt: z.string().datetime().optional(),
  }).strict(),
});

const campaignQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    status: z.enum(["DRAFT", "SCHEDULED", "SENDING", "SENT", "PARTIAL", "FAILED"]).optional(),
  }),
});

module.exports = {
  createSmsCampaignSchema,
  campaignIdSchema,
  pushNotificationSchema,
  campaignQuerySchema,
};
