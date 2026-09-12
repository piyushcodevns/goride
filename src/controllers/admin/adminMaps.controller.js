const service = require("../../services/admin/adminMaps.service");

const createCity = async (req, res, next) => {
  try {
    const result = await service.createCity(req.body);

    res.status(201).json({
      success: true,
      message: "Supported city created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getCities = async (req, res, next) => {
  try {
    const result = await service.getCities(req.query);

    res.status(200).json({
      success: true,
      message: "Supported cities fetched successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getCityById = async (req, res, next) => {
  try {
    const result = await service.getCityById(req.params.id);

    res.status(200).json({
      success: true,
      message: "City fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateCity = async (req, res, next) => {
  try {
    const result = await service.updateCity(
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "City updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteCity = async (req, res, next) => {
  try {
    await service.deleteCity(req.params.id);

    res.status(200).json({
      success: true,
      message: "City deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const createZone = async (req, res, next) => {
  try {
    const result = await service.createZone(req.body);

    res.status(201).json({
      success: true,
      message: "Map zone created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getZones = async (req, res, next) => {
  try {
    const result = await service.getZones(req.query);

    res.status(200).json({
      success: true,
      message: "Map zones fetched successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getZoneById = async (req, res, next) => {
  try {
    const result = await service.getZoneById(req.params.id);

    res.status(200).json({
      success: true,
      message: "Map zone fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateZone = async (req, res, next) => {
  try {
    const result = await service.updateZone(
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Map zone updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const deleteZone = async (req, res, next) => {
  try {
    await service.deleteZone(req.params.id);

    res.status(200).json({
      success: true,
      message: "Map zone deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const checkPoint = async (req, res, next) => {
  try {
    const result = await service.checkPoint({
      latitude: Number(req.query.latitude),
      longitude: Number(req.query.longitude),
      type: req.query.type,
      cityId: req.query.cityId,
    });

    res.status(200).json({
      success: true,
      message: "Geofence check completed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
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
