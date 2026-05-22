// EEWS — P-Wave Detection routes
// Mount: /api/eews/p-wave-detection
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

const M = () => db.PWaveEvent;

// ── CRUD ─────────────────────────────────────────────────────────────────────

// 1. list
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const { count, rows } = await M().findAndCountAll({ where, order: [['pArrivalTime', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. count
router.get('/count', async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.region) where.region = req.query.region;
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
      where: { [Op.or]: [{ eventCode: { [Op.like]: `%${q}%` } }, { region: { [Op.like]: `%${q}%` } }, { eventType: { [Op.like]: `%${q}%` } }] },
      order: [['pArrivalTime', 'DESC']], limit, offset: (page - 1) * limit,
    });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. by-event (by eventCode)
router.get('/by-event/:eventCode', async (req, res) => {
  try {
    const rows = await M().findAll({ where: { eventCode: req.params.eventCode }, order: [['pArrivalTime', 'DESC']] });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. by-region
router.get('/by-region/:region', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { count, rows } = await M().findAndCountAll({ where: { region: req.params.region }, order: [['pArrivalTime', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. export-csv
router.get('/export/csv', async (req, res) => {
  try {
    const rows = await M().findAll({ order: [['pArrivalTime', 'DESC']] });
    const fields = ['id', 'eventCode', 'region', 'latitude', 'longitude', 'depth', 'pArrivalTime', 'preliminaryMagnitude', 'finalMagnitude', 'magnitudeType', 'eventType', 'pickConfidence', 'isFalsePick', 'status', 'createdAt'];
    const csv = [fields.join(','), ...rows.map(r => fields.map(f => `"${r[f] ?? ''}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pwave_events.csv"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. stats-summary
router.get('/stats/summary', async (req, res) => {
  try {
    const [byType, byStatus, byMagType] = await Promise.all([
      M().findAll({ attributes: ['eventType', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['eventType'], raw: true }),
      M().findAll({ attributes: ['status', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['status'], raw: true }),
      M().findAll({ attributes: ['magnitudeType', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['magnitudeType'], raw: true }),
    ]);
    res.json({ byType, byStatus, byMagType });
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
    const [count] = await M().update({ status: 'cancelled' }, { where: { id: { [Op.in]: ids } } });
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
    const rec = await M().findByPk(req.params.id, { include: [{ model: db.SeismicFeed, as: 'seismicFeed', required: false }] });
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
    await rec.update({ status: 'cancelled' });
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
    await rec.update({ status: 'detected' });
    res.json({ data: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 18. history
router.get('/:id/history', async (req, res) => {
  try {
    const rec = await M().findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    const related = await M().findAll({ where: { region: rec.region }, order: [['updatedAt', 'DESC']], limit: 50 });
    res.json({ data: related, eventCode: rec.eventCode });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI verbs ──────────────────────────────────────────────────────────────────

router.post('/ai/detect-p-wave-arrival', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Analyze incoming seismic waveform data and detect the P-wave arrival.
Input: ${ctx}
Respond with JSON: { "p_wave_detected": true|false, "arrival_time_utc": "...", "stalta_ratio": number, "confidence": "high|medium|low", "channels_positive": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/estimate-magnitude', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Estimate earthquake magnitude from P-wave data.
Data: ${ctx}
Respond with JSON: { "estimated_magnitude": number, "magnitude_type": "Mw|Ml|Mb|Ms|Md", "uncertainty": number, "method": "...", "stations_used": number }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-event-type', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Classify the seismic event type (tectonic, volcanic, induced, explosion, etc.).
Data: ${ctx}
Respond with JSON: { "event_type": "tectonic|volcanic|induced|explosion|noise|unknown", "confidence": "high|medium|low", "discriminant_features": [...], "rationale": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-final-magnitude', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Predict the final earthquake magnitude based on early P-wave signals.
Data: ${ctx}
Respond with JSON: { "predicted_final_mw": number, "lower_bound": number, "upper_bound": number, "prediction_basis": "...", "update_expected": true|false }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-additional-stations', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Recommend additional seismic stations to include for more precise event location and magnitude.
Event: ${ctx}
Respond with JSON: { "recommended_stations": [{ "stationCode": "...", "networkCode": "...", "expected_benefit": "..." }], "rationale": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-pick-confidence', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Score the confidence of this P-wave phase pick.
Data: ${ctx}
Respond with JSON: { "confidence_score": 0-100, "pick_quality": "excellent|good|fair|poor", "uncertainty_s": number, "issues": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-event-narrative', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Generate a public-facing earthquake event narrative for emergency managers.
Data: ${ctx}
Respond with JSON: { "narrative": "...", "key_facts": [...], "hazard_level": "low|moderate|high|extreme", "public_guidance": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-pick-quality', aiRateLimit, async (req, res) => {
  try {
    const events = await M().findAll({ order: [['createdAt', 'DESC']], limit: 50 });
    const raw = await callAI(`Summarize pick quality across recent P-wave detection events.
Recent events: ${JSON.stringify(events.map(e => ({ id: e.id, pickConfidence: e.pickConfidence, isFalsePick: e.isFalsePick, staltaRatio: e.staltaRatio })))}
Respond with JSON: { "summary": "...", "avg_confidence": number, "false_pick_rate": number, "quality_trend": "improving|stable|degrading", "actions": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-stalta-threshold', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Validate whether the STA/LTA threshold settings are appropriate for current network conditions.
Settings/context: ${ctx}
Respond with JSON: { "current_threshold": number, "recommended_threshold": number, "false_positive_risk": "low|medium|high", "false_negative_risk": "low|medium|high", "rationale": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-template-match', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Suggest template waveforms for template-matching detection to improve sensitivity for this region.
Context: ${ctx}
Respond with JSON: { "template_events": [...], "cross_correlation_threshold": number, "expected_detection_improvement": "...", "caveats": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-false-pick', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Determine if this P-wave pick is likely a false detection.
Data: ${ctx}
Respond with JSON: { "is_false_pick": true|false, "confidence": "high|medium|low", "evidence": [...], "recommended_action": "confirm|discard|review" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-source-mechanism', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Classify the source mechanism of this seismic event.
Data: ${ctx}
Respond with JSON: { "mechanism": "...", "fault_type": "strike_slip|reverse|normal|oblique|unknown", "focal_mechanism_description": "...", "tsunami_potential": true|false }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-aftershock-rate', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Predict the expected aftershock rate using Omori-Utsu law parameters.
Mainshock data: ${ctx}
Respond with JSON: { "expected_aftershocks_24h": number, "expected_aftershocks_7d": number, "largest_expected_magnitude": number, "omori_k": number, "omori_p": number, "omori_c": number }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-magnitude-method', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Recommend the optimal magnitude estimation method for this event and network configuration.
Context: ${ctx}
Respond with JSON: { "recommended_method": "Mw|Ml|Mb|Ms|Md|other", "rationale": "...", "alternative_methods": [...], "expected_accuracy": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-eq-bulletin', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Generate a formal earthquake bulletin in standard format.
Event data: ${ctx}
Respond with JSON: { "bulletin": "...", "event_id": "...", "magnitude": number, "location": "...", "depth_km": number, "origin_time": "...", "intensity_scale": "...", "issued_at": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-detection-latency', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.eventId ? await M().findByPk(req.body.eventId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Score the EEW detection latency for this event against performance benchmarks.
Data: ${ctx}
Respond with JSON: { "detection_latency_ms": number, "benchmark_ms": number, "performance_grade": "A|B|C|D|F", "contributing_factors": [...], "improvement_suggestions": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
