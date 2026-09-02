const prisma = require("../config/prisma");


/**
 * Create notification
 */
const createNotification = async (data, db = prisma) => {
  return db.notification.create({
    data,
  });
};

/**
 * Get notification by ID
 */
const findNotificationById = async (id, db = prisma) => {
  return db.notification.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      message: true,
      type: true,
      channel: true,
      status: true,
      priority: true,
      metadata: true,
      retryCount: true,
      readAt: true,
      sentAt: true,
      failedAt: true,
      createdAt: true,
    },
  });
};

/**
 * Get all notifications of a user
 */
const findUserNotifications = async (
  userId,
  { skip = 0, take = 20, sort = "desc", status, type, priority, search } = {},
  db = prisma,
) => {
  const where = {
    userId,
  };
  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  if (priority) {
    where.priority = priority;
  }
  if (search) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        message: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await db.notification.count({
    where,
  });

  const notifications = await db.notification.findMany({
    where,
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      channel: true,
      status: true,
      priority: true,
      readAt: true,
      sentAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: sort,
    },
    skip,
    take,
  });

  return {
    notifications,
    total,
  };
};

/**
 * Count unread notifications
 */
const countUnreadNotifications = async (userId, db = prisma) => {
  return db.notification.count({
    where: {
      userId,
      status: {
        not: "READ",
      },
    },
  });
};

/**
 * Mark notification as read
 */
const markNotificationAsRead = async (id, db = prisma) => {
  return db.notification.update({
    where: { id },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = async (userId, db = prisma) => {
  return db.notification.updateMany({
    where: {
      userId,
      status: {
        not: "READ",
      },
    },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });
};

/**
 * Update notification status
 */
const updateNotificationStatus = async (id, status, db = prisma) => {
  const data = {
    status,
  };

  if (status === "SENT") {
    data.sentAt = new Date();
  }

  if (status === "FAILED") {
    data.failedAt = new Date();
  }

  if (status === "READ") {
    data.readAt = new Date();
  }

  return db.notification.update({
    where: { id },
    data,
  });
};

/**
 * Increment retry count
 */
const incrementRetryCount = async (id, db = prisma) => {
  return db.notification.update({
    where: { id },
    data: {
      retryCount: {
        increment: 1,
      },
    },
  });
};

/**
 * Delete notification
 */
const deleteNotification = async (id, db = prisma) => {
  return db.notification.delete({
    where: { id },
  });
};

module.exports = {
  createNotification,
  findNotificationById,
  findUserNotifications,
  countUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotificationStatus,
  incrementRetryCount,
  deleteNotification,
};
