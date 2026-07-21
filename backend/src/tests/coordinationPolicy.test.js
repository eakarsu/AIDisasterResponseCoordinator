const assert = require('node:assert/strict');
const test = require('node:test');
const { assertTransition, assessSource, prioritizeNeed } = require('../services/coordinationPolicy');

test('rejects skipping command approval', () => {
  assert.throws(() => assertTransition('draft', 'dispatched'), /cannot transition/);
  assert.doesNotThrow(() => assertTransition('draft', 'approved'));
});

test('flags stale and low-confidence reports for verification', () => {
  const now = new Date('2026-07-18T12:00:00Z');
  assert.equal(assessSource({ observedAt: '2026-07-18T10:00:00Z', confidence: 0.9, now }).stale, true);
  assert.equal(assessSource({ observedAt: '2026-07-18T11:55:00Z', confidence: 0.4, now }).requiresVerification, true);
});

test('priority is deterministic and penalizes stale information', () => {
  const current = prioritizeNeed({ severity: 5, affectedPeople: 1000, sourceConfidence: 0.9, stale: false });
  const stale = prioritizeNeed({ severity: 5, affectedPeople: 1000, sourceConfidence: 0.9, stale: true });
  assert.ok(current > stale);
  assert.equal(current, prioritizeNeed({ severity: 5, affectedPeople: 1000, sourceConfidence: 0.9, stale: false }));
});

