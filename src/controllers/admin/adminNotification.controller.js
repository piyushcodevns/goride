const notificationService = require("../../services/admin/adminNotification.service");

const createSmsCampaign = async (req, res, next) => {
  try {
    const result = await notificationService.createSmsCampaign({
      ...req.body,
      adminId: req.admin.id,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const sendSmsCampaign = async (req, res, next) => {
  try {
    const result = await notificationService.sendSmsCampaign(req.params.id, req.admin.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const getSmsCampaign = async (req, res, next) => {
  try {
    const result = await notificationService.getSmsCampaign(req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const listSmsCampaigns = async (req, res, next) => {
  try {
    const result = await notificationService.listSmsCampaigns(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const retrySmsCampaign = async (req, res, next) => {
  try {
    const result = await notificationService.retrySmsCampaign(req.params.id, req.admin.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

const sendPushNotification = async (req, res, next) => {
  try {
    const result = await notificationService.sendPushNotification({
      ...req.body,
      adminId: req.admin.id,
    });
    return res.status(202).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createSmsCampaign,
  getSmsCampaign,
  listSmsCampaigns,
  sendSmsCampaign,
  retrySmsCampaign,
  sendPushNotification,
};
