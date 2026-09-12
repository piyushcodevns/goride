const { z } = require("zod");

const driverIdParamSchema = z.object({
  id: z.string().min(1, "Driver ID is required."),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const getDriversQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),

  status: z
    .enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"])
    .optional(),

  availability: z
    .enum(["OFFLINE", "AVAILABLE", "BUSY"])
    .optional(),

  sortBy: z
    .enum([
      "createdAt",
      "updatedAt",
      "experience",
      "averageRating",
      "totalRatings",
    ])
    .default("createdAt"),

  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const reasonBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

const documentIdParamSchema = z.object({
  id: z.string().min(1, "Document ID is required."),
});

const documentRejectBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

module.exports = {
  driverIdParamSchema,
  paginationSchema,
  getDriversQuerySchema,
  reasonBodySchema,
  documentIdParamSchema,
  documentRejectBodySchema,
};