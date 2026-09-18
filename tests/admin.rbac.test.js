const test = require("node:test");
const assert = require("node:assert/strict");

const permissions = require("../src/constants/adminPermissions");
const roles = require("../src/constants/adminRoles");
const matrix = require("../src/constants/adminRolePermissions");
const rbac = require("../src/services/admin/adminRbac.service");
const {
  rolePermissionsSchema,
  adminRoleSchema,
} = require("../src/validators/admin/adminRbac.validator");

test("RBAC registry contains all required roles and a complete SUPER_ADMIN matrix", () => {
  assert.deepEqual(Object.keys(matrix).sort(), Object.values(roles).sort());
  assert.equal(new Set(matrix.SUPER_ADMIN).size, Object.values(permissions).length);
  for (const permission of Object.values(permissions)) {
    assert.ok(matrix.SUPER_ADMIN.includes(permission));
  }
});

test("RBAC validators reject unknown roles, duplicate permissions, and extra fields", () => {
  assert.throws(
    () => rolePermissionsSchema.parse({
      params: { role: "UNKNOWN" },
      body: { permissions: ["user:view"] },
    }),
  );
  assert.throws(
    () => rolePermissionsSchema.parse({
      params: { role: "ADMIN" },
      body: { permissions: ["user:view", "user:view"] },
    }),
  );
  assert.throws(
    () => adminRoleSchema.parse({
      params: { id: "admin_1" },
      body: { role: "ADMIN", extra: true },
    }),
  );
});

test("RBAC service resolves the persisted-or-default SUPER_ADMIN permissions", async () => {
  const resolved = await rbac.getPermissionsForRole(roles.SUPER_ADMIN);
  assert.equal(new Set(resolved).size, Object.values(permissions).length);
});

test("RBAC service rejects dynamic roles and unknown roles", async () => {
  await assert.rejects(
    () => rbac.createRole({ name: "CUSTOM" }),
    /cannot be created dynamically/,
  );
  await assert.rejects(
    () => rbac.getRole("UNKNOWN"),
    /Role not found/,
  );
});
