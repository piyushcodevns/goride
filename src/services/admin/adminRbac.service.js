const prisma = require("../../config/prisma");
const ADMIN_ROLES = require("../../constants/adminRoles");
const ADMIN_PERMISSIONS = require("../../constants/adminPermissions");
const ADMIN_ROLE_PERMISSIONS = require("../../constants/adminRolePermissions");
const { createAuditLog } = require("../../repositories/admin/adminAuth.repository");
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../utils/AppError");

const roleValues = Object.values(ADMIN_ROLES);
const permissionValues = Object.values(ADMIN_PERMISSIONS);

const getPermissionsForRole = async (role) => {
  const permissions = ADMIN_ROLE_PERMISSIONS[role];
  if (!permissions) return [];
  const stored = await prisma.adminRolePermission.findMany({
    where: { role },
    select: { permission: true },
  });
  return stored.length
    ? stored.map((entry) => entry.permission)
    : [...new Set(permissions)];
};

const listRoles = async () =>
  Promise.all(roleValues.map(async (name) => ({
    name,
    system: true,
    permissions: await getPermissionsForRole(name),
  })));

const getRole = async (name) => {
  if (!roleValues.includes(name)) throw new NotFoundError("Role not found.");
  return (await listRoles()).find((role) => role.name === name);
};

const listPermissions = () =>
  permissionValues.map((key) => ({ key })).sort((a, b) => a.key.localeCompare(b.key));

const replaceRolePermissions = async ({ actor, role, permissions, ipAddress, userAgent }) => {
  if (role === ADMIN_ROLES.SUPER_ADMIN) {
    throw new ForbiddenError("SUPER_ADMIN permissions cannot be reduced.");
  }
  if (!roleValues.includes(role)) throw new NotFoundError("Role not found.");
  const unique = [...new Set(permissions)];
  if (!unique.length) throw new BadRequestError("At least one permission is required.");
  if (unique.some((permission) => !permissionValues.includes(permission))) {
    throw new BadRequestError("Unknown permission.");
  }
  const actorPermissions = new Set(await getPermissionsForRole(actor.role));
  if (![...unique].every((permission) => actorPermissions.has(permission))) {
    throw new ForbiddenError("You cannot grant a permission you do not hold.");
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.adminRolePermission.deleteMany({ where: { role } });
    if (unique.length) {
      await tx.adminRolePermission.createMany({
        data: unique.map((permission) => ({ role, permission })),
      });
    }
    return unique;
  });
  await createAuditLog({
    adminId: actor.id,
    action: "UPDATE",
    entity: "ADMIN",
    entityId: role,
    metadata: { operation: "ROLE_PERMISSIONS_REPLACED", permissions: unique },
    ipAddress,
    userAgent,
  });
  return { role, permissions: updated };
};

const assignAdminRole = async ({ actor, adminId, role, ipAddress, userAgent }) => {
  if (!roleValues.includes(role)) throw new BadRequestError("Invalid admin role.");
  if (actor.id === adminId && actor.role !== role) {
    throw new ForbiddenError("Administrators cannot change their own role.");
  }
  const target = await prisma.user.findFirst({
    where: { id: adminId, role: { in: roleValues } },
    select: { id: true, role: true, isActive: true },
  });
  if (!target) throw new NotFoundError("Admin account not found.");
  if (target.role === ADMIN_ROLES.SUPER_ADMIN && role !== ADMIN_ROLES.SUPER_ADMIN) {
    const count = await prisma.user.count({
      where: { role: ADMIN_ROLES.SUPER_ADMIN, isActive: true },
    });
    if (count <= 1) throw new ConflictError("The final active SUPER_ADMIN cannot be demoted.");
  }
  if (role === ADMIN_ROLES.SUPER_ADMIN && actor.role !== ADMIN_ROLES.SUPER_ADMIN) {
    throw new ForbiddenError("Only SUPER_ADMIN can grant SUPER_ADMIN.");
  }
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.user.findFirst({
      where: { id: adminId, role: { in: roleValues } },
      select: { role: true },
    });
    if (!current) throw new NotFoundError("Admin account not found.");
    if (current.role === ADMIN_ROLES.SUPER_ADMIN && role !== ADMIN_ROLES.SUPER_ADMIN) {
      const count = await tx.user.count({
        where: { role: ADMIN_ROLES.SUPER_ADMIN, isActive: true },
      });
      if (count <= 1) throw new ConflictError("The final active SUPER_ADMIN cannot be demoted.");
    }
    return tx.user.update({
      where: { id: adminId },
      data: { role },
      select: { id: true, fullName: true, email: true, role: true },
    });
  });
  await createAuditLog({
    adminId: actor.id,
    action: "ASSIGN",
    entity: "ADMIN",
    entityId: adminId,
    metadata: { operation: "ROLE_CHANGE", role },
    ipAddress,
    userAgent,
  });
  return updated;
};

const createRole = async () => {
  throw new BadRequestError("Roles are defined by the UserRole enum and cannot be created dynamically.");
};

const deleteRole = async ({ role }) => {
  if (!roleValues.includes(role)) throw new NotFoundError("Role not found.");
  throw new ForbiddenError("System roles cannot be deleted.");
};

module.exports = {
  getPermissionsForRole,
  listRoles,
  getRole,
  listPermissions,
  replaceRolePermissions,
  assignAdminRole,
  createRole,
  deleteRole,
};
