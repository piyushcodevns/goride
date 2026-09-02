const { z } = require("zod");


const calculateFareSchema = z.object({

  body: z.object({

    city: z
      .string()
      .min(2)
      .optional()
      .default("DEFAULT"),


    vehicleType: z.enum([
      "BIKE",
      "AUTO",
      "CAR",
      "SUV",
    ]),


    distanceKm: z
      .number()
      .positive("Distance must be greater than zero"),


    durationMinutes: z
      .number()
      .nonnegative("Duration cannot be negative")
      .default(0),


    waitingMinutes: z
      .number()
      .nonnegative("Waiting time cannot be negative")
      .default(0),


    tollCharge: z
      .number()
      .nonnegative("Toll charge cannot be negative")
      .default(0),


    isAirportRide: z
      .boolean()
      .default(false),


    isPeakHour: z
      .boolean()
      .default(false),


    isNightRide: z
      .boolean()
      .default(false),


    isRaining: z
      .boolean()
      .default(false),


    isEventRide: z
      .boolean()
      .default(false),


    discountAmount: z
      .number()
      .nonnegative("Discount cannot be negative")
      .default(0),

  }),


  params: z.object({}),


  query: z.object({}),


});


module.exports = {
  calculateFareSchema,
};