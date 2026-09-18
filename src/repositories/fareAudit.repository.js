const prisma = require("../config/prisma");

const createFareAudit = async (data, db = prisma) => {
  return db.fareAudit.create({
    data,
  });
};

const getFareAuditByRideId = async (rideId, db = prisma) => {
  return db.fareAudit.findUnique({
    where: {
      rideId,
    },
  });
};

module.exports = {
  createFareAudit,
  getFareAuditByRideId,
};