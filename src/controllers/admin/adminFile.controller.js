const {
  uploadUserDocument,
  getUserDocument,
  downloadUserDocument,
  getUserDocumentList,
  replaceUserDocument,
  deleteUserDocumentById,
} = require("../../services/admin/adminFile.service");

const uploadDocument = async (req, res, next) => {
  try {
    const document = await uploadUserDocument({
      userId: req.body.userId,
      documentType: req.body.documentType,
      documentNumber: req.body.documentNumber,
      file: req.file,
      adminId: req.admin?.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(201).json({
      success: true,
      message: "User document uploaded successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

const getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await getUserDocument(id);

    return res.status(200).json({
      success: true,
      message: "File fetched successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { document, stream } = await downloadUserDocument(id, {
      adminId: req.admin?.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.setHeader(
      "Content-Type",
      document.mimeType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.originalName || "document")}"`
    );
    if (document.fileSize) {
      res.setHeader("Content-Length", document.fileSize);
    }

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

const getDocuments = async (req, res, next) => {
  try {
    const result = await getUserDocumentList(req.query);

    return res.status(200).json({
      success: true,
      message: "Files fetched successfully.",
      data: result.documents,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const replaceDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await replaceUserDocument({
      documentId: id,
      documentNumber: req.body.documentNumber,
      file: req.file,
      adminId: req.admin?.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "File replaced successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await deleteUserDocumentById(id, {
      adminId: req.admin?.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "File deleted successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getDocument,
  downloadDocument,
  getDocuments,
  replaceDocument,
  deleteDocument,
};