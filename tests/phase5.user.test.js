const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const userService = require("../src/services/user.service");
const adminUserService = require("../src/services/admin/adminUser.service");
const { NotFoundError, ConflictError, ForbiddenError, BadRequestError } = require("../src/utils/AppError");

describe("PHASE 5: User Management & Profile Lifecycle", () => {
  const uniqueId = Date.now();
  let testUser;
  let testAdmin;

  test("Setup test user and admin", async () => {
    testUser = await prisma.user.create({
      data: {
        fullName: "Phase5 User",
        email: `phase5_user_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        gender: "MALE",
        role: "USER",
        isActive: true,
      },
    });

    testAdmin = await prisma.user.create({
      data: {
        fullName: "Phase5 Admin",
        email: `phase5_admin_${uniqueId}@goride.internal`,
        phone: `7${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "ADMIN",
        isActive: true,
      },
    });

    assert.ok(testUser.id);
    assert.ok(testAdmin.id);
  });

  test("getProfile returns user profile without sensitive password", async () => {
    const profile = await userService.getProfile(testUser.id);
    assert.equal(profile.id, testUser.id);
    assert.equal(profile.email, testUser.email);
    assert.equal(profile.password, undefined, "Password hash must not be returned in profile");
  });

  test("getProfile throws NotFoundError for nonexistent user", async () => {
    await assert.rejects(
      async () => {
        await userService.getProfile("non_existent_cuid_9999");
      },
      (err) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.message, "User not found.");
        return true;
      },
    );
  });

  test("updateProfile sanitizes input and protects sensitive fields from tampering", async () => {
    const originalRole = testUser.role;
    const originalEmail = testUser.email;

    const updated = await userService.updateProfile(testUser.id, {
      fullName: "Updated Name",
      gender: "FEMALE",
      role: "ADMIN", // Tampering attempt
      email: "injected@evil.com", // Tampering attempt
      password: "newHackedPassword", // Tampering attempt
    });

    assert.equal(updated.fullName, "Updated Name");
    assert.equal(updated.gender, "FEMALE");

    // Verify in DB that role and email were not changed
    const freshUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert.equal(freshUser.role, originalRole, "Role must not be modifiable via updateProfile");
    assert.equal(freshUser.email, originalEmail, "Email must not be modifiable via updateProfile");
  });

  test("User Document: rejects invalid document type", async () => {
    await assert.rejects(
      async () => {
        await userService.uploadUserDocumentSelf(
          testUser.id,
          { documentType: "PASSPORT_INVALID" },
          { buffer: Buffer.from("dummy content"), mimetype: "image/jpeg", size: 1024 },
        );
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("Invalid document type"));
        return true;
      },
    );
  });

  test("User Document: enforces deletion ownership (non-owner forbidden)", async () => {
    const doc = await prisma.userDocument.create({
      data: {
        userId: testUser.id,
        documentType: "ID_PROOF",
        fileUrl: "https://storage.goride.internal/id_proof.jpg",
      },
    });

    const otherUserId = "other_random_user_id";
    await assert.rejects(
      async () => {
        await userService.deleteUserDocumentSelf(otherUserId, doc.id);
      },
      (err) => {
        assert.ok(err instanceof ForbiddenError);
        assert.equal(err.message, "You are not authorized to delete this document.");
        return true;
      },
    );

    // Clean up created test document
    await prisma.userDocument.delete({ where: { id: doc.id } });
  });

  test("Admin softDeleteUser marks user as deleted and prevents duplicate deletion", async () => {
    const deleted = await adminUserService.deleteUser({
      userId: testUser.id,
      adminId: testAdmin.id,
      ipAddress: "127.0.0.1",
      userAgent: "TestAgent",
    });

    assert.ok(deleted.deletedAt instanceof Date);
    assert.equal(deleted.isActive, false);

    // Duplicate deletion attempt must throw ConflictError
    await assert.rejects(
      async () => {
        await adminUserService.deleteUser({
          userId: testUser.id,
          adminId: testAdmin.id,
          ipAddress: "127.0.0.1",
          userAgent: "TestAgent",
        });
      },
      (err) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.message, "User is already deleted.");
        return true;
      },
    );

    // Soft-deleted user cannot upload document or update avatar
    await assert.rejects(
      async () => {
        await userService.uploadProfileImage(testUser.id, {
          originalname: "avatar.jpg",
          buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
          mimetype: "image/jpeg",
          size: 1024,
        });
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.equal(err.message, "User account is not active.");
        return true;
      },
    );
  });
});
