const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth.middleware");

const {
  registerVehicle,
  getMyVehicle,
  updateMyVehicleController,
  deleteMyVehicleController,
  uploadDocumentController,
  getDocumentsController,
  deleteDocumentController,
} = require("../controllers/vehicle.controller");

const { fileUploadLimiter } = require("../middleware/rateLimit.middleware");
const { validate } = require("../middleware/validate.middleware");
const upload = require("../middleware/upload.middleware");

const {
  vehicleDocumentUploadSchema,
  vehicleDocumentIdParamSchema,
} = require("../validators/vehicle.validator");

/**
 * @swagger
 * tags:
 *   name: Vehicle
 *   description: Vehicle Management APIs
 */

/**
 * @swagger
 * /api/driver/vehicle:
 *   post:
 *     summary: Register a vehicle
 *     description: Registers a new vehicle for the authenticated driver.
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVehicleRequest'
 *     responses:
 *       201:
 *         description: Vehicle registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Vehicle already exists for this driver.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/driver/vehicle:
 *   get:
 *     summary: Get driver's vehicle
 *     description: Returns the vehicle details of the authenticated driver.
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Vehicle not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/driver/vehicle:
 *   patch:
 *     summary: Update vehicle details
 *     description: Updates the authenticated driver's vehicle information.
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateVehicleRequest'
 *     responses:
 *       200:
 *         description: Vehicle updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Vehicle not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/driver/vehicle:
 *   delete:
 *     summary: Delete driver's vehicle
 *     description: Deletes the authenticated driver's registered vehicle.
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Vehicle not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Register Vehicle
router.post("/", authenticate, registerVehicle);

// Get My Vehicle
router.get("/", authenticate, getMyVehicle);

// Update My Vehicle
router.patch("/", authenticate, updateMyVehicleController);

// Delete My Vehicle
router.delete("/", authenticate, deleteMyVehicleController);

/**
 * @swagger
 * /api/driver/vehicle/documents:
 *   post:
 *     summary: Upload or replace vehicle document
 *     description: Uploads a vehicle verification document (RC, Insurance, Permit, Fitness).
 *     tags: [Vehicle]
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
 *                 enum: [RC, INSURANCE, PERMIT, FITNESS]
 *               documentNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vehicle document uploaded successfully.
 *       400:
 *         description: Validation failed or document already exists.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Vehicle not found.
 *       429:
 *         description: Too many upload requests.
 */
router.post(
  "/documents",
  authenticate,
  fileUploadLimiter,
  upload.uploadDocument.single("document"),
  validate(vehicleDocumentUploadSchema),
  uploadDocumentController,
);

/**
 * @swagger
 * /api/driver/vehicle/documents:
 *   get:
 *     summary: Get vehicle documents
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle documents fetched successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Vehicle not found.
 */
router.get("/documents", authenticate, getDocumentsController);

/**
 * @swagger
 * /api/driver/vehicle/documents/{id}:
 *   delete:
 *     summary: Delete a vehicle document
 *     description: Deletes a pending or rejected vehicle document. Approved documents cannot be deleted.
 *     tags: [Vehicle]
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
 *         description: Vehicle document deleted successfully.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Document not found.
 *       409:
 *         description: Approved documents cannot be deleted.
 */
router.delete(
  "/documents/:id",
  authenticate,
  validate(vehicleDocumentIdParamSchema),
  deleteDocumentController,
);

module.exports = router;