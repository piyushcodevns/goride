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

const jwtVerificationOptions = () => {
  const options = {
    algorithms: ["HS256"],
  };
  if (process.env.JWT_ISSUER) {
    options.issuer = process.env.JWT_ISSUER;
  }
  if (process.env.JWT_AUDIENCE) {
    options.audience = process.env.JWT_AUDIENCE;
  }
  return options;
};

const generateToken = (user) => {
  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    algorithm: "HS256",
  };
  if (process.env.JWT_ISSUER) {
    options.issuer = process.env.JWT_ISSUER;
  }
  if (process.env.JWT_AUDIENCE) {
    options.audience = process.env.JWT_AUDIENCE;
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: user.sessionId,
      tokenType: user.tokenType || "access",
    },
    getJwtSecret(),
    options,
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret(), jwtVerificationOptions());
};

module.exports = {
  generateToken,
  verifyToken,
};
