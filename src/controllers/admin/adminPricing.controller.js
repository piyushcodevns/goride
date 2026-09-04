const pricingService = require("../../services/admin/adminPricing.service");

/**
 * Get all pricing configurations.
 */
const getAllPricing = async (req, res, next) => {
  try {
    const pricing = await pricingService.getAllPricing(req.query);

    return res.status(200).json({
      success: true,
      message: "Pricing configurations fetched successfully.",
      data: pricing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pricing configuration by ID.
 */
const getPricingById = async (req, res, next) => {
  try {
    const pricing = await pricingService.getPricingById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Pricing configuration fetched successfully.",
      data: pricing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create pricing configuration.
 */
const createPricing = async (req, res, next) => {
  try {
    const pricing = await pricingService.createPricingConfig(req.body);

    return res.status(201).json({
      success: true,
      message: "Pricing configuration created successfully.",
      data: pricing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update pricing configuration.
 */
const updatePricing = async (req, res, next) => {
  try {
    const pricing = await pricingService.updatePricingConfig(
      req.params.id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Pricing configuration updated successfully.",
      data: pricing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete pricing configuration.
 */
const deletePricing = async (req, res, next) => {
  try {
    const pricing = await pricingService.deletePricingConfig(
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      message: "Pricing configuration deleted successfully.",
      data: pricing,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPricing,
  getPricingById,
  createPricing,
  updatePricing,
  deletePricing,
};
