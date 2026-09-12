const {
  loginAdmin,
  createAdmin,
  refreshAdminToken,
  logoutAdmin,
  changeAdminPassword,
  forgotAdminPassword,
  resetAdminPasswordService,
  verifyAdminMfaLogin,
  enableAdminTwoFactor,
  confirmAdminTwoFactor,
  disableAdminTwoFactor,
} = require("../../services/admin/adminAuth.service");

const { AppError } = require("../../utils/AppError");

// =========================
// ADMIN LOGIN
// =========================

const login = async (req, res) => {
  try {
    const result = await loginAdmin({
      email: req.body.email,
      password: req.body.password,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Admin login successful.",
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// =========================
// CREATE ADMIN
// =========================

const createAdminController = async (req, res) => {
  try {
    const result = await createAdmin({
      ...req.body,
      createdByAdminId: req.admin.id,
      createdByRole: req.admin.role,
    });

    return res.status(201).json({
      success: true,
      message: "Admin created successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// =========================
// REFRESH ADMIN TOKEN
// =========================

const refreshToken = async (req, res) => {
  try {
    const result = await refreshAdminToken({
      refreshToken: req.body.refreshToken,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Admin token refreshed successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// =========================
// ADMIN LOGOUT
// =========================

const logout = async (req, res) => {
  try {
    const result = await logoutAdmin({
      sessionId: req.body.sessionId,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Admin logout successful.",
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const changeAdminPasswordController = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const result = await changeAdminPassword(
      req.admin.id,
      currentPassword,
      newPassword,
      confirmPassword,
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const forgotAdminPasswordController = async (req, res) => {
  try {
    const result = await forgotAdminPassword(req.body.email);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const resetAdminPasswordController = async (req, res) => {
  try {
    const { resetToken, resetOtp, otp, newPassword, confirmPassword } = req.body;
    const token = resetOtp || otp || resetToken;

    const result = await resetAdminPasswordService(
      token,
      newPassword,
      confirmPassword,
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const verifyMfaLogin = async (req, res, next) => {
  try {
    const result = await verifyAdminMfaLogin({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const setupMfa = async (req, res, next) => {
  try {
    const result = await enableAdminTwoFactor(req.admin.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const confirmMfa = async (req, res, next) => {
  try {
    const result = await confirmAdminTwoFactor(req.admin.id, req.body.code);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const disableMfa = async (req, res, next) => {
  try {
    const result = await disableAdminTwoFactor(req.admin.id, req.body.code);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  createAdminController,
  refreshToken,
  logout,
  changeAdminPasswordController,
  forgotAdminPasswordController,
  resetAdminPasswordController,
  verifyMfaLogin,
  setupMfa,
  confirmMfa,
  disableMfa,
};
