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

const findActiveBackup = () =>
  prisma.backup.findFirst({
    where: {
      status: {
        in: ["PENDING", "RUNNING"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

const listBackups = ({ skip = 0, take = 50, where = {} } = {}) =>
  prisma.backup.findMany({
    where,
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
  });

const countBackups = (where = {}) =>
  prisma.backup.count({ where });

const listBackupsBefore = (cutoffDate, { take = 100 } = {}) =>
  prisma.backup.findMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
      status: {
        in: ["COMPLETED", "FAILED"],
      },
    },
    take,
    orderBy: {
      createdAt: "asc",
    },
  });

const reconcileStaleRunningBackups = (cutoffDate) =>
  prisma.backup.updateMany({
    where: {
      status: "RUNNING",
      createdAt: {
        lt: cutoffDate,
      },
    },
    data: {
      status: "FAILED",
      errorMessage: "Backup timed out or worker process terminated unexpectedly.",
    },
  });

const deleteBackup = (id) =>
  prisma.backup.delete({
    where: { id },
  });

module.exports = {
  createBackup,
  updateBackup,
  getBackupById,
  getBackupByFilename,
  findActiveBackup,
  listBackups,
  countBackups,
  listBackupsBefore,
  reconcileStaleRunningBackups,
  deleteBackup,
};
