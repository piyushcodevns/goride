/**
 * CORS Configuration & Origin Validator
 * Strictly validates GoRide frontend domains, local development origins,
 * and environment-configured origins without wildcard *.
 */

const getEnvOrigins = () => {
  return (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((val) => val.trim())
    .filter(Boolean);
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://goride-frontend.vercel.app",
  "https://goride-frontend-piyushcodevns-projects.vercel.app",
  "https://goride-frontend-ieukthm4z-piyushcodevns-projects.vercel.app",
  "https://goride-frontend-8vm8gowne-piyushcodevns-projects.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

// Regex strictly matching Vercel preview and branch deployments for goride-frontend
const VERCEL_PROJECT_REGEX =
  /^https:\/\/goride-frontend(-[a-z0-9-]+)?(-piyushcodevns-projects)?\.vercel\.app$/i;

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  // 1. Explicitly configured origins via environment variable
  const envOrigins = getEnvOrigins();
  if (envOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard patterns in CORS_ALLOWED_ORIGINS (strictly rejecting overly broad wildcards like * or *.vercel.app)
  for (const pattern of envOrigins) {
    if (pattern.includes("*")) {
      const trimmed = pattern.trim();
      if (trimmed === "*" || /^https?:\/\/\*\.[a-z.]+$/i.test(trimmed)) {
        continue;
      }
      const regex = new RegExp(
        "^" + trimmed.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$",
        "i",
      );
      if (regex.test(origin)) {
        return true;
      }
    }
  }


  // 2. Default stable production & local development origins
  if (DEFAULT_ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  // 3. Safe dynamic pattern matching for Vercel preview & branch deployments of this project
  return VERCEL_PROJECT_REGEX.test(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  maxAge: 86400,
  optionsSuccessStatus: 204,
};

module.exports = {
  isAllowedOrigin,
  corsOptions,
  DEFAULT_ALLOWED_ORIGINS,
  VERCEL_PROJECT_REGEX,
};
