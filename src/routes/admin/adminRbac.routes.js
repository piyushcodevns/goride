const express = require("express");
const adminAuthMiddleware = require("../../middleware/admin/adminAuth.middleware");
const { requirePermission } = require("../../middleware/admin/adminRbac.middleware");
const permissions = require("../../constants/adminPermissions");
const controller = require("../../controllers/admin/adminRbac.controller");

const router = express.Router();
router.use(adminAuthMiddleware);

/**
 * @swagger
 * /api/admin/rbac/roles:
 *   get:
 *     summary: List administrator roles and permissions
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Roles returned successfully. }
 *       401: { description: Authentication required. }
 *       403: { description: Role view permission required. }
 */
router.get("/roles", requirePermission(permissions.ROLE_VIEW), controller.listRoles);
/**
 * @swagger
 * /api/admin/rbac/roles/{role}:
 *   get:
 *     summary: Get an administrator role
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Role returned successfully. }
 *       400: { description: Invalid role. }
 *       404: { description: Role not found. }
 */
/**
 * @swagger
 * /api/admin/rbac/roles:
 *   post:
 *     summary: Create an administrator role
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role, permissions]
 *             properties:
 *               role: { type: string }
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201: { description: Role created successfully. }
 *       400: { description: Invalid role or duplicate. }
 *       403: { description: Role creation denied. }
 */
router.post("/roles", requirePermission(permissions.ROLE_CREATE), controller.createRole);
router.get("/roles/:role", requirePermission(permissions.ROLE_VIEW), controller.getRole);

/**
 * @swagger
 * /api/admin/rbac/roles/{role}:
 *   delete:
 *     summary: Delete an administrator role
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Role deleted successfully. }
 *       403: { description: Role deletion denied. }
 *       404: { description: Role not found. }
 */
router.delete("/roles/:role", requirePermission(permissions.ROLE_DELETE), controller.deleteRole);
/**
 * @swagger
 * /api/admin/rbac/permissions:
 *   get:
 *     summary: List registered administrator permissions
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Permissions returned successfully. }
 */
router.get("/permissions", requirePermission(permissions.PERMISSION_VIEW), controller.listPermissions);
/**
 * @swagger
 * /api/admin/rbac/roles/{role}/permissions:
 *   put:
 *     summary: Replace permissions assigned to a role
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissions]
 *             properties:
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Permissions replaced successfully. }
 *       400: { description: Invalid role or permission input. }
 *       403: { description: Permission management denied. }
 */
router.put("/roles/:role/permissions", requirePermission(permissions.PERMISSION_MANAGE), controller.replaceRolePermissions);

/**
 * @swagger
 * /api/admin/rbac/roles/{role}:
 *   patch:
 *     summary: Update an administrator role and its permissions
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Role updated successfully. }
 *       400: { description: Invalid input. }
 *       403: { description: Permission denied. }
 */
router.patch("/roles/:role", requirePermission(permissions.ROLE_UPDATE), controller.replaceRolePermissions);
/**
 * @swagger
 * /api/admin/rbac/admins/{id}/role:
 *   patch:
 *     summary: Assign a role to an administrator
 *     tags: [Admin RBAC]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string }
 *     responses:
 *       200: { description: Role assigned successfully. }
 *       403: { description: Role management denied. }
 *       409: { description: Protected role operation rejected. }
 */
router.patch("/admins/:id/role", requirePermission(permissions.ROLE_MANAGE), controller.assignAdminRole);

module.exports = router;
