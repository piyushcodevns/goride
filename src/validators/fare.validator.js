const { z } = require("zod");

const coordinateSchema = z.coerce.number().finite().refine(
  (value) => value >= -180 && value <= 180,
  "Coordinate must be within valid range.",
);

const latitudeSchema = z.coerce.number().finite().refine(
  (value) => value >= -90 && value <= 90,
  "Latitude must be between -90 and 90.",
);

const calculateFareSchema = z.object({
  body: z
    .object({
      city: z.string().trim().min(2).max(100).optional().default("DEFAULT"),
      vehicleType: z.enum(["BIKE", "AUTO", "CAR", "SUV"]),
      pickupLatitude: latitudeSchema,
      pickupLongitude: coordinateSchema,
      destinationLatitude: latitudeSchema,
      destinationLongitude: coordinateSchema,
    })
    .strict(),

  params: z.object({}).strict(),
  query: z.object({}).strict(),
});

module.exports = {
  calculateFareSchema,
};
