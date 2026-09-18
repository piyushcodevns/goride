const { calculateFare } = require("../services/fare.service");

const calculateRideFare = async (req, res, next) => {
  try {
    const fare = await calculateFare(req.body);

    return res.status(200).json({
      success: true,

      message: "Fare calculated successfully",

      data: fare,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculateRideFare,
};
