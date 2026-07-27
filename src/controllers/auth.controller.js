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
      message: "User registered successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
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
    return res.status(401).json({
      success: false,
      message: error.message,
    });
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
      message: "Password reset token generated successfully.",
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
    const result = await changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword,
      req.body.confirmPassword
    );

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
    const result = await sendVerificationEmail(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Verification email sent successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= VERIFY EMAIL =================

const verifyEmailController = async (req, res) => {
  try {
    const result = await verifyEmail(req.body.token);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
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