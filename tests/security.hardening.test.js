const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { verifyToken } = require('../src/utils/jwt');
const { calculateFareSchema } = require('../src/validators/fare.validator');
const adminTotp = require('../src/utils/adminTotp');

const originalJwtSecret = process.env.JWT_SECRET;
const originalIssuer = process.env.JWT_ISSUER;
const originalAudience = process.env.JWT_AUDIENCE;
const originalTotpKey = process.env.ADMIN_2FA_ENCRYPTION_KEY;

test('verifyToken rejects tokens signed with a non-approved algorithm', () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_ISSUER = 'goride';
  process.env.JWT_AUDIENCE = 'goride-api';

  const unsignedToken = jwt.sign({ id: 'user-1', tokenType: 'access' }, 'test-jwt-secret', {
    algorithm: 'none',
    issuer: 'goride',
    audience: 'goride-api',
  });

  assert.throws(() => verifyToken(unsignedToken), /jwt signature is required|not allowed|algorithm/i);
});

test('fare validation rejects direct fare tampering fields', () => {
  assert.throws(() => {
    calculateFareSchema.parse({
      body: {
        city: 'DEFAULT',
        vehicleType: 'CAR',
        distanceKm: 42,
        durationMinutes: 30,
        pickupLatitude: 26.847,
        pickupLongitude: 80.95,
        destinationLatitude: 26.9,
        destinationLongitude: 80.99,
      },
    });
  }, /distanceKm|durationMinutes|strict/i);
});

test('admin TOTP encryption requires a dedicated encryption key', () => {
  delete process.env.ADMIN_2FA_ENCRYPTION_KEY;
  assert.throws(() => adminTotp.encryptSecret('test-secret'), /ADMIN_2FA_ENCRYPTION_KEY/i);
  process.env.ADMIN_2FA_ENCRYPTION_KEY = originalTotpKey || 'totp-test-key';
});

test.after(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalJwtSecret;
  if (originalIssuer === undefined) delete process.env.JWT_ISSUER; else process.env.JWT_ISSUER = originalIssuer;
  if (originalAudience === undefined) delete process.env.JWT_AUDIENCE; else process.env.JWT_AUDIENCE = originalAudience;
  if (originalTotpKey === undefined) delete process.env.ADMIN_2FA_ENCRYPTION_KEY; else process.env.ADMIN_2FA_ENCRYPTION_KEY = originalTotpKey;
});
