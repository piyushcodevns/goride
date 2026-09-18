const prisma = require("../config/prisma");

const getActivePricingByVehicle = async (city, vehicleType) => {
  let pricing = await prisma.pricingConfig.findFirst({
    where: {
      city,
      vehicleType,
      isActive: true,
    },
  });

  if (!pricing) {
    pricing = await prisma.pricingConfig.findFirst({
      where: {
        city: "DEFAULT",
        vehicleType,
        isActive: true,
      },
    });
  }

  return pricing;
};

const getAllPricingConfigs = async () => {
  return prisma.pricingConfig.findMany({
    orderBy: [
      { city: "asc" },
      { vehicleType: "asc" },
    ],
  });
};

const createPricingConfig = async (data) => {
  return prisma.pricingConfig.create({
    data,
  });
};

const updatePricingConfig = async (id, data) => {
  return prisma.pricingConfig.update({
    where: { id },
    data,
  });
};

module.exports = {
  getActivePricingByVehicle,
  getAllPricingConfigs,
  createPricingConfig,
  updatePricingConfig,
};