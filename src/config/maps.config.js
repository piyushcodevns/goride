const mapsConfig = {
  provider: "openrouteservice",

  baseUrl:
    process.env.OPENROUTESERVICE_BASE_URL ||
    "https://api.openrouteservice.org",

  apiKey: process.env.OPENROUTESERVICE_API_KEY,

  timeout: Number(process.env.MAPS_REQUEST_TIMEOUT_MS || 10000),

  maxRetries: Number(process.env.MAPS_MAX_RETRIES || 2),

  cacheTTL: Number(process.env.MAPS_CACHE_TTL || 300),

  rateLimitBuffer: Number(process.env.MAPS_RATE_LIMIT_BUFFER || 5),
};

module.exports = mapsConfig;