const express = require("express");

const router = express.Router();

const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const {
  requirePermission,
} = require("../../middleware/admin/adminRbac.middleware");
const { validate } = require("../../middleware/validate.middleware");

const upload = require("../../middleware/upload.middleware");
const { fileUploadLimiter } = require("../../middleware/rateLimit.middleware");

const controller = require("../../controllers/admin/adminFile.controller");

const {
  documentIdParamSchema,
  uploadUserDocumentBodySchema,
  replaceUserDocumentBodySchema,
  userDocumentListQuerySchema,
} = require("../../validators/admin/adminFile.validator");

router.use(adminAuthMiddleware);

/**
 * @swagger
 * tags:
 *   - name: Admin File Management
 *     description: User document and file management
 */

/**
 * @swagger
 * /api/admin/files:
 *   post:
 *     summary: Upload a user document
 *     tags:
 *       - Admin File Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - documentType
 *               - file
 *             properties:
 *               userId:
 *                 type: string
 *               documentType:
 *                 type: string
 *                 enum: [ID_PROOF, ADDRESS_PROOF, OTHER]
 *               documentNumber:
 *                 type: string
 *                 maxLength: 100
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User document uploaded successfully.
 *       400:
 *         description: Invalid document data or file.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       409:
 *         description: Document already exists.
 */
router.post(
  "/",
  requirePermission("file:upload"),
  fileUploadLimiter,
  upload.uploadDocument.single("file"),
  validate(uploadUserDocumentBodySchema),
  controller.uploadDocument,
);

/**
 * @swagger
 * /api/admin/files:
 *   get:
 *     summary: Get user documents
 *     tags:
 *       - Admin File Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *           enum: [ID_PROOF, ADDRESS_PROOF, OTHER]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, originalName, fileSize]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Files fetched successfully.
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get(
  "/",
  requirePermission("file:view"),
  validate(userDocumentListQuerySchema),
  controller.getDocuments,
);

/**
 * @swagger
 * /api/admin/files/{id}:
 *   get:
 *     summary: Get file details
 *     tags:
 *       - Admin File Management
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
 *         description: File fetched successfully.
 *       400:
 *         description: Invalid document ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: File not found.
 */
router.get(
  "/:id",
  requirePermission("file:view"),
  validate(documentIdParamSchema),
  controller.getDocument,
);

/**
 * @swagger
 * /api/admin/files/{id}/download:
 *   get:
 *     summary: Download user document file
 *     tags:
 *       - Admin File Management
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
 *         description: File downloaded successfully.
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid document ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: File not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/download",
  requirePermission("file:view"),
  validate(documentIdParamSchema),
  controller.downloadDocument,
);

/**
 * @swagger
 * /api/admin/files/{id}:
 *   put:
 *     summary: Replace a user document
 *     tags:
 *       - Admin File Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               documentNumber:
 *                 type: string
 *                 maxLength: 100
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File replaced successfully.
 *       400:
 *         description: Invalid document or file.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: File not found.
 */
router.put(
  "/:id",
  requirePermission("file:manage"),
  fileUploadLimiter,
  validate(documentIdParamSchema),
  upload.uploadDocument.single("file"),
  validate(replaceUserDocumentBodySchema),
  controller.replaceDocument,
);

/**
 * @swagger
 * /api/admin/files/{id}:
 *   delete:
 *     summary: Delete a user document
 *     tags:
 *       - Admin File Management
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
 *         description: File deleted successfully.
 *       400:
 *         description: Invalid document ID.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: File not found.
 */
router.delete(
  "/:id",
  requirePermission("file:delete"),
  validate(documentIdParamSchema),
  controller.deleteDocument,
);

module.exports = router;
