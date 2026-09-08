const jwt = require("jsonwebtoken");

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || !secret.trim()) {
   throw new Error(
     "JWT_SECRET is not configured. Set JWT_SECRET before starting the GoRide API.",
   );
  }

  return secret;
};

const jwtVerificationOptions = () => ({
  algorithms: ["HS256"],
  issuer: process.env.JWT_ISSUER || undefined,
  audience: process.env.JWT_AUDIENCE || undefined,
});

const generateToken = (user) => {
  return jwt.sign(
   {
     id: user.id,
     email: user.email,
     role: user.role,
     sessionId: user.sessionId,
     tokenType: user.tokenType || "access",
   },
   getJwtSecret(),
   {
     expiresIn: process.env.JWT_EXPIRES_IN || "7d",
     algorithm: "HS256",
     issuer: process.env.JWT_ISSUER || undefined,
     audience: process.env.JWT_AUDIENCE || undefined,
   },
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret(), jwtVerificationOptions());
};

module.exports = {
  generateToken,
  verifyToken,
};
