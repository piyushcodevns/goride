const userRepository = require("../repositories/user.repository");
const storageService = require("./storage.service");
const { validateImageFile, validateDocumentFile } = require("../utils/fileSecurity");
const {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} = require("../utils/AppError");
const logger = require("../utils/logger");

const ALLOWED_USER_DOCUMENT_TYPES = ["ID_PROOF", "ADDRESS_PROOF", "OTHER"];

/**
 * Get Logged-in User Profile
 */
const getProfile = async (userId) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return user;
};

/**
 * Update Logged-in User Profile
 */
const updateProfile = async (userId, body) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const updatedUser = await userRepository.updateUserProfile(userId, {
    fullName: body.fullName,
    gender: body.gender,
  });

  return updatedUser;
};

/************************************************
 * Upload Profile Image
 ***********************************************/
const uploadProfileImage = async (userId, file) => {
  if (!file) {
    throw new BadRequestError("Please upload an image.");
  }

  validateImageFile(file);

  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  if (!user.isActive || user.deletedAt) {
    throw new BadRequestError("User account is not active.");
  }

  // 1. Upload new image to storage
  const uploadResult = await storageService.uploadStream(file.buffer, {
    folder: "goride/profile-images",
    resourceType: "image",
    tags: ["goride", "avatar", `user_${userId}`],
  });

  // 2. Persist new DB state with compensation
  let updatedUser;
  try {
    updatedUser = await userRepository.updateUserProfile(userId, {
      profileImage: uploadResult.secure_url,
    });
  } catch (dbError) {
    // Compensation: Storage succeeded but DB failed
    if (uploadResult.public_id) {
      await storageService.deleteResource(uploadResult.public_id, { resourceType: "image" });
    }
    throw dbError;
  }

  // 3. Delete old file only after DB update succeeds
  if (user.profileImage && user.profileImage !== uploadResult.secure_url) {
    const oldPublicId = storageService.extractPublicId(user.profileImage);
    if (oldPublicId && oldPublicId !== uploadResult.public_id) {
      try {
        await storageService.deleteResource(oldPublicId, { resourceType: "image" });
      } catch (cleanupError) {
        logger.warn(`[AVATAR CLEANUP] Failed to cleanup previous avatar: ${oldPublicId}`);
      }
    }
  }

  return updatedUser;
};

/************************************************
 * User Document Self-Service
 ***********************************************/
const uploadUserDocumentSelf = async (userId, data, file) => {
  if (!file) {
    throw new BadRequestError("Please upload a document file.");
  }

  if (!data || !data.documentType) {
    throw new BadRequestError("Document type is required.");
  }

  if (!ALLOWED_USER_DOCUMENT_TYPES.includes(data.documentType)) {
    throw new BadRequestError(`Invalid document type. Allowed types: ${ALLOWED_USER_DOCUMENT_TYPES.join(", ")}`);
  }

  const { isPdf } = validateDocumentFile(file);

  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  if (!user.isActive || user.deletedAt) {
    throw new BadRequestError("User account is not active.");
  }

  const existingDoc = await userRepository.findUserDocumentByType(userId, data.documentType);
  if (existingDoc) {
    throw new ConflictError(
      `${data.documentType} document already exists. Delete the existing document before uploading a new one.`
    );
  }

  // 1. Upload to storage
  const uploadResult = await storageService.uploadStream(file.buffer, {
    folder: "goride/user-documents",
    resourceType: isPdf ? "auto" : "image",
    tags: ["goride", "user-document", `user_${userId}`],
  });

  // 2. Persist in DB with compensation
  let createdDocument;
  try {
    createdDocument = await userRepository.createUserDocument({
      userId,
      documentType: data.documentType,
      documentNumber: data.documentNumber ? String(data.documentNumber).trim() : null,
      fileUrl: uploadResult.secure_url,
      filePublicId: uploadResult.public_id,
      originalName: file.originalname || null,
      mimeType: file.mimetype || null,
      fileSize: file.size || null,
    });
  } catch (dbError) {
    // Compensation on DB failure
    if (uploadResult.public_id) {
      await storageService.deleteResource(uploadResult.public_id, {
        resourceType: uploadResult.resource_type || "image",
      });
    }
    throw dbError;
  }

  return createdDocument;
};

const getUserDocumentsSelf = async (userId) => {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return userRepository.getUserDocuments(userId);
};

const deleteUserDocumentSelf = async (userId, documentId) => {
  const document = await userRepository.getUserDocumentById(documentId);
  if (!document) {
    throw new NotFoundError("Document not found.");
  }

  if (document.userId !== userId) {
    throw new ForbiddenError("You are not authorized to delete this document.");
  }

  // 1. Delete from database
  await userRepository.deleteUserDocument(documentId);

  // 2. Clean up storage asset using authoritative filePublicId
  if (document.filePublicId) {
    await storageService.deleteResource(document.filePublicId, {
      resourceType: document.mimeType === "application/pdf" ? "auto" : "image",
    });
  }

  return { message: "Document deleted successfully." };
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfileImage,
  uploadUserDocumentSelf,
  getUserDocumentsSelf,
  deleteUserDocumentSelf,
};