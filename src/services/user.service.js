const {
  getUserById,
  updateUserProfile,
} = require("../repositories/user.repository");

const { uploadImage } = require("./upload.service");

/**
 * Get Logged-in User Profile
 */
const getProfile = async (userId) => {
  const user = await getUserById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  return user;
};

/**
 * Update Logged-in User Profile
 */
const updateProfile = async (userId, body) => {
  const user = await getUserById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const updatedUser = await updateUserProfile(userId, {
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
    throw new Error("Please upload an image.");
  }

  const user = await getUserById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const result = await uploadImage(file, "goride/profile-images");

  const updatedUser = await updateUserProfile(userId, {
    profileImage: result.secure_url,
  });

  return updatedUser;
};

module.exports = {
  uploadProfileImage,
  getProfile,
  updateProfile,
};