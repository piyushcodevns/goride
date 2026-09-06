const fs = require("fs");
const backupService = require("../../services/admin/adminBackup.service");

const serializeBackup = (backup) => ({
  ...backup,
  size: backup.size == null ? null : backup.size.toString(),
});

const createBackup = async (req, res, next) => {
  try {
    const backup = await backupService.createBackup({
      adminId: req.admin.id,
      type: "MANUAL",
    });

    return res.status(201).json({
      success: true,
      message: "Backup created successfully.",
      data: serializeBackup(backup),
    });
  } catch (error) {
    next(error);
  }
};

const getBackups = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const result = await backupService.getBackups({
      skip,
      take: limit,
    });

    const data = Array.isArray(result)
      ? result.map(serializeBackup)
      : result.data.map(serializeBackup);

    return res.status(200).json({
      success: true,
      message: "Backups fetched successfully.",
      data,
      pagination: {
        page,
        limit,
        count: data.length,
        ...(Array.isArray(result)
          ? {}
          : { total: result.total }),
      },
    });
  } catch (error) {
    next(error);
  }
};


const downloadBackup = async (req, res, next) => {
  try {
    const backup = await backupService.getBackupDownload({ id: req.params.id, adminId: req.admin.id });

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${backup.filename}"`,
    );
    res.setHeader("Content-Length", backup.size);

    const stream = fs.createReadStream(backup.path);
    stream.on("error", next);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};


const deleteBackup = async (req, res, next) => {
  try {
    const backup = await backupService.deleteBackup(req.params.id, req.admin.id);

    return res.status(200).json({
      success: true,
      message: "Backup deleted successfully.",
      data: backup,
    });
  } catch (error) {
    next(error);
  }
};
const restoreBackup = async (req, res, next) => {
  try {
    const backup = await backupService.restoreBackup({
      id: req.params.id,
      confirmation: req.body?.confirmation,
      adminId: req.admin.id,
    });

    return res.status(200).json({
      success: true,
      message: "Backup restored successfully.",
      data: backup,
    });
  } catch (error) {
    next(error);
  }
};
const getBackup = async (req, res, next) => {
  try {
    const backup = await backupService.getBackup(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Backup fetched successfully.",
      data: serializeBackup(backup),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBackup,
  getBackups,
  getBackup,
  downloadBackup,
  restoreBackup,
  deleteBackup,
};



