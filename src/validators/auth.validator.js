const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must not exceed 100 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).+$/,
    "Password must contain uppercase, lowercase, number and special character",
  );

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Full name must be at least 3 characters")
      .max(100, "Full name must not exceed 100 characters"),

    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .toLowerCase(),

    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),

    password: passwordSchema,
  })
  .strict();

const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Invalid email address"),

    password: z
      .string()
      .min(1, "Password is required"),
  })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  passwordSchema,
};