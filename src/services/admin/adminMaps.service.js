const repository = require("../../repositories/admin/adminMaps.repository");

const {
  NotFoundError,
  ConflictError,
  BadRequestError,
} = require("../../utils/AppError");

const isPointInsidePolygon = (latitude, longitude, polygon) => {
  let inside = false;

  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;

    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersects =
      yi > longitude !== yj > longitude &&
      latitude <
        ((xj - xi) * (longitude - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const validateBoundary = (boundary) => {
  if (!Array.isArray(boundary) || boundary.length < 3) {
    throw new BadRequestError(
      "Zone boundary must contain at least 3 coordinates.",
    );
  }

  for (const point of boundary) {
    if (
      typeof point.latitude !== "number" ||
      typeof point.longitude !== "number"
    ) {
      throw new BadRequestError(
        "Every boundary point must contain valid latitude and longitude.",
      );
    }

    if (point.latitude < -90 || point.latitude > 90) {
      throw new BadRequestError("Invalid boundary latitude.");
    }

    if (point.longitude < -180 || point.longitude > 180) {
      throw new BadRequestError("Invalid boundary longitude.");
    }
  }
};

const createCity = async (data) => {
  const existing = await repository.getCities({
    skip: 0,
    take: 1,
    where: {
      name: {
        equals: data.name,
        mode: "insensitive",
      },
    },
  });

  if (existing.length) {
    throw new ConflictError("City already exists.");
  }

  return repository.createCity(data);
};

const getCities = async ({ page = 1, limit = 20, active }) => {
  const parsedPage = Number(page) || 1;
  const parsedLimit = Number(limit) || 20;
  const skip = (parsedPage - 1) * parsedLimit;

  const where =
    active === undefined
      ? {}
      : {
          isActive: active === true || active === "true",
        };

  const [data, total] = await Promise.all([
    repository.getCities({
      skip,
      take: parsedLimit,
      where,
    }),
    repository.countCities(where),
  ]);

  return {
    data,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

const getCityById = async (id) => {
  const city = await repository.getCityById(id);

  if (!city) {
    throw new NotFoundError("City not found.");
  }

  return city;
};

const updateCity = async (id, data) => {
  await getCityById(id);

  return repository.updateCity(id, data);
};

const deleteCity = async (id) => {
  await getCityById(id);

  return repository.deleteCity(id);
};

const createZone = async (data) => {
  validateBoundary(data.boundary);

  if (data.cityId) {
    const city = await repository.getCityById(data.cityId);

    if (!city) {
      throw new NotFoundError("City not found.");
    }
  }

  const existing = await repository.getZones({
    skip: 0,
    take: 1,
    where: {
      name: data.name,
      type: data.type,
    },
  });

  if (existing.length) {
    throw new ConflictError("Zone with this name and type already exists.");
  }

  return repository.createZone(data);
};

const getZones = async ({
  page = 1,
  limit = 20,
  type,
  cityId,
  active,
}) => {
  const parsedPage = Number(page) || 1;
  const parsedLimit = Number(limit) || 20;
  const skip = (parsedPage - 1) * parsedLimit;

  const where = {
    ...(type ? { type } : {}),
    ...(cityId ? { cityId } : {}),
    ...(active === undefined
      ? {}
      : {
          isActive: active === true || active === "true",
        }),
  };

  const [data, total] = await Promise.all([
    repository.getZones({
      skip,
      take: parsedLimit,
      where,
    }),
    repository.countZones(where),
  ]);

  return {
    data,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

const getZoneById = async (id) => {
  const zone = await repository.getZoneById(id);

  if (!zone) {
    throw new NotFoundError("Zone not found.");
  }

  return zone;
};

const updateZone = async (id, data) => {
  await getZoneById(id);

  if (data.boundary) {
    validateBoundary(data.boundary);
  }

  if (data.cityId) {
    const city = await repository.getCityById(data.cityId);

    if (!city) {
      throw new NotFoundError("City not found.");
    }
  }

  return repository.updateZone(id, data);
};

const deleteZone = async (id) => {
  await getZoneById(id);

  return repository.deleteZone(id);
};

const checkPoint = async ({
  latitude,
  longitude,
  type,
  cityId,
}) => {
  const zones = await repository.getActiveZonesByType(type, cityId);

  const matches = zones.filter((zone) =>
    isPointInsidePolygon(
      latitude,
      longitude,
      zone.boundary,
    ),
  );

  return {
    inside: matches.length > 0,
    zones: matches,
  };
};

module.exports = {
  createCity,
  getCities,
  getCityById,
  updateCity,
  deleteCity,

  createZone,
  getZones,
  getZoneById,
  updateZone,
  deleteZone,

  checkPoint,
};
