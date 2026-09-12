process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/config/prisma");
const notificationService = require("../src/services/notification.service");
const NotificationFactory = require("../src/factories/notification.factory");
const { ValidationError, ForbiddenError } = require("../src/utils/AppError");

describe("PHASE 13: Notification Pipeline, Event Mapping & Multi-Channel Delivery", () => {
  const uniqueId = Date.now();
  let testUser, otherUser;

  test("Setup notification test users", async () => {
    testUser = await prisma.user.create({
      data: {
        fullName: "Notify User",
        email: `notify_${uniqueId}@goride.internal`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    otherUser = await prisma.user.create({
      data: {
        fullName: "Other Notify User",
        email: `notify_other_${uniqueId}@goride.internal`,
        phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
        password: "hashedPassword123",
        role: "USER",
      },
    });

    assert.ok(testUser.id);
    assert.ok(otherUser.id);
  });

  test("Validation: Rejects missing userId, empty title, or empty message", async () => {
    // 1. Missing userId
    await assert.rejects(
      async () => {
        await notificationService.createNotification({
          userId: null,
          title: "Valid Title",
          message: "Valid Message",
        });
      },
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.message, "User ID is required.");
        return true;
      },
    );

    // 2. Empty title
    await assert.rejects(
      async () => {
        await notificationService.createNotification({
          userId: testUser.id,
          title: "   ",
          message: "Valid Message",
        });
      },
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.message, "Notification title is required.");
        return true;
      },
    );

    // 3. Empty message
    await assert.rejects(
      async () => {
        await notificationService.createNotification({
          userId: testUser.id,
          title: "Valid Title",
          message: "",
        });
      },
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.message, "Notification message is required.");
        return true;
      },
    );
  });

  test("Factory Methods: Produce complete, schema-compliant notification payloads", () => {
    const welcome = NotificationFactory.createWelcomeNotification(testUser);
    assert.equal(welcome.userId, testUser.id);
    assert.ok(welcome.title.includes("Welcome"));

    const rideBooked = NotificationFactory.createRideBookedNotification({
      userId: testUser.id,
      rideId: "ride_123",
      pickup: "Connaught Place",
      destination: "India Gate",
      status: "REQUESTED",
    });
    assert.equal(rideBooked.type, "RIDE");
    assert.equal(rideBooked.metadata.rideId, "ride_123");

    const rideAccepted = NotificationFactory.createRideAcceptedNotification({
      userId: testUser.id,
      rideId: "ride_123",
      driverId: "driver_456",
      status: "ACCEPTED",
    });
    assert.equal(rideAccepted.metadata.driverId, "driver_456");

    const rideCancelled = NotificationFactory.createRideCancelledNotification({
      userId: testUser.id,
      rideId: "ride_123",
      pickup: "CP",
      destination: "Noida",
      status: "CANCELLED",
    });
    assert.equal(rideCancelled.metadata.status, "CANCELLED");

    const rideRejected = NotificationFactory.createRideRejectedNotification({
      userId: testUser.id,
      rideId: "ride_123",
      driverId: "driver_456",
    });
    assert.equal(rideRejected.title, "Ride Rejected");

    const paySuccess = NotificationFactory.createPaymentSuccessNotification({
      userId: testUser.id,
      id: "pay_123",
      rideId: "ride_123",
      amount: 250.0,
      transactionId: "tx_999",
    });
    assert.equal(paySuccess.type, "PAYMENT");

    const payFailed = NotificationFactory.createPaymentFailedNotification({
      userId: testUser.id,
      id: "pay_123",
      rideId: "ride_123",
      amount: 250.0,
    });
    assert.equal(payFailed.type, "PAYMENT");
  });

  test("Dispatch Pipeline: Creates notification and safely handles queue disabled fallback", async () => {
    const payload = NotificationFactory.createRideBookedNotification({
      userId: testUser.id,
      rideId: "ride_test_001",
      pickup: "Sector 18",
      destination: "Cyber City",
      status: "REQUESTED",
    });

    const result = await notificationService.dispatchNotification(payload);
    assert.ok(result);
    assert.ok(result.id);
    assert.equal(result.userId, testUser.id);
    assert.equal(result.title, payload.title);
    assert.equal(result.type, "RIDE");

    // In queue-disabled test mode, status is updated synchronously to SENT
    assert.ok(["PENDING", "SENT"].includes(result.status));
  });

  test("User Notifications Retrieval: Returns paginated user notifications", async () => {
    const list = await notificationService.getUserNotifications(testUser.id, {
      skip: 0,
      take: 10,
    });

    assert.ok(list.notifications);
    assert.ok(list.notifications.length >= 1);
    assert.ok(list.total >= 1);
  });

  test("Unread Count: Accurately reflects unread notification counts", async () => {
    const unreadCount = await notificationService.getUnreadCount(testUser.id);
    assert.ok(typeof unreadCount === "number");
    assert.ok(unreadCount >= 1);
  });

  test("Mark as Read: Updates read state and enforces user ownership", async () => {
    const notifs = await notificationService.getUserNotifications(testUser.id, { skip: 0, take: 1 });
    const targetNotif = notifs.notifications[0];

    // Non-owner cannot mark notification as read
    await assert.rejects(
      async () => {
        await notificationService.markAsRead(targetNotif.id, otherUser.id);
      },
      (err) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      },
    );

    // Authoritative owner marks as read
    const readResult = await notificationService.markAsRead(targetNotif.id, testUser.id);
    assert.equal(readResult.status, "READ");
    assert.ok(readResult.readAt instanceof Date);
  });
});
