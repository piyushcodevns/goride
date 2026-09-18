const prisma = require("../../config/prisma");

const createCity = (data) =>
  prisma.supportedCity.create({
    data,
  });

const getCities = ({ skip, take, where }) =>
  prisma.supportedCity.findMany({
    where,
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          zones: true,
        },
      },
    },
  });

const countCities = (where) =>
  prisma.supportedCity.count({
    where,
  });

const getCityById = (id) =>
  prisma.supportedCity.findUnique({
    where: { id },
    include: {
      zones: true,
    },
  });

const updateCity = (id, data) =>
  prisma.supportedCity.update({
    where: { id },
    data,
  });

const deleteCity = (id) =>
  prisma.supportedCity.delete({
    where: { id },
  });

const createZone = (data) =>
  prisma.mapZone.create({
    data,
  });

const getZones = ({ skip, take, where }) =>
  prisma.mapZone.findMany({
    where,
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      city: true,
    },
  });

const countZones = (where) =>
  prisma.mapZone.count({
    where,
  });

const getZoneById = (id) =>
  prisma.mapZone.findUnique({
    where: { id },
    include: {
      city: true,
    },
  });

const updateZone = (id, data) =>
  prisma.mapZone.update({
    where: { id },
    data,
    include: {
      city: true,
    },
  });

const deleteZone = (id) =>
  prisma.mapZone.delete({
    where: { id },
  });

const getActiveZonesByType = (type, cityId = undefined) =>
  prisma.mapZone.findMany({
    where: {
      type,
      isActive: true,
      ...(cityId ? { cityId } : {}),
    },
  });

module.exports = {
  createCity,
  getCities,
  countCities,
  getCityById,
  updateCity,
  deleteCity,

  createZone,
  getZones,
  countZones,
  getZoneById,
  updateZone,
  deleteZone,

  getActiveZonesByType,
};
