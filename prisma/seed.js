const { PrismaClient, VehicleType } = require("@prisma/client");

const prisma = new PrismaClient();

const pricingData = [
  {
    city: "DEFAULT",
    vehicleType: VehicleType.BIKE,
    baseFare: 30,
    pricePerKm: 8,
    pricePerMinute: 1,
    minimumFare: 50,
    platformFee: 10,
    bookingFee: 5,
    gstPercentage: 5,
    waitingChargePerMinute: 1,
    airportCharge: 0,
    peakMultiplier: 1.5,
    nightMultiplier: 1.2,
    rainMultiplier: 1.3,
    eventMultiplier: 1.5,
  },
  {
    city: "DEFAULT",
    vehicleType: VehicleType.AUTO,
    baseFare: 40,
    pricePerKm: 12,
    pricePerMinute: 2,
    minimumFare: 80,
    platformFee: 10,
    bookingFee: 5,
    gstPercentage: 5,
    waitingChargePerMinute: 2,
    airportCharge: 50,
    peakMultiplier: 1.5,
    nightMultiplier: 1.2,
    rainMultiplier: 1.3,
    eventMultiplier: 1.5,
  },
  {
    city: "DEFAULT",
    vehicleType: VehicleType.CAR,
    baseFare: 80,
    pricePerKm: 15,
    pricePerMinute: 3,
    minimumFare: 150,
    platformFee: 15,
    bookingFee: 10,
    gstPercentage: 5,
    waitingChargePerMinute: 3,
    airportCharge: 100,
    peakMultiplier: 1.5,
    nightMultiplier: 1.2,
    rainMultiplier: 1.3,
    eventMultiplier: 1.5,
  },
  {
    city: "DEFAULT",
    vehicleType: VehicleType.SUV,
    baseFare: 120,
    pricePerKm: 20,
    pricePerMinute: 4,
    minimumFare: 250,
    platformFee: 20,
    bookingFee: 15,
    gstPercentage: 5,
    waitingChargePerMinute: 4,
    airportCharge: 150,
    peakMultiplier: 1.5,
    nightMultiplier: 1.2,
    rainMultiplier: 1.3,
    eventMultiplier: 1.5,
  },
];

async function main() {
  console.log("🌱 Seeding default pricing configurations...");

  for (const pricing of pricingData) {
    await prisma.pricingConfig.upsert({
      where: {
        city_vehicleType: {
          city: pricing.city,
          vehicleType: pricing.vehicleType,
        },
      },
      update: pricing,
      create: pricing,
    });
  }

  console.log("✅ Pricing configuration seeded successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("❌ Seeding failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });