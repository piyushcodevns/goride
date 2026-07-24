const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { generateToken } = require("../utils/jwt");
const { registerSchema } = require("../validators/auth.validator");

const registerUser = async (userData) => {
  // Validate input
  const validatedData = registerSchema.parse(userData);

  // Check email
  const emailExists = await prisma.user.findUnique({
    where: { email: validatedData.email },
  });

  if (emailExists) {
    throw new Error("Email already registered.");
  }

  // Check phone
  const phoneExists = await prisma.user.findUnique({
    where: { phone: validatedData.phone },
  });

  if (phoneExists) {
    throw new Error("Phone number already registered.");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      fullName: validatedData.fullName,
      email: validatedData.email,
      phone: validatedData.phone,
      password: hashedPassword,
    },
  });

  // Generate JWT
  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
  };
};

module.exports = {
  registerUser,
};