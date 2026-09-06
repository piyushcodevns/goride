const {
  BadRequestError,
  NotFoundError,
} = require("../../utils/AppError");
const {
  findUsersByIds,
  createCampaign,
  createCampaignRecipients,
  findCampaignById,
  findCampaigns,
  updateCampaign,
  updateCampaignRecipient,
  findRetryableRecipients,
  findPushDevices,
  upsertPushDevice,
} = require("../../repositories/admin/adminNotification.repository");
const { dispatchNotification } = require("../notification.service");
const { createAuditLog } = require("../../repositories/admin/adminAuth.repository");
const { isQueueEnabled } = require("../../config/redis");

const assertRecipients = async (userIds) => {
  const users = await findUsersByIds(userIds);
  if (users.length !== userIds.length) {
    throw new NotFoundError("One or more active recipients were not found.");
  }
  return users;
};

const createSmsCampaign = async ({ title, message, userIds, scheduledAt, adminId }) => {
  const users = await assertRecipients(userIds);
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  if (scheduledDate && scheduledDate <= new Date()) {
    throw new BadRequestError("Scheduled time must be in the future.");
  }
  const campaign = await createCampaign({
    title: title.trim(),
    message: message.trim(),
    scheduledAt: scheduledDate,
    status: scheduledDate ? "SCHEDULED" : "DRAFT",
    createdById: adminId,
  });
  await createCampaignRecipients(
    users.map((user) => ({ campaignId: campaign.id, userId: user.id })),
  );
  if (scheduledDate) {
    if (!isQueueEnabled()) {
      throw new BadRequestError("Scheduling requires the notification queue.");
    }
    const delay = scheduledDate.getTime() - Date.now();
    for (const user of users) {
      const notification = await dispatchNotification(
        {
          userId: user.id,
          title: campaign.title,
          message: campaign.message,
          channel: "SMS",
          type: "PROMOTION",
        },
        { delay },
      );
      if (notification) {
        const recipient = (await findCampaignById(campaign.id)).recipients.find(
          (item) => item.userId === user.id,
        );
        await updateCampaignRecipient(recipient.id, {
          notificationId: notification.id,
          status: "QUEUED",
        });
      }
    }
  }
  await createAuditLog({
    adminId,
    action: "CREATE",
    entity: "NOTIFICATION",
    entityId: campaign.id,
    metadata: { action: "SMS_CAMPAIGN_CREATED", recipientCount: users.length },
  });
  return { ...campaign, recipientCount: users.length };
};

const sendSmsCampaign = async (campaignId, adminId) => {
  const campaign = await findCampaignById(campaignId);
  if (!campaign) throw new NotFoundError("SMS campaign not found.");
  if (campaign.status === "SENDING") throw new BadRequestError("Campaign is already sending.");
  if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
    throw new BadRequestError("Campaign is scheduled for a future time.");
  }
  await updateCampaign(campaignId, { status: "SENDING" });
  let queued = 0;
  for (const recipient of campaign.recipients.filter((item) => item.status !== "SENT")) {
    const notification = await dispatchNotification({
      userId: recipient.userId,
      title: campaign.title,
      message: campaign.message,
      channel: "SMS",
      type: "PROMOTION",
    });
    if (notification) {
      await updateCampaignRecipient(recipient.id, {
        notificationId: notification.id,
        status: "QUEUED",
        attempts: { increment: 1 },
        errorMessage: null,
      });
      queued += 1;
    } else {
      await updateCampaignRecipient(recipient.id, {
        status: "FAILED",
        attempts: { increment: 1 },
        errorMessage: "Notification dispatch failed.",
      });
    }
  }
  const status = queued === campaign.recipients.length ? "SENT" : queued ? "PARTIAL" : "FAILED";
  await updateCampaign(campaignId, { status, sentAt: queued ? new Date() : null });
  await createAuditLog({
    adminId,
    action: "UPDATE",
    entity: "NOTIFICATION",
    entityId: campaignId,
    metadata: { action: "SMS_CAMPAIGN_SENT", queued },
  });
  return findCampaignById(campaignId);
};

const getSmsCampaign = async (campaignId) => {
  const campaign = await findCampaignById(campaignId);
  if (!campaign) throw new NotFoundError("SMS campaign not found.");
  return campaign;
};

const listSmsCampaigns = (filters = {}) =>
  findCampaigns({
    skip: Math.max(0, (Number(filters.page || 1) - 1) * Number(filters.limit || 20)),
    take: Math.min(100, Number(filters.limit || 20)),
    status: filters.status,
  });

const retrySmsCampaign = async (campaignId, adminId) => {
  const recipients = await findRetryableRecipients(campaignId);
  if (!recipients.length) throw new BadRequestError("No failed campaign deliveries to retry.");
  let queued = 0;
  for (const recipient of recipients) {
    const notification = await dispatchNotification({
      userId: recipient.userId,
      title: recipient.campaign.title,
      message: recipient.campaign.message,
      channel: "SMS",
      type: "PROMOTION",
    });
    if (notification) {
      await updateCampaignRecipient(recipient.id, {
        notificationId: notification.id,
        status: "QUEUED",
        attempts: { increment: 1 },
        errorMessage: null,
      });
      queued += 1;
    }
  }
  await updateCampaign(campaignId, { status: queued ? "PARTIAL" : "FAILED" });
  await createAuditLog({
    adminId,
    action: "UPDATE",
    entity: "NOTIFICATION",
    entityId: campaignId,
    metadata: { action: "SMS_CAMPAIGN_RETRIED", queued },
  });
  return findCampaignById(campaignId);
};

const sendPushNotification = async ({ userIds, title, message, scheduledAt, adminId }) => {
  const users = await assertRecipients(userIds);
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  if (scheduledDate && scheduledDate <= new Date()) {
    throw new BadRequestError("Scheduled time must be in the future.");
  }
  const results = [];
  for (const user of users) {
    const devices = await findPushDevices(user.id);
    if (!devices.length) {
      results.push({ userId: user.id, status: "FAILED", error: "No active push device." });
      continue;
    }
    const notification = await dispatchNotification(
      { userId: user.id, title: title.trim(), message: message.trim(), channel: "PUSH", type: "SYSTEM" },
      scheduledDate ? { delay: scheduledDate.getTime() - Date.now() } : {},
    );
    results.push({ userId: user.id, status: notification ? "QUEUED" : "FAILED" });
  }
  await createAuditLog({
    adminId,
    action: "CREATE",
    entity: "NOTIFICATION",
    metadata: { action: "PUSH_NOTIFICATION_SENT", recipientCount: results.length },
  });
  return results;
};

const registerPushDevice = (userId, token, platform) =>
  upsertPushDevice(userId, token, platform);

module.exports = {
  createSmsCampaign,
  getSmsCampaign,
  listSmsCampaigns,
  sendSmsCampaign,
  retrySmsCampaign,
  sendPushNotification,
  registerPushDevice,
};
