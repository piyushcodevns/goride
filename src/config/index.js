/**
 * GoRide Centralized Configuration Index
 * Exports validated, immutable configuration and existing subsystem configs.
 */

const { config, validateConfig, getPublicConfigSummary } = require("./env");
const prisma = require("./prisma");
const { redisConnection, isQueueEnabled, connectRedisIfNeeded, closeRedisConnection } = require("./redis");
const mapsConfig = require("./maps.config");
const cloudinary = require("./cloudinary");
const mailTransporter = require("./mail");
const backupConfig = require("./backup.config");
const fareConfig = require("./fare.config");

module.exports = {
  config,
  validateConfig,
  getPublicConfigSummary,
  prisma,
  redisConnection,
  isQueueEnabled,
  connectRedisIfNeeded,
  closeRedisConnection,
  mapsConfig,
  cloudinary,
  mailTransporter,
  backupConfig,
  fareConfig,
};
