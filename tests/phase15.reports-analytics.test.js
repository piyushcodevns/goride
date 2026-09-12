process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const adminReportsService = require("../src/services/admin/adminReports.service");
const adminAnalyticsService = require("../src/services/admin/adminAnalytics.service");

describe("PHASE 15: Reports & Analytics Source Reconciliation & Boundary Math", () => {
  const uniqueId = Date.now();
  let testUser, testDriver, completedRide, cancelledRide, testPayment;

  test("Setup controlled source data for report reconciliation", async () => {
    // 1. User
    testUser = await prisma.user.create({
      data: {
        fullName: "Report Test User",
        email: `report_user_${uniqueId}@goride.internal`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
        isActive: true,
      },
    });

    // 2. Driver
    const driverUser = await prisma.user.create({
      data: {
        fullName: "Report Driver User",
        email: `report_driver_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "DRIVER",
        isActive: true,
      },
    });

    testDriver = await prisma.driver.create({
      data: {
        userId: driverUser.id,
        licenseNumber: `DL${uniqueId.toString().slice(-8)}RP`,
        aadharNumber: `5555${uniqueId.toString().slice(-8)}`,
        experience: 4,
        status: "APPROVED",
        availability: "AVAILABLE",
      },
    });

    // 3. Completed Ride
    completedRide = await prisma.ride.create({
      data: {
        userId: testUser.id,
        driverId: testDriver.id,
        pickup: "Report Pickup A",
        destination: "Report Dest A",
        distance: 10.0,
        finalFare: 200.0,
        vehicleType: "CAR",
        status: "COMPLETED",
      },
    });

    // 4. Cancelled Ride
    cancelledRide = await prisma.ride.create({
      data: {
        userId: testUser.id,
        pickup: "Report Pickup B",
        destination: "Report Dest B",
        distance: 5.0,
        vehicleType: "CAR",
        status: "CANCELLED",
      },
    });

    // 5. Successful Payment
    testPayment = await prisma.payment.create({
      data: {
        rideId: completedRide.id,
        userId: testUser.id,
        amount: 200.0,
        paymentMethod: "UPI",
        status: "SUCCESS",
        transactionId: `tx_rep_${uniqueId}`,
        paidAt: new Date(),
      },
    });

    assert.ok(testUser.id);
    assert.ok(testDriver.id);
    assert.ok(completedRide.id);
    assert.ok(cancelledRide.id);
    assert.ok(testPayment.id);
  });

  test("Source Data Reconciliation: Overview report reflects live database entities", async () => {
    const report = await adminReportsService.getOverviewReport();

    assert.ok(report);
    assert.ok(report.rides.total >= 2);
    assert.ok(report.rides.completed >= 1);
    assert.ok(report.rides.cancelled >= 1);
    assert.ok(typeof report.rides.cancellationRate === "number");
    assert.ok(typeof report.rides.completionRate === "number");
    assert.ok(!Number.isNaN(report.rides.cancellationRate));
    assert.ok(!Number.isNaN(report.rides.completionRate));

    assert.ok(report.users.total >= 1);
    assert.ok(report.drivers.total >= 1);
    assert.ok(report.payments.total >= 1);
    assert.ok(report.payments.successful >= 1);
    assert.ok(Number(report.revenue.totalRevenue) >= 200.0);
  });

  test("Zero-Division Defense: Empty/out-of-range dataset returns 0% without NaN or Infinity", async () => {
    // Filter by year 2099 where no data exists
    const futureReport = await adminReportsService.getOverviewReport({
      fromDate: "2099-01-01",
      toDate: "2099-01-02",
    });

    assert.equal(futureReport.rides.total, 0);
    assert.equal(futureReport.rides.cancellationRate, 0);
    assert.equal(futureReport.rides.completionRate, 0);
    assert.equal(futureReport.revenue.totalRevenue, "0.00");
    assert.equal(futureReport.revenue.averageTransaction, "0.00");
    assert.equal(futureReport.payments.successRate, 0);
  });

  test("Analytics Date Range Boundaries: Enforces valid formats, sequence, and maximum window", async () => {
    // 1. fromDate after toDate throws
    await assert.rejects(
      async () => {
        await adminAnalyticsService.getGrowth({
          fromDate: "2026-05-01",
          toDate: "2026-04-01",
        });
      },
      (err) => err.message.includes("must be before toDate"),
    );

    // 2. Date range exceeding 366 days throws
    await assert.rejects(
      async () => {
        await adminAnalyticsService.getGrowth({
          fromDate: "2024-01-01",
          toDate: "2026-01-01",
        });
      },
      (err) => err.message.includes("cannot exceed 366 days"),
    );

    // 3. Invalid date string throws
    await assert.rejects(
      async () => {
        await adminAnalyticsService.getGrowth({
          fromDate: "invalid-date-string",
          toDate: "2026-04-01",
        });
      },
      (err) => err.message.includes("Invalid analytics fromDate"),
    );
  });

  test("Revenue Report: Formats amounts and summarizes revenue statistics cleanly", async () => {
    const revReport = await adminReportsService.getRevenueReport();
    assert.ok(revReport);
    assert.ok(revReport.summary);
    assert.ok(typeof revReport.summary.totalRevenue === "string");
    assert.ok(typeof revReport.summary.transactionCount === "number");
    assert.ok(Array.isArray(revReport.vehicleTypeBreakdown));
  });

  test("Rides Report: Breaks down ride states, completions, and average distance", async () => {
    const ridesReport = await adminReportsService.getRideReport();
    assert.ok(ridesReport);
    assert.ok(ridesReport.summary);
    assert.ok(ridesReport.summary.totalRides >= 2);
    assert.ok(typeof ridesReport.summary.completionRate === "number");
    assert.ok(typeof ridesReport.summary.cancellationRate === "number");
  });
});
