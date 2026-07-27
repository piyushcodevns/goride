const bcrypt = require("bcrypt");
// const prisma = require("../config/prisma");

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

// ================= REGISTER =================

const registerUser = async (userData) => {
  const validatedData = registerSchema.parse(userData);

  const emailExists = await findUserByEmail(validatedData.email);

  if (emailExists) {
    throw new Error("Email already registered.");
  }

  const phoneExists = await findUserByPhone(validatedData.phone);

  if (phoneExists) {
    throw new Error("Phone number already registered.");
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  const user = await createUser({
    fullName: validatedData.fullName,
    email: validatedData.email,
    phone: validatedData.phone,
    password: hashedPassword,
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
    throw new Error("Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
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
    throw new Error("No account found with this email.");
  }

  const resetToken = generateResetToken();
  const hashedToken = hashToken(resetToken);

  const passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

  await savePasswordResetToken(user.id, hashedToken, passwordResetExpires);

  await sendEmail({
    to: user.email,
    subject: "GoRide Password Reset",
    html: `
      <h2>Password Reset</h2>
      <p>Your password reset token is:</p>
      <h3>${resetToken}</h3>
      <p>This token will expire in 15 minutes.</p>
    `,
  });

  console.log("=================================");
  console.log("PASSWORD RESET TOKEN:", resetToken);
  console.log("=================================");

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
    throw new Error("Invalid or expired reset token.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await updatePassword(user.id, hashedPassword);

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
    throw new Error("User not found.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    throw new Error("Current password is incorrect.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirm password do not match.");
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);

  if (isSamePassword) {
    throw new Error("New password must be different from current password.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await changeUserPassword(userId, hashedPassword);

  return {
    message: "Password changed successfully.",
  };
};

// ================= SEND VERIFICATION EMAIL =================

const sendVerificationEmail = async (userId) => {
  const user = await findUserByIdWithPassword(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.emailVerified) {
    throw new Error("Email is already verified.");
  }

  // Generate 6 digit OTP
  const verificationOTP = generateOTP();

  // Hash OTP before saving in database
  const hashedToken = hashToken(verificationOTP);

  const emailVerificationExpires = new Date(
    Date.now() + 15 * 60 * 1000
  );

  await saveEmailVerificationToken(
    user.id,
    hashedToken,
    emailVerificationExpires
  );

  await sendEmail({
    to: user.email,
    subject: "GoRide Email Verification",
    html: `
      <h2>GoRide Email Verification</h2>
      <p>Your verification code is:</p>
      <h1>${verificationOTP}</h1>
      <p>This code will expire in 15 minutes.</p>
    `,
  });

  console.log("=================================");
  console.log("EMAIL VERIFICATION OTP:", verificationOTP);
  console.log("=================================");

  return {
    message: "Verification email sent successfully.",
  };
};

// ================= VERIFY EMAIL =================

const verifyEmail = async (otp) => {
  const hashedToken = hashToken(otp);

  const user = await findUserByEmailVerificationToken(hashedToken);

  if (!user) {
    throw new Error("Invalid or expired verification token.");
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
