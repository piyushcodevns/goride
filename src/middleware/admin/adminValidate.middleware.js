const { ZodError } = require("zod");

const validateAdminBody = (schema) => async (req, res, next) => {
  try {
    const parsedBody = await schema.parseAsync(req.body);

    req.body = parsedBody;

    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    return next(error);
  }
};

module.exports = {
  validateAdminBody,
};