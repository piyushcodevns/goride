const { z } = require("zod");

// =========================
// COMMON PASSWORD SCHEMA
// =========================

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must not exceed 100 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).+$/,
    "Password must contain uppercase, lowercase, number and special character",
  );

// =========================
// COMMON EMAIL SCHEMA
// =========================

const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .toLowerCase();

// =========================
// CREATE ADMIN
// =========================

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Full name must be at least 3 characters")
      .max(100, "Full name must not exceed 100 characters"),

    email: emailSchema,

    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),

    password: passwordSchema,
  })
  .strict();

// =========================
// ADMIN LOGIN
// =========================

const loginSchema = z
  .object({
    email: emailSchema,

    password: z
      .string()
      .min(1, "Password is required")
      .max(100, "Password must not exceed 100 characters"),
  })
  .strict();

// =========================
// REFRESH TOKEN
// =========================

const refreshTokenSchema = z
  .object({
    refreshToken: z
      .string()
      .trim()
      .min(1, "Refresh token is required")
      .max(500, "Invalid refresh token"),
  })
  .strict();

// =========================
// LOGOUT
// =========================

const logoutSchema = z
  .object({
    sessionId: z
      .string()
      .trim()
      .min(1, "Session ID is required")
      .max(100, "Invalid session ID"),
  })
  .strict();

// =========================
// CHANGE PASSWORD
// =========================

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .max(100, "Current password must not exceed 100 characters"),

    newPassword: passwordSchema,

    confirmPassword: z
      .string()
      .min(1, "Confirm password is required")
      .max(100, "Confirm password must not exceed 100 characters"),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password do not match.",
    path: ["confirmPassword"],
  });

// =========================
// FORGOT PASSWORD
// =========================

const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

// =========================
// RESET PASSWORD
// =========================

const resetPasswordSchema = z
  .object({
    resetToken: z
      .string()
      .trim()
      .min(1, "Reset token is required")
      .max(500, "Invalid reset token"),

    newPassword: passwordSchema,

    confirmPassword: z
      .string()
      .min(1, "Confirm password is required")
      .max(100, "Confirm password must not exceed 100 characters"),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password do not match.",
    path: ["confirmPassword"],
  });

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  passwordSchema,
};
