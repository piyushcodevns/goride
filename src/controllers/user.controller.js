const {
  getProfile,
  updateProfile,
  uploadProfileImage,
  uploadUserDocumentSelf,
  getUserDocumentsSelf,
  deleteUserDocumentSelf,
} = require("../services/user.service");

/**
 * Get Logged-in User Profile
 */
const getMyProfile = async (req, res, next) => {
  try {
    const user = await getProfile(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Logged-in User Profile
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const user = await updateProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload Profile Image
 */
const uploadMyProfileImage = async (req, res, next) => {
  try {
    const user = await uploadProfileImage(req.user.id, req.file);

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload User KYC / Identification Document
 */
const uploadMyDocument = async (req, res, next) => {
  try {
    const document = await uploadUserDocumentSelf(req.user.id, req.body, req.file);

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User Documents
 */
const getMyDocuments = async (req, res, next) => {
  try {
    const documents = await getUserDocumentsSelf(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Documents fetched successfully.",
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete User Document
 */
const deleteMyDocument = async (req, res, next) => {
  try {
    const result = await deleteUserDocumentSelf(req.user.id, req.params.id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage: uploadMyProfileImage,
  uploadMyDocument,
  getMyDocuments,
  deleteMyDocument,
};