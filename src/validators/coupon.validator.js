const { z } = require("zod");

const couponCodeSchema = z
  .string()
  .trim()
  .min(3, "Coupon code must be at least 3 characters.")
  .max(30, "Coupon code cannot exceed 30 characters.")
  .regex(
    /^[A-Z0-9_-]+$/,
    "Coupon code can only contain uppercase letters, numbers, hyphens and underscores.",
  );

const createCouponSchema = z.object({
  body: z
    .object({
      code: couponCodeSchema,

      description: z
        .string()
        .trim()
        .max(500, "Description cannot exceed 500 characters.")
        .optional(),

      type: z.enum(["FLAT", "PERCENTAGE"]),

      discountValue: z
        .number({
          invalid_type_error: "Discount value must be a number.",
        })
        .positive("Discount value must be greater than 0."),

      minimumRideFare: z
        .number({
          invalid_type_error: "Minimum ride fare must be a number.",
        })
        .min(0, "Minimum ride fare cannot be negative.")
        .default(0),

      maximumDiscount: z
        .number({
          invalid_type_error: "Maximum discount must be a number.",
        })
        .positive("Maximum discount must be greater than 0.")
        .nullable()
        .optional(),

      usageLimit: z
        .number({
          invalid_type_error: "Usage limit must be a number.",
        })
        .int()
        .positive("Usage limit must be greater than 0.")
        .optional(),

      perUserUsageLimit: z
        .number({
          invalid_type_error: "Per-user usage limit must be a number.",
        })
        .int()
        .positive("Per-user usage limit must be greater than 0.")
        .default(1),

      validFrom: z.coerce.date(),

      validUntil: z.coerce.date(),

      isActive: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.type === "PERCENTAGE" && data.discountValue > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountValue"],
          message: "Percentage discount cannot exceed 100%.",
        });
      }

      if (data.validUntil <= data.validFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["validUntil"],
          message: "Valid until must be after valid from.",
        });
      }

      if (data.type === "PERCENTAGE" && data.maximumDiscount === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maximumDiscount"],
          message: "Maximum discount is required for percentage coupons.",
        });
      }
    }),
});

const updateCouponSchema = z.object({
  body: z
    .object({
      code: couponCodeSchema.optional(),

      description: z.string().trim().max(500).optional(),

      type: z.enum(["FLAT", "PERCENTAGE"]).optional(),

      discountValue: z.number().positive().optional(),

      minimumRideFare: z.number().min(0).optional(),

      maximumDiscount: z.number().positive().nullable().optional(),

      usageLimit: z.number().int().positive().optional(),

      perUserUsageLimit: z.number().int().positive().optional(),

      validFrom: z.coerce.date().optional(),

      validUntil: z.coerce.date().optional(),

      isActive: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.type === "PERCENTAGE" &&
        data.discountValue !== undefined &&
        data.discountValue > 100
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountValue"],
          message: "Percentage discount cannot exceed 100%.",
        });
      }

      if (
        data.validFrom &&
        data.validUntil &&
        data.validUntil <= data.validFrom
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["validUntil"],
          message: "Valid until must be after valid from.",
        });
      }
    }),
});

const couponIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid("Invalid coupon ID."),
  }),
});

const validateCouponSchema = z.object({
  body: z.object({
    code: couponCodeSchema,

    rideFare: z
      .number({
        invalid_type_error: "Ride fare must be a number.",
      })
      .min(0, "Ride fare cannot be negative."),
  }),
});

const applyCouponSchema = z.object({
  body: z.object({
    rideId: z.string().cuid("Invalid ride ID."),

    code: couponCodeSchema,
  }),
});

module.exports = {
  createCouponSchema,
  updateCouponSchema,
  couponIdParamSchema,
  validateCouponSchema,
  applyCouponSchema,
};
