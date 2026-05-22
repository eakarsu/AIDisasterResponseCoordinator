// EEWS — Tsunami Propagation routes
// Mount: /api/eews/tsunami-propagation
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

const M = () => db.TsunamiModel;

// ── CRUD ─────────────────────────────────────────────────────────────────────

// 1. list
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const { count, rows } = await M().findAndCountAll({ where, order: [['modelRunAt', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. count
router.get('/count', async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.warningLevel) where.warningLevel = req.query.warningLevel;
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
      where: { [Op.or]: [{ region: { [Op.like]: `%${q}%` } }, { sourceType: { [Op.like]: `%${q}%` } }, { bathymetryDataset: { [Op.like]: `%${q}%` } }] },
      order: [['modelRunAt', 'DESC']], limit, offset: (page - 1) * limit,
    });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. by-event
router.get('/by-event/:pWaveEventId', async (req, res) => {
  try {
    const rows = await M().findAll({ where: { pWaveEventId: req.params.pWaveEventId }, order: [['modelRunAt', 'DESC']] });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. by-region
router.get('/by-region/:region', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { count, rows } = await M().findAndCountAll({ where: { region: req.params.region }, order: [['modelRunAt', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. export-csv
router.get('/export/csv', async (req, res) => {
  try {
    const rows = await M().findAll({ order: [['modelRunAt', 'DESC']] });
    const fields = ['id', 'pWaveEventId', 'region', 'sourceType', 'estimatedMaxRunup', 'wavePeriodSeconds', 'modelConfidence', 'warningLevel', 'status', 'modelRunAt', 'createdAt'];
    const csv = [fields.join(','), ...rows.map(r => fields.map(f => `"${r[f] ?? ''}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tsunami_models.csv"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. stats-summary
router.get('/stats/summary', async (req, res) => {
  try {
    const [byWarning, bySource, byStatus] = await Promise.all([
      M().findAll({ attributes: ['warningLevel', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['warningLevel'], raw: true }),
      M().findAll({ attributes: ['sourceType', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['sourceType'], raw: true }),
      M().findAll({ attributes: ['status', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['status'], raw: true }),
    ]);
    res.json({ byWarning, bySource, byStatus });
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
    await rec.update({ status: 'modelling' });
    res.json({ data: rec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 18. history
router.get('/:id/history', async (req, res) => {
  try {
    const rec = await M().findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    const related = await M().findAll({ where: { region: rec.region }, order: [['updatedAt', 'DESC']], limit: 50 });
    res.json({ data: related, region: rec.region });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AI verbs ──────────────────────────────────────────────────────────────────

router.post('/ai/model-tsunami-arrival', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.modelId ? await M().findByPk(req.body.modelId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Model tsunami wave arrival times for coastal locations based on earthquake source parameters.
Data: ${ctx}
Respond with JSON: { "coastal_arrivals": [{ "location": "...", "eta_utc": "...", "estimated_wave_height_m": number }], "first_arrival_location": "...", "first_arrival_utc": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-tsunami-source', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Classify the tsunami source mechanism and generation type.
Context: ${ctx}
Respond with JSON: { "source_type": "subduction|strike_slip|landslide|volcanic|unknown", "generation_mechanism": "...", "expected_wave_period_range_s": "...", "regional_amplification_risk": "low|moderate|high" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-runup-height', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.modelId ? await M().findByPk(req.body.modelId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Predict tsunami runup heights at specified coastal locations.
Data: ${ctx}
Respond with JSON: { "runup_predictions": [{ "location": "...", "runup_m": number, "inundation_distance_m": number, "uncertainty_factor": number }], "max_runup_location": "...", "max_runup_m": number }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-evacuation-zone', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.modelId ? await M().findByPk(req.body.modelId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Recommend tsunami evacuation zones based on inundation modelling.
Data: ${ctx}
Respond with JSON: { "zone_a_description": "...", "zone_b_description": "...", "zone_c_description": "...", "recommended_evacuation_boundary_m": number, "high_ground_targets": [...], "time_to_evacuate_min": number }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-model-confidence', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.modelId ? await M().findByPk(req.body.modelId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Score the confidence level of this tsunami propagation model.
Data: ${ctx}
Respond with JSON: { "confidence_score": 0-100, "confidence_tier": "high|medium|low", "limiting_factors": [...], "data_gaps": [...], "recommended_updates": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-tsunami-bulletin', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.modelId ? await M().findByPk(req.body.modelId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Generate a formal tsunami bulletin for public dissemination.
Data: ${ctx}
Respond with JSON: { "bulletin_number": "...", "issued_at": "...", "warning_level": "...", "affected_regions": [...], "estimated_arrival_times": [...], "public_message": "...", "evacuation_guidance": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-coastal-impact', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.modelId ? await M().findByPk(req.body.modelId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Summarize the expected coastal impact from this tsunami event.
Data: ${ctx}
Respond with JSON: { "impact_summary": "...", "at_risk_communities": [...], "critical_infrastructure_at_risk": [...], "estimated_affected_population": number, "severity_rating": "minor|moderate|major|catastrophic" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-bathymetry-input', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Validate the bathymetry dataset used as input for tsunami propagation modelling.
Context: ${ctx}
Respond with JSON: { "valid": true|false, "resolution_adequate": true|false, "coverage_gaps": [...], "recommended_dataset": "...", "accuracy_impact": "low|moderate|high" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-buoy-deployment', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Suggest optimal DART buoy deployment locations for improved tsunami detection in this region.
Context: ${ctx}
Respond with JSON: { "recommended_locations": [{ "lat": number, "lon": number, "priority": "high|medium|low", "rationale": "..." }], "expected_lead_time_improvement_min": number }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-coastal-amplification', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Detect coastal locations with potential wave amplification due to bathymetric focusing.
Context: ${ctx}
Respond with JSON: { "amplification_zones": [{ "location": "...", "amplification_factor": number, "mechanism": "..." }], "highest_risk_location": "...", "modeling_notes": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-wave-period', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Classify the tsunami wave period and its implications for coastal impacts.
Context: ${ctx}
Respond with JSON: { "dominant_period_s": number, "period_class": "short|intermediate|long", "resonance_risk": true|false, "at_risk_bays": [...], "impact_duration_h": number }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-second-wave', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.modelId ? await M().findByPk(req.body.modelId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Predict timing and intensity of secondary tsunami waves after the first wave arrival.
Data: ${ctx}
Respond with JSON: { "second_wave_eta_utc": "...", "second_wave_height_relative_to_first": number, "third_wave_possible": true|false, "all_clear_estimated_utc": "...", "notes": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-shelter-locations', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Recommend tsunami safe shelter locations above inundation zones.
Context: ${ctx}
Respond with JSON: { "shelter_locations": [{ "name": "...", "lat": number, "lon": number, "elevation_m": number, "capacity": number, "accessibility": "..." }], "vertical_evacuation_options": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-evacuation-narrative', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Generate clear public-facing evacuation instructions for a tsunami threat.
Context: ${ctx}
Respond with JSON: { "narrative": "...", "key_actions": [...], "routes": [...], "do_not_list": [...], "target_audience": "general_public" }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-warning-lead-time', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.modelId ? await M().findByPk(req.body.modelId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Score the warning lead time available for tsunami evacuation.
Data: ${ctx}
Respond with JSON: { "available_lead_time_min": number, "adequate_for_evacuation": true|false, "evacuation_completion_probability": 0-1, "bottlenecks": [...], "recommended_actions": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-historical-comparison', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.modelId ? await M().findByPk(req.body.modelId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Compare this tsunami event against historical events to contextualize severity.
Current event: ${ctx}
Respond with JSON: { "comparable_historical_events": [...], "severity_percentile": number, "lessons_from_history": [...], "unique_risk_factors": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
