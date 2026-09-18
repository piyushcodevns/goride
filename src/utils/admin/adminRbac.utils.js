const ADMIN_PERMISSIONS = require("../../constants/adminPermissions");

const ALL_PERMISSIONS = new Set(Object.values(ADMIN_PERMISSIONS));

const isValidPermission = (permission) => {
  return ALL_PERMISSIONS.has(permission);
};

const validatePermission = (permission) => {
  if (!isValidPermission(permission)) {
    throw new Error(`Invalid admin permission: ${permission}`);
  }

  return true;
};

module.exports = {
  isValidPermission,
  validatePermission,
};