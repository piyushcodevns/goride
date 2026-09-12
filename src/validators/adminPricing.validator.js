const { z } = require("zod");

const vehicleTypeSchema = z.enum([
  "BIKE",
  "AUTO",
  "CAR",
  "SUV",
]);

const pricingConfigFields = {
  city: z
    .string()
    .trim()
    .min(2, "City must contain at least 2 characters.")
    .max(100, "City cannot exceed 100 characters."),

  vehicleType: vehicleTypeSchema,

  baseFare: z
    .number({
      invalid_type_error: "Base fare must be a number.",
    })
    .nonnegative("Base fare cannot be negative."),

  pricePerKm: z
    .number({
      invalid_type_error: "Price per km must be a number.",
    })
    .nonnegative("Price per km cannot be negative."),

  pricePerMinute: z
    .number({
      invalid_type_error: "Price per minute must be a number.",
    })
    .nonnegative("Price per minute cannot be negative."),

  minimumFare: z
    .number({
      invalid_type_error: "Minimum fare must be a number.",
    })
    .nonnegative("Minimum fare cannot be negative."),

  platformFee: z
    .number({
      invalid_type_error: "Platform fee must be a number.",
    })
    .nonnegative("Platform fee cannot be negative."),

  bookingFee: z
    .number({
      invalid_type_error: "Booking fee must be a number.",
    })
    .nonnegative("Booking fee cannot be negative."),

  gstPercentage: z
    .number({
      invalid_type_error: "GST percentage must be a number.",
    })
    .min(0, "GST percentage cannot be negative.")
    .max(100, "GST percentage cannot exceed 100."),

  waitingChargePerMinute: z
    .number({
      invalid_type_error: "Waiting charge per minute must be a number.",
    })
    .nonnegative("Waiting charge per minute cannot be negative."),

  airportCharge: z
    .number({
      invalid_type_error: "Airport charge must be a number.",
    })
    .nonnegative("Airport charge cannot be negative."),

  peakMultiplier: z
    .number({
      invalid_type_error: "Peak multiplier must be a number.",
    })
    .min(1, "Peak multiplier must be at least 1."),

  nightMultiplier: z
    .number({
      invalid_type_error: "Night multiplier must be a number.",
    })
    .min(1, "Night multiplier must be at least 1."),

  rainMultiplier: z
    .number({
      invalid_type_error: "Rain multiplier must be a number.",
    })
    .min(1, "Rain multiplier must be at least 1."),

  eventMultiplier: z
    .number({
      invalid_type_error: "Event multiplier must be a number.",
    })
    .min(1, "Event multiplier must be at least 1."),

  maxSurgeMultiplier: z
    .number({
      invalid_type_error: "Maximum surge multiplier must be a number.",
    })
    .min(1, "Maximum surge multiplier must be at least 1."),

  isActive: z.boolean().optional(),
};

const createPricingSchema = z.object({
  body: z
    .object(pricingConfigFields)
    .superRefine((data, ctx) => {
      if (data.minimumFare < data.baseFare) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minimumFare"],
          message: "Minimum fare cannot be less than base fare.",
        });
      }

      if (data.maxSurgeMultiplier < data.peakMultiplier) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxSurgeMultiplier"],
          message:
            "Maximum surge multiplier cannot be less than peak multiplier.",
        });
      }

      if (data.maxSurgeMultiplier < data.nightMultiplier) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxSurgeMultiplier"],
          message:
            "Maximum surge multiplier cannot be less than night multiplier.",
        });
      }

      if (data.maxSurgeMultiplier < data.rainMultiplier) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxSurgeMultiplier"],
          message:
            "Maximum surge multiplier cannot be less than rain multiplier.",
        });
      }

      if (data.maxSurgeMultiplier < data.eventMultiplier) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxSurgeMultiplier"],
          message:
            "Maximum surge multiplier cannot be less than event multiplier.",
        });
      }
    }),
  params: z.object({}),
  query: z.object({}),
});

const updatePricingSchema = z.object({
  body: z
    .object({
      city: pricingConfigFields.city.optional(),
      vehicleType: pricingConfigFields.vehicleType.optional(),
      baseFare: pricingConfigFields.baseFare.optional(),
      pricePerKm: pricingConfigFields.pricePerKm.optional(),
      pricePerMinute: pricingConfigFields.pricePerMinute.optional(),
      minimumFare: pricingConfigFields.minimumFare.optional(),
      platformFee: pricingConfigFields.platformFee.optional(),
      bookingFee: pricingConfigFields.bookingFee.optional(),
      gstPercentage: pricingConfigFields.gstPercentage.optional(),
      waitingChargePerMinute:
        pricingConfigFields.waitingChargePerMinute.optional(),
      airportCharge: pricingConfigFields.airportCharge.optional(),
      peakMultiplier: pricingConfigFields.peakMultiplier.optional(),
      nightMultiplier: pricingConfigFields.nightMultiplier.optional(),
      rainMultiplier: pricingConfigFields.rainMultiplier.optional(),
      eventMultiplier: pricingConfigFields.eventMultiplier.optional(),
      maxSurgeMultiplier: pricingConfigFields.maxSurgeMultiplier.optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      "At least one pricing field is required.",
    ),
  params: z.object({
    id: z.string().cuid("Invalid pricing configuration ID."),
  }),
  query: z.object({}),
});

const pricingIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.string().cuid("Invalid pricing configuration ID."),
  }),
  query: z.object({}),
});

const getAllPricingQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    city: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    vehicleType: vehicleTypeSchema.optional(),

    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  }),
});

module.exports = {
  createPricingSchema,
  updatePricingSchema,
  pricingIdParamSchema,
  getAllPricingQuerySchema,
};
