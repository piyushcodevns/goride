const { ForbiddenError } = require("../utils/AppError");

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError("Authentication required."));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          "You are not authorized to access this resource."
        )
      );
    }

    next();
  };
};

module.exports = {
  authorize,
};