const { verifyToken } = require("../../utils/jwt");
const prisma = require("../../config/prisma");

const { UnauthorizedError, ForbiddenError } = require("../../utils/AppError");

const {
  findActiveAdminSessionById,
} = require("../../repositories/admin/adminAuth.repository");

const ADMIN_ROLES = require("../../constants/adminRoles");

const adminAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError("Authorization header is required.");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Invalid authorization format.");
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new UnauthorizedError("Access token is required.");
    }

    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (error) {
      throw new UnauthorizedError("Invalid or expired access token.");
    }

    if (!decoded?.id || !decoded?.sessionId) {
      throw new UnauthorizedError("Invalid access token payload.");
    }

    const session = await findActiveAdminSessionById(decoded.sessionId);

    if (!session) {
      throw new UnauthorizedError(
        "Admin session is invalid, expired, or revoked.",
      );
    }

    if (session.userId !== decoded.id) {
      throw new UnauthorizedError("Invalid admin session.");
    }
    
    const admin = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        emailVerified: true,
        accountLockedUntil: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedError("Admin account not found.");
    }

    if (!Object.values(ADMIN_ROLES).includes(admin.role)) {
      throw new ForbiddenError("Admin access is required.");
    }

    if (!admin.isActive) {
      throw new ForbiddenError("Admin account is inactive.");
    }

    if (
      admin.accountLockedUntil &&
      new Date(admin.accountLockedUntil) > new Date()
    ) {
      throw new ForbiddenError("Admin account is temporarily locked.");
    }

    req.admin = admin;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = adminAuthMiddleware;
