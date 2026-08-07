const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getQueueName,
  buildNotificationJob,
  getQueueHealth,
} = require('../src/queues/notification.queue');

test('getQueueName returns the right queue for retry jobs', () => {
  assert.equal(getQueueName('retry'), 'notification-retry');
  assert.equal(getQueueName('scheduled'), 'notification-scheduled');
  assert.equal(getQueueName('default'), 'notification');
});

test('buildNotificationJob includes delivery metadata and retry configuration', () => {
  const job = buildNotificationJob({
    notificationId: 'notif_1',
    userId: 'user_1',
    channel: 'EMAIL',
  });

  assert.equal(job.queueName, 'notification');
  assert.equal(job.data.notificationId, 'notif_1');
  assert.equal(job.data.channel, 'EMAIL');
  assert.equal(job.options.attempts, 3);
  assert.equal(job.options.removeOnComplete, true);
});

test('getQueueHealth returns a safe status when queueing is disabled', async () => {
  process.env.NOTIFICATION_QUEUE_ENABLED = 'false';
  const health = await getQueueHealth();
  assert.equal(health.healthy, false);
  assert.equal(health.queueEnabled, false);
});
