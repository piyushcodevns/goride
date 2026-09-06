const { z } = require("zod");

const idSchema = z.string().trim().min(1, "Document ID is required.");

const userIdSchema = z
  .string()
  .trim()
  .min(1, "User ID is required.");

const documentTypeSchema = z.enum([
  "ID_PROOF",
  "ADDRESS_PROOF",
  "OTHER",
]);

const documentNumberSchema = z
  .string()
  .trim()
  .max(100, "Document number must not exceed 100 characters.")
  .optional()
  .nullable();

const documentIdParamSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

const uploadUserDocumentBodySchema = z.object({
  body: z.object({
    userId: userIdSchema,
    documentType: documentTypeSchema,
    documentNumber: documentNumberSchema,
  }),
});

const replaceUserDocumentBodySchema = z.object({
  body: z.object({
    documentNumber: documentNumberSchema,
  }),
});

const userDocumentListQuerySchema = z.object({
  query: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    search: z
      .string()
      .trim()
      .max(100)
      .optional(),

    documentType: documentTypeSchema.optional(),

    userId: userIdSchema.optional(),

    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "originalName",
        "fileSize",
      ])
      .default("createdAt"),

    sortOrder: z
      .enum(["asc", "desc"])
      .default("desc"),
  }),
});

module.exports = {
  documentIdParamSchema,
  uploadUserDocumentBodySchema,
  replaceUserDocumentBodySchema,
  userDocumentListQuerySchema,
};