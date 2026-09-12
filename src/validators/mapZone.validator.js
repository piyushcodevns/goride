const { z } = require("zod");

const zoneTypeSchema = z.enum([
  "SERVICE",
  "AIRPORT",
  "TOLL",
  "RESTRICTED",
]);

const coordinateSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();

const boundarySchema = z
  .array(coordinateSchema)
  .min(3, "Zone boundary must contain at least 3 points.");

const createCitySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    state: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).default("India"),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const updateCitySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    state: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const createZoneSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    type: zoneTypeSchema,
    cityId: z.string().uuid().optional().nullable(),
    description: z.string().trim().max(500).optional(),
    boundary: boundarySchema,
    isActive: z.boolean().optional().default(true),
  })
  .strict();

const updateZoneSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    type: zoneTypeSchema.optional(),
    cityId: z.string().uuid().optional().nullable(),
    description: z.string().trim().max(500).optional(),
    boundary: boundarySchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

module.exports = {
  createCitySchema,
  updateCitySchema,
  createZoneSchema,
  updateZoneSchema,
};
