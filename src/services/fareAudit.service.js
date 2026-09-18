const { getFareAuditByRideId } = require("../repositories/fareAudit.repository");
const rideRepository = require("../repositories/ride.repository");

const { NotFoundError } = require("../utils/AppError");

const canAccessRideFareAudit = (ride, userId) => {
  if (!ride || !userId) {
    return false;
  }

  if (ride.userId === userId) {
    return true;
  }

  return ride.driver?.user?.id === userId;
};

const getRideFareAudit = async (rideId, userId) => {
  const ride = await rideRepository.getRideById(rideId);

  if (!ride || !canAccessRideFareAudit(ride, userId)) {
    throw new NotFoundError("Fare audit not found.");
  }

  const fareAudit = await getFareAuditByRideId(rideId);

  if (!fareAudit) {
    throw new NotFoundError("Fare audit not found.");
  }

  return fareAudit;
};

module.exports = {
  canAccessRideFareAudit,
  getRideFareAudit,
};