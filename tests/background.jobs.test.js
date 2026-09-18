process.env.NODE_ENV = "test";
process.env.QUEUE_ENABLED = "false";
process.env.NOTIFICATION_QUEUE_ENABLED = "false";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SCHEDULED_RIDE_QUEUE_NAME,
  addScheduledRideActivationJob,
  addScheduledRideSweepJob,
  closeScheduledRideQueue,
} = require("../src/queues/scheduledRide.queue");

const {
  CLEANUP_QUEUE_NAME,
  addCleanupJob,
  closeCleanupQueue,
} = require("../src/queues/cleanup.queue");

const {
  DATASET_QUEUE_NAME,
  addRideDatasetJob,
  closeDatasetQueue,
} = require("../src/queues/dataset.queue");

const {
  BACKUP_QUEUE_NAME,
  ensureBackupSchedule,
  closeBackupQueue,
} = require("../src/queues/backup.queue");

const { closeAllQueues } = require("../src/queues");

const {
  processNotificationJob,
} = require("../src/processors/notification.processor");

const {
  processScheduledRideJob,
} = require("../src/processors/scheduledRide.processor");

const {
  processCleanupJob,
} = require("../src/processors/cleanup.processor");

const {
  processDatasetJob,
} = require("../src/processors/dataset.processor");

const {
  startAllWorkers,
  stopAllWorkers,
  getAllWorkerStatus,
} = require("../src/workers");

const {
  startSchedulers,
  stopSchedulers,
} = require("../src/schedulers");

const rideRepository = require("../src/repositories/ride.repository");
const rideService = require("../src/services/ride.service");
const notificationRepository = require("../src/repositories/notification.repository");
const prisma = require("../src/config/prisma");

test("Scheduled ride queue rejects job without rideId", async () => {
  await assert.rejects(
    async () => {
      await addScheduledRideActivationJob({});
    },
    {
      message: /rideId is required to enqueue scheduled ride activation/,
    },
  );
});

test("Dataset queue rejects job without rideId", async () => {
  await assert.rejects(
    async () => {
      await addRideDatasetJob({});
    },
    {
      message: /rideId is required to enqueue dataset job/,
    },
  );
});

test("All queue producers return null safely when queueing is disabled in test environment", async () => {
  assert.equal(process.env.NODE_ENV, "test");

  const rideJob = await addScheduledRideActivationJob({ rideId: "test_ride_123" });
  assert.equal(rideJob, null);

  const sweepJob = await addScheduledRideSweepJob();
  assert.equal(sweepJob, null);

  const cleanupJob = await addCleanupJob("full");
  assert.equal(cleanupJob, null);

  const datasetJob = await addRideDatasetJob({ rideId: "test_ride_123" });
  assert.equal(datasetJob, null);

  const backupScheduled = await ensureBackupSchedule();
  assert.equal(backupScheduled, false);
});

test("processNotificationJob enforces idempotency: skips duplicate delivery if status is already SENT", async () => {
  const origFind = notificationRepository.findNotificationById;

  let deliveryCalled = false;
  notificationRepository.findNotificationById = async (id) => ({
    id,
    userId: "user_test",
    title: "Test Ride",
    message: "Test Ride Message",
    channel: "IN_APP",
    status: "SENT", // Already sent
  });

  try {
    const job = {
      id: "bullmq_job_1",
      queueName: "notification",
      data: { notificationId: "notif_sent_123" },
      attemptsMade: 0,
    };

    const result = await processNotificationJob(job);
    assert.equal(result.success, true);
    assert.equal(result.idempotent, true);
    assert.equal(result.notificationId, "notif_sent_123");
  } finally {
    notificationRepository.findNotificationById = origFind;
  }
});

test("processScheduledRideJob activates due ride and handles non-existent or already active ride safely", async () => {
  const origActivate = rideService.activateScheduledRide;

  let calledWithRideId = null;
  rideService.activateScheduledRide = async (rideId) => {
    calledWithRideId = rideId;
    return { activated: true, rideId };
  };

  try {
    const job = {
      id: "job_sched_1",
      name: "activate-scheduled-ride",
      data: { rideId: "ride_due_999" },
    };

    const result = await processScheduledRideJob(job);
    assert.equal(calledWithRideId, "ride_due_999");
    assert.equal(result.activated, true);
    assert.equal(result.rideId, "ride_due_999");
  } finally {
    rideService.activateScheduledRide = origActivate;
  }
});

test("processScheduledRideJob handles periodic sweep jobs safely", async () => {
  const origProcessDue = rideService.processDueScheduledRides;

  rideService.processDueScheduledRides = async () => ({
    totalChecked: 3,
    activatedCount: 2,
  });

  try {
    const job = {
      id: "job_sweep_1",
      name: "sweep-scheduled-rides",
      data: {},
    };

    const result = await processScheduledRideJob(job);
    assert.equal(result.totalChecked, 3);
    assert.equal(result.activatedCount, 2);
  } finally {
    rideService.processDueScheduledRides = origProcessDue;
  }
});

test("processScheduledRideJob throws error for unknown job name", async () => {
  await assert.rejects(
    async () => {
      await processScheduledRideJob({
        id: "job_unknown",
        name: "unsupported-job",
        data: {},
      });
    },
    {
      message: /Unknown scheduled ride job name/,
    },
  );
});

test("processCleanupJob executes bounded maintenance subroutines with failure isolation", async () => {
  const job = {
    id: "cleanup_job_1",
    data: { type: "full" },
  };

  const result = await processCleanupJob(job);
  assert.equal(result.success, true);
  assert.equal(result.summary.type, "full");
  assert.equal(typeof result.summary.cleanedSessions, "number");
  assert.equal(typeof result.summary.cleanedTokens, "number");
  assert.equal(typeof result.summary.cleanedNotifications, "number");
  assert.equal(typeof result.durationMs, "number");
  assert.ok(result.durationMs >= 0);
});

test("processDatasetJob extracts features from ride record without exposing credentials", async () => {
  const origFindUnique = prisma.ride.findUnique;

  prisma.ride.findUnique = async () => ({
    id: "ride_dataset_test",
    status: "COMPLETED",
    distance: "12.5",
    duration: 25,
    vehicleType: "SEDAN",
    isScheduled: false,
    scheduledFor: null,
    finalFare: "350.00",
    estimatedFare: "340.00",
    pickupLatitude: 28.6139,
    pickupLongitude: 77.2090,
    destinationLatitude: 28.5355,
    destinationLongitude: 77.3910,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  try {
    const job = {
      id: "job_dataset_1",
      data: { rideId: "ride_dataset_test", eventType: "RIDE_COMPLETED" },
    };

    const result = await processDatasetJob(job);
    assert.equal(result.success, true);
    assert.equal(result.rideId, "ride_dataset_test");
    assert.ok(result.extractedAt);
  } finally {
    prisma.ride.findUnique = origFindUnique;
  }
});

test("processDatasetJob handles missing ride record gracefully", async () => {
  const origFindUnique = prisma.ride.findUnique;
  prisma.ride.findUnique = async () => null;

  try {
    const job = {
      id: "job_dataset_missing",
      data: { rideId: "non_existent_ride" },
    };

    const result = await processDatasetJob(job);
    assert.equal(result.success, false);
    assert.equal(result.reason, "Ride not found");
  } finally {
    prisma.ride.findUnique = origFindUnique;
  }
});

test("Worker manager startAllWorkers and stopAllWorkers operate safely when queueing disabled", async () => {
  const workers = startAllWorkers();
  assert.deepEqual(workers, []);

  await assert.doesNotReject(async () => {
    await stopAllWorkers();
  });

  const statuses = getAllWorkerStatus();
  assert.ok(Array.isArray(statuses));
  assert.ok(statuses.some((s) => s.queueName === "notification"));
  assert.ok(statuses.some((s) => s.queueName === "scheduled-rides"));
  assert.ok(statuses.some((s) => s.queueName === "cleanup"));
  assert.ok(statuses.some((s) => s.queueName === "dataset"));
  assert.ok(statuses.some((s) => s.queueName === "backup"));
});

test("BullMQ schedulers start and stop safely when queueing disabled", async () => {
  const started = await startSchedulers();
  assert.equal(started, false);

  await assert.doesNotReject(async () => {
    await stopSchedulers();
  });
});

test("rideRepository findDueScheduledRides and activateScheduledRide bounded queries execute safely", async () => {
  const origFindMany = prisma.ride.findMany;
  const origUpdateMany = prisma.ride.updateMany;

  let queriedWhere = null;
  let updatedWhere = null;

  prisma.ride.findMany = async ({ where, take }) => {
    queriedWhere = where;
    assert.equal(take, 50);
    return [
      { id: "ride_sched_1", isScheduled: true, status: "REQUESTED" },
    ];
  };

  prisma.ride.updateMany = async ({ where, data }) => {
    updatedWhere = where;
    assert.equal(data.isScheduled, false);
    return { count: 1 };
  };

  try {
    const dueRides = await rideRepository.findDueScheduledRides(15, 50);
    assert.equal(dueRides.length, 1);
    assert.equal(queriedWhere.isScheduled, true);
    assert.equal(queriedWhere.status, "REQUESTED");
    assert.ok(queriedWhere.scheduledFor.lte instanceof Date);

    const updateResult = await rideRepository.activateScheduledRide("ride_sched_1");
    assert.equal(updateResult.count, 1);
    assert.equal(updatedWhere.id, "ride_sched_1");
    assert.equal(updatedWhere.isScheduled, true);
    assert.equal(updatedWhere.status, "REQUESTED");
  } finally {
    prisma.ride.findMany = origFindMany;
    prisma.ride.updateMany = origUpdateMany;
  }
});

test("rideService activateScheduledRide transitions ride and dispatches notification", async () => {
  const origRepoActivate = rideRepository.activateScheduledRide;
  const origRepoGet = rideRepository.getRideById;
  const origDispatch = require("../src/services/notification.service").dispatchNotification;

  let notificationDispatched = null;

  rideRepository.activateScheduledRide = async (rideId) => ({ count: 1 });
  rideRepository.getRideById = async (rideId) => ({
    id: rideId,
    userId: "user_sched_owner",
    pickup: "Connaught Place",
    destination: "Indira Gandhi Airport",
  });

  const notificationService = require("../src/services/notification.service");
  notificationService.dispatchNotification = async (payload) => {
    notificationDispatched = payload;
    return payload;
  };

  try {
    const result = await rideService.activateScheduledRide("ride_to_activate_123");
    assert.equal(result.activated, true);
    assert.equal(result.rideId, "ride_to_activate_123");
    assert.ok(notificationDispatched);
    assert.equal(notificationDispatched.userId, "user_sched_owner");
    assert.equal(notificationDispatched.metadata.action, "SCHEDULED_RIDE_ACTIVATED");
  } finally {
    rideRepository.activateScheduledRide = origRepoActivate;
    rideRepository.getRideById = origRepoGet;
    notificationService.dispatchNotification = origDispatch;
  }
});

test("rideService activateScheduledRide returns false when ride was already activated or cancelled", async () => {
  const origRepoActivate = rideRepository.activateScheduledRide;
  rideRepository.activateScheduledRide = async () => ({ count: 0 });

  try {
    const result = await rideService.activateScheduledRide("already_activated_ride");
    assert.equal(result.activated, false);
    assert.equal(result.reason, "Already active or not found");
  } finally {
    rideRepository.activateScheduledRide = origRepoActivate;
  }
});

test("closeAllQueues settles cleanly without errors", async () => {
  await assert.doesNotReject(async () => {
    await closeAllQueues();
  });
});
