const { getRideFareAudit } = require("../services/fareAudit.service");

const getFareAudit = async (req, res, next) => {
  try {
    const { rideId } = req.params;

    const fareAudit = await getRideFareAudit(rideId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Fare audit fetched successfully.",
      data: fareAudit,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getFareAudit,
};