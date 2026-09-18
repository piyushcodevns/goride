const { uploadStream } = require("./storage.service");

/**
 * Backward-compatible uploadImage function delegating to centralized storage service
 * @param {object} file Multer file object
 * @param {string} [folder="goride"]
 * @returns {Promise<object>} Cloudinary upload result
 */
const uploadImage = (file, folder = "goride") => {
  return uploadStream(file.buffer, {
    folder,
    resourceType: "image",
  });
};

module.exports = {
  uploadImage,
};