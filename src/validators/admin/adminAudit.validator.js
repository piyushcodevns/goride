const { z } = require("zod");

const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "APPROVE",
  "REJECT",
  "SUSPEND",
  "ACTIVATE",
  "CANCEL",
  "REFUND",
  "BLOCK",
  "ASSIGN",
  "REASSIGN",
  "FORCE_COMPLETE",
  "UPLOAD",
  "REPLACE",
  "ACCESS",
];

const AUDIT_ENTITIES = [
  "USER",
  "DRIVER",
  "VEHICLE",
  "RIDE",
  "PAYMENT",
  "COUPON",
  "PRICING",
  "NOTIFICATION",
  "SETTINGS",
  "ADMIN",
  "FILE",
];

const LOGIN_STATUSES = [
  "SUCCESS",
  "FAILED",
  "LOCKED",
  "LOGOUT",
];

const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

const dateRangeRefinement = (data, ctx) => {
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "endDate must be greater than or equal to startDate.",
    });
  }
};

const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortOrder: sortOrderSchema,
};

/**
 * Audit log list query.
 */
const auditLogQuerySchema = z.object({
  query: z
    .object({
      ...paginationFields,

      search: z.string().trim().min(1).max(100).optional(),

      adminId: z.string().trim().min(1).optional(),
      action: z.enum(AUDIT_ACTIONS).optional(),
      entity: z.enum(AUDIT_ENTITIES).optional(),
      entityId: z.string().trim().min(1).optional(),
      ipAddress: z.string().trim().min(1).optional(),

      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .superRefine(dateRangeRefinement),
});

/**
 * Audit log ID parameter.
 */
const auditLogIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

/**
 * Entity audit-log query.
 */
const auditEntityParamsSchema = z.object({
  params: z.object({
    entity: z.enum(AUDIT_ENTITIES),
    entityId: z.string().trim().min(1),
  }),
});

const auditEntityQuerySchema = z.object({
  query: z.object({
    sortOrder: sortOrderSchema,
  }),
});

/**
 * Admin login history query.
 */
const loginHistoryQuerySchema = z.object({
  query: z
    .object({
      ...paginationFields,

      userId: z.string().trim().min(1).optional(),
      email: z.string().trim().email().optional(),
      status: z.enum(LOGIN_STATUSES).optional(),
      ipAddress: z.string().trim().min(1).optional(),

      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .superRefine(dateRangeRefinement),
});

/**
 * Login history ID parameter.
 */
const loginHistoryIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

/**
 * Export query.
 */
const auditExportQuerySchema = z.object({
  query: z
    .object({
      search: z.string().trim().min(1).max(100).optional(),

      adminId: z.string().trim().min(1).optional(),
      action: z.enum(AUDIT_ACTIONS).optional(),
      entity: z.enum(AUDIT_ENTITIES).optional(),
      entityId: z.string().trim().min(1).optional(),
      ipAddress: z.string().trim().min(1).optional(),

      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),

      sortOrder: sortOrderSchema,
    })
    .superRefine(dateRangeRefinement),
});

module.exports = {
  auditLogQuerySchema,
  auditLogIdParamSchema,
  auditEntityParamsSchema,
  auditEntityQuerySchema,
  loginHistoryQuerySchema,
  loginHistoryIdParamSchema,
  auditExportQuerySchema,
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  LOGIN_STATUSES,
};


