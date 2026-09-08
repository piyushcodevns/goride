const { z } = require("zod");

const backupIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Backup ID is required"),
  }),
});

const backupQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]).optional(),
    type: z.enum(["MANUAL", "SCHEDULED"]).optional(),
  }),
});

const restoreBackupSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Backup ID is required"),
  }),
  body: z.object({
    confirmation: z.literal("RESTORE"),
  }).strict(),
});

module.exports = {
  backupIdSchema,
  backupQuerySchema,
  restoreBackupSchema,
};
