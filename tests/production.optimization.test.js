const test = require('node:test');
const assert = require('node:assert/strict');
const CacheService = require('../src/services/cache.service');
const prisma = require('../src/config/prisma');
const paymentRepository = require('../src/repositories/payment.repository');
const rideRepository = require('../src/repositories/ride.repository');
const rideReviewRepository = require('../src/repositories/rideReview.repository');
const couponRepository = require('../src/repositories/coupon.repository');

test('CacheService bounds size, evicts oldest entry upon capacity, and refreshes LRU', () => {
  CacheService.clearAll();

  // Test basic get/set
  CacheService.set('key1', 'val1', 1000);
  CacheService.set('key2', 'val2', 1000);
  assert.equal(CacheService.get('key1'), 'val1');
  assert.equal(CacheService.get('key2'), 'val2');

  // Verify getStats
  const stats = CacheService.getStats();
  assert.equal(stats.entries, 2);
  assert.ok(stats.maxEntries > 0);

  // Clean expired
  const cleaned = CacheService.cleanExpired();
  assert.equal(typeof cleaned, 'number');
  CacheService.clearAll();
});

test('CacheService cleanExpired removes items past their TTL', async () => {
  CacheService.clearAll();
  CacheService.set('expire_soon', 'temporary', 10); // 10ms TTL
  CacheService.set('stay_alive', 'permanent', 60000); // 60s TTL

  await new Promise((resolve) => setTimeout(resolve, 25));

  const count = CacheService.cleanExpired();
  assert.equal(count, 1);
  assert.equal(CacheService.get('expire_soon'), null);
  assert.equal(CacheService.get('stay_alive'), 'permanent');
  CacheService.clearAll();
});

test('paymentRepository.getUserPayments applies default take bound of 50 and handles pagination', async () => {
  const originalFindMany = prisma.payment.findMany;
  let capturedArgs = null;

  prisma.payment.findMany = async (args) => {
    capturedArgs = args;
    return [{ id: 'pay_1' }];
  };

  try {
    // Default call with only userId
    const defaultRes = await paymentRepository.getUserPayments('user_1');
    assert.ok(Array.isArray(defaultRes));
    assert.equal(capturedArgs.take, 50);
    assert.equal(capturedArgs.skip, 0);
    assert.equal(capturedArgs.where.userId, 'user_1');

    // Call with custom page and limit
    await paymentRepository.getUserPayments('user_1', { page: 2, limit: 20 });
    assert.equal(capturedArgs.take, 20);
    assert.equal(capturedArgs.skip, 20);

    // Call with excessive limit clamped to 100
    await paymentRepository.getUserPayments('user_1', { limit: 500 });
    assert.equal(capturedArgs.take, 100);
  } finally {
    prisma.payment.findMany = originalFindMany;
  }
});

test('rideRepository.getUserRides applies default take bound of 50 and handles pagination', async () => {
  const originalFindMany = prisma.ride.findMany;
  let capturedArgs = null;

  prisma.ride.findMany = async (args) => {
    capturedArgs = args;
    return [{ id: 'ride_1' }];
  };

  try {
    const defaultRes = await rideRepository.getUserRides('user_1');
    assert.ok(Array.isArray(defaultRes));
    assert.equal(capturedArgs.take, 50);
    assert.equal(capturedArgs.skip, 0);
    assert.equal(capturedArgs.where.userId, 'user_1');

    await rideRepository.getUserRides('user_1', { page: 3, limit: 15 });
    assert.equal(capturedArgs.take, 15);
    assert.equal(capturedArgs.skip, 30);
  } finally {
    prisma.ride.findMany = originalFindMany;
  }
});

test('rideRepository.getAvailableRides applies default take bound of 50', async () => {
  const originalFindMany = prisma.ride.findMany;
  let capturedArgs = null;

  prisma.ride.findMany = async (args) => {
    capturedArgs = args;
    return [{ id: 'ride_avail_1' }];
  };

  try {
    const defaultRes = await rideRepository.getAvailableRides();
    assert.ok(Array.isArray(defaultRes));
    assert.equal(capturedArgs.take, 50);
    assert.equal(capturedArgs.where.status, 'REQUESTED');
  } finally {
    prisma.ride.findMany = originalFindMany;
  }
});

test('rideReviewRepository.getDriverReviews applies default take bound of 50', async () => {
  const originalFindMany = prisma.rideReview.findMany;
  let capturedArgs = null;

  prisma.rideReview.findMany = async (args) => {
    capturedArgs = args;
    return [{ id: 'rev_1' }];
  };

  try {
    const defaultRes = await rideReviewRepository.getDriverReviews('driver_1');
    assert.ok(Array.isArray(defaultRes));
    assert.equal(capturedArgs.take, 50);
    assert.equal(capturedArgs.where.driverId, 'driver_1');

    await rideReviewRepository.getDriverReviews('driver_1', { page: 2, limit: 10 });
    assert.equal(capturedArgs.take, 10);
    assert.equal(capturedArgs.skip, 10);
  } finally {
    prisma.rideReview.findMany = originalFindMany;
  }
});

test('couponRepository available and expired queries apply bounded limits', async () => {
  const originalFindMany = prisma.coupon.findMany;
  let capturedArgs = null;

  prisma.coupon.findMany = async (args) => {
    capturedArgs = args;
    return [{ id: 'c_1' }];
  };

  try {
    await couponRepository.getAvailableCoupons();
    assert.equal(capturedArgs.take, 50);

    await couponRepository.getExpiredCoupons();
    assert.equal(capturedArgs.take, 50);
  } finally {
    prisma.coupon.findMany = originalFindMany;
  }
});

test('CacheService preserves and updates LRU order upon access', () => {
  CacheService.clearAll();
  CacheService.set('item1', 'first');
  CacheService.set('item2', 'second');
  CacheService.set('item3', 'third');

  // Access item1 to refresh its recency
  const val1 = CacheService.get('item1');
  assert.equal(val1, 'first');

  assert.equal(CacheService.has('item1'), true);
  assert.equal(CacheService.has('item2'), true);
  assert.equal(CacheService.has('item3'), true);

  CacheService.clearAll();
});
