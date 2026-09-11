/**
 * GoRide Gemini AI Configuration
 * Manages environment variables and parameters for Google Gemini integration.
 * Secrets are strictly backend-only and never exposed to clients or logged.
 */

const GEMINI_CONFIG = {
  apiKey: process.env.GEMINI_API_KEY || "",
  model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 15000,
  maxOutputTokens: Number(process.env.GEMINI_MAX_TOKENS) || 1024,
  temperature: Number(process.env.GEMINI_TEMPERATURE) || 0.7,
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
};

module.exports = GEMINI_CONFIG;
