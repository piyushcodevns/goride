const {
  getUsers,
  exportUsersCsv,
  getUserDetails,
  getUserRideHistory,
  getUserPaymentHistory,
  getUserCouponHistory,
  getUserNotifications,
  activateUser,
  suspendUser,
  blockUserAccount,
  deleteUser,
} = require("../../services/admin/adminUser.service");

const {
  userIdParamSchema,
  paginationSchema,
  getUsersQuerySchema,
} = require("../../validators/admin/adminUser.validator");

/**
 * Get all users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const query = getUsersQuerySchema.parse(req.query);

    const result = await getUsers(query);

    const totalPages = Math.ceil(result.total / query.limit);

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      data: {
        items: result.users,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export users as CSV.
 */
const exportUsers = async (req, res, next) => {
  try {
    const query = getUsersQuerySchema.parse(req.query);
    const csv = await exportUsersCsv(query);

    res.status(200);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="goride-users.csv"',
    );

    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user details
 */
const getUser = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);

    const user = await getUserDetails(id);

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user ride history
 */
const getRideHistory = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const pagination = paginationSchema.parse(req.query);

    const result = await getUserRideHistory(id, pagination);

    return res.status(200).json({
      success: true,
      message: "User ride history fetched successfully.",
      data: {
        items: result.rides,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user payment history
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const pagination = paginationSchema.parse(req.query);

    const result = await getUserPaymentHistory(id, pagination);

    return res.status(200).json({
      success: true,
      message: "User payment history fetched successfully.",
      data: {
        items: result.payments,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user coupon history
 */
const getCouponHistory = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const pagination = paginationSchema.parse(req.query);

    const result = await getUserCouponHistory(id, pagination);

    return res.status(200).json({
      success: true,
      message: "User coupon history fetched successfully.",
      data: {
        items: result.couponUsages,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const pagination = paginationSchema.parse(req.query);

    const result = await getUserNotifications(id, pagination);

    return res.status(200).json({
      success: true,
      message: "User notifications fetched successfully.",
      data: {
        items: result.notifications,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate user
 */
const activate = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);

    const user = await activateUser({
      userId: id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "User activated successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend user
 */
const suspend = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);

    const user = await suspendUser({
      userId: id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "User suspended successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Block user
 */
const block = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);

    const user = await blockUserAccount({
      userId: id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "User blocked successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete user
 */
const deleteUserController = async (req, res, next) => {
  try {
    const { id } = userIdParamSchema.parse(req.params);

    const user = await deleteUser({
      userId: id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  exportUsers,
  getUser,
  getRideHistory,
  getPaymentHistory,
  getCouponHistory,
  getNotifications,
  activate,
  suspend,
  block,
  deleteUserController,
};
