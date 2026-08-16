const {
  loginAdmin,
  createAdmin,
  refreshAdminToken,
  logoutAdmin,
  changeAdminPassword,
  forgotAdminPassword,
  resetAdminPasswordService,
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
    const result = await createAdmin(req.body);

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
    const { resetToken, newPassword, confirmPassword } = req.body;

    const result = await resetAdminPasswordService(
      resetToken,
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

module.exports = {
  login,
  createAdminController,
  refreshToken,
  logout,
  changeAdminPasswordController,
  forgotAdminPasswordController,
  resetAdminPasswordController,
};
