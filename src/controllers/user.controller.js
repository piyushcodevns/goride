const {
  getProfile,
  updateProfile,
  uploadProfileImage,
} = require("../services/user.service");

/**
 * Get Logged-in User Profile
 */
const getMyProfile = async (req, res) => {
  try {
    const user = await getProfile(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update Logged-in User Profile
 */
const updateMyProfile = async (req, res) => {
  try {
    const user = await updateProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Upload Profile Image
 */
const uploadMyProfileImage = async (req, res) => {
  try {
    const user = await uploadProfileImage(req.user.id, req.file);

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully.",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage: uploadMyProfileImage,
};