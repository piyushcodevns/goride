const { z } = require("zod");

const roles = [
  "SUPER_ADMIN",
  "ADMIN",
  "OPERATIONS_MANAGER",
  "FINANCE_MANAGER",
  "SUPPORT_EXECUTIVE",
  "DRIVER_MANAGER",
  "MARKETING_MANAGER",
];

const roleParamSchema = z.object({
  params: z.object({ role: z.enum(roles) }),
});

const rolePermissionsSchema = roleParamSchema.extend({
  body: z.object({
    permissions: z.array(z.string().min(1)).max(200).superRefine((items, ctx) => {
      if (new Set(items).size !== items.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate permissions are not allowed." });
      }
    }),
  }).strict(),
});

const adminRoleSchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
  body: z.object({ role: z.enum(roles) }).strict(),
});

module.exports = { roleParamSchema, rolePermissionsSchema, adminRoleSchema };
