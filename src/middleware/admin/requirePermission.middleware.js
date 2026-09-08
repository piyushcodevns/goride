const { ForbiddenError } = require("../../utils/AppError");
const ADMIN_ROLES = require("../../constants/adminRoles");
const { getPermissionsForRole } = require("../../services/admin/adminRbac.service");
const { validatePermission } = require("../../utils/admin/adminRbac.utils");

const requirePermission = (permission) => {
  validatePermission(permission);

  return async function requirePermissionMiddleware(req, res, next) {
    if (!req.admin) {
      return next(new ForbiddenError("Admin authentication required."));
    }

    if (!Object.values(ADMIN_ROLES).includes(req.admin.role)) {
      return next(new ForbiddenError("Admin access is required."));
    }

    const rolePermissions = await getPermissionsForRole(req.admin.role);

    if (!rolePermissions.includes(permission)) {
      return next(
        new ForbiddenError(
          "You do not have permission to perform this action.",
        ),
      );
    }

    next();
  };
};

module.exports = {
  requirePermission,
};
