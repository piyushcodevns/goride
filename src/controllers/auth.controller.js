const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  changePassword,
  sendVerificationEmail,
  verifyEmail,
} = require("../services/auth.service");

// ================= REGISTER =================

const register = async (req, res) => {
  try {
    const result = await registerUser(req.body);

    return res.status(201).json({
      success: true,
      message: result.message || "Account created. Please verify your email to continue.",
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.name === "ZodError" ? 400 : 400);
    const message = (error.name === "ZodError" && (error.errors?.[0]?.message || error.issues?.[0]?.message)) || error.message;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

// ================= LOGIN =================

const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.name === "ZodError" ? 400 : 401);
    const message = (error.name === "ZodError" && (error.errors?.[0]?.message || error.issues?.[0]?.message)) || error.message || "Invalid email or password.";

    const responseBody = {
      success: false,
      message,
    };
    if (error.data) {
      responseBody.data = error.data;
    }

    return res.status(statusCode).json(responseBody);
  }
};

// ================= PROFILE =================

const profile = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Profile fetched successfully.",
    data: req.user,
  });
};

// ================= FORGOT PASSWORD =================

const forgotPasswordController = async (req, res) => {
  try {
    const result = await forgotPassword(req.body);

    return res.status(200).json({
      success: true,
      message: result.message || "Verification code sent to your email.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= RESET PASSWORD =================

const resetPasswordController = async (req, res) => {
  try {
    const result = await resetPassword(req.body);

    return res.status(200).json({
      success: true,
      message: "Password reset successful.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= CHANGE PASSWORD =================

const changePasswordController = async (req, res) => {
  try {
    const result = await changePassword(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= SEND VERIFICATION EMAIL =================

const sendVerificationEmailController = async (req, res) => {
  try {
    const target = req.user?.id
      ? { userId: req.user.id }
      : (req.body?.email ? { email: req.body.email } : null);

    if (!target) {
      return res.status(400).json({
        success: false,
        message: "Email is required to send verification code.",
      });
    }

    const result = await sendVerificationEmail(target);

    return res.status(200).json({
      success: true,
      message: result.message || "Verification email sent successfully.",
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= VERIFY EMAIL =================

const verifyEmailController = async (req, res) => {
  try {
    const otp = req.body?.otp;
    const email = req.body?.email;
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit number",
      });
    }

    const result = await verifyEmail(otp, email);

    return res.status(200).json({
      success: true,
      message: result.message || "Email verified successfully.",
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.name === "ZodError" ? 400 : 400);
    const message = (error.name === "ZodError" && (error.errors?.[0]?.message || error.issues?.[0]?.message)) || error.message;
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

module.exports = {
  register,
  login,
  profile,
  forgotPasswordController,
  resetPasswordController,
  changePasswordController,
  sendVerificationEmailController,
  verifyEmailController,
};