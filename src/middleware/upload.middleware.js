const multer = require("multer");
const path = require("path");
const { DANGEROUS_EXTENSIONS } = require("../utils/fileSecurity");

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_FILES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/jpg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const ALLOWED_DOCUMENT_FILES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/jpg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

const createFileFilter = (allowedMimeMap) => (req, file, cb) => {
  if (
    !file.originalname ||
    file.originalname.length > 255 ||
    file.originalname.includes("..") ||
    file.originalname.includes("/") ||
    file.originalname.includes("\\") ||
    file.originalname.includes("\0")
  ) {
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  }

  const parts = file.originalname.toLowerCase().split(".");
  if (parts.length > 2) {
    for (let i = 1; i < parts.length; i++) {
      if (DANGEROUS_EXTENSIONS.includes(parts[i])) {
        return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
      }
    }
  }

  const normalizedMime = (file.mimetype || "").toLowerCase();
  const allowedExtensions = allowedMimeMap[normalizedMime];

  if (!allowedExtensions) {
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  }

  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  }

  cb(null, true);
};

const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: MAX_AVATAR_SIZE,
    files: 1,
    fields: 10,
    parts: 20,
  },
  fileFilter: createFileFilter(ALLOWED_IMAGE_FILES),
});

const uploadDocument = multer({
  storage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 1,
    fields: 10,
    parts: 20,
  },
  fileFilter: createFileFilter(ALLOWED_DOCUMENT_FILES),
});

// Default upload instance is document-capable (PDF + images) for backward compatibility
const upload = uploadDocument;

upload.uploadAvatar = uploadAvatar;
upload.uploadImageOnly = uploadAvatar;
upload.uploadDocument = uploadDocument;

module.exports = upload;
