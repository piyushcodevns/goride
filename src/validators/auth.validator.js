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

    email: z.string().trim().email("Invalid email address").toLowerCase(),

    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),

    password: passwordSchema,
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),

    password: z.string().min(1, "Password is required"),
  })
  .strict();

const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email("Invalid email address").toLowerCase(),
  })
  .strict();

const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1, "Reset token is required")
      .max(500, "Invalid reset token"),
    password: passwordSchema,
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .max(100, "Current password is invalid"),

    newPassword: passwordSchema,

    confirmPassword: z
      .string()
      .min(1, "Password confirmation is required")
      .max(100, "Password confirmation is invalid"),
  })
  .strict();

const verifyEmailSchema = z
  .object({
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "OTP must be a 6-digit number"),
  })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  passwordSchema,
};
