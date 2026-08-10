const { z } = require("zod");
const USER_ROLES = require("../../constants/userRoles");

const userIdParamSchema = z.object({
  id: z.string().min(1, "User ID is required."),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const getUsersQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(100).optional(),

  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  isVerified: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  emailVerified: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  role: z.enum(Object.values(USER_ROLES)).optional(),

  sortBy: z
    .enum([
      "fullName",
      "email",
      "phone",
      "createdAt",
      "updatedAt",
      "lastLoginAt",
    ])
    .default("createdAt"),

  sortOrder: z
    .enum(["asc", "desc"])
    .default("desc"),
});

module.exports = {
  userIdParamSchema,
  paginationSchema,
  getUsersQuerySchema,
};
