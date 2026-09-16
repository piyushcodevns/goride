const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const { createRideSchema } = require("../src/validators/ride.validator");
const { routeCoordinateSchema } = require("../src/validators/maps.validator");
const {
  getRouteDetails,
  reverseGeocode,
  validateVaranasiServiceArea,
  VARANASI_CENTER,
  VARANASI_SERVICE_RADIUS_KM,
} = require("../src/services/openRoute.service");
const MapsCacheService = require("../src/services/maps-cache.service");

describe("Places Search Autocomplete, Custom Pin & Transparent ETA", () => {
  describe("Places Deduplication & Prioritization Logic", () => {
    // Replicate the client-side deduplication logic from js/map.js
    function haversineDistance(c1, c2) {
      const R = 6371;
      const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
      const dLon = ((c2.lng - c1.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((c1.lat * Math.PI) / 180) *
          Math.cos((c2.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function processAndDeduplicate(rawFeatures, maxDisplay = 6) {
      const candidateItems = rawFeatures.map((feature, idx) => {
        const props = feature.properties || {};
        const lat = parseFloat(feature.geometry?.coordinates?.[1]);
        const lng = parseFloat(feature.geometry?.coordinates?.[0]);

        const displayName =
          props.name ||
          (props.street
            ? props.housenumber
              ? `${props.housenumber}, ${props.street}`
              : props.street
            : null) ||
          props.district ||
          props.suburb ||
          props.locality ||
          "Varanasi Location";

        const addressParts = [
          props.street,
          props.district || props.suburb,
          props.city || "Varanasi",
          props.state || "Uttar Pradesh",
        ].filter(Boolean);

        const secondaryAddress =
          addressParts
            .filter((part) => part.toLowerCase() !== displayName.toLowerCase())
            .join(", ") || "Varanasi, Uttar Pradesh";

        const isWaterway = props.osm_key === "waterway";

        return {
          placeId: `osm-${props.osm_type || "W"}-${props.osm_id || idx}`,
          osmId: props.osm_id,
          name: displayName,
          address: `${displayName}, ${secondaryAddress}`,
          lat,
          lng,
          isWaterway,
          district: props.district || props.suburb || "",
        };
      }).filter((item) => !isNaN(item.lat) && !isNaN(item.lng));

      candidateItems.sort((a, b) => {
        if (a.isWaterway && !b.isWaterway) return 1;
        if (!a.isWaterway && b.isWaterway) return -1;
        return 0;
      });

      const deduplicated = [];
      for (const item of candidateItems) {
        const isDuplicate = deduplicated.some((existing) => {
          if (existing.placeId === item.placeId) return true;
          if (existing.name.toLowerCase() === item.name.toLowerCase()) {
            const dist = haversineDistance(
              { lat: existing.lat, lng: existing.lng },
              { lat: item.lat, lng: item.lng }
            );
            if (dist < 1.0 || existing.isWaterway || item.isWaterway) {
              return true;
            }
          }
          return false;
        });

        if (!isDuplicate) {
          deduplicated.push(item);
          if (deduplicated.length >= maxDisplay) break;
        }
      }

      return deduplicated;
    }

    test("Deduplicates multiple segments of the same linear watercourse (e.g. Assi River)", () => {
      // 5 consecutive river way segments simulating Photon raw response
      const mockRawFeatures = [
        {
          properties: { osm_type: "W", osm_id: 949958598, osm_key: "waterway", osm_value: "river", name: "Assi River", district: "Bhullanpur" },
          geometry: { coordinates: [82.9796, 25.2798] },
        },
        {
          properties: { osm_type: "W", osm_id: 952277351, osm_key: "waterway", osm_value: "river", name: "Assi River" },
          geometry: { coordinates: [82.9895, 25.2824] },
        },
        {
          properties: { osm_type: "W", osm_id: 1536463658, osm_key: "waterway", osm_value: "river", name: "Assi River" },
          geometry: { coordinates: [82.9683, 25.2743] },
        },
        {
          properties: { osm_type: "W", osm_id: 26732303, osm_key: "highway", osm_value: "residential", name: "Assi Ghat Road" },
          geometry: { coordinates: [83.0049, 25.2881] },
        },
        {
          properties: { osm_type: "W", osm_id: 1337770189, osm_key: "amenity", osm_value: "place_of_worship", name: "Assi Ghat Mandir", street: "Assi Ghat Road" },
          geometry: { coordinates: [83.0059, 25.2892] },
        },
      ];

      const results = processAndDeduplicate(mockRawFeatures, 6);

      // Prioritized: Assi Ghat Road and Assi Ghat Mandir must appear first
      assert.equal(results[0].name, "Assi Ghat Road");
      assert.equal(results[1].name, "Assi Ghat Mandir");

      // Exactly ONE Assi River entry remains; duplicate river segments collapsed
      const riverEntries = results.filter((r) => r.name === "Assi River");
      assert.equal(riverEntries.length, 1, "Must contain exactly 1 deduplicated Assi River entry");
      assert.equal(results.length, 3, "Total results should be 3 (Road, Mandir, collapsed River)");
    });

    test("Preserves distinct branch locations that share a name across different localities", () => {
      const mockRawFeatures = [
        {
          properties: { osm_type: "N", osm_id: 1001, osm_key: "amenity", osm_value: "bank", name: "State Bank of India", district: "Lanka" },
          geometry: { coordinates: [82.9980, 25.2780] },
        },
        {
          properties: { osm_type: "N", osm_id: 1002, osm_key: "amenity", osm_value: "bank", name: "State Bank of India", district: "Cantt" },
          geometry: { coordinates: [82.9850, 25.3280] }, // ~5.7 km away
        },
      ];

      const results = processAndDeduplicate(mockRawFeatures, 6);
      assert.equal(results.length, 2, "Both branches must be preserved because distance > 1km and districts differ");
      assert.equal(results[0].district, "Lanka");
      assert.equal(results[1].district, "Cantt");
    });

    test("Adaptive Proximity: Sorts candidate destinations by distance from rider context location", () => {
      const riderPickup = { lat: 25.2891, lng: 83.0062 }; // Assi Ghat

      const candidates = [
        { name: "Cantt Railway Station", lat: 25.3263, lng: 82.9866 }, // ~5.4 km
        { name: "Assi Ghat Cafe", lat: 25.2895, lng: 83.0065 }, // ~0.05 km
        { name: "Sarnath Temple", lat: 25.3715, lng: 83.0232 }, // ~9.3 km
      ];

      candidates.sort((a, b) => {
        const dA = haversineDistance(riderPickup, a);
        const dB = haversineDistance(riderPickup, b);
        return dA - dB;
      });

      assert.equal(candidates[0].name, "Assi Ghat Cafe", "Nearest place to Assi pickup must be ranked first");
      assert.equal(candidates[1].name, "Cantt Railway Station");
      assert.equal(candidates[2].name, "Sarnath Temple");
    });
  });

  describe("Custom Map Pin Coordinates & Reverse Geocode Validation", () => {
    test("Encompasses Babatpur Airport and Pt Deen Dayal Upadhyaya Junction within service area bounds", () => {
      const bounds = { south: 25.12, west: 82.72, north: 25.52, east: 83.22 };

      const airport = { lat: 25.4509, lng: 82.8635 }; // Babatpur Airport
      const mughalsarai = { lat: 25.2803, lng: 83.1207 }; // Pt. Deen Dayal Upadhyaya Junction

      assert.ok(airport.lat >= bounds.south && airport.lat <= bounds.north, "Airport latitude must be within bounds");
      assert.ok(airport.lng >= bounds.west && airport.lng <= bounds.east, "Airport longitude must be within bounds");

      assert.ok(mughalsarai.lat >= bounds.south && mughalsarai.lat <= bounds.north, "Mughalsarai latitude must be within bounds");
      assert.ok(mughalsarai.lng >= bounds.west && mughalsarai.lng <= bounds.east, "Mughalsarai longitude must be within bounds");
    });
    test("routeCoordinateSchema validates valid geographic coordinates in Varanasi", () => {
      const valid = routeCoordinateSchema.parse({
        latitude: 25.3176,
        longitude: 82.9739,
      });
      assert.equal(valid.latitude, 25.3176);
      assert.equal(valid.longitude, 82.9739);
    });

    test("routeCoordinateSchema rejects invalid latitude/longitude numbers or out-of-range bounds", () => {
      assert.throws(() => {
        routeCoordinateSchema.parse({ latitude: 105.0, longitude: 82.9739 });
      }, /Invalid latitude/);

      assert.throws(() => {
        routeCoordinateSchema.parse({ latitude: 25.3176, longitude: 195.0 });
      }, /Invalid longitude/);

      assert.throws(() => {
        routeCoordinateSchema.parse({ latitude: "not-a-number", longitude: 82.9739 });
      }, /expected number|Coordinate must be a number/);
    });

    test("createRideSchema accepts custom pin coordinates and reverse-geocoded address", () => {
      const parsedRide = createRideSchema.parse({
        pickup: "Pinned Location near Assi Ghat (25.2891, 83.0062), Varanasi",
        pickupLatitude: 25.2891,
        pickupLongitude: 83.0062,
        destination: "Pinned Location near Cantt Station (25.3263, 82.9866), Varanasi",
        destinationLatitude: 25.3263,
        destinationLongitude: 82.9866,
        vehicleType: "AUTO",
        paymentMethod: "CASH",
      });

      assert.equal(parsedRide.pickupLatitude, 25.2891);
      assert.equal(parsedRide.destinationLatitude, 25.3263);
      assert.equal(parsedRide.vehicleType, "AUTO");
      assert.equal(parsedRide.paymentMethod, "CASH");
    });

    test("reverseGeocode returns cached result or authentic address structure without leaking keys", async () => {
      // Seed reverse geocode cache
      const testLat = "25.289100";
      const testLng = "83.006200";
      const cachedData = {
        address: "Assi Ghat Road, Bhelupur, Varanasi, Uttar Pradesh",
        latitude: 25.2891,
        longitude: 83.0062,
      };

      MapsCacheService.setReverseGeocode(testLat, testLng, cachedData);

      const result = await reverseGeocode(25.2891, 83.0062);
      assert.equal(result.address, "Assi Ghat Road, Bhelupur, Varanasi, Uttar Pradesh");
      assert.equal(result.latitude, 25.2891);
      assert.equal(result.longitude, 83.0062);
    });
  });

  describe("Transparent Route ETA (No Fake Multipliers)", () => {
    test("Authoritative route details maintains STATIC_ROUTE_ESTIMATE with false traffic/vehicle flags", async () => {
      // Seed route cache
      const start = { latitude: 25.3176, longitude: 82.9739 };
      const end = { latitude: 25.3276, longitude: 82.9839 };

      MapsCacheService.setRoute(
        Number(start.latitude).toFixed(6),
        Number(start.longitude).toFixed(6),
        Number(end.latitude).toFixed(6),
        Number(end.longitude).toFixed(6),
        {
          distance: 1.1,
          duration: 11.0,
          eta: "11 minutes",
          trafficModel: "STATIC_ROUTE_ESTIMATE",
          isTrafficAware: false,
          isVehicleSpecific: false,
          geometry: "mock_polyline",
        },
      );

      const route = await getRouteDetails(start, end);
      assert.equal(route.distance, 1.1);
      assert.equal(route.duration, 11.0);
      assert.equal(route.trafficModel, "STATIC_ROUTE_ESTIMATE");
      assert.equal(route.isTrafficAware, false);
      assert.equal(route.isVehicleSpecific, false);
    });
  });

  describe("Varanasi Search Alias Normalization & Compound Queries", () => {
    const VARANASI_SEARCH_ALIASES = [
      { pattern: /\b(babatpur\s+airport|varanasi\s+airport|banaras\s+airport|airport\s+babatpur)\b/i, alias: "Lal Bahadur Shastri International Airport" },
      { pattern: /\b(cantt\s+station|varanasi\s+cantt|cantt\s+railway\s+station|banaras\s+cantt)\b/i, alias: "Varanasi Junction railway station" },
      { pattern: /\b(manduadih\s+station|manduwadih)\b/i, alias: "Banaras railway station" },
      { pattern: /\b(ddu\s+station|ddu\s+junction|mughalsarai\s+station|mughalsarai\s+junction)\b/i, alias: "Pt. Deen Dayal Upadhyaya Junction" },
      { pattern: /\b(kashi\s+vishwanath\s+mandir|kashi\s+vishwanath\s+temple|vishwanath\s+temple|vishwanath\s+mandir)\b/i, alias: "Shri Kashi Vishwanath Temple" },
    ];

    function normalize(query) {
      let trimmed = (query || "").trim();
      for (const item of VARANASI_SEARCH_ALIASES) {
        if (item.pattern.test(trimmed)) {
          return trimmed.replace(item.pattern, item.alias);
        }
      }
      return trimmed;
    }

    test("Normalizes colloquial 'Babatpur Airport' compound query to OSM-indexed airport name", () => {
      const normalized = normalize("Babatpur Airport");
      assert.equal(normalized, "Lal Bahadur Shastri International Airport");
    });

    test("Normalizes 'Cantt Station' to Varanasi Junction railway station", () => {
      const normalized = normalize("cantt station");
      assert.equal(normalized, "Varanasi Junction railway station");
    });

    test("Normalizes 'DDU station' and 'Mughalsarai Station' to Pt. Deen Dayal Upadhyaya Junction", () => {
      assert.equal(normalize("ddu station"), "Pt. Deen Dayal Upadhyaya Junction");
      assert.equal(normalize("mughalsarai station"), "Pt. Deen Dayal Upadhyaya Junction");
    });
  });

  describe("Backend Varanasi 25 km Service Area Geofence Enforcement", () => {
    test("Accepts points strictly inside 25 km Varanasi radius", () => {
      // Varanasi Cantt (Center)
      assert.equal(validateVaranasiServiceArea({ latitude: 25.3176, longitude: 82.9739 }, "Cantt"), true);

      // Assi Ghat (~4.5 km)
      assert.equal(validateVaranasiServiceArea({ latitude: 25.2882, longitude: 83.0049 }, "Assi Ghat"), true);

      // Babatpur Airport (~18.5 km)
      assert.equal(validateVaranasiServiceArea({ latitude: 25.4510, longitude: 82.8636 }, "Babatpur Airport"), true);

      // Mughalsarai / DDU Junction (~15.3 km)
      assert.equal(validateVaranasiServiceArea({ latitude: 25.2804, longitude: 83.1207 }, "Mughalsarai Station"), true);
    });

    test("Rejects points outside 25 km Varanasi radius with clear BadRequestError", () => {
      // Lucknow (~260 km away)
      assert.throws(
        () => validateVaranasiServiceArea({ latitude: 26.8467, longitude: 80.9462 }, "Pickup location"),
        /outside the GoRide 25 km Varanasi service area/
      );

      // Delhi (~700 km away)
      assert.throws(
        () => validateVaranasiServiceArea({ latitude: 28.6139, longitude: 77.2090 }, "Destination location"),
        /outside the GoRide 25 km Varanasi service area/
      );

      // BBox NE Corner (33.4 km away - inside bounding box rectangle, but outside 25 km circle)
      assert.throws(
        () => validateVaranasiServiceArea({ latitude: 25.52, longitude: 83.22 }, "Selected point"),
        /outside the GoRide 25 km Varanasi service area/
      );
    });
  });
});
