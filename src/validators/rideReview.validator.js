const { z } = require("zod");

const createRideReviewSchema = z
  .object({
    rating: z
      .number({
        required_error: "Rating is required.",
        invalid_type_error: "Rating must be a number.",
      })
      .int("Rating must be an integer.")
      .min(1, "Rating must be at least 1.")
      .max(5, "Rating cannot be more than 5."),

    review: z
      .string({
        invalid_type_error: "Review must be a string.",
      })
      .trim()
      .max(500, "Review cannot exceed 500 characters.")
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
  })
  .strict();

module.exports = {
  createRideReviewSchema,
};
