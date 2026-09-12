const prisma = require("../../config/prisma");

const findUsersByIds = (userIds) =>
  prisma.user.findMany({
    where: { id: { in: userIds }, isActive: true, deletedAt: null },
    select: { id: true, phone: true },
  });

const createCampaign = (data, db = prisma) =>
  db.smsCampaign.create({ data });

const createCampaignRecipients = (data, db = prisma) =>
  db.smsCampaignRecipient.createMany({ data });

const findCampaignById = (id, db = prisma) =>
  db.smsCampaign.findUnique({
    where: { id },
    include: { recipients: true },
  });

const findCampaigns = ({ skip = 0, take = 20, status } = {}) =>
  prisma.smsCampaign.findMany({
    where: status ? { status } : {},
    include: { _count: { select: { recipients: true } } },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

const updateCampaign = (id, data, db = prisma) =>
  db.smsCampaign.update({ where: { id }, data });

const updateCampaignRecipient = (id, data, db = prisma) =>
  db.smsCampaignRecipient.update({ where: { id }, data });

const findCampaignRecipientByNotificationId = (notificationId) =>
  prisma.smsCampaignRecipient.findFirst({ where: { notificationId } });

const findRetryableRecipients = (campaignId) =>
  prisma.smsCampaignRecipient.findMany({
    where: { campaignId, status: "FAILED", notificationId: { not: null } },
    include: { campaign: true },
  });

const findPushDevices = (userId) =>
  prisma.pushDevice.findMany({
    where: { userId, isActive: true },
    select: { id: true, token: true, platform: true },
  });

const upsertPushDevice = (userId, token, platform) =>
  prisma.pushDevice.upsert({
    where: { token },
    update: { userId, platform, isActive: true },
    create: { userId, token, platform },
  });

module.exports = {
  findUsersByIds,
  createCampaign,
  createCampaignRecipients,
  findCampaignById,
  findCampaigns,
  updateCampaign,
  updateCampaignRecipient,
  findCampaignRecipientByNotificationId,
  findRetryableRecipients,
  findPushDevices,
  upsertPushDevice,
};
