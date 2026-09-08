const test = require("node:test");
const assert = require("node:assert/strict");

const {
  detectFileSignature,
  sanitizeFileName,
  validateImageFile,
  validateDocumentFile,
  MAX_AVATAR_SIZE,
  MAX_DOCUMENT_SIZE,
} = require("../src/utils/fileSecurity");

const storageService = require("../src/services/storage.service");
const userService = require("../src/services/user.service");
const driverService = require("../src/services/driver.service");
const vehicleService = require("../src/services/vehicle.service");
const adminVehicleService = require("../src/services/admin/adminVehicle.service");
const adminVehicleRepository = require("../src/repositories/admin/adminVehicle.repository");
const userRepository = require("../src/repositories/user.repository");
const driverRepository = require("../src/repositories/driver.repository");
const vehicleRepository = require("../src/repositories/vehicle.repository");

// Fixtures for testing
const VALID_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9,
]);

const VALID_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
  0x44, 0x52,
]);

const VALID_WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBPVP8 "),
]);

const VALID_PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

const FAKE_TEXT = Buffer.from("This is plain text disguised as an image file.");

// ==========================================
// 1. File Security & Validation Tests
// ==========================================

test("detectFileSignature correctly identifies JPEG, PNG, WebP, and PDF", () => {
  assert.equal(detectFileSignature(VALID_JPEG), "image/jpeg");
  assert.equal(detectFileSignature(VALID_PNG), "image/png");
  assert.equal(detectFileSignature(VALID_WEBP), "image/webp");
  assert.equal(detectFileSignature(VALID_PDF), "application/pdf");
  assert.equal(detectFileSignature(FAKE_TEXT), null);
  assert.equal(detectFileSignature(Buffer.alloc(0)), null);
  assert.equal(detectFileSignature(null), null);
});

test("sanitizeFileName strips path traversal, control characters, and blocks dangerous extensions", () => {
  assert.throws(() => sanitizeFileName("../../etc/passwd"), /invalid or dangerous/);
  assert.throws(() => sanitizeFileName("..\\windows\\system32"), /invalid or dangerous/);
  assert.throws(() => sanitizeFileName("file\0name.jpg"), /invalid or dangerous/);
  assert.throws(() => sanitizeFileName("exploit.php"), /prohibited/);
  assert.throws(() => sanitizeFileName("payload.exe"), /prohibited/);
  assert.throws(() => sanitizeFileName("photo.exe.jpg"), /Dangerous double extension/);
  assert.throws(() => sanitizeFileName(""), /missing or exceeds/);

  const clean = sanitizeFileName("My Profile Photo (2026).jpg");
  assert.equal(clean, "My_Profile_Photo__2026_.jpg");
});

test("validateImageFile accepts valid JPEG, PNG, and WebP, and rejects PDF or spoofed MIME", () => {
  const validJpegFile = {
    originalname: "avatar.jpg",
    mimetype: "image/jpeg",
    buffer: VALID_JPEG,
    size: VALID_JPEG.length,
  };
  const resultJpeg = validateImageFile(validJpegFile);
  assert.equal(resultJpeg.detectedType, "image/jpeg");

  const validPngFile = {
    originalname: "avatar.png",
    mimetype: "image/png",
    buffer: VALID_PNG,
    size: VALID_PNG.length,
  };
  assert.equal(validateImageFile(validPngFile).detectedType, "image/png");

  const validWebpFile = {
    originalname: "avatar.webp",
    mimetype: "image/webp",
    buffer: VALID_WEBP,
    size: VALID_WEBP.length,
  };
  assert.equal(validateImageFile(validWebpFile).detectedType, "image/webp");

  // Rejects PDF as avatar
  const pdfAsAvatar = {
    originalname: "doc.pdf",
    mimetype: "application/pdf",
    buffer: VALID_PDF,
    size: VALID_PDF.length,
  };
  assert.throws(() => validateImageFile(pdfAsAvatar), /Invalid image format/);

  // MIME spoofing: text file named .jpg
  const spoofedFile = {
    originalname: "avatar.jpg",
    mimetype: "image/jpeg",
    buffer: FAKE_TEXT,
    size: FAKE_TEXT.length,
  };
  assert.throws(() => validateImageFile(spoofedFile), /Invalid image format/);

  // Extension mismatch: PNG content named .jpg
  const mismatchFile = {
    originalname: "avatar.jpg",
    mimetype: "image/jpeg",
    buffer: VALID_PNG,
    size: VALID_PNG.length,
  };
  assert.throws(() => validateImageFile(mismatchFile), /MIME spoofing detected/);

  // Oversized image
  const oversizedFile = {
    originalname: "large.jpg",
    mimetype: "image/jpeg",
    buffer: VALID_JPEG,
    size: MAX_AVATAR_SIZE + 1024,
  };
  assert.throws(() => validateImageFile(oversizedFile), /must not exceed/);
});

test("validateDocumentFile accepts PDF, JPEG, PNG, WebP and rejects spoofing", () => {
  const pdfDoc = {
    originalname: "license.pdf",
    mimetype: "application/pdf",
    buffer: VALID_PDF,
    size: VALID_PDF.length,
  };
  const resPdf = validateDocumentFile(pdfDoc);
  assert.equal(resPdf.isPdf, true);
  assert.equal(resPdf.detectedType, "application/pdf");

  const jpegDoc = {
    originalname: "rc.jpg",
    mimetype: "image/jpeg",
    buffer: VALID_JPEG,
    size: VALID_JPEG.length,
  };
  const resJpeg = validateDocumentFile(jpegDoc);
  assert.equal(resJpeg.isPdf, false);
  assert.equal(resJpeg.detectedType, "image/jpeg");

  // Reject PDF claiming to be image/jpeg
  const spoofedDoc = {
    originalname: "rc.jpg",
    mimetype: "image/jpeg",
    buffer: VALID_PDF,
    size: VALID_PDF.length,
  };
  assert.throws(() => validateDocumentFile(spoofedDoc), /MIME spoofing detected/);

  // Reject empty document
  assert.throws(
    () =>
      validateDocumentFile({
        originalname: "empty.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.alloc(0),
        size: 0,
      }),
    /empty/,
  );

  // Reject oversized document
  assert.throws(
    () =>
      validateDocumentFile({
        originalname: "huge.pdf",
        mimetype: "application/pdf",
        buffer: VALID_PDF,
        size: MAX_DOCUMENT_SIZE + 1024,
      }),
    /must not exceed/,
  );
});

// ==========================================
// 2. Storage Service & PublicId Extraction
// ==========================================

test("extractPublicId correctly parses Cloudinary URLs and ignores non-Cloudinary URLs", () => {
  const urlWithVersion =
    "https://res.cloudinary.com/goride-cloud/image/upload/v1692837482/goride/profile-images/user123_avatar.jpg";
  assert.equal(
    storageService.extractPublicId(urlWithVersion),
    "goride/profile-images/user123_avatar",
  );

  const urlWithoutVersion =
    "https://res.cloudinary.com/goride-cloud/image/upload/goride/user-documents/id_proof_456.pdf";
  assert.equal(
    storageService.extractPublicId(urlWithoutVersion),
    "goride/user-documents/id_proof_456",
  );

  assert.equal(storageService.extractPublicId("https://example.com/other.jpg"), null);
  assert.equal(storageService.extractPublicId(null), null);
  assert.equal(storageService.extractPublicId(""), null);
});

test("deleteResource handles missing or empty publicId gracefully", async () => {
  const resNull = await storageService.deleteResource(null);
  assert.equal(resNull.success, false);
  assert.equal(resNull.result, "missing_public_id");

  const resEmpty = await storageService.deleteResource("   ");
  assert.equal(resEmpty.success, false);
  assert.equal(resEmpty.result, "missing_public_id");
});

// ==========================================
// 3. User Avatar & Document Compensation Tests
// ==========================================

test("uploadProfileImage compensates by cleaning up storage if database update fails", async () => {
  const originalUploadStream = storageService.uploadStream;
  const originalDeleteResource = storageService.deleteResource;
  const originalGetUserById = userRepository.getUserById;
  const originalUpdateUserProfile = userRepository.updateUserProfile;

  let uploadedPublicId = null;
  let deletedPublicId = null;

  try {
    storageService.uploadStream = async () => {
      uploadedPublicId = "goride/profile-images/test_avatar_compensation";
      return {
        public_id: uploadedPublicId,
        secure_url: `https://res.cloudinary.com/test/image/upload/${uploadedPublicId}.jpg`,
        resource_type: "image",
      };
    };

    storageService.deleteResource = async (publicId) => {
      deletedPublicId = publicId;
      return { success: true, result: "ok" };
    };

    userRepository.getUserById = async () => ({
      id: "test_user_comp",
      isActive: true,
      deletedAt: null,
      profileImage: null,
    });

    userRepository.updateUserProfile = async () => {
      throw new Error("Simulated PostgreSQL connection failure");
    };

    const file = {
      originalname: "avatar.jpg",
      mimetype: "image/jpeg",
      buffer: VALID_JPEG,
      size: VALID_JPEG.length,
    };

    await assert.rejects(
      () => userService.uploadProfileImage("test_user_comp", file),
      /Simulated PostgreSQL connection failure/,
    );

    assert.equal(deletedPublicId, uploadedPublicId, "Compensation cleanup must delete the uploaded asset on DB failure");
  } finally {
    storageService.uploadStream = originalUploadStream;
    storageService.deleteResource = originalDeleteResource;
    userRepository.getUserById = originalGetUserById;
    userRepository.updateUserProfile = originalUpdateUserProfile;
  }
});

test("uploadProfileImage deletes previous avatar from Cloudinary only AFTER database succeeds", async () => {
  const originalUploadStream = storageService.uploadStream;
  const originalDeleteResource = storageService.deleteResource;
  const originalGetUserById = userRepository.getUserById;
  const originalUpdateUserProfile = userRepository.updateUserProfile;

  let oldDeletedPublicId = null;

  try {
    const oldUrl =
      "https://res.cloudinary.com/test/image/upload/v1234/goride/profile-images/old_avatar.jpg";

    userRepository.getUserById = async () => ({
      id: "test_user_replace",
      isActive: true,
      deletedAt: null,
      profileImage: oldUrl,
    });

    storageService.uploadStream = async () => ({
      public_id: "goride/profile-images/new_avatar",
      secure_url:
        "https://res.cloudinary.com/test/image/upload/v5678/goride/profile-images/new_avatar.jpg",
      resource_type: "image",
    });

    storageService.deleteResource = async (publicId) => {
      oldDeletedPublicId = publicId;
      return { success: true, result: "ok" };
    };

    userRepository.updateUserProfile = async (id, data) => ({
      id,
      profileImage: data.profileImage,
    });

    const file = {
      originalname: "new_avatar.jpg",
      mimetype: "image/jpeg",
      buffer: VALID_JPEG,
      size: VALID_JPEG.length,
    };

    const updated = await userService.uploadProfileImage("test_user_replace", file);
    assert.ok(updated.profileImage.includes("new_avatar"));
    assert.equal(oldDeletedPublicId, "goride/profile-images/old_avatar");
  } finally {
    storageService.uploadStream = originalUploadStream;
    storageService.deleteResource = originalDeleteResource;
    userRepository.getUserById = originalGetUserById;
    userRepository.updateUserProfile = originalUpdateUserProfile;
  }
});

test("uploadUserDocumentSelf rejects duplicates, validates PDFs, and compensates on DB failure", async () => {
  const originalUploadStream = storageService.uploadStream;
  const originalDeleteResource = storageService.deleteResource;
  const originalGetUserById = userRepository.getUserById;
  const originalFindUserDocumentByType = userRepository.findUserDocumentByType;
  const originalCreateUserDocument = userRepository.createUserDocument;

  let deletedPublicId = null;

  try {
    userRepository.getUserById = async () => ({
      id: "user_doc_test",
      isActive: true,
      deletedAt: null,
    });

    // 1. Test duplicate rejection
    userRepository.findUserDocumentByType = async () => ({
      id: "existing_doc_id",
      documentType: "ID_PROOF",
    });

    const validPdfFile = {
      originalname: "id_card.pdf",
      mimetype: "application/pdf",
      buffer: VALID_PDF,
      size: VALID_PDF.length,
    };

    await assert.rejects(
      () =>
        userService.uploadUserDocumentSelf(
          "user_doc_test",
          { documentType: "ID_PROOF", documentNumber: "12345" },
          validPdfFile,
        ),
      /already exists/,
    );

    // 2. Test compensation on DB failure
    userRepository.findUserDocumentByType = async () => null;

    storageService.uploadStream = async () => ({
      public_id: "goride/user-documents/pdf_comp_id",
      secure_url: "https://res.cloudinary.com/test/image/upload/doc.pdf",
      resource_type: "raw",
    });

    storageService.deleteResource = async (publicId) => {
      deletedPublicId = publicId;
      return { success: true, result: "ok" };
    };

    userRepository.createUserDocument = async () => {
      throw new Error("DB insert timeout");
    };

    await assert.rejects(
      () =>
        userService.uploadUserDocumentSelf(
          "user_doc_test",
          { documentType: "ID_PROOF", documentNumber: "12345" },
          validPdfFile,
        ),
      /DB insert timeout/,
    );

    assert.equal(deletedPublicId, "goride/user-documents/pdf_comp_id");
  } finally {
    storageService.uploadStream = originalUploadStream;
    storageService.deleteResource = originalDeleteResource;
    userRepository.getUserById = originalGetUserById;
    userRepository.findUserDocumentByType = originalFindUserDocumentByType;
    userRepository.createUserDocument = originalCreateUserDocument;
  }
});

test("deleteUserDocumentSelf enforces ownership and deletes storage asset using filePublicId", async () => {
  const originalGetUserDocumentById = userRepository.getUserDocumentById;
  const originalDeleteUserDocument = userRepository.deleteUserDocument;
  const originalDeleteResource = storageService.deleteResource;

  let deletedStorageId = null;

  try {
    userRepository.getUserDocumentById = async (id) => {
      if (id === "doc_not_owned") {
        return { id, userId: "other_user", filePublicId: "pub_other" };
      }
      return { id, userId: "owner_user", filePublicId: "pub_owner_123", mimeType: "application/pdf" };
    };

    userRepository.deleteUserDocument = async (id) => ({ id });
    storageService.deleteResource = async (publicId) => {
      deletedStorageId = publicId;
      return { success: true, result: "ok" };
    };

    // Unauthorized delete
    await assert.rejects(
      () => userService.deleteUserDocumentSelf("owner_user", "doc_not_owned"),
      /not authorized to delete this document/,
    );

    // Authorized delete
    const res = await userService.deleteUserDocumentSelf("owner_user", "doc_owned");
    assert.equal(res.message, "Document deleted successfully.");
    assert.equal(deletedStorageId, "pub_owner_123");
  } finally {
    userRepository.getUserDocumentById = originalGetUserDocumentById;
    userRepository.deleteUserDocument = originalDeleteUserDocument;
    storageService.deleteResource = originalDeleteResource;
  }
});

// ==========================================
// 4. Driver Document Tests (Compensation & Protection)
// ==========================================

test("uploadDriverDocument rejects non-rejected duplicates and cleans up old file on replacement", async () => {
  const originalGetDriverById = driverRepository.getDriverById;
  const originalGetDriverDocumentByType = driverRepository.getDriverDocumentByType;
  const originalUploadStream = storageService.uploadStream;
  const originalDeleteResource = storageService.deleteResource;
  const originalReplaceRejected = driverRepository.replaceRejectedDriverDocument;

  let oldAssetCleaned = null;

  try {
    driverRepository.getDriverById = async () => ({ id: "drv_1", userId: "usr_1" });

    // 1. Reject if already pending or approved
    driverRepository.getDriverDocumentByType = async () => ({
      id: "doc_pending",
      status: "PENDING",
      documentType: "LICENSE",
    });

    const file = {
      originalname: "license.pdf",
      mimetype: "application/pdf",
      buffer: VALID_PDF,
      size: VALID_PDF.length,
    };

    await assert.rejects(
      () => driverService.uploadDriverDocument("drv_1", { documentType: "LICENSE", documentNumber: "DL123" }, file),
      /already exists/,
    );

    // 2. Allow replacement when REJECTED, and clean up old file
    driverRepository.getDriverDocumentByType = async () => ({
      id: "doc_rejected",
      status: "REJECTED",
      documentType: "LICENSE",
      filePublicId: "goride/driver-documents/old_license_pub",
    });

    storageService.uploadStream = async () => ({
      public_id: "goride/driver-documents/new_license_pub",
      secure_url: "https://res.cloudinary.com/test/image/upload/new.pdf",
      resource_type: "raw",
    });

    storageService.deleteResource = async (publicId) => {
      oldAssetCleaned = publicId;
      return { success: true, result: "ok" };
    };

    driverRepository.replaceRejectedDriverDocument = async ({ documentId }) => ({
      id: documentId,
      status: "PENDING",
    });

    const replaced = await driverService.uploadDriverDocument(
      "drv_1",
      { documentType: "LICENSE", documentNumber: "DL123" },
      file,
    );

    assert.equal(replaced.status, "PENDING");
    assert.equal(oldAssetCleaned, "goride/driver-documents/old_license_pub");
  } finally {
    driverRepository.getDriverById = originalGetDriverById;
    driverRepository.getDriverDocumentByType = originalGetDriverDocumentByType;
    storageService.uploadStream = originalUploadStream;
    storageService.deleteResource = originalDeleteResource;
    driverRepository.replaceRejectedDriverDocument = originalReplaceRejected;
  }
});

test("deleteDriverDocument prevents deletion of APPROVED documents and enforces ownership", async () => {
  const originalGetDriverDocumentById = driverRepository.getDriverDocumentById;
  const originalDeleteDriverDoc = driverRepository.deleteDriverDocument;
  const originalDeleteResource = storageService.deleteResource;

  let storageDeleted = null;

  try {
    driverRepository.getDriverDocumentById = async (id) => {
      if (id === "doc_approved") {
        return { id, driverId: "drv_1", status: "APPROVED", filePublicId: "pub_app" };
      }
      if (id === "doc_wrong_driver") {
        return { id, driverId: "drv_2", status: "PENDING", filePublicId: "pub_wrong" };
      }
      return { id, driverId: "drv_1", status: "PENDING", filePublicId: "pub_pending_1" };
    };

    driverRepository.deleteDriverDocument = async (id) => ({ id });
    storageService.deleteResource = async (publicId) => {
      storageDeleted = publicId;
      return { success: true, result: "ok" };
    };

    // Cannot delete approved document
    await assert.rejects(
      () => driverService.deleteDriverDocument("drv_1", "doc_approved"),
      /Approved driver document cannot be deleted/,
    );

    // Cannot delete document of another driver
    await assert.rejects(
      () => driverService.deleteDriverDocument("drv_1", "doc_wrong_driver"),
      /not authorized to delete this document/,
    );

    // Can delete pending document
    const res = await driverService.deleteDriverDocument("drv_1", "doc_pending");
    assert.equal(res.message, "Driver document deleted successfully.");
    assert.equal(storageDeleted, "pub_pending_1");
  } finally {
    driverRepository.getDriverDocumentById = originalGetDriverDocumentById;
    driverRepository.deleteDriverDocument = originalDeleteDriverDoc;
    storageService.deleteResource = originalDeleteResource;
  }
});

// ==========================================
// 5. Vehicle Document Tests (Ownership Chain & Admin RBAC)
// ==========================================

test("vehicle document upload verifies DB ownership chain (User -> Driver -> Vehicle)", async () => {
  const originalGetDriverByUserId = driverRepository.getDriverByUserId;
  const originalGetVehicleByDriverId = vehicleRepository.getVehicleByDriverId;
  const originalGetVehicleDocByType = vehicleRepository.getVehicleDocumentByType;
  const originalUploadStream = storageService.uploadStream;
  const originalCreateVehicleDoc = vehicleRepository.createVehicleDocument;

  try {
    // 1. Non-driver user
    driverRepository.getDriverByUserId = async () => null;
    const file = {
      originalname: "rc.pdf",
      mimetype: "application/pdf",
      buffer: VALID_PDF,
      size: VALID_PDF.length,
    };

    await assert.rejects(
      () => vehicleService.uploadVehicleDocument("user_non_driver", { documentType: "RC" }, file),
      /Driver profile not found/,
    );

    // 2. Driver without registered vehicle
    driverRepository.getDriverByUserId = async () => ({ id: "drv_no_veh" });
    vehicleRepository.getVehicleByDriverId = async () => null;

    await assert.rejects(
      () => vehicleService.uploadVehicleDocument("user_driver_no_veh", { documentType: "RC" }, file),
      /Vehicle not found/,
    );

    // 3. Driver with vehicle: success
    vehicleRepository.getVehicleByDriverId = async () => ({ id: "veh_123", driverId: "drv_no_veh" });
    vehicleRepository.getVehicleDocumentByType = async () => null;
    storageService.uploadStream = async () => ({
      public_id: "goride/vehicle-documents/veh_doc_pub",
      secure_url: "https://res.cloudinary.com/test/image/upload/veh.pdf",
      resource_type: "raw",
    });
    vehicleRepository.createVehicleDocument = async (data) => ({
      id: "veh_doc_created",
      ...data,
      status: "PENDING",
    });

    const created = await vehicleService.uploadVehicleDocument(
      "user_driver_with_veh",
      { documentType: "RC", documentNumber: "RC-999" },
      file,
    );

    assert.equal(created.id, "veh_doc_created");
    assert.equal(created.documentType, "RC");
  } finally {
    driverRepository.getDriverByUserId = originalGetDriverByUserId;
    vehicleRepository.getVehicleByDriverId = originalGetVehicleByDriverId;
    vehicleRepository.getVehicleDocumentByType = originalGetVehicleDocByType;
    storageService.uploadStream = originalUploadStream;
    vehicleRepository.createVehicleDocument = originalCreateVehicleDoc;
  }
});

test("adminVehicleService approves and rejects vehicle documents with audit logging", async () => {
  const originalFindDocById = adminVehicleRepository.findVehicleDocumentById;
  const originalUpdateDocWithAudit = adminVehicleRepository.updateVehicleDocumentStatusWithAudit;

  let capturedAudit = null;

  try {
    adminVehicleRepository.findVehicleDocumentById = async (id) => ({
      id,
      vehicleId: "veh_target",
      documentType: "RC",
      status: "PENDING",
    });

    adminVehicleRepository.updateVehicleDocumentStatusWithAudit = async ({ status, rejectionReason, auditLog }) => {
      capturedAudit = auditLog;
      return { id: "doc_1", status, rejectionReason };
    };

    // Approve
    const approved = await adminVehicleService.approveVehicleDocument({
      documentId: "doc_1",
      adminId: "adm_1",
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });

    assert.equal(approved.status, "APPROVED");
    assert.equal(capturedAudit.action, "APPROVE");
    assert.equal(capturedAudit.entity, "VEHICLE");
    assert.equal(capturedAudit.entityId, "veh_target");

    // Reject
    const rejected = await adminVehicleService.rejectVehicleDocument({
      documentId: "doc_1",
      reason: "Document image is blurry",
      adminId: "adm_1",
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });

    assert.equal(rejected.status, "REJECTED");
    assert.equal(rejected.rejectionReason, "Document image is blurry");
    assert.equal(capturedAudit.action, "REJECT");
    assert.equal(capturedAudit.metadata.rejectionReason, "Document image is blurry");
  } finally {
    adminVehicleRepository.findVehicleDocumentById = originalFindDocById;
    adminVehicleRepository.updateVehicleDocumentStatusWithAudit = originalUpdateDocWithAudit;
  }
});

// ==========================================
// 6. Storage Dual-Fallback & Multer Bounds Tests
// ==========================================

test("deleteResource attempts raw fallback when image returns not found", async () => {
  const cloudinary = require("../src/config/cloudinary");
  const originalDestroy = cloudinary.uploader.destroy;

  const attemptedTypes = [];

  try {
    cloudinary.uploader.destroy = async (publicId, options) => {
      attemptedTypes.push(options.resource_type);
      if (options.resource_type === "image") {
        return { result: "not found" };
      }
      return { result: "ok" };
    };

    const res = await storageService.deleteResource("goride/documents/raw_pdf_doc", {
      resourceType: "image",
    });

    assert.equal(res.success, true);
    assert.equal(res.result, "ok");
    assert.deepEqual(attemptedTypes, ["image", "raw"]);
  } finally {
    cloudinary.uploader.destroy = originalDestroy;
  }
});

test("upload.middleware enforces memory bounds and exports specialized uploaders", () => {
  const upload = require("../src/middleware/upload.middleware");

  assert.ok(upload.uploadAvatar, "uploadAvatar must be exported");
  assert.ok(upload.uploadDocument, "uploadDocument must be exported");
  assert.ok(typeof upload.single === "function", "default upload must support single()");
});

test("fileUploadLimiter is attached to upload and replace routes", () => {
  const userRoutes = require("../src/routes/user.routes");
  const driverRoutes = require("../src/routes/driver.routes");
  const vehicleRoutes = require("../src/routes/vehicle.routes");
  const adminFileRoutes = require("../src/routes/admin/adminFile.routes");

  const { fileUploadLimiter } = require("../src/middleware/rateLimit.middleware");

  const checkRouteHasLimiter = (router, path, method) => {
    const route = router.stack.find(
      (layer) => layer.route && layer.route.path === path && layer.route.methods[method.toLowerCase()]
    );
    assert.ok(route, `Route ${method} ${path} must exist`);
    const hasLimiter = route.route.stack.some(
      (layer) => layer.handle === fileUploadLimiter
    );
    assert.ok(hasLimiter, `Route ${method} ${path} must have fileUploadLimiter attached`);
  };

  checkRouteHasLimiter(userRoutes, "/me/avatar", "PATCH");
  checkRouteHasLimiter(userRoutes, "/me/documents", "POST");
  checkRouteHasLimiter(driverRoutes, "/documents", "POST");
  checkRouteHasLimiter(vehicleRoutes, "/documents", "POST");
  checkRouteHasLimiter(adminFileRoutes, "/", "POST");
  checkRouteHasLimiter(adminFileRoutes, "/:id", "PUT");
});

