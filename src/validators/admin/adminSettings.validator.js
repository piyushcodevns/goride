const { z } = require("zod");

const settingCategorySchema = z.enum([
  "GENERAL",
  "COMPANY",
  "MAINTENANCE",
  "UPLOAD",
]);

const settingKeySchema = z
  .string()
  .trim()
  .min(2, "Setting key must contain at least 2 characters.")
  .max(100, "Setting key cannot exceed 100 characters.")
  .regex(
    /^[A-Z][A-Z0-9_.-]*$/,
    "Setting key must use uppercase letters, numbers, dots, underscores, or hyphens.",
  );

const settingValueSchema = z
  .string()
  .max(5000, "Setting value cannot exceed 5000 characters.")
  .nullable()
  .optional();

const descriptionSchema = z
  .string()
  .trim()
  .max(500, "Description cannot exceed 500 characters.")
  .nullable()
  .optional();

/**
 * Create system setting.
 */
const createSettingSchema = z.object({
  body: z.object({
    key: settingKeySchema,

    category: settingCategorySchema,

    value: settingValueSchema,

    isSecret: z.boolean().optional(),

    description: descriptionSchema,
  }),

  params: z.object({}),

  query: z.object({}),
});

/**
 * Update system setting.
 */
const updateSettingSchema = z.object({
  body: z
    .object({
      value: settingValueSchema,

      category: settingCategorySchema.optional(),

      isSecret: z.boolean().optional(),

      description: descriptionSchema,
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      "At least one setting field is required.",
    ),

  params: z.object({
    key: settingKeySchema,
  }),

  query: z.object({}),
});

/**
 * Get system setting by key.
 */
const settingKeyParamSchema = z.object({
  body: z.object({}),

  params: z.object({
    key: settingKeySchema,
  }),

  query: z.object({}),
});

/**
 * Get all system settings.
 */
const getAllSettingsQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    category: settingCategorySchema.optional(),
  }),
});

module.exports = {
  createSettingSchema,
  updateSettingSchema,
  settingKeyParamSchema,
  getAllSettingsQuerySchema,
};
