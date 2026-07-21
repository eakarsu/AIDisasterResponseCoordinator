const ASSIGNMENT_TRANSITIONS = Object.freeze({
  draft: ['approved', 'cancelled'],
  approved: ['dispatched', 'cancelled'],
  dispatched: ['acknowledged', 'failed'],
  acknowledged: ['completed', 'failed'],
  failed: ['draft', 'cancelled'],
  completed: [],
  cancelled: [],
});

function assertTransition(from, to) {
  if (!(ASSIGNMENT_TRANSITIONS[from] || []).includes(to)) {
    throw new Error(`Assignment cannot transition from ${from} to ${to}`);
  }
}

function assessSource({ observedAt, confidence, now = new Date(), maxAgeMinutes = 30 }) {
  const parsed = new Date(observedAt);
  if (Number.isNaN(parsed.getTime())) throw new Error('observedAt must be an ISO timestamp');
  const normalizedConfidence = Number(confidence);
  if (normalizedConfidence < 0 || normalizedConfidence > 1) throw new Error('confidence must be between 0 and 1');
  const ageMinutes = (now.getTime() - parsed.getTime()) / 60000;
  return {
    stale: ageMinutes > maxAgeMinutes,
    confidence: normalizedConfidence,
    requiresVerification: ageMinutes > maxAgeMinutes || normalizedConfidence < 0.7,
  };
}

function prioritizeNeed({ severity, affectedPeople, sourceConfidence, stale }) {
  const s = Math.max(1, Math.min(5, Number(severity)));
  const population = Math.max(0, Number(affectedPeople || 0));
  const confidence = Math.max(0, Math.min(1, Number(sourceConfidence)));
  const score = Math.round((s * 20 + Math.min(40, Math.log10(population + 1) * 10)) * confidence - (stale ? 20 : 0));
  return Math.max(0, Math.min(100, score));
}

module.exports = { ASSIGNMENT_TRANSITIONS, assertTransition, assessSource, prioritizeNeed };

