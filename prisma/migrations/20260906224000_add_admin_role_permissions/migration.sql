CREATE TABLE "AdminRolePermission" (
    "role" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminRolePermission_pkey" PRIMARY KEY ("role", "permission")
);

CREATE INDEX "AdminRolePermission_role_idx" ON "AdminRolePermission"("role");
CREATE INDEX "AdminRolePermission_permission_idx" ON "AdminRolePermission"("permission");
