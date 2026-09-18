const path = require("path");
const { BadRequestError } = require("./AppError");

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

const DANGEROUS_EXTENSIONS = [
  "exe",
  "php",
  "js",
  "html",
  "htm",
  "sh",
  "bat",
  "cmd",
  "ps1",
  "vbs",
  "jar",
  "py",
  "pl",
  "cgi",
  "jsp",
  "asp",
  "aspx",
  "dll",
  "so",
  "bin",
];

/**
 * Detect file MIME type from magic byte signature
 * @param {Buffer} buffer
 * @returns {string|null}
 */
const detectFileSignature = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
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
    buffer.length >= 12 &&
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

  // PDF: %PDF- (25 50 44 46)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  return null;
};

/**
 * Sanitize original filename and check for security threats
 * @param {string} originalname
 * @returns {string} Sanitized safe filename
 */
const sanitizeFileName = (originalname) => {
  if (!originalname || typeof originalname !== "string" || !originalname.trim()) {
    throw new BadRequestError("Filename is missing or exceeds maximum length of 255 characters.");
  }

  const trimmed = originalname.trim();

  if (trimmed.length > 255) {
    throw new BadRequestError("Filename is missing or exceeds maximum length of 255 characters.");
  }

  // Check for path traversal attempts
  if (
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0") ||
    /[\x00-\x1F\x7F]/.test(trimmed)
  ) {
    throw new BadRequestError("Filename contains invalid or dangerous characters.");
  }

  // Check multiple extensions for disguised executables (e.g. photo.exe.jpg)
  const parts = trimmed.toLowerCase().split(".");
  if (parts.length > 2) {
    for (let i = 1; i < parts.length - 1; i++) {
      if (DANGEROUS_EXTENSIONS.includes(parts[i])) {
        throw new BadRequestError("Dangerous double extension detected.");
      }
    }
  }

  const ext = path.extname(trimmed).toLowerCase().slice(1);
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    throw new BadRequestError("File extension is prohibited.");
  }

  // Strip non-alphanumeric characters except dot, dash, underscore
  const baseName = path.basename(trimmed, path.extname(trimmed));
  const safeBase = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "file";
  const safeExt = path.extname(trimmed).toLowerCase();

  return `${safeBase}${safeExt}`;
};

/**
 * Validate an uploaded image file (avatar / photo)
 * @param {object} file Multer file object
 * @param {number} [maxSize=MAX_AVATAR_SIZE]
 */
const validateImageFile = (file, maxSize = MAX_AVATAR_SIZE) => {
  if (!file) {
    throw new BadRequestError("Please upload an image file.");
  }

  if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
    throw new BadRequestError("Invalid file buffer.");
  }

  if (!file.size || file.size <= 0) {
    throw new BadRequestError("Uploaded file is empty.");
  }

  if (file.size > maxSize) {
    throw new BadRequestError(`Image size must not exceed ${Math.round(maxSize / (1024 * 1024))} MB.`);
  }

  sanitizeFileName(file.originalname);

  const detectedType = detectFileSignature(file.buffer);
  if (!detectedType || detectedType === "application/pdf") {
    throw new BadRequestError("Invalid image format. Supported formats: JPEG, PNG, WebP.");
  }

  const normalizedMime = (file.mimetype || "").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();

  const isJpeg =
    detectedType === "image/jpeg" &&
    (normalizedMime === "image/jpeg" || normalizedMime === "image/jpg") &&
    (ext === ".jpg" || ext === ".jpeg");

  const isPng =
    detectedType === "image/png" &&
    normalizedMime === "image/png" &&
    ext === ".png";

  const isWebp =
    detectedType === "image/webp" &&
    normalizedMime === "image/webp" &&
    ext === ".webp";

  if (!isJpeg && !isPng && !isWebp) {
    throw new BadRequestError(
      "MIME type or file extension does not match actual image content (MIME spoofing detected)."
    );
  }

  return {
    detectedType,
    ext,
    size: file.size,
  };
};

/**
 * Validate an uploaded document file (driver/vehicle/user document)
 * Accepts JPEG, PNG, WebP, and PDF.
 * @param {object} file Multer file object
 * @param {number} [maxSize=MAX_DOCUMENT_SIZE]
 */
const validateDocumentFile = (file, maxSize = MAX_DOCUMENT_SIZE) => {
  if (!file) {
    throw new BadRequestError("Please upload a document file.");
  }

  if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
    throw new BadRequestError("Invalid file buffer.");
  }

  if (!file.size || file.size <= 0) {
    throw new BadRequestError("Uploaded document is empty.");
  }

  if (file.size > maxSize) {
    throw new BadRequestError(`Document size must not exceed ${Math.round(maxSize / (1024 * 1024))} MB.`);
  }

  sanitizeFileName(file.originalname);

  const detectedType = detectFileSignature(file.buffer);
  if (!detectedType) {
    throw new BadRequestError("Invalid document format. Supported formats: PDF, JPEG, PNG, WebP.");
  }

  const normalizedMime = (file.mimetype || "").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();

  const isPdf =
    detectedType === "application/pdf" &&
    normalizedMime === "application/pdf" &&
    ext === ".pdf";

  const isJpeg =
    detectedType === "image/jpeg" &&
    (normalizedMime === "image/jpeg" || normalizedMime === "image/jpg") &&
    (ext === ".jpg" || ext === ".jpeg");

  const isPng =
    detectedType === "image/png" &&
    normalizedMime === "image/png" &&
    ext === ".png";

  const isWebp =
    detectedType === "image/webp" &&
    normalizedMime === "image/webp" &&
    ext === ".webp";

  if (!isPdf && !isJpeg && !isPng && !isWebp) {
    throw new BadRequestError(
      "MIME type or file extension does not match actual document content (MIME spoofing detected)."
    );
  }

  return {
    detectedType,
    isPdf,
    ext,
    size: file.size,
  };
};

module.exports = {
  detectFileSignature,
  sanitizeFileName,
  validateImageFile,
  validateDocumentFile,
  MAX_AVATAR_SIZE,
  MAX_DOCUMENT_SIZE,
  DANGEROUS_EXTENSIONS,
};
