const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const ALLOWED_FILES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/jpg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
];

const fileFilter = (req, file, cb) => {
  if (
    !file.originalname ||
    file.originalname.length > 255 ||
    file.originalname.includes("..") ||
    file.originalname.includes("/") ||
    file.originalname.includes("\\")
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

  const allowedExtensions = ALLOWED_FILES[file.mimetype];

  if (!allowedExtensions) {
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  }

  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

module.exports = upload;
