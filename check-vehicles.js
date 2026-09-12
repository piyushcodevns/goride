const prisma = require("./src/config/prisma");

(async () => {
  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      vehicleNumber: true,
      vehicleType: true,
      brand: true,
      model: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  console.log(JSON.stringify(vehicles, null, 2));
  await prisma.$disconnect();
})();
