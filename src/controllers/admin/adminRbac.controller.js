const service = require("../../services/admin/adminRbac.service");
const {
  roleParamSchema,
  rolePermissionsSchema,
  adminRoleSchema,
} = require("../../validators/admin/adminRbac.validator");

const listRoles = async (req, res, next) => {
  try { return res.json({ success: true, data: await service.listRoles() }); } catch (error) { return next(error); }
};
const getRole = async (req, res, next) => {
  try { const { role } = roleParamSchema.parse(req); return res.json({ success: true, data: await service.getRole(role) }); } catch (error) { return next(error); }
};
const listPermissions = async (req, res, next) => {
  try { return res.json({ success: true, data: service.listPermissions() }); } catch (error) { return next(error); }
};
const replaceRolePermissions = async (req, res, next) => {
  try {
    const input = rolePermissionsSchema.parse(req);
    const data = await service.replaceRolePermissions({
      actor: req.admin, role: input.params.role, permissions: input.body.permissions,
      ipAddress: req.ip, userAgent: req.get("user-agent"),
    });
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};
const assignAdminRole = async (req, res, next) => {
  try {
    const input = adminRoleSchema.parse(req);
    const data = await service.assignAdminRole({
      actor: req.admin, adminId: input.params.id, role: input.body.role,
      ipAddress: req.ip, userAgent: req.get("user-agent"),
    });
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};
const createRole = async (req, res, next) => {
  try { const data = await service.createRole(req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
const deleteRole = async (req, res, next) => {
  try { const { role } = roleParamSchema.parse(req); await service.deleteRole({ role }); return res.status(204).send(); } catch (error) { return next(error); }
};

module.exports = { listRoles, getRole, listPermissions, replaceRolePermissions, assignAdminRole, createRole, deleteRole };
