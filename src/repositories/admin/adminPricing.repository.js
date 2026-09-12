const prisma = require("../../config/prisma");

/**
 * Get all pricing configurations with optional filters.
 */
const findPricingConfigs = async ({
  city,
  vehicleType,
  isActive,
}) => {
  const where = {};

  if (city) {
    where.city = {
      contains: city,
      mode: "insensitive",
    };
  }

  if (vehicleType) {
    where.vehicleType = vehicleType;
  }

  if (typeof isActive === "boolean") {
    where.isActive = isActive;
  }

  return prisma.pricingConfig.findMany({
    where,
    orderBy: [
      { city: "asc" },
      { vehicleType: "asc" },
    ],
  });
};

/**
 * Get pricing configuration by ID.
 */
const findPricingById = async (id) => {
  return prisma.pricingConfig.findUnique({
    where: { id },
  });
};

/**
 * Find pricing configuration by city + vehicle type.
 */
const findPricingByCityAndVehicle = async (city, vehicleType) => {
  return prisma.pricingConfig.findUnique({
    where: {
      city_vehicleType: {
        city,
        vehicleType,
      },
    },
  });
};

/**
 * Create pricing configuration.
 */
const createPricing = async (data) => {
  return prisma.pricingConfig.create({
    data,
  });
};

/**
 * Update pricing configuration.
 */
const updatePricing = async (id, data) => {
  return prisma.pricingConfig.update({
    where: { id },
    data,
  });
};

/**
 * Delete pricing configuration.
 */
const deletePricing = async (id) => {
  return prisma.pricingConfig.delete({
    where: { id },
  });
};

module.exports = {
  findPricingConfigs,
  findPricingById,
  findPricingByCityAndVehicle,
  createPricing,
  updatePricing,
  deletePricing,
};
