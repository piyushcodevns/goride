const { z } = require("zod");

const userDocumentUploadSchema = z.object({
  body: z.object({
    documentType: z.enum(["ID_PROOF", "ADDRESS_PROOF", "OTHER"], {
      required_error: "Document type is required.",
      invalid_type_error: "Invalid document type.",
    }),
    documentNumber: z.string().trim().max(100, "Document number is too long.").optional(),
  }),
});

const userDocumentIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Document ID is required."),
  }),
});

module.exports = {
  userDocumentUploadSchema,
  userDocumentIdParamSchema,
};
