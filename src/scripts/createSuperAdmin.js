const bcrypt = require("bcrypt");

const prisma = require("../config/prisma");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

const createSuperAdmin = async () => {
  const fullName = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const phone = process.env.SUPER_ADMIN_PHONE;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!fullName || !email || !phone || !password) {
    throw new Error(
      "SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PHONE and SUPER_ADMIN_PASSWORD are required.",
    );
  }

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
  });

  if (existingAdmin) {
    throw new Error(
      "An account with this email or phone number already exists.",
    );
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
      isVerified: true,
      emailVerified: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
    },
  });

  console.log("SUPER_ADMIN created successfully.");
  console.log({
    id: admin.id,
    fullName: admin.fullName,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
  });
};

createSuperAdmin()
  .catch((error) => {
    console.error("Failed to create SUPER_ADMIN.");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
