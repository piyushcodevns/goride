const { z } = require("zod");

const registerDriverSchema = z.object({
  licenseNumber: z
    .string()
    .trim()
    .min(5, "License number is required.")
    .max(30, "License number is too long."),

  aadharNumber: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "Aadhar number must be exactly 12 digits."),

  experience: z
    .number({
      required_error: "Experience is required.",
      invalid_type_error: "Experience must be a number.",
    })
    .int("Experience must be an integer.")
    .min(0, "Experience cannot be negative.")
    .max(60, "Invalid experience."),
});

module.exports = {
  registerDriverSchema,
};