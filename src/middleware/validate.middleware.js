const { ZodError } = require("zod");

const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }

    if (parsed.params !== undefined) {
      req.params = parsed.params;
    }

    if (parsed.query !== undefined) {
      req.query = parsed.query;
    }

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
  validate,
}; 