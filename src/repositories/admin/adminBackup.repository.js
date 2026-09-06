const prisma = require("../../config/prisma");

const createBackup = (data) =>
  prisma.backup.create({
    data,
  });

const updateBackup = (id, data) =>
  prisma.backup.update({
    where: { id },
    data,
  });

const getBackupById = (id) =>
  prisma.backup.findUnique({
    where: { id },
  });

const getBackupByFilename = (filename) =>
  prisma.backup.findUnique({
    where: { filename },
  });

const listBackups = ({ skip = 0, take = 50 } = {}) =>
  prisma.backup.findMany({
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
  });

const countBackups = () =>
  prisma.backup.count();

const deleteBackup = (id) =>
  prisma.backup.delete({
    where: { id },
  });

module.exports = {
  createBackup,
  updateBackup,
  getBackupById,
  getBackupByFilename,
  listBackups,
  countBackups,
  listBackupsBefore,
  deleteBackup,
};

