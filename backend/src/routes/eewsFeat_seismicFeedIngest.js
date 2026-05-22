// EEWS — Seismic Feed Ingest routes
// Mount: /api/eews/seismic-feed-ingest
const router = require('express').Router();
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const db = require('../models');
const { Op } = require('sequelize');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

router.use(auth);

// ── Rate limiter ─────────────────────────────────────────────────────────────
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

// ── AI helper ────────────────────────────────────────────────────────────────
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

const M = () => db.SeismicFeed;

// ── CRUD ─────────────────────────────────────────────────────────────────────

// 1. list
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const { count, rows } = await M().findAndCountAll({ where, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. count
router.get('/count', async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.networkCode) where.networkCode = req.query.networkCode;
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
      where: { [Op.or]: [{ stationCode: { [Op.like]: `%${q}%` } }, { networkCode: { [Op.like]: `%${q}%` } }, { operatorOrg: { [Op.like]: `%${q}%` } }] },
      order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit,
    });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. by-network
router.get('/by-network/:networkCode', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { count, rows } = await M().findAndCountAll({ where: { networkCode: req.params.networkCode }, order: [['stationCode', 'ASC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. by-status
router.get('/by-status/:status', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { count, rows } = await M().findAndCountAll({ where: { status: req.params.status }, order: [['lastHeartbeat', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. export-csv
router.get('/export/csv', async (req, res) => {
  try {
    const rows = await M().findAll({ order: [['stationCode', 'ASC']] });
    const fields = ['id', 'stationCode', 'networkCode', 'channelCode', 'protocol', 'status', 'latencyMs', 'qualityScore', 'lastHeartbeat', 'createdAt'];
    const csv = [fields.join(','), ...rows.map(r => fields.map(f => `"${r[f] ?? ''}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="seismic_feeds.csv"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. stats-summary
router.get('/stats/summary', async (req, res) => {
  try {
    const [byStatus, byProtocol, byInstrument] = await Promise.all([
      M().findAll({ attributes: ['status', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['status'], raw: true }),
      M().findAll({ attributes: ['protocol', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['protocol'], raw: true }),
      M().findAll({ attributes: ['instrumentType', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['instrumentType'], raw: true }),
    ]);
    res.json({ byStatus, byProtocol, byInstrument });
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
    const [count] = await M().update({ status: 'offline' }, { where: { id: { [Op.in]: ids } } });
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
    await rec.update({ status: 'offline' });
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
    await rec.update({ status: 'active' });
    res.json({ data: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 18. history (audit log pattern - recent updates for this station)
router.get('/:id/history', async (req, res) => {
  try {
    const rec = await M().findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    const related = await M().findAll({ where: { networkCode: rec.networkCode }, order: [['updatedAt', 'DESC']], limit: 50 });
    res.json({ data: related, stationCode: rec.stationCode });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI verbs ──────────────────────────────────────────────────────────────────

router.post('/ai/detect-feed-drop', aiRateLimit, async (req, res) => {
  try {
    const { feedId } = req.body;
    const feed = feedId ? await M().findByPk(feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Analyze seismic feed data and detect whether the feed has dropped or is at risk of dropping.
Feed context: ${ctx}
Respond with JSON: { "drop_detected": true|false, "confidence": "high|medium|low", "last_heartbeat_age_s": number, "probable_cause": "...", "recommended_action": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-station-quality', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Classify the quality tier of this seismic station feed.
Data: ${ctx}
Respond with JSON: { "quality_tier": "A|B|C|D|F", "score": 0-100, "issues": [...], "recommendations": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-feed-latency', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Predict expected feed latency trend for this seismic station.
Data: ${ctx}
Respond with JSON: { "predicted_latency_ms": number, "trend": "improving|stable|degrading", "risk_flag": true|false, "rationale": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-backup-station', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Recommend backup seismic stations for this feed in case of failure.
Data: ${ctx}
Respond with JSON: { "backup_stations": [{ "stationCode": "...", "networkCode": "...", "rationale": "..." }], "failover_strategy": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-feed-completeness', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Score the data completeness of this seismic feed over a rolling window.
Data: ${ctx}
Respond with JSON: { "completeness_score": 0-100, "gap_rate_percent": number, "missing_channels": [...], "impact_on_eew": "low|moderate|high" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-feed-health-report', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Generate a comprehensive feed health report for this seismic station.
Data: ${ctx}
Respond with JSON: { "report_title": "...", "executive_summary": "...", "metrics": {...}, "issues_found": [...], "recommendations": [...], "generated_at": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-network-status', aiRateLimit, async (req, res) => {
  try {
    const feeds = await M().findAll({ order: [['stationCode', 'ASC']], limit: 100 });
    const raw = await callAI(`Summarize the overall status of this seismic network for operators.
Network data (${feeds.length} stations): ${JSON.stringify(feeds.map(f => ({ id: f.id, station: f.stationCode, network: f.networkCode, status: f.status, latency: f.latencyMs, quality: f.qualityScore })))}
Respond with JSON: { "summary": "...", "online_count": number, "degraded_count": number, "offline_count": number, "critical_issues": [...], "overall_health": "good|fair|poor" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-station-metadata', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Validate station metadata completeness and correctness for FDSN/miniSEED compliance.
Data: ${ctx}
Respond with JSON: { "valid": true|false, "missing_fields": [...], "invalid_values": [...], "compliance_score": 0-100, "notes": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-station-calibration', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Suggest calibration actions for this seismic station based on its current metrics.
Data: ${ctx}
Respond with JSON: { "calibration_needed": true|false, "urgency": "routine|soon|immediate", "suggested_steps": [...], "expected_improvement": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-noise-burst', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Detect if this seismic feed is experiencing noise bursts that could affect EEW accuracy.
Data: ${ctx}
Respond with JSON: { "noise_burst_detected": true|false, "probable_source": "...", "affected_channels": [...], "recommended_action": "...", "estimated_duration_s": number }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-instrument-type', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Classify the seismometer instrument type based on available metadata.
Data: ${ctx}
Respond with JSON: { "classified_type": "broadband|short_period|strong_motion|MEMS|infrasound|other", "confidence": "high|medium|low", "frequency_range_hz": "...", "suitable_for_eew": true|false }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-data-gap', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Predict likelihood and timing of the next data gap for this seismic feed.
Data: ${ctx}
Respond with JSON: { "gap_probability_24h": 0-1, "predicted_gap_start": "ISO8601 or null", "probable_cause": "...", "prevention_steps": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-network-densification', aiRateLimit, async (req, res) => {
  try {
    const feeds = await M().findAll({ limit: 200 });
    const raw = await callAI(`Recommend locations for additional seismic stations to densify this monitoring network.
Current stations: ${JSON.stringify(feeds.map(f => ({ station: f.stationCode, lat: f.latitude, lon: f.longitude, network: f.networkCode })))}
Context: ${JSON.stringify(req.body)}
Respond with JSON: { "recommended_locations": [{ "lat": number, "lon": number, "priority": "high|medium|low", "rationale": "..." }], "coverage_gaps": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-station-config', aiRateLimit, async (req, res) => {
  try {
    const feed = req.body.feedId ? await M().findByPk(req.body.feedId) : null;
    const ctx = feed ? JSON.stringify(feed) : JSON.stringify(req.body);
    const raw = await callAI(`Generate a recommended station configuration for this seismic instrument.
Data: ${ctx}
Respond with JSON: { "config_template": {...}, "seedlink_settings": {...}, "fdsn_settings": {...}, "recommended_sample_rate_hz": number, "notes": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-redundancy', aiRateLimit, async (req, res) => {
  try {
    const feeds = await M().findAll({ limit: 200 });
    const raw = await callAI(`Score the redundancy level of this seismic network for EEW operations.
Stations: ${JSON.stringify(feeds.map(f => ({ station: f.stationCode, lat: f.latitude, lon: f.longitude, status: f.status, backup: f.backupStationCode })))}
Respond with JSON: { "redundancy_score": 0-100, "single_points_of_failure": [...], "resilience_rating": "high|medium|low", "improvement_actions": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-feed-anomalies', aiRateLimit, async (req, res) => {
  try {
    const feeds = await M().findAll({ where: { status: { [Op.in]: ['degraded', 'offline'] } }, limit: 50 });
    const raw = await callAI(`Summarize feed anomalies currently affecting the seismic network.
Anomalous feeds: ${JSON.stringify(feeds)}
Respond with JSON: { "summary": "...", "critical_anomalies": [...], "degraded_stations": [...], "estimated_eew_impact": "none|minor|moderate|severe" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
