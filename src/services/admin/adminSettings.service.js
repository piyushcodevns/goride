const {
  findSettings,
  findSettingByKey,
  createSettingWithAudit,
  updateSettingWithAudit,
} = require("../../repositories/admin/adminSettings.repository");

const {
  NotFoundError,
  ConflictError,
  ValidationError,
} = require("../../utils/AppError");

const SECRET_MASK = "********";

const sanitizeSetting = (setting) => {
  if (!setting) return setting;

  if (setting.isSecret) {
    return {
      ...setting,
      value: SECRET_MASK,
    };
  }

  return setting;
};

const sanitizeSettings = (settings) => settings.map(sanitizeSetting);

const getAllSettings = async (filters = {}) => {
  const settings = await findSettings(filters);
  return sanitizeSettings(settings);
};

const getSettingByKey = async (key) => {
  const setting = await findSettingByKey(key);

  if (!setting) {
    throw new NotFoundError("System setting not found.");
  }

  return sanitizeSetting(setting);
};

const createSystemSetting = async (data, adminId) => {
  const existing = await findSettingByKey(data.key);

  if (existing) {
    throw new ConflictError("System setting with this key already exists.");
  }

  const setting = await createSettingWithAudit(
    {
      ...data,
      updatedByAdminId: adminId,
    },
    {
      adminId,
      action: "CREATE",
      entity: "SETTINGS",
      metadata: {
        operation: "CREATE_SYSTEM_SETTING",
        key: data.key,
        category: data.category,
        isSecret: data.isSecret ?? false,
        description: data.description ?? null,
      },
    },
  );

  return sanitizeSetting(setting);
};

const updateSystemSetting = async (key, data, adminId) => {
  const existing = await findSettingByKey(key);

  if (!existing) {
    throw new NotFoundError("System setting not found.");
  }

  if (existing.isSecret && data.value === SECRET_MASK) {
    throw new ValidationError(
      "Masked secret value cannot be used as an update value.",
    );
  }

  const setting = await updateSettingWithAudit(
    key,
    {
      ...data,
      updatedByAdminId: adminId,
    },
    {
      adminId,
      action: "UPDATE",
      entity: "SETTINGS",
      metadata: {
        operation: "UPDATE_SYSTEM_SETTING",
        key,
        categoryBefore: existing.category,
        categoryAfter: data.category ?? existing.category,
        isSecretBefore: existing.isSecret,
        isSecretAfter: data.isSecret ?? existing.isSecret,
        changedFields: Object.keys(data),
      },
    },
  );

  const safeAfter = existing.isSecret
    ? {
        ...setting,
        value: SECRET_MASK,
      }
    : sanitizeSetting(setting);

  return {
    before: sanitizeSetting(existing),
    after: safeAfter,
  };
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  createSystemSetting,
  updateSystemSetting,
  sanitizeSetting,
  sanitizeSettings,
};
