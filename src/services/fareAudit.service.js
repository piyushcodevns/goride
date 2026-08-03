const { getFareAuditByRideId } = require("../repositories/fareAudit.repository");

const { NotFoundError } = require("../utils/AppError");


const getRideFareAudit = async (rideId) => {
  const fareAudit = await getFareAuditByRideId(rideId);

  if (!fareAudit) {
    throw new NotFoundError("Fare audit not found.");
  }

  return fareAudit;
};


module.exports = {
  getRideFareAudit,
};