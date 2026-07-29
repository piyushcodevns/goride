const axios = require("axios");

const ORS_BASE_URL =
  "https://api.openrouteservice.org/v2/directions/driving-car";

/**
 * Get route details from OpenRouteService
 * 
 * Returns:
 * - distance (KM)
 * - duration (minutes)
 * - ETA data
 * - route geometry
 */
const getRouteDetails = async (start, end) => {
  try {
    if (!start || !end) {
      throw new Error("Start and end coordinates are required.");
    }

    const response = await axios.post(
      ORS_BASE_URL,
      {
        coordinates: [
          [
            start.longitude,
            start.latitude,
          ],
          [
            end.longitude,
            end.latitude,
          ],
        ],
      },
      {
        headers: {
          Authorization: process.env.OPENROUTESERVICE_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const route = response.data.routes[0];

    if (!route) {
      throw new Error("Route not found.");
    }

    const distanceInKm = Number(
      (route.summary.distance / 1000).toFixed(2)
    );

    const durationInMinutes = Number(
      (route.summary.duration / 60).toFixed(2)
    );

    return {
      distance: distanceInKm,

      duration: durationInMinutes,

      eta: `${Math.ceil(durationInMinutes)} minutes`,

      geometry: route.geometry,
    };

  } catch (error) {
    console.error(
      "OpenRouteService Error:",
      error.response?.data || error.message
    );

    throw new Error(
      "Unable to calculate route details."
    );
  }
};


module.exports = {
  getRouteDetails,
};