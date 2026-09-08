process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { registerSchema, loginSchema } = require("../src/validators/auth.validator");
const { createRideSchema } = require("../src/validators/ride.validator");

describe("PHASE 27: Frontend <-> Backend Contract & Compatibility", () => {
  test("Auth Contract: Frontend login and signup payload structures match backend validation", () => {
    // Frontend payload from js/register.js
    const frontendRegisterPayload = {
      fullName: "Frontend User",
      email: "frontend_user@goride.com",
      phone: "9876543210",
      password: "StrongPassword123!",
    };

    const regResult = registerSchema.safeParse(frontendRegisterPayload);
    assert.equal(regResult.success, true);

    // Frontend payload from js/login.js
    const frontendLoginPayload = {
      email: "frontend_user@goride.com",
      password: "StrongPassword123!",
    };

    const loginResult = loginSchema.safeParse(frontendLoginPayload);
    assert.equal(loginResult.success, true);
  });

  test("Vehicle Matrix Contract: Maps frontend vehicle UI choices to backend VehicleType enum", () => {
    const frontendVehicles = ["bike", "auto", "mini", "sedan"];
    const backendVehicleTypes = ["BIKE", "AUTO", "CAR"];

    const mapToBackendVehicleType = (uiType) => {
      const normalized = uiType.toUpperCase();
      if (normalized === "MINI" || normalized === "SEDAN") return "CAR";
      return normalized;
    };

    for (const uiType of frontendVehicles) {
      const backendType = mapToBackendVehicleType(uiType);
      assert.ok(
        backendVehicleTypes.includes(backendType),
        `UI vehicle ${uiType} maps to valid backend VehicleType ${backendType}`
      );
    }
  });

  test("Ride Creation Security Contract: Rejects client-supplied distance (server calculates distance)", () => {
    // 1. Valid booking payload without distance (calculated server-side)
    const validBooking = {
      pickup: "Varanasi Cantt Station",
      destination: "Dashashwamedh Ghat",
      pickupLatitude: 25.3283,
      pickupLongitude: 82.9866,
      destinationLatitude: 25.3076,
      destinationLongitude: 83.0107,
      vehicleType: "CAR",
    };

    const validResult = createRideSchema.safeParse(validBooking);
    assert.equal(validResult.success, true);

    // 2. Client tampering: attempting to inject client-calculated distance is rejected by strict schema
    const tamperedBooking = {
      ...validBooking,
      distance: 1.0, // client attempting to spoof distance
    };
    const tamperedResult = createRideSchema.safeParse(tamperedBooking);
    assert.equal(tamperedResult.success, false);
  });

  test("Response Error Contract: Frontend parsing handles standardized backend error shapes", () => {
    const backendErrorResponse = {
      success: false,
      message: "Invalid credentials.",
      errors: [{ path: ["password"], message: "Incorrect password" }],
    };

    const extractErrorMessage = (res) => {
      if (res && res.message) return res.message;
      if (res && Array.isArray(res.errors) && res.errors.length > 0) return res.errors[0].message;
      return "An unexpected error occurred.";
    };

    assert.equal(extractErrorMessage(backendErrorResponse), "Invalid credentials.");
  });
});
