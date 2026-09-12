const settingsService = require("../../services/admin/adminSettings.service");

/**
 * Get all system settings.
 */
const getAllSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getAllSettings(req.query);

    return res.status(200).json({
      success: true,
      message: "System settings fetched successfully.",
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system setting by key.
 */
const getSettingByKey = async (req, res, next) => {
  try {
    const setting = await settingsService.getSettingByKey(req.params.key);

    return res.status(200).json({
      success: true,
      message: "System setting fetched successfully.",
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a system setting.
 */
const createSetting = async (req, res, next) => {
  try {
    const setting = await settingsService.createSystemSetting(
      req.body,
      req.admin.id,
    );

    return res.status(201).json({
      success: true,
      message: "System setting created successfully.",
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a system setting by key.
 */
const updateSetting = async (req, res, next) => {
  try {
    const result = await settingsService.updateSystemSetting(
      req.params.key,
      req.body,
      req.admin.id,
    );

    return res.status(200).json({
      success: true,
      message: "System setting updated successfully.",
      data: result.after,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
};
