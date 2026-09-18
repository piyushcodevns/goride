const {
  getDrivers,
  getPendingDrivers,
  getDriverDetails,
  getDriverVehicle,
  getDriverTrips,
  getDriverRatings,
  getDriverKyc,
  getDriverStatistics,
  getDriverEarnings,
  approveDriver,
  rejectDriver,
  suspendDriver,
  activateDriver,

  getDriverDocuments,
  approveDriverDocument,
  rejectDriverDocument,
  getDriverWallet,
  getDriverWalletTransactions,
} = require("../../services/admin/adminDriver.service");

const {
  driverIdParamSchema,
  paginationSchema,
  getDriversQuerySchema,
  reasonBodySchema,
  documentIdParamSchema,
  documentRejectBodySchema,
} = require("../../validators/admin/adminDriver.validator");

/**
 * Get all drivers.
 */
const getAllDrivers = async (req, res, next) => {
  try {
    const query = getDriversQuerySchema.parse(req.query);

    const result = await getDrivers(query);

    return res.status(200).json({
      success: true,
      message: "Drivers fetched successfully.",
      data: {
        items: result.drivers,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending drivers.
 */
const getPending = async (req, res, next) => {
  try {
    const pagination = paginationSchema.parse(req.query);

    const result = await getPendingDrivers(pagination);

    return res.status(200).json({
      success: true,
      message: "Pending drivers fetched successfully.",
      data: {
        items: result.drivers,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver details.
 */
const getDriver = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);

    const driver = await getDriverDetails(id);

    return res.status(200).json({
      success: true,
      message: "Driver details fetched successfully.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver's vehicle.
 */
const getVehicle = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);

    const vehicle = await getDriverVehicle(id);

    return res.status(200).json({
      success: true,
      message: "Driver vehicle fetched successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver's trip history.
 */
const getTrips = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);
    const pagination = paginationSchema.parse(req.query);

    const result = await getDriverTrips(id, pagination);

    return res.status(200).json({
      success: true,
      message: "Driver trip history fetched successfully.",
      data: {
        items: result.rides,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver's ratings and reviews.
 */
const getRatings = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);
    const pagination = paginationSchema.parse(req.query);

    const result = await getDriverRatings(id, pagination);

    return res.status(200).json({
      success: true,
      message: "Driver ratings fetched successfully.",
      data: {
        items: result.ratings,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver's KYC information.
 */
const getKyc = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);

    const kyc = await getDriverKyc(id);

    return res.status(200).json({
      success: true,
      message: "Driver KYC fetched successfully.",
      data: kyc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver statistics.
 */
const getStatistics = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);

    const statistics = await getDriverStatistics(id);

    return res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver earnings.
 */
const getEarnings = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);

    const earnings = await getDriverEarnings(id);

    return res.status(200).json({
      success: true,
      data: earnings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve driver.
 */
const approve = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);

    const driver = await approveDriver({
      driverId: id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Driver approved successfully.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject driver.
 */
const reject = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);
    const { reason } = reasonBodySchema.parse(req.body);

    const driver = await rejectDriver({
      driverId: id,
      adminId: req.admin.id,
      reason,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Driver rejected successfully.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend driver.
 */
const suspend = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);
    const { reason } = reasonBodySchema.parse(req.body);

    const driver = await suspendDriver({
      driverId: id,
      adminId: req.admin.id,
      reason,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Driver suspended successfully.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate suspended driver.
 */
const activate = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);

    const driver = await activateDriver({
      driverId: id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Driver activated successfully.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver documents.
 */
const getDocuments = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);

    const documents = await getDriverDocuments(id);

    return res.status(200).json({
      success: true,
      message: "Driver documents fetched successfully.",
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

const approveDocument = async (req, res, next) => {
  try {
    const { id } = documentIdParamSchema.parse(req.params);

    const document = await approveDriverDocument({
      documentId: id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Driver document approved successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

const rejectDocument = async (req, res, next) => {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const { reason } = documentRejectBodySchema.parse(req.body);

    const document = await rejectDriverDocument({
      documentId: id,
      adminId: req.admin.id,
      reason,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Driver document rejected successfully.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

const getWallet = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);

    const wallet = await getDriverWallet(id);

    return res.status(200).json({
      success: true,
      message: "Driver wallet fetched successfully.",
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

const getWalletTransactions = async (req, res, next) => {
  try {
    const { id } = driverIdParamSchema.parse(req.params);
    const pagination = paginationSchema.parse(req.query);

    const result = await getDriverWalletTransactions(id, pagination);

    return res.status(200).json({
      success: true,
      message: "Driver wallet transactions fetched successfully.",
      data: {
        items: result.transactions,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDrivers,
  getPending,
  getDriver,
  getVehicle,
  getTrips,
  getRatings,
  getKyc,
  getStatistics,
  getEarnings,
  approve,
  reject,
  suspend,
  activate,

  getDocuments,
  approveDocument,
  rejectDocument,
  getWallet,
  getWalletTransactions,
};
