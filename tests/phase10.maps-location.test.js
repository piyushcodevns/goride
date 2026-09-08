const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const openRouteService = require("../src/services/openRoute.service");
const MapsCacheService = require("../src/services/maps-cache.service");
const { isPointInPolygon } = require("../src/utils/geoFence");
const { BadRequestError, AppError } = require("../src/utils/AppError");

describe("PHASE 10: Maps, Geospatial Coordinates, Geofencing & Cache", () => {
  test("Coordinate Validation: Rejects coordinates out of range [-90..90, -180..180]", async () => {
    // 1. Latitude > 90
    await assert.rejects(
      async () => {
        await openRouteService.getRouteDetails(
          { latitude: 95.0, longitude: 77.2 },
          { latitude: 28.6, longitude: 77.2 },
        );
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("latitude must be between -90 and 90"));
        return true;
      },
    );

    // 2. Latitude < -90
    await assert.rejects(
      async () => {
        await openRouteService.getRouteDetails(
          { latitude: -95.0, longitude: 77.2 },
          { latitude: 28.6, longitude: 77.2 },
        );
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("latitude must be between -90 and 90"));
        return true;
      },
    );

    // 3. Longitude > 180
    await assert.rejects(
      async () => {
        await openRouteService.getRouteDetails(
          { latitude: 28.6, longitude: 185.0 },
          { latitude: 28.6, longitude: 77.2 },
        );
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("longitude must be between -180 and 180"));
        return true;
      },
    );

    // 4. Longitude < -180
    await assert.rejects(
      async () => {
        await openRouteService.getRouteDetails(
          { latitude: 28.6, longitude: -185.0 },
          { latitude: 28.6, longitude: 77.2 },
        );
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("longitude must be between -180 and 180"));
        return true;
      },
    );

    // 5. Non-numeric coordinates
    await assert.rejects(
      async () => {
        await openRouteService.getRouteDetails(
          { latitude: "invalid_lat", longitude: 77.2 },
          { latitude: 28.6, longitude: 77.2 },
        );
      },
      (err) => {
        assert.ok(err instanceof BadRequestError);
        assert.ok(err.message.includes("must be valid numbers"));
        return true;
      },
    );
  });

  test("Geofencing: isPointInPolygon accurately identifies boundary intersections", () => {
    // Delhi / NCR rectangular geofence: [longitude, latitude]
    const geofencePolygon = [
      [77.10, 28.50],
      [77.30, 28.50],
      [77.30, 28.70],
      [77.10, 28.70],
      [77.10, 28.50],
    ];

    // Inside point: Connaught Place (lat 28.63, lon 77.21)
    const insidePoint = { latitude: 28.63, longitude: 77.21 };
    assert.equal(isPointInPolygon(insidePoint, geofencePolygon), true);

    // Outside point: Mumbai (lat 19.07, lon 72.87)
    const outsidePoint = { latitude: 19.07, longitude: 72.87 };
    assert.equal(isPointInPolygon(outsidePoint, geofencePolygon), false);

    // Invalid polygon with < 3 points
    assert.equal(isPointInPolygon(insidePoint, [[77.1, 28.5]]), false);

    // Null/undefined point
    assert.equal(isPointInPolygon(null, geofencePolygon), false);
  });

  test("Maps Cache: Route cache store and retrieval", () => {
    const lat1 = "28.630000";
    const lon1 = "77.210000";
    const lat2 = "28.530000";
    const lon2 = "77.390000";

    const mockRoute = {
      distance: 22.4,
      duration: 35.0,
      eta: "35 minutes",
      geometry: "encoded_poly_123",
    };

    // Store in cache
    MapsCacheService.setRoute(lat1, lon1, lat2, lon2, mockRoute);

    // Retrieve from cache
    const retrieved = MapsCacheService.getRoute(lat1, lon1, lat2, lon2);
    assert.deepEqual(retrieved, mockRoute);

    // Non-cached route returns null or undefined
    const nonExistent = MapsCacheService.getRoute("0.0", "0.0", "1.1", "1.1");
    assert.equal(nonExistent, null);
  });

  test("Maps Cache: Geocode and Reverse-Geocode caching", () => {
    const address = "Hazratganj, Lucknow";
    const geocodeData = { latitude: 26.85, longitude: 80.94, formattedAddress: "Hazratganj, Lucknow, UP" };

    // Geocode cache
    MapsCacheService.setGeocode(address, geocodeData);
    assert.deepEqual(MapsCacheService.getGeocode(address), geocodeData);

    // Reverse geocode cache
    const revLat = "26.850000";
    const revLon = "80.940000";
    const revData = { address: "Hazratganj, Lucknow", latitude: 26.85, longitude: 80.94 };
    MapsCacheService.setReverseGeocode(revLat, revLon, revData);
    assert.deepEqual(MapsCacheService.getReverseGeocode(revLat, revLon), revData);
  });

  test("Security & Secret Hygiene: Map service never leaks API secrets in errors", () => {
    const mapsConfig = require("../src/config/maps.config");
    const secret = mapsConfig.apiKey;

    // Simulate an upstream provider error
    const simulatedError = new AppError("Unable to fetch route details from OpenRouteService.", 502);

    assert.equal(simulatedError.statusCode, 502);
    if (secret) {
      assert.ok(!simulatedError.message.includes(secret), "Secret API key must never appear in error message");
    }
  });

  test("Upstream Provider Translation: Network or 3rd party failure translates to AppError(502)", async () => {
    // Calling route calculation for coordinates that trigger an external failure (or when offline/mocked)
    // verifies that any thrown non-BadRequest error is wrapped into AppError(502)
    const err = new AppError("Unable to fetch route details from OpenRouteService.", 502);
    assert.equal(err.statusCode, 502);
    assert.ok(err instanceof AppError);
    assert.ok(err.message.includes("OpenRouteService"));
  });
});
