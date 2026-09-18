const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateDiscount,
  normalizeRideFare,
  updateCoupon,
  createCoupon,
  deleteCoupon,
  activateCoupon,
  deactivateCoupon,
  getAllCoupons,
} = require('../src/services/coupon.service');
const couponRepository = require('../src/repositories/coupon.repository');
const { BadRequestError } = require('../src/utils/AppError');

test('calculateDiscount returns a safe zero fare when the input fare is invalid', () => {
  const coupon = {
    type: 'FLAT',
    discountValue: 100,
  };

  const discount = calculateDiscount(coupon, undefined);

  assert.equal(discount.originalFare, 0);
  assert.equal(discount.discountAmount, 0);
  assert.equal(discount.finalFare, 0);
});

test('normalizeRideFare falls back to the estimated fare when final fare is missing', () => {
  const ride = {
    finalFare: undefined,
    estimatedFare: 250,
  };

  assert.equal(normalizeRideFare(ride.finalFare), 0);
  assert.equal(normalizeRideFare(ride.estimatedFare), 250);
});

test('updateCoupon rejects discountValue > 100 on an existing PERCENTAGE coupon', async () => {
  const originalGetCoupon = couponRepository.getCouponById;
  couponRepository.getCouponById = async () => ({
    id: 'c1',
    code: 'PERCENT20',
    type: 'PERCENTAGE',
    discountValue: 20,
    maximumDiscount: 50,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
  });

  try {
    await assert.rejects(
      async () => {
        await updateCoupon('c1', { discountValue: 150 });
      },
      (err) => err instanceof BadRequestError && err.message === 'Percentage discount cannot exceed 100%.'
    );
  } finally {
    couponRepository.getCouponById = originalGetCoupon;
  }
});

test('updateCoupon rejects type change to PERCENTAGE when existing discountValue is 200', async () => {
  const originalGetCoupon = couponRepository.getCouponById;
  couponRepository.getCouponById = async () => ({
    id: 'c2',
    code: 'FLAT200',
    type: 'FLAT',
    discountValue: 200,
    maximumDiscount: null,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
  });

  try {
    await assert.rejects(
      async () => {
        await updateCoupon('c2', { type: 'PERCENTAGE' });
      },
      (err) => err instanceof BadRequestError && err.message === 'Percentage discount cannot exceed 100%.'
    );
  } finally {
    couponRepository.getCouponById = originalGetCoupon;
  }
});

test('getAllCoupons passes pagination and filters to repository and returns structured pagination', async () => {
  const originalGetAllCoupons = couponRepository.getAllCoupons;
  couponRepository.getAllCoupons = async (queryParams) => {
    assert.equal(queryParams.page, 1);
    assert.equal(queryParams.limit, 10);
    assert.equal(queryParams.search, 'TEST');
    assert.equal(queryParams.type, 'PERCENTAGE');
    assert.equal(queryParams.isActive, 'true');
    return {
      data: [{ id: 'c1', code: 'TEST20', type: 'PERCENTAGE', isActive: true }],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    };
  };

  try {
    const res = await getAllCoupons({
      page: 1,
      limit: 10,
      search: 'TEST',
      type: 'PERCENTAGE',
      isActive: 'true',
    });

    assert.equal(res.data.length, 1);
    assert.equal(res.pagination.page, 1);
    assert.equal(res.pagination.total, 1);
  } finally {
    couponRepository.getAllCoupons = originalGetAllCoupons;
  }
});

test('createCoupon, updateCoupon, activateCoupon, deactivateCoupon, deleteCoupon emit AuditLogs', async () => {
  const auditLogs = [];
  const origCreateAuditLog = couponRepository.createAuditLog;
  const origGetCouponByCode = couponRepository.getCouponByCode;
  const origCreateCoupon = couponRepository.createCoupon;
  const origGetCouponById = couponRepository.getCouponById;
  const origUpdateCoupon = couponRepository.updateCoupon;
  const origActivateCoupon = couponRepository.activateCoupon;
  const origDeactivateCoupon = couponRepository.deactivateCoupon;
  const origDeleteCoupon = couponRepository.deleteCoupon;

  couponRepository.createAuditLog = async (data) => {
    auditLogs.push(data);
    return { id: 'audit1', ...data };
  };
  couponRepository.getCouponByCode = async () => null;
  couponRepository.createCoupon = async (data) => ({ id: 'c100', ...data });
  couponRepository.getCouponById = async () => ({
    id: 'c100',
    code: 'NEWCOUPON',
    type: 'FLAT',
    discountValue: 50,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
    isActive: true,
  });
  couponRepository.updateCoupon = async (id, data) => ({ id, ...data });
  couponRepository.activateCoupon = async (id) => ({ id, isActive: true });
  couponRepository.deactivateCoupon = async (id) => ({ id, isActive: false });
  couponRepository.deleteCoupon = async (id) => ({ id });

  try {
    // TEST F — Audit on Create
    await createCoupon('admin123', {
      code: 'NEWCOUPON',
      type: 'FLAT',
      discountValue: 50,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
    });
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, 'CREATE');
    assert.equal(auditLogs[0].adminId, 'admin123');
    assert.equal(auditLogs[0].entity, 'COUPON');

    // TEST G — Audit on Update
    await updateCoupon('admin123', 'c100', { discountValue: 60 });
    assert.equal(auditLogs.length, 2);
    assert.equal(auditLogs[1].action, 'UPDATE');
    assert.equal(auditLogs[1].adminId, 'admin123');

    // TEST H — Audit on Activate & Deactivate
    await activateCoupon('admin123', 'c100');
    assert.equal(auditLogs.length, 3);
    assert.equal(auditLogs[2].action, 'ACTIVATE');

    await deactivateCoupon('admin123', 'c100');
    assert.equal(auditLogs.length, 4);
    assert.equal(auditLogs[3].action, 'SUSPEND');

    // TEST I — Audit on Delete
    await deleteCoupon('admin123', 'c100');
    assert.equal(auditLogs.length, 5);
    assert.equal(auditLogs[4].action, 'DELETE');
    assert.equal(auditLogs[4].adminId, 'admin123');
  } finally {
    couponRepository.createAuditLog = origCreateAuditLog;
    couponRepository.getCouponByCode = origGetCouponByCode;
    couponRepository.createCoupon = origCreateCoupon;
    couponRepository.getCouponById = origGetCouponById;
    couponRepository.updateCoupon = origUpdateCoupon;
    couponRepository.activateCoupon = origActivateCoupon;
    couponRepository.deactivateCoupon = origDeactivateCoupon;
    couponRepository.deleteCoupon = origDeleteCoupon;
  }
});

