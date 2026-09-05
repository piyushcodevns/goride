const { z } = require("zod");

const ticketTypeEnum = z.enum([
  "GENERAL",
  "COMPLAINT",
  "USER_REPORT",
  "DRIVER_REPORT",
]);

const ticketStatusEnum = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

const idSchema = z.string().min(1);

const createTicketSchema = z.object({
  body: z.object({
    userId: idSchema.optional(),
    driverId: idSchema.optional(),
    rideId: idSchema.optional(),

    type: ticketTypeEnum.default("GENERAL"),

    subject: z
      .string()
      .trim()
      .min(3)
      .max(200),

    description: z
      .string()
      .trim()
      .min(5)
      .max(5000),
  }),
});

const listTicketsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(200).optional(),
    type: ticketTypeEnum.optional(),
    status: ticketStatusEnum.optional(),
    userId: idSchema.optional(),
    driverId: idSchema.optional(),
    rideId: idSchema.optional(),

    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),

    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

const ticketIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

const ticketNumberSchema = z.object({
  params: z.object({
    ticketNumber: z.string().trim().min(1).max(100),
  }),
});

const updateStatusSchema = z.object({
  params: z.object({
    id: idSchema,
  }),

  body: z.object({
    status: ticketStatusEnum,

    message: z
      .string()
      .trim()
      .max(2000)
      .optional(),
  }),
});

const replyTicketSchema = z.object({
  params: z.object({
    id: idSchema,
  }),

  body: z.object({
    message: z
      .string()
      .trim()
      .min(1)
      .max(5000),
  }),
});

module.exports = {
  createTicketSchema,
  listTicketsSchema,
  ticketIdSchema,
  ticketNumberSchema,
  updateStatusSchema,
  replyTicketSchema,
};
