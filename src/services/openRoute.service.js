const mapsConfig = require("../config/maps.config");
const logger = require("../utils/logger");
const httpRetry = require("../utils/httpRetry");
const MapsCacheService = require("./maps-cache.service");

const { BadRequestError, AppError } = require("../utils/AppError");

const axios = require("axios");

const mapsClient = axios.create({
  baseURL: `${mapsConfig.baseUrl}/v2/directions/driving-car`,
  timeout: mapsConfig.timeout,
  headers: {
    Authorization: mapsConfig.apiKey,
    "Content-Type": "application/json",
  },
});

/**
 * Validate Coordinates
 */
const validateCoordinates = (point, name) => {
  if (!point) {
    throw new BadRequestError(`${name} coordinates are required.`);
  }

  const { latitude, longitude } = point;

  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude === null ||
    longitude === null
  ) {
    throw new BadRequestError(`${name} latitude and longitude are required.`);
  }

  if (Number.isNaN(Number(latitude)) || Number.isNaN(Number(longitude))) {
    throw new BadRequestError(`${name} coordinates must be valid numbers.`);
  }

  if (latitude < -90 || latitude > 90) {
    throw new BadRequestError(`${name} latitude must be between -90 and 90.`);
  }

  if (longitude < -180 || longitude > 180) {
    throw new BadRequestError(
      `${name} longitude must be between -180 and 180.`,
    );
  }
};

/**
 * Calculate realistic, bounded vehicle duration based on physical vehicle dynamics
 * in urban environments without fabricating artificial congestion.
 *
 * Grounding:
 * - BIKE: maneuvers through city bottlenecks and narrow lanes (~35% faster in dense urban streets).
 * - AUTO: agile 3-wheeler profile in tight street turns (~20% faster than cars).
 * - CAR / SEDAN / MINI: baseline car duration from road network graph.
 * - SUV: wider turning radius in narrow streets (~5% slower).
 *
 * Bounds:
 * - Deterministic, bounded between minimum crawl (4 km/h) and urban vehicle speed caps (45 km/h for bike/car, 35 km/h for auto).
 * - Minimum duration: 1 minute.
 */
const calculateVehicleDuration = (baseDurationMinutes, vehicleType = "CAR", distanceKm = 0) => {
  const normType = String(vehicleType || "CAR").toUpperCase();
  const baseMinutes = Math.max(0.5, Number(baseDurationMinutes) || 1);

  let multiplier = 1.0;
  let maxSpeedKmh = 45;

  if (normType.includes("BIKE") || normType.includes("MOTO")) {
    multiplier = 0.65;
    maxSpeedKmh = 45;
  } else if (normType.includes("AUTO")) {
    multiplier = 0.80;
    maxSpeedKmh = 35;
  } else if (normType.includes("SUV")) {
    multiplier = 1.05;
    maxSpeedKmh = 45;
  } else {
    multiplier = 1.0;
    maxSpeedKmh = 45;
  }

  let duration = baseMinutes * multiplier;

  if (distanceKm && distanceKm > 0) {
    const minPossibleMinutes = (distanceKm / maxSpeedKmh) * 60;
    if (duration < minPossibleMinutes) {
      duration = minPossibleMinutes;
    }

    const maxPossibleMinutes = (distanceKm / 4) * 60;
    if (duration > maxPossibleMinutes) {
      duration = maxPossibleMinutes;
    }
  }

  return Number(Math.max(1, duration).toFixed(2));
};

/**
 * Get Route Details
 */
const getRouteDetails = async (start, end, vehicleType = "CAR") => {
  validateCoordinates(start, "Pickup");
  validateCoordinates(end, "Destination");

  const cachedRoute = MapsCacheService.getRoute(
    Number(start.latitude).toFixed(6),
    Number(start.longitude).toFixed(6),
    Number(end.latitude).toFixed(6),
    Number(end.longitude).toFixed(6),
  );

  if (cachedRoute) {
    logger.info("Route Cache HIT");
    const rawDuration = cachedRoute.baseDuration || cachedRoute.duration;
    const adjustedDuration = calculateVehicleDuration(rawDuration, vehicleType, cachedRoute.distance);
    return {
      ...cachedRoute,
      duration: adjustedDuration,
      eta: `${Math.ceil(adjustedDuration)} minutes`,
      vehicleType,
      trafficModel: "STATIC_ROUTE_ESTIMATE",
      isTrafficAware: false,
    };
  }

  logger.info("Route Cache MISS");

  try {
    const response = await httpRetry(
      () =>
        mapsClient.post("", {
          coordinates: [
            [Number(start.longitude), Number(start.latitude)],
            [Number(end.longitude), Number(end.latitude)],
          ],
        }),
      {
        retries: mapsConfig.maxRetries,
      },
    );

    if (
      !response.data ||
      !Array.isArray(response.data.routes) ||
      response.data.routes.length === 0
    ) {
      throw new AppError(
        "Invalid response received from OpenRouteService.",
        502,
      );
    }

    const route = response.data.routes[0];

    if (!route.summary) {
      throw new AppError("Route summary is missing.", 502);
    }

    const distance = Number((route.summary.distance / 1000).toFixed(2));
    const baseDuration = Number((route.summary.duration / 60).toFixed(2));
    const duration = calculateVehicleDuration(baseDuration, vehicleType, distance);

    const result = {
      distance,
      duration,
      baseDuration,
      eta: `${Math.ceil(duration)} minutes`,
      vehicleType,
      trafficModel: "STATIC_ROUTE_ESTIMATE",
      isTrafficAware: false,
      geometry: route.geometry ?? null,
    };

    MapsCacheService.setRoute(
      Number(start.latitude).toFixed(6),
      Number(start.longitude).toFixed(6),
      Number(end.latitude).toFixed(6),
      Number(end.longitude).toFixed(6),
      result,
    );

    return result;

  } catch (error) {
    logger.error(
      `OpenRouteService Error: ${
        error.response?.data
          ? JSON.stringify(error.response.data)
          : error.message
      }`,
    );

    if (error instanceof BadRequestError || error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      error.response?.data?.error?.message ||
        error.message ||
        "Unable to fetch route details from OpenRouteService.",
      502,
    );
  }
};

/**
 * Address -> Coordinates
 */
const geocodeAddress = async (address) => {
  if (!address || !address.trim()) {
    throw new BadRequestError("Address is required.");
  }

  const cached = MapsCacheService.getGeocode(address);

  if (cached) {
    logger.info("Geocode Cache HIT");
    return cached;
  }

  logger.info("Geocode Cache MISS");

  try {
    const response = await httpRetry(
      () =>
        axios.get(`${mapsConfig.baseUrl}/geocode/search`, {
          params: {
            api_key: mapsConfig.apiKey,
            text: address.trim(),
            size: 1,
          },
          timeout: mapsConfig.timeout,
        }),
      {
        retries: mapsConfig.maxRetries,
      },
    );

    const feature = response.data?.features?.[0];

    if (!feature) {
      throw new AppError("Address not found.", 404);
    }

    const result = {
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      formattedAddress: feature.properties.label || address,
    };

    MapsCacheService.setGeocode(address, result);

    return result;
  } catch (error) {
    logger.error(
      `Geocoding Error: ${
        error.response?.data
          ? JSON.stringify(error.response.data)
          : error.message
      }`,
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Unable to geocode address.", 502);
  }
};

/**
 * Coordinates -> Address
 */
const reverseGeocode = async (latitude, longitude) => {
  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude === null ||
    longitude === null
  ) {
    throw new BadRequestError("Latitude and longitude are required.");
  }

  validateCoordinates(
    {
      latitude: Number(latitude),
      longitude: Number(longitude),
    },
    "Location",
  );

  const cached = MapsCacheService.getReverseGeocode(
    Number(latitude).toFixed(6),
    Number(longitude).toFixed(6),
  );

  if (cached) {
    logger.info("Reverse Geocode Cache HIT");
    return cached;
  }

  logger.info("Reverse Geocode Cache MISS");

  try {
    const response = await httpRetry(
      () =>
        axios.get(`${mapsConfig.baseUrl}/geocode/reverse`, {
          params: {
            api_key: mapsConfig.apiKey,
            "point.lat": latitude,
            "point.lon": longitude,
            size: 1,
          },
          timeout: mapsConfig.timeout,
        }),
      {
        retries: mapsConfig.maxRetries,
      },
    );

    const feature = response.data?.features?.[0];

    if (!feature) {
      throw new AppError("Address not found.", 404);
    }

    const result = {
      address: feature.properties.label,
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
    };

    MapsCacheService.setReverseGeocode(
      Number(latitude).toFixed(6),
      Number(longitude).toFixed(6),
      result,
    );

    return result;
  } catch (error) {
    logger.error(
      `Reverse Geocoding Error: ${
        error.response?.data
          ? JSON.stringify(error.response.data)
          : error.message
      }`,
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Unable to reverse geocode coordinates.", 502);
  }
};

module.exports = {
  getRouteDetails,
  calculateVehicleDuration,
  geocodeAddress,
  reverseGeocode,
};

