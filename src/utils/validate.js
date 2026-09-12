const { ZodError } = require("zod");
const { ValidationError } = require("./AppError");

const validate = (schema, data) => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues
        .map((issue) => issue.message)
        .join(", ");

      throw new ValidationError(message);
    }

    throw error;
  }
};

module.exports = validate;