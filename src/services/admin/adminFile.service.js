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
const { uploadStream, deleteResource } = require("../storage.service");
const { validateDocumentFile } = require("../../utils/fileSecurity");

const ALLOWED_DOCUMENT_TYPES = [
  "ID_PROOF",
  "ADDRESS_PROOF",
  "OTHER",
];

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
  const { isPdf } = validateDocumentFile(file);

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
    uploadedFile = await uploadStream(
      file.buffer,
      {
        folder: "goride/user-documents",
        resourceType: isPdf ? "auto" : "image",
        tags: ["goride", "admin-upload", `user_${userId}`],
      }
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
      await deleteResource(uploadedFile.public_id, {
        resourceType: uploadedFile.resource_type || "image",
      });
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
  const { isPdf } = validateDocumentFile(file);

  const existingDocument = await findUserDocumentById(documentId);

  if (!existingDocument) {
    throw new NotFoundError("File not found.");
  }

  let uploadedFile;

  try {
    uploadedFile = await uploadStream(
      file.buffer,
      {
        folder: "goride/user-documents",
        resourceType: isPdf ? "auto" : "image",
        tags: ["goride", "admin-replace", `doc_${documentId}`],
      }
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
      await deleteResource(uploadedFile.public_id, {
        resourceType: uploadedFile.resource_type || "image",
      });
    }

    throw error;
  }

  if (
    existingDocument.filePublicId &&
    existingDocument.filePublicId !== uploadedFile.public_id
  ) {
    await deleteResource(
      existingDocument.filePublicId,
      {
        resourceType: "auto",
      }
    );
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
    await deleteResource(
      existingDocument.filePublicId,
      {
        resourceType: "auto",
      }
    );
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