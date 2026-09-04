const {
  findPricingConfigs,
  findPricingById,
  findPricingByCityAndVehicle,
  createPricing,
  updatePricing,
  deletePricing,
} = require("../../repositories/admin/adminPricing.repository");

const PricingCacheService = require("../pricing-cache.service");
const { NotFoundError, ConflictError } = require("../../utils/AppError");

/**
 * Get all pricing configurations.
 */
const getAllPricing = async (filters = {}) => {
  return findPricingConfigs(filters);
};

/**
 * Get pricing configuration by ID.
 */
const getPricingById = async (id) => {
  const pricing = await findPricingById(id);

  if (!pricing) {
    throw new NotFoundError("Pricing configuration not found.");
  }

  return pricing;
};

/**
 * Create pricing configuration.
 */
const createPricingConfig = async (data) => {
  const existing = await findPricingByCityAndVehicle(
    data.city,
    data.vehicleType,
  );

  if (existing) {
    throw new ConflictError(
      "Pricing configuration already exists for this city and vehicle type.",
    );
  }

  const pricing = await createPricing(data);

  PricingCacheService.clear(data.city, data.vehicleType);

  return pricing;
};

/**
 * Update pricing configuration.
 */
const updatePricingConfig = async (id, data) => {
  const existing = await findPricingById(id);

  if (!existing) {
    throw new NotFoundError("Pricing configuration not found.");
  }

  if (data.city || data.vehicleType) {
    const city = data.city ?? existing.city;
    const vehicleType = data.vehicleType ?? existing.vehicleType;

    const duplicate = await findPricingByCityAndVehicle(
      city,
      vehicleType,
    );

    if (duplicate && duplicate.id !== id) {
      throw new ConflictError(
        "Pricing configuration already exists for this city and vehicle type.",
      );
    }
  }

  const pricing = await updatePricing(id, data);

  PricingCacheService.clear(existing.city, existing.vehicleType);

  if (
    pricing.city !== existing.city ||
    pricing.vehicleType !== existing.vehicleType
  ) {
    PricingCacheService.clear(pricing.city, pricing.vehicleType);
  }

  return pricing;
};

/**
 * Delete pricing configuration.
 */
const deletePricingConfig = async (id) => {
  const existing = await findPricingById(id);

  if (!existing) {
    throw new NotFoundError("Pricing configuration not found.");
  }

  const pricing = await deletePricing(id);

  PricingCacheService.clear(
    existing.city,
    existing.vehicleType,
  );

  return pricing;
};

module.exports = {
  getAllPricing,
  getPricingById,
  createPricingConfig,
  updatePricingConfig,
  deletePricingConfig,
};
