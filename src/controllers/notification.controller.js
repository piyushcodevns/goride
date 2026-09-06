const notificationService = require("../services/notification.service");

const buildPagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const getNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = buildPagination(req.query);

    const result = await notificationService.getUserNotifications(req.user.id, {
      skip,
      take: limit,
      status: req.query.status,
      type: req.query.type,
      priority: req.query.priority,
      search: req.query.search,
      sort: req.query.sort || "desc",
    });

    return res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const registerPushDevice = async (req, res, next) => {
  try {
    const device = await notificationService.registerPushDevice(
      req.user.id,
      req.body.token,
      req.body.platform,
    );
    return res.status(200).json({ success: true, data: device });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerPushDevice,
};
