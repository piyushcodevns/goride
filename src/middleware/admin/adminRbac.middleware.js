const { ForbiddenError } = require("../../utils/AppError");
const ADMIN_ROLES = require("../../constants/adminRoles");
const ADMIN_ROLE_PERMISSIONS = require("../../constants/adminRolePermissions");
const { validatePermission } = require("../../utils/admin/adminRbac.utils");

const requirePermission = (permission) => {
  validatePermission(permission);
  return (req, res, next) => {
    if (!req.admin) {
      return next(new ForbiddenError("Admin authentication required."));
    }

    if (!Object.values(ADMIN_ROLES).includes(req.admin.role)) {
      return next(new ForbiddenError("Admin access is required."));
    }

    const rolePermissions = ADMIN_ROLE_PERMISSIONS[req.admin.role] || [];

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
