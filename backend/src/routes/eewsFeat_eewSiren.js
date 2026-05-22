// EEWS — EEW Siren Gateway routes
// Mount: /api/eews/eew-siren
const router = require('express').Router();
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const db = require('../models');
const { Op } = require('sequelize');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

router.use(auth);

const rlMap = new Map();
function aiRateLimit(req, res, next) {
  const key = req.user ? `u:${req.user.id}` : `ip:${req.ip}`;
  const now = Date.now();
  const win = 60 * 60 * 1000;
  const entry = rlMap.get(key) || { count: 0, reset: now + win };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + win; }
  if (++entry.count > 20) { rlMap.set(key, entry); return res.status(429).json({ error: 'Rate limit exceeded' }); }
  rlMap.set(key, entry);
  next();
}

async function callAI(prompt) {
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message || 'OpenRouter error');
  return data.choices[0].message.content;
}
function parseAIJson(raw) {
  if (!raw) return { raw_response: '' };
  const blk = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blk) { try { return JSON.parse(blk[1].trim()); } catch (_) {} }
  try { return JSON.parse(raw); } catch (_) {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return { raw_response: raw };
}

const M = () => db.SirenActivation;

// ── CRUD ─────────────────────────────────────────────────────────────────────

// 1. list
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const { count, rows } = await M().findAndCountAll({ where, order: [['activatedAt', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. count
router.get('/count', async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.sirenId) where.sirenId = req.query.sirenId;
    res.json({ count: await M().count({ where }) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. search
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { count, rows } = await M().findAndCountAll({
      where: { [Op.or]: [{ sirenId: { [Op.like]: `%${q}%` } }, { sirenLocation: { [Op.like]: `%${q}%` } }, { tonePattern: { [Op.like]: `%${q}%` } }] },
      order: [['activatedAt', 'DESC']], limit, offset: (page - 1) * limit,
    });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. by-event
router.get('/by-event/:pWaveEventId', async (req, res) => {
  try {
    const rows = await M().findAll({ where: { pWaveEventId: req.params.pWaveEventId }, order: [['activatedAt', 'DESC']] });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. by-siren
router.get('/by-siren/:sirenId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { count, rows } = await M().findAndCountAll({ where: { sirenId: req.params.sirenId }, order: [['activatedAt', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. export-csv
router.get('/export/csv', async (req, res) => {
  try {
    const rows = await M().findAll({ order: [['activatedAt', 'DESC']] });
    const fields = ['id', 'sirenId', 'sirenLocation', 'triggerSource', 'tonePattern', 'eventSeverity', 'activatedAt', 'deactivatedAt', 'durationSeconds', 'acousticCoverageM', 'relayStuck', 'status', 'readinessScore', 'createdAt'];
    const csv = [fields.join(','), ...rows.map(r => fields.map(f => `"${r[f] ?? ''}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="siren_activations.csv"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. stats-summary
router.get('/stats/summary', async (req, res) => {
  try {
    const [byStatus, byTone, byTrigger] = await Promise.all([
      M().findAll({ attributes: ['status', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['status'], raw: true }),
      M().findAll({ attributes: ['tonePattern', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['tonePattern'], raw: true }),
      M().findAll({ attributes: ['triggerSource', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['triggerSource'], raw: true }),
    ]);
    res.json({ byStatus, byTone, byTrigger });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 8. batch-create
router.post('/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items[] required' });
    const created = await M().bulkCreate(items, { validate: true });
    res.status(201).json({ data: created, count: created.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 9. batch-update
router.put('/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items[] required' });
    const results = await Promise.all(items.map(async ({ id, ...fields }) => {
      if (!id) return { error: 'missing id' };
      const rec = await M().findByPk(id);
      if (!rec) return { error: 'not found', id };
      return rec.update(fields);
    }));
    res.json({ data: results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 10. batch-delete
router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids[] required' });
    const [count] = await M().update({ status: 'fault' }, { where: { id: { [Op.in]: ids } } });
    res.json({ updated: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 11. import-csv
router.post('/import/csv', async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv required' });
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ error: 'CSV needs header + rows' });
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const items = lines.slice(1).map(line => {
      const vals = line.match(/(".*?"|[^,]+)/g) || [];
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ? vals[i].replace(/^"|"$/g, '').replace(/""/g, '"') : null; });
      return obj;
    });
    const created = await M().bulkCreate(items, { validate: true, ignoreDuplicates: true });
    res.status(201).json({ data: created, count: created.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 12. get by id
router.get('/:id', async (req, res) => {
  try {
    const rec = await M().findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json({ data: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 13. create
router.post('/', async (req, res) => {
  try {
    const rec = await M().create(req.body);
    res.status(201).json({ data: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 14. update
router.put('/:id', async (req, res) => {
  try {
    const rec = await M().findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    await rec.update(req.body);
    res.json({ data: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 15. soft-delete
router.delete('/:id', async (req, res) => {
  try {
    const rec = await M().findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    await rec.update({ status: 'fault' });
    res.json({ data: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 16. archive
router.post('/:id/archive', async (req, res) => {
  try {
    const rec = await M().findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    await rec.update({ status: 'archived' });
    res.json({ data: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 17. restore
router.post('/:id/restore', async (req, res) => {
  try {
    const rec = await M().findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    await rec.update({ status: 'standby' });
    res.json({ data: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 18. history
router.get('/:id/history', async (req, res) => {
  try {
    const rec = await M().findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    const related = await M().findAll({ where: { sirenId: rec.sirenId }, order: [['updatedAt', 'DESC']], limit: 50 });
    res.json({ data: related, sirenId: rec.sirenId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI verbs ──────────────────────────────────────────────────────────────────

router.post('/ai/classify-siren-pattern', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Classify the appropriate siren tone pattern for an emergency event.
Context: ${ctx}
Respond with JSON: { "recommended_pattern": "alert|all_clear|evacuation|test|attack", "duration_s": number, "repetitions": number, "rationale": "...", "alternative_patterns": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-tone-by-event-severity', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Recommend the optimal siren tone and activation parameters based on event severity.
Context: ${ctx}
Respond with JSON: { "severity": "...", "recommended_tone": "...", "volume_db": number, "duration_s": number, "pulse_pattern": "...", "evacuation_tone_needed": true|false }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-siren-failure', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.sirenRecordId ? await M().findByPk(req.body.sirenRecordId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Predict the probability of siren failure for this unit based on maintenance history and operational data.
Data: ${ctx}
Respond with JSON: { "failure_probability_30d": 0-1, "most_likely_failure_mode": "...", "recommended_action": "...", "maintenance_urgency": "routine|soon|immediate" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-acoustic-coverage', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.sirenRecordId ? await M().findByPk(req.body.sirenRecordId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Score the acoustic coverage area of this siren unit considering terrain and obstacles.
Data: ${ctx}
Respond with JSON: { "coverage_score": 0-100, "effective_radius_m": number, "dead_zones": [...], "population_covered": number, "coverage_gaps": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-siren-test-schedule', aiRateLimit, async (req, res) => {
  try {
    const sirens = await M().findAll({ where: { status: { [Op.in]: ['standby', 'active'] } }, limit: 100 });
    const raw = await callAI(`Generate a comprehensive siren network test schedule optimizing coverage validation and public disruption minimization.
Sirens: ${JSON.stringify(sirens.map(s => ({ id: s.id, sirenId: s.sirenId, location: s.sirenLocation, lastTest: s.updatedAt, status: s.status })))}
Respond with JSON: { "test_schedule": [{ "sirenId": "...", "test_date": "...", "test_time_local": "...", "duration_s": number, "prior_public_notice_h": number }], "schedule_rationale": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-siren-events', aiRateLimit, async (req, res) => {
  try {
    const activations = await M().findAll({ order: [['activatedAt', 'DESC']], limit: 100 });
    const raw = await callAI(`Summarize recent siren activation events for operational review.
Data: ${JSON.stringify(activations.map(a => ({ sirenId: a.sirenId, tone: a.tonePattern, trigger: a.triggerSource, severity: a.eventSeverity, activatedAt: a.activatedAt, status: a.status })))}
Respond with JSON: { "summary": "...", "total_activations": number, "test_vs_real": { "tests": number, "real": number }, "faults_detected": number, "coverage_assessment": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-siren-network-status', aiRateLimit, async (req, res) => {
  try {
    const sirens = await M().findAll({ limit: 200 });
    const raw = await callAI(`Validate the operational readiness of the entire siren network.
Network inventory: ${JSON.stringify(sirens.map(s => ({ sirenId: s.sirenId, location: s.sirenLocation, status: s.status, readiness: s.readinessScore, relayStuck: s.relayStuck })))}
Respond with JSON: { "network_ready": true|false, "operational_count": number, "fault_count": number, "readiness_score": 0-100, "critical_gaps": [...], "action_items": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-additional-siren-placement', aiRateLimit, async (req, res) => {
  try {
    const sirens = await M().findAll({ limit: 200 });
    const raw = await callAI(`Suggest additional siren placements to improve coverage gaps in the network.
Existing sirens: ${JSON.stringify(sirens.map(s => ({ sirenId: s.sirenId, lat: s.latitude, lon: s.longitude, coverageM: s.acousticCoverageM })))}
Region context: ${JSON.stringify(req.body)}
Respond with JSON: { "suggested_locations": [{ "lat": number, "lon": number, "priority": "high|medium|low", "coverage_gain_m": number, "rationale": "..." }] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-stuck-relay', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.sirenRecordId ? await M().findByPk(req.body.sirenRecordId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Detect if the siren relay is stuck in an open or closed state based on diagnostic data.
Data: ${ctx}
Respond with JSON: { "stuck_relay_detected": true|false, "state": "open|closed|unknown", "confidence": "high|medium|low", "diagnostic_evidence": [...], "remediation": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-siren-trigger-source', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Classify the source that triggered this siren activation and assess appropriateness.
Context: ${ctx}
Respond with JSON: { "trigger_source": "auto_eew|shakealert|operator|test|manual", "appropriate": true|false, "confidence": "high|medium|low", "notes": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-maintenance-need', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.sirenRecordId ? await M().findByPk(req.body.sirenRecordId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Predict the maintenance needs for this siren unit over the next 90 days.
Data: ${ctx}
Respond with JSON: { "maintenance_predicted": true|false, "predicted_date": "...", "maintenance_type": [...], "estimated_downtime_h": number, "parts_needed": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-redundancy', aiRateLimit, async (req, res) => {
  try {
    const sirens = await M().findAll({ limit: 200 });
    const raw = await callAI(`Recommend redundancy improvements for the siren network to eliminate single points of failure.
Network: ${JSON.stringify(sirens.map(s => ({ sirenId: s.sirenId, location: s.sirenLocation, status: s.status })))}
Respond with JSON: { "redundancy_score": 0-100, "single_points_of_failure": [...], "recommended_redundant_pairs": [...], "power_backup_gaps": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-public-notice-of-test', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Generate a public notice announcement for a planned siren test.
Context (includes test date, time, location, expected duration): ${ctx}
Respond with JSON: { "notice_text": "...", "recommended_distribution_channels": [...], "advance_notice_days": number, "languages": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-siren-readiness', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.sirenRecordId ? await M().findByPk(req.body.sirenRecordId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Score the operational readiness of this siren unit for emergency activation.
Data: ${ctx}
Respond with JSON: { "readiness_score": 0-100, "ready_to_activate": true|false, "blockers": [...], "last_test_result": "...", "estimated_time_to_activate_s": number }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-siren-decommission', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.sirenRecordId ? await M().findByPk(req.body.sirenRecordId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Evaluate whether this siren unit should be decommissioned and replaced.
Data: ${ctx}
Respond with JSON: { "decommission_recommended": true|false, "rationale": "...", "replacement_priority": "low|medium|high", "cost_benefit_summary": "...", "replacement_spec": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-historical-activations', aiRateLimit, async (req, res) => {
  try {
    const activations = await M().findAll({ order: [['activatedAt', 'DESC']], limit: 500 });
    const raw = await callAI(`Summarize historical siren activation patterns and identify trends.
Data: ${JSON.stringify(activations.map(a => ({ sirenId: a.sirenId, tone: a.tonePattern, trigger: a.triggerSource, duration: a.durationSeconds, activatedAt: a.activatedAt })))}
Respond with JSON: { "total_activations": number, "by_trigger_source": {...}, "by_tone_pattern": {...}, "avg_duration_s": number, "trend_observations": [...], "recommendations": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
