// EEWS — ShakeAlert Gateway routes
// Mount: /api/eews/shake-alert-gateway
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

const M = () => db.ShakeAlertMessage;

// ── CRUD ─────────────────────────────────────────────────────────────────────

// 1. list
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.source) where.source = req.query.source;
    const { count, rows } = await M().findAndCountAll({ where, order: [['receivedAt', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. count
router.get('/count', async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.source) where.source = req.query.source;
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
      where: { [Op.or]: [{ messageId: { [Op.like]: `%${q}%` } }, { source: { [Op.like]: `%${q}%` } }, { regionalMapping: { [Op.like]: `%${q}%` } }] },
      order: [['receivedAt', 'DESC']], limit, offset: (page - 1) * limit,
    });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. by-event
router.get('/by-event/:pWaveEventId', async (req, res) => {
  try {
    const rows = await M().findAll({ where: { pWaveEventId: req.params.pWaveEventId }, order: [['receivedAt', 'DESC']] });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. by-source
router.get('/by-source/:source', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { count, rows } = await M().findAndCountAll({ where: { source: req.params.source }, order: [['receivedAt', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. export-csv
router.get('/export/csv', async (req, res) => {
  try {
    const rows = await M().findAll({ order: [['receivedAt', 'DESC']] });
    const fields = ['id', 'messageId', 'source', 'eventQualityBand', 'magnitude', 'latitude', 'longitude', 'depth', 'originTime', 'receivedAt', 'endToEndLatencyMs', 'isDuplicate', 'revisionNeeded', 'suppressedDownstream', 'reliabilityScore', 'status', 'createdAt'];
    const csv = [fields.join(','), ...rows.map(r => fields.map(f => `"${r[f] ?? ''}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="shakealert_messages.csv"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. stats-summary
router.get('/stats/summary', async (req, res) => {
  try {
    const [bySource, byStatus, byQualityBand] = await Promise.all([
      M().findAll({ attributes: ['source', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['source'], raw: true }),
      M().findAll({ attributes: ['status', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['status'], raw: true }),
      M().findAll({ attributes: ['eventQualityBand', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['eventQualityBand'], raw: true }),
    ]);
    res.json({ bySource, byStatus, byQualityBand });
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
    const [count] = await M().update({ status: 'suppressed' }, { where: { id: { [Op.in]: ids } } });
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
    const rec = await M().findByPk(req.params.id, { include: [{ model: db.PWaveEvent, as: 'pWaveEvent', required: false }] });
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
    await rec.update({ status: 'suppressed' });
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
    await rec.update({ status: 'received' });
    res.json({ data: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 18. history
router.get('/:id/history', async (req, res) => {
  try {
    const rec = await M().findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    const related = await M().findAll({ where: { source: rec.source }, order: [['updatedAt', 'DESC']], limit: 50 });
    res.json({ data: related, source: rec.source });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI verbs ──────────────────────────────────────────────────────────────────

router.post('/ai/classify-shakealert-event-message', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.messageId ? await M().findByPk(req.body.messageId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Classify this ShakeAlert event message by type, quality, and actionability.
Message data: ${ctx}
Respond with JSON: { "message_type": "initial|update|cancellation|test", "actionable": true|false, "quality_band": "A|B|C|D", "classification_notes": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-shakealert-cap', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.messageId ? await M().findByPk(req.body.messageId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Validate the CAP (Common Alerting Protocol) XML in this ShakeAlert message.
Data: ${ctx}
Respond with JSON: { "valid": true|false, "cap_version": "...", "validation_errors": [...], "required_fields_missing": [...], "conformance_score": 0-100 }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-message-delay', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Predict end-to-end message delivery delay for ShakeAlert messages under current network conditions.
Context: ${ctx}
Respond with JSON: { "predicted_delay_ms": number, "delay_components": { "seismic_processing_ms": number, "network_transit_ms": number, "distribution_ms": number }, "delay_risk": "low|medium|high", "mitigation": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-message-republication', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.messageId ? await M().findByPk(req.body.messageId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Recommend whether this ShakeAlert message should be republished to downstream systems.
Data: ${ctx}
Respond with JSON: { "republish_recommended": true|false, "target_systems": [...], "modifications_needed": [...], "urgency": "immediate|routine|none", "rationale": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-message-reliability', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.messageId ? await M().findByPk(req.body.messageId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Score the reliability and trustworthiness of this ShakeAlert message.
Data: ${ctx}
Respond with JSON: { "reliability_score": 0-100, "source_trust": "high|medium|low", "data_consistency": true|false, "anomalies_detected": [...], "recommend_action": "use|review|discard" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-bridge-translation', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.messageId ? await M().findByPk(req.body.messageId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Generate a bridge translation of this ShakeAlert CAP message into a local EEW system format.
Data: ${ctx}
Respond with JSON: { "translated_message": {...}, "target_format": "...", "field_mappings": [...], "warnings": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-shakealert-events', aiRateLimit, async (req, res) => {
  try {
    const messages = await M().findAll({ order: [['receivedAt', 'DESC']], limit: 100 });
    const raw = await callAI(`Summarize recent ShakeAlert event messages for operational awareness.
Messages: ${JSON.stringify(messages.map(m => ({ id: m.id, source: m.source, magnitude: m.magnitude, qualityBand: m.eventQualityBand, isDuplicate: m.isDuplicate, latency: m.endToEndLatencyMs, status: m.status })))}
Respond with JSON: { "summary": "...", "total_messages": number, "by_source": {...}, "avg_latency_ms": number, "duplicate_rate": number, "quality_distribution": {...} }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-regional-mapping', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Suggest improved regional mapping configuration for ShakeAlert message distribution.
Context: ${ctx}
Respond with JSON: { "current_mapping": "...", "suggested_mapping": "...", "improvement_rationale": "...", "affected_regions": [...], "implementation_steps": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-message-duplicate', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.messageId ? await M().findByPk(req.body.messageId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Detect if this ShakeAlert message is a duplicate of a previously processed message.
Data: ${ctx}
Respond with JSON: { "is_duplicate": true|false, "duplicate_of_id": "...", "match_criteria": [...], "confidence": "high|medium|low", "recommended_action": "suppress|accept|review" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-event-quality-band', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.messageId ? await M().findByPk(req.body.messageId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Classify the ShakeAlert event quality band based on network coverage and detection confidence.
Data: ${ctx}
Respond with JSON: { "quality_band": "A|B|C|D|unknown", "rationale": "...", "limiting_factors": [...], "actionability": "full|partial|none" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-revision-needed', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.messageId ? await M().findByPk(req.body.messageId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Predict whether this ShakeAlert message is likely to be revised with updated parameters.
Data: ${ctx}
Respond with JSON: { "revision_predicted": true|false, "revision_probability": 0-1, "expected_revision_within_s": number, "likely_changes": [...], "hold_downstream": true|false }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-downstream-suppression', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.messageId ? await M().findByPk(req.body.messageId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Recommend whether to suppress this ShakeAlert message from downstream distribution.
Data: ${ctx}
Respond with JSON: { "suppress": true|false, "suppression_reason": "...", "affected_systems": [...], "override_possible": true|false, "confidence": "high|medium|low" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-operator-narrative', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.messageId ? await M().findByPk(req.body.messageId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Generate an operator narrative for this ShakeAlert event message.
Data: ${ctx}
Respond with JSON: { "narrative": "...", "key_metrics": {...}, "action_items": [...], "watch_points": [...], "generated_at": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-end-to-end-latency', aiRateLimit, async (req, res) => {
  try {
    const messages = await M().findAll({ order: [['receivedAt', 'DESC']], limit: 50 });
    const raw = await callAI(`Score and analyze end-to-end latency performance across recent ShakeAlert messages.
Data: ${JSON.stringify(messages.map(m => ({ id: m.id, source: m.source, latencyMs: m.endToEndLatencyMs, receivedAt: m.receivedAt })))}
Respond with JSON: { "avg_latency_ms": number, "p95_latency_ms": number, "performance_grade": "A|B|C|D|F", "latency_trend": "improving|stable|degrading", "bottlenecks": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-failover-source', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Suggest a failover ShakeAlert source if the primary source becomes unavailable.
Context: ${ctx}
Respond with JSON: { "primary_source": "...", "failover_source": "...", "failover_rationale": "...", "transition_steps": [...], "expected_data_quality_delta": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-shakealert-vs-local', aiRateLimit, async (req, res) => {
  try {
    const shakeMessages = await M().findAll({ order: [['receivedAt', 'DESC']], limit: 50 });
    const localEvents = await db.PWaveEvent.findAll({ order: [['pArrivalTime', 'DESC']], limit: 50 });
    const raw = await callAI(`Compare ShakeAlert messages against locally detected events to identify discrepancies.
ShakeAlert messages: ${JSON.stringify(shakeMessages.map(m => ({ magnitude: m.magnitude, lat: m.latitude, lon: m.longitude, originTime: m.originTime, quality: m.eventQualityBand })))}
Local detections: ${JSON.stringify(localEvents.map(e => ({ magnitude: e.finalMagnitude || e.preliminaryMagnitude, lat: e.latitude, lon: e.longitude, pArrival: e.pArrivalTime, eventCode: e.eventCode })))}
Respond with JSON: { "comparison_summary": "...", "matches": number, "discrepancies": [...], "shakealert_lead_time_avg_s": number, "local_unique_events": number, "recommendations": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
