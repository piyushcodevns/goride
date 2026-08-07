const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateDiscount, normalizeRideFare } = require('../src/services/coupon.service');

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
