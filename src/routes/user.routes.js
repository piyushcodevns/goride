const express = require("express");

const router = express.Router();

const {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
  uploadMyDocument,
  getMyDocuments,
  deleteMyDocument,
} = require("../controllers/user.controller");

const { authenticate } = require("../middleware/auth.middleware");
const { fileUploadLimiter } = require("../middleware/rateLimit.middleware");
const { validate } = require("../middleware/validate.middleware");
const upload = require("../middleware/upload.middleware");
const {
  userDocumentUploadSchema,
  userDocumentIdParamSchema,
} = require("../validators/user.validator");

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User profile and document management APIs
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get logged-in user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get("/me", authenticate, getMyProfile);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update logged-in user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       401:
 *         description: Unauthorized.
 */
router.put("/me", authenticate, updateMyProfile);

/**
 * @swagger
 * /api/users/me/avatar:
 *   patch:
 *     summary: Upload profile avatar image
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (JPEG, PNG, WebP, max 5MB)
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully.
 *       400:
 *         description: Invalid or unsupported image.
 *       401:
 *         description: Unauthorized.
 *       429:
 *         description: Too many upload requests.
 */
router.patch(
  "/me/avatar",
  authenticate,
  fileUploadLimiter,
  upload.uploadAvatar.single("avatar"),
  uploadProfileImage
);

/**
 * @swagger
 * /api/users/me/documents:
 *   post:
 *     summary: Upload user KYC / verification document
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *               - documentType
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: Document file (PDF, JPEG, PNG, WebP, max 10MB)
 *               documentType:
 *                 type: string
 *                 enum: [ID_PROOF, ADDRESS_PROOF, OTHER]
 *               documentNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded successfully.
 *       400:
 *         description: Invalid document data or file.
 *       401:
 *         description: Unauthorized.
 *       409:
 *         description: Document of this type already exists.
 *       429:
 *         description: Too many upload requests.
 */
router.post(
  "/me/documents",
  authenticate,
  fileUploadLimiter,
  upload.uploadDocument.single("document"),
  validate(userDocumentUploadSchema),
  uploadMyDocument
);

/**
 * @swagger
 * /api/users/me/documents:
 *   get:
 *     summary: Get logged-in user documents
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Documents fetched successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get("/me/documents", authenticate, getMyDocuments);

/**
 * @swagger
 * /api/users/me/documents/{id}:
 *   delete:
 *     summary: Delete a user document
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Document not found.
 */
router.delete(
  "/me/documents/:id",
  authenticate,
  validate(userDocumentIdParamSchema),
  deleteMyDocument
);

module.exports = router;