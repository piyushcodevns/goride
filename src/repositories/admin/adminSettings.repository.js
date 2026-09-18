const prisma = require("../../config/prisma");

/**
 * Get all system settings with optional category filter.
 */
const findSettings = async ({ category } = {}) => {
  const where = {};

  if (category) {
    where.category = category;
  }

  return prisma.systemSetting.findMany({
    where,
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
};

/**
 * Get system setting by ID.
 */
const findSettingById = async (id) => {
  return prisma.systemSetting.findUnique({
    where: { id },
  });
};

/**
 * Get system setting by unique key.
 */
const findSettingByKey = async (key) => {
  return prisma.systemSetting.findUnique({
    where: { key },
  });
};

/**
 * Create system setting.
 */
const createSetting = async (data) => {
  return prisma.systemSetting.create({
    data,
  });
};

/**
 * Update system setting by key.
 */
const updateSettingByKey = async (key, data) => {
  return prisma.systemSetting.update({
    where: { key },
    data,
  });
};

/**
 * Delete system setting by key.
 */
const deleteSettingByKey = async (key) => {
  return prisma.systemSetting.delete({
    where: { key },
  });
};

/**
 * Create audit log for a settings operation.
 */
const createSettingsAuditLog = async (data) => {
  return prisma.auditLog.create({
    data,
  });
};

/**
 * Create system setting and audit log atomically.
 */
const createSettingWithAudit = async (settingData, auditData) => {
  return prisma.$transaction(async (tx) => {
    const setting = await tx.systemSetting.create({
      data: settingData,
    });

    await tx.auditLog.create({
      data: {
        ...auditData,
        entityId: setting.id,
      },
    });

    return setting;
  });
};

/**
 * Update system setting and audit log atomically.
 */
const updateSettingWithAudit = async (key, settingData, auditData) => {
  return prisma.$transaction(async (tx) => {
    const setting = await tx.systemSetting.update({
      where: { key },
      data: settingData,
    });

    await tx.auditLog.create({
      data: {
        ...auditData,
        entityId: setting.id,
      },
    });

    return setting;
  });
};

module.exports = {
  findSettings,
  findSettingById,
  findSettingByKey,
  createSetting,
  updateSettingByKey,
  deleteSettingByKey,
  createSettingsAuditLog,
  createSettingWithAudit,
  updateSettingWithAudit,
};
