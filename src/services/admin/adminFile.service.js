const axios = require("axios");
const {
  NotFoundError,
  BadRequestError,
  ConflictError,
} = require("../../utils/AppError");

const logger = require("../../utils/logger");

const {
  createUserDocument,
  findUserDocumentById,
  findUserDocumentByType,
  findUserDocuments,
  updateUserDocument,
  deleteUserDocument,
} = require("../../repositories/admin/adminFile.repository");

const {
  createAuditLog,
} = require("../../repositories/admin/adminAuth.repository");

const prisma = require("../../config/prisma");
const cloudinary = require("../../config/cloudinary");
const { uploadImage } = require("../upload.service");

const ALLOWED_DOCUMENT_TYPES = [
  "ID_PROOF",
  "ADDRESS_PROOF",
  "OTHER",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const isValidImageSignature = (buffer) => {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return false;
};

const validateFile = (file) => {
  if (!file) {
    throw new BadRequestError("Please upload a file.");
  }

  if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
    throw new BadRequestError("Invalid file upload.");
  }

  if (!file.size || file.size <= 0) {
    throw new BadRequestError("Uploaded file is empty.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError("File size must not exceed 5 MB.");
  }

  const detectedType = isValidImageSignature(file.buffer);
  if (!detectedType) {
    throw new BadRequestError(
      "Invalid or corrupted file content. File does not match supported image format.",
    );
  }

  const normalizedMime = (file.mimetype || "").toLowerCase();
  const isJpeg =
    detectedType === "image/jpeg" &&
    (normalizedMime === "image/jpeg" || normalizedMime === "image/jpg");
  const isPng = detectedType === "image/png" && normalizedMime === "image/png";
  const isWebp = detectedType === "image/webp" && normalizedMime === "image/webp";

  if (!isJpeg && !isPng && !isWebp) {
    throw new BadRequestError(
      "File extension/MIME type does not match actual file contents (MIME spoofing detected).",
    );
  }

  if (!ALLOWED_DOCUMENT_TYPES.length) {
    throw new BadRequestError("No document types are configured.");
  }
};

const validateUser = async (userId) => {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new BadRequestError("User ID is required.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId.trim() },
    select: {
      id: true,
      isActive: true,
      deletedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  if (!user.isActive || user.deletedAt) {
    throw new BadRequestError("User account is not active.");
  }

  return user;
};

const uploadUserDocument = async ({
  userId,
  documentType,
  documentNumber,
  file,
  adminId,
  ipAddress,
  userAgent,
}) => {
  validateFile(file);

  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    throw new BadRequestError("Invalid document type.");
  }

  await validateUser(userId);

  const existingDocument = await findUserDocumentByType(
    userId,
    documentType
  );

  if (existingDocument) {
    throw new ConflictError(
      `${documentType} document already exists. Use replacement instead.`
    );
  }

  let uploadedFile;

  try {
    uploadedFile = await uploadImage(
      file,
      "goride/user-documents"
    );
  } catch (error) {
    throw new BadRequestError("File upload failed.");
  }

  let createdDocument;

  try {
    createdDocument = await createUserDocument({
      userId,
      documentType,
      documentNumber: documentNumber || null,
      fileUrl: uploadedFile.secure_url,
      filePublicId: uploadedFile.public_id,
      originalName: file.originalname || null,
      mimeType: file.mimetype || null,
      fileSize: file.size || null,
    });
  } catch (error) {
    if (uploadedFile.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedFile.public_id, {
          resource_type: "image",
        });
      } catch (cleanupError) {
        // Do not replace the original database error.
      }
    }

    throw error;
  }

  if (adminId) {
    try {
      await createAuditLog({
        adminId,
        action: "UPLOAD",
        entity: "FILE",
        entityId: createdDocument.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {
          operation: "UPLOAD_FILE",
          documentType: createdDocument.documentType,
          userId: createdDocument.userId,
          originalName: createdDocument.originalName,
          mimeType: createdDocument.mimeType,
          fileSize: createdDocument.fileSize,
        },
      });
    } catch (auditError) {
      // Primary upload succeeded; do not fail request if audit logging encounters an issue.
    }
  }

  return createdDocument;
};

const getUserDocument = async (documentId) => {
  const document = await findUserDocumentById(documentId);

  if (!document) {
    throw new NotFoundError("File not found.");
  }

  return document;
};

const downloadUserDocument = async (
  documentId,
  { adminId, ipAddress, userAgent } = {}
) => {
  const document = await findUserDocumentById(documentId);

  if (!document) {
    throw new NotFoundError("File not found.");
  }

  let response;

  try {
    response = await axios.get(document.fileUrl, {
      responseType: "stream",
    });
  } catch (error) {
    throw new BadRequestError("File could not be retrieved from storage.");
  }

  if (adminId) {
    try {
      await createAuditLog({
        adminId,
        action: "ACCESS",
        entity: "FILE",
        entityId: document.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {
          operation: "DOWNLOAD_FILE",
          documentType: document.documentType,
          userId: document.userId,
          originalName: document.originalName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
        },
      });
    } catch (auditError) {
      // Primary download succeeded; do not fail request if audit logging encounters an issue.
    }
  }

  return {
    document,
    stream: response.data,
  };
};

const getUserDocumentList = async (filters = {}) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));

  const result = await findUserDocuments({
    ...filters,
    page,
    limit,
  });

  return {
    documents: result.documents,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit) || 1,
    },
  };
};

const replaceUserDocument = async ({
  documentId,
  documentNumber,
  file,
  adminId,
  ipAddress,
  userAgent,
}) => {
  validateFile(file);

  const existingDocument = await findUserDocumentById(documentId);

  if (!existingDocument) {
    throw new NotFoundError("File not found.");
  }

  let uploadedFile;

  try {
    uploadedFile = await uploadImage(
      file,
      "goride/user-documents"
    );
  } catch (error) {
    throw new BadRequestError("File upload failed.");
  }

  let updatedDocument;

  try {
    updatedDocument = await updateUserDocument(documentId, {
      documentNumber:
        documentNumber !== undefined
          ? documentNumber
          : existingDocument.documentNumber,
      fileUrl: uploadedFile.secure_url,
      filePublicId: uploadedFile.public_id,
      originalName: file.originalname || null,
      mimeType: file.mimetype || null,
      fileSize: file.size || null,
    });
  } catch (error) {
    if (uploadedFile.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedFile.public_id, {
          resource_type: "image",
        });
      } catch (cleanupError) {
        // Preserve the original database error.
      }
    }

    throw error;
  }

  if (
    existingDocument.filePublicId &&
    existingDocument.filePublicId !== uploadedFile.public_id
  ) {
    try {
      await cloudinary.uploader.destroy(
        existingDocument.filePublicId,
        {
          resource_type: "image",
        }
      );
    } catch (cleanupError) {
      // The new DB reference remains valid even if old
      // Cloudinary cleanup fails.
    }
  }

  if (adminId) {
    try {
      await createAuditLog({
        adminId,
        action: "REPLACE",
        entity: "FILE",
        entityId: updatedDocument.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {
          operation: "REPLACE_FILE",
          documentType: updatedDocument.documentType,
          userId: updatedDocument.userId,
          oldOriginalName: existingDocument.originalName,
          newOriginalName: updatedDocument.originalName,
          oldFileSize: existingDocument.fileSize,
          newFileSize: updatedDocument.fileSize,
          oldMimeType: existingDocument.mimeType,
          newMimeType: updatedDocument.mimeType,
        },
      });
    } catch (auditError) {
      // Primary replace succeeded.
    }
  }

  return updatedDocument;
};

const deleteUserDocumentById = async (
  documentId,
  { adminId, ipAddress, userAgent } = {}
) => {
  const existingDocument = await findUserDocumentById(documentId);

  if (!existingDocument) {
    throw new NotFoundError("File not found.");
  }

  const deletedDocument = await deleteUserDocument(documentId);

  if (existingDocument.filePublicId) {
    try {
      await cloudinary.uploader.destroy(
        existingDocument.filePublicId,
        {
          resource_type: "image",
        }
      );
    } catch (error) {
      // DB reference has already been removed.
      // Log warning for monitoring so orphaned Cloudinary asset can be cleaned up.
      logger.warn(
        `[FILE DELETE] Cloudinary cleanup failed for publicId="${existingDocument.filePublicId}". ` +
          `DB record already deleted. Manual cleanup may be required.`
      );
    }
  }

  if (adminId) {
    try {
      await createAuditLog({
        adminId,
        action: "DELETE",
        entity: "FILE",
        entityId: deletedDocument.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: {
          operation: "DELETE_FILE",
          documentType: deletedDocument.documentType,
          userId: deletedDocument.userId,
          originalName: deletedDocument.originalName,
          fileSize: deletedDocument.fileSize,
        },
      });
    } catch (auditError) {
      // Primary delete succeeded.
    }
  }

  return deletedDocument;
};

module.exports = {
  uploadUserDocument,
  getUserDocument,
  downloadUserDocument,
  getUserDocumentList,
  replaceUserDocument,
  deleteUserDocumentById,
};