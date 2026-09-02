const bcrypt = require("bcrypt");
// const prisma = require("../config/prisma");
const notificationService = require("./notification.service");
const NotificationFactory = require("../factories/notification.factory");
const { welcomeTemplate } = require("../templates/email/welcome.template");

const {
  passwordResetTemplate,
} = require("../templates/email/password-reset.template");

const {
  emailVerificationTemplate,
} = require("../templates/email/email-verification.template");

const logger = require("../utils/logger");

const {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} = require("../utils/AppError");

const {
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserByPhone,
  findUserByResetToken,
  findUserByEmailVerificationToken,

  findUserByIdWithPassword,
  changeUserPassword,

  createUser,
  savePasswordResetToken,
  saveEmailVerificationToken,
  updatePassword,
  verifyUserEmail,
} = require("../repositories/auth.repository");

const generateResetToken = require("../utils/generateToken");
const hashToken = require("../utils/hashToken");
const generateOTP = require("../utils/generateOTP");
const { generateToken } = require("../utils/jwt");
const { sendEmail } = require("./email.service");

const {
  registerSchema,
  passwordSchema,
} = require("../validators/auth.validator");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

// ================= REGISTER =================

const registerUser = async (userData) => {
  const validatedData = registerSchema.parse(userData);

  const emailExists = await findUserByEmail(validatedData.email);

  if (emailExists) {
    throw new ConflictError("Email already registered.");
  }

  const phoneExists = await findUserByPhone(validatedData.phone);

  if (phoneExists) {
    throw new ConflictError("Phone number already registered.");
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);

  const user = await createUser({
    fullName: validatedData.fullName,
    email: validatedData.email,
    phone: validatedData.phone,
    password: hashedPassword,
  });

  await notificationService.dispatchNotification(
    NotificationFactory.createWelcomeNotification(user),
  );

  await sendEmail({
    to: user.email,
    subject: "Welcome to GoRide",
    html: welcomeTemplate({
      fullName: user.fullName,
    }),
  });

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
  };
};

// ================= LOGIN =================

const loginUser = async ({ email, password }) => {
  const user = await findUserByEmailWithPassword(email);

  if (!user) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
  };
};

// ================= FORGOT PASSWORD =================

const forgotPassword = async ({ email }) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new NotFoundError("No account found with this email.");
  }

  const resetToken = generateResetToken();
  const hashedToken = hashToken(resetToken);

  const passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

  await savePasswordResetToken(user.id, hashedToken, passwordResetExpires);

  await sendEmail({
    to: user.email,
    subject: "GoRide Password Reset",
    html: passwordResetTemplate({
      token: resetToken,
    }),
  });

  logger.info("Password reset email sent successfully.", {
    userId: user.id,
    email: user.email,
  });

  return {
    message: "Password reset email sent successfully.",
  };
};

// ================= RESET PASSWORD =================

const resetPassword = async ({ token, password }) => {
  passwordSchema.parse(password);
  const hashedToken = hashToken(token);

  const user = await findUserByResetToken(hashedToken);

  if (!user) {
    throw new BadRequestError("Invalid or expired reset token.");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  await updatePassword(user.id, hashedPassword);

  await notificationService.dispatchNotification(
    NotificationFactory.createPasswordResetNotification(user),
  );

  return {
    message: "Password reset successfully.",
  };
};

// ================= CHANGE PASSWORD =================

const changePassword = async (
  userId,
  currentPassword,
  newPassword,
  confirmPassword,
) => {
  passwordSchema.parse(newPassword);
  const user = await findUserByIdWithPassword(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    throw new UnauthorizedError("Current password is incorrect.");
  }

  if (newPassword !== confirmPassword) {
    throw new BadRequestError(
      "New password and confirm password do not match.",
    );
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);

  if (isSamePassword) {
    throw new BadRequestError(
      "New password must be different from current password.",
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await changeUserPassword(userId, hashedPassword);

  return {
    message: "Password changed successfully.",
  };
};

// ================= SEND VERIFICATION EMAIL =================

const sendVerificationEmail = async (userId) => {
  const user = await findUserByIdWithPassword(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  if (user.emailVerified) {
    throw new ConflictError("Email is already verified.");
  }

  // Generate 6 digit OTP
  const verificationOTP = generateOTP();

  // Hash OTP before saving in database
  const hashedToken = hashToken(verificationOTP);

  const emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);

  await saveEmailVerificationToken(
    user.id,
    hashedToken,
    emailVerificationExpires,
  );

  await sendEmail({
    to: user.email,
    subject: "GoRide Email Verification",
    html: emailVerificationTemplate({
      otp: verificationOTP,
    }),
  });

  logger.info("Email verification email sent successfully.", {
    userId: user.id,
    email: user.email,
  });

  return {
    message: "Verification email sent successfully.",
  };
};

// ================= VERIFY EMAIL =================

const verifyEmail = async (otp) => {
  const hashedToken = hashToken(otp);

  const user = await findUserByEmailVerificationToken(hashedToken);

  if (!user) {
    throw new BadRequestError("Invalid or expired verification token.");
  }

  await verifyUserEmail(user.id);

  return {
    message: "Email verified successfully.",
  };
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  changePassword,
  sendVerificationEmail,
  verifyEmail,
};
