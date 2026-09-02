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
 * Get Route Details
 */
const getRouteDetails = async (start, end) => {
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
    return cachedRoute;
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

    const duration = Number((route.summary.duration / 60).toFixed(2));

    const result = {
      distance,
      duration,
      eta: `${Math.ceil(duration)} minutes`,
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
  geocodeAddress,
  reverseGeocode,
};
