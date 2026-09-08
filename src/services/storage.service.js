const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");
const { BadRequestError } = require("../utils/AppError");

/**
 * Upload a buffer stream to Cloudinary
 * @param {Buffer} buffer
 * @param {object} [options]
 * @param {string} [options.folder="goride"]
 * @param {string} [options.resourceType="image"]
 * @param {string[]} [options.tags=[]]
 * @returns {Promise<{public_id: string, secure_url: string, resource_type: string, format: string, bytes: number}>}
 */
const uploadStream = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      return reject(new BadRequestError("Cannot upload invalid or empty buffer."));
    }

    const {
      folder = "goride",
      resourceType = "image",
      tags = ["goride"],
    } = options;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        tags,
      },
      (error, result) => {
        if (error) {
          logger.error("[STORAGE UPLOAD] Cloudinary upload stream error", {
            message: error.message,
            http_code: error.http_code,
          });
          return reject(new BadRequestError("File upload to storage failed."));
        }

        if (!result || !result.secure_url) {
          return reject(new BadRequestError("Storage returned an invalid upload response."));
        }

        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          resource_type: result.resource_type || resourceType,
          format: result.format || null,
          bytes: result.bytes || buffer.length,
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Delete a resource from Cloudinary by public ID
 * @param {string} publicId Primary storage cleanup identifier
 * @param {object} [options]
 * @param {string} [options.resourceType="image"]
 * @returns {Promise<{success: boolean, result: string}>}
 */
const deleteResource = async (publicId, options = {}) => {
  if (!publicId || typeof publicId !== "string" || !publicId.trim()) {
    return { success: false, result: "missing_public_id" };
  }

  const safePublicId = publicId.trim();
  const resourceType = options.resourceType || "image";

  try {
    const result = await cloudinary.uploader.destroy(safePublicId, {
      resource_type: resourceType,
    });

    if (result && result.result === "ok") {
      return { success: true, result: "ok" };
    }

    // If not found and was attempted as image, attempt raw as fallback
    if (result && result.result === "not found" && resourceType === "image") {
      const rawResult = await cloudinary.uploader.destroy(safePublicId, {
        resource_type: "raw",
      });
      if (rawResult && rawResult.result === "ok") {
        return { success: true, result: "ok" };
      }
    }

    logger.warn(`[STORAGE DELETE] Asset cleanup returned: ${result ? result.result : "unknown"} for publicId="${safePublicId}"`);
    return { success: false, result: result ? result.result : "failed" };
  } catch (error) {
    logger.warn(`[STORAGE DELETE] Cloudinary cleanup exception for publicId="${safePublicId}": ${error.message}`);
    return { success: false, result: "error", error: error.message };
  }
};

/**
 * Fallback parser to extract Cloudinary public ID from secure URL
 * ONLY used for legacy records (e.g. User.profileImage) where filePublicId was not stored.
 * @param {string} url
 * @returns {string|null}
 */
const extractPublicId = (url) => {
  if (!url || typeof url !== "string") {
    return null;
  }

  try {
    // Pattern: /image/upload/(v\d+/)?(folder/.../filename)(\.[a-zA-Z0-9]+)?$
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) {
      return null;
    }

    let remainder = url.substring(uploadIndex + "/upload/".length);
    // Strip version prefix if present e.g. v123456789/
    if (/^v\d+\//.test(remainder)) {
      remainder = remainder.replace(/^v\d+\//, "");
    }

    // Strip extension
    const dotIndex = remainder.lastIndexOf(".");
    if (dotIndex !== -1) {
      remainder = remainder.substring(0, dotIndex);
    }

    return remainder.trim() || null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  uploadStream,
  deleteResource,
  extractPublicId,
};
