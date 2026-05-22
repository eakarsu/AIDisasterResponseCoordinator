// EEWS — Population Alert Router routes
// Mount: /api/eews/population-alert-router
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

const M = () => db.AlertDispatch;

// ── CRUD ─────────────────────────────────────────────────────────────────────

// 1. list
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.alertType) where.alertType = req.query.alertType;
    const { count, rows } = await M().findAndCountAll({ where, order: [['dispatchedAt', 'DESC']], limit, offset: (page - 1) * limit });
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
      where: { [Op.or]: [{ region: { [Op.like]: `%${q}%` } }, { alertText: { [Op.like]: `%${q}%` } }, { alertChannel: { [Op.like]: `%${q}%` } }] },
      order: [['dispatchedAt', 'DESC']], limit, offset: (page - 1) * limit,
    });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. by-event
router.get('/by-event/:pWaveEventId', async (req, res) => {
  try {
    const rows = await M().findAll({ where: { pWaveEventId: req.params.pWaveEventId }, order: [['dispatchedAt', 'DESC']] });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. by-region
router.get('/by-region/:region', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { count, rows } = await M().findAndCountAll({ where: { region: req.params.region }, order: [['dispatchedAt', 'DESC']], limit, offset: (page - 1) * limit });
    res.json({ data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. export-csv
router.get('/export/csv', async (req, res) => {
  try {
    const rows = await M().findAll({ order: [['dispatchedAt', 'DESC']] });
    const fields = ['id', 'pWaveEventId', 'region', 'alertType', 'targetPopulationGroup', 'alertChannel', 'languageCode', 'coveragePercent', 'acknowledgedCount', 'fatigueFlagged', 'status', 'dispatchedAt', 'createdAt'];
    const csv = [fields.join(','), ...rows.map(r => fields.map(f => `"${r[f] ?? ''}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="alert_dispatches.csv"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. stats-summary
router.get('/stats/summary', async (req, res) => {
  try {
    const [byChannel, byType, byStatus] = await Promise.all([
      M().findAll({ attributes: ['alertChannel', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['alertChannel'], raw: true }),
      M().findAll({ attributes: ['alertType', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['alertType'], raw: true }),
      M().findAll({ attributes: ['status', [M().sequelize.fn('COUNT', M().sequelize.col('id')), 'count']], group: ['status'], raw: true }),
    ]);
    res.json({ byChannel, byType, byStatus });
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
    await rec.update({ status: 'pending' });
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

router.post('/ai/predict-shaking-intensity', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Predict ground shaking intensity (MMI) for the population in the alert footprint.
Context: ${ctx}
Respond with JSON: { "predicted_mmi": number, "intensity_description": "...", "affected_area_km2": number, "population_at_mmi_threshold": number, "alert_warranted": true|false }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-alert-population-group', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Classify population groups requiring tailored alert messaging for this event.
Context: ${ctx}
Respond with JSON: { "groups": [{ "group": "...", "estimated_size": number, "special_needs": [...], "preferred_channel": "..." }], "priority_order": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-alert-cadence', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Recommend the optimal alerting cadence (frequency and timing) for this event.
Context: ${ctx}
Respond with JSON: { "initial_alert_delay_s": number, "update_interval_min": number, "all_clear_criteria": "...", "max_alerts_recommended": number, "rationale": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-route-coverage', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.dispatchId ? await M().findByPk(req.body.dispatchId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Score the coverage achieved by this alert dispatch routing.
Data: ${ctx}
Respond with JSON: { "coverage_score": 0-100, "reached_population_percent": number, "unreached_areas": [...], "coverage_gaps": [...], "improvement_actions": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-localized-alert-text', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Generate localized, culturally appropriate alert text for a specific community.
Context (includes region, language, event type): ${ctx}
Respond with JSON: { "alert_text_en": "...", "alert_text_local": "...", "character_count": number, "reading_level": "...", "key_actions": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-alert-distribution', aiRateLimit, async (req, res) => {
  try {
    const dispatches = await M().findAll({ order: [['dispatchedAt', 'DESC']], limit: 100 });
    const raw = await callAI(`Summarize the distribution performance of recent alert dispatches.
Dispatches: ${JSON.stringify(dispatches.map(d => ({ id: d.id, region: d.region, channel: d.alertChannel, coverage: d.coveragePercent, status: d.status })))}
Respond with JSON: { "summary": "...", "total_dispatches": number, "avg_coverage_percent": number, "failed_count": number, "top_performing_channels": [...], "systemic_issues": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-cell-broadcast-region', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Validate the geographic cell broadcast region polygon for this alert dispatch.
Context: ${ctx}
Respond with JSON: { "valid": true|false, "cell_count": number, "coverage_overlap_detected": true|false, "region_issues": [...], "recommended_correction": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-multi-language-template', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Suggest multi-language alert templates for the languages spoken in this region.
Context: ${ctx}
Respond with JSON: { "templates": [{ "language_code": "...", "language_name": "...", "alert_text": "...", "character_count": number }], "recommended_priority_languages": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-alert-fatigue', aiRateLimit, async (req, res) => {
  try {
    const dispatches = await M().findAll({ where: { region: req.body.region || undefined }, order: [['dispatchedAt', 'DESC']], limit: 30 });
    const raw = await callAI(`Detect signs of alert fatigue in this region based on recent dispatch history.
Recent dispatches: ${JSON.stringify(dispatches)}
Respond with JSON: { "fatigue_detected": true|false, "fatigue_score": 0-100, "evidence": [...], "recommended_mitigation": "...", "alert_frequency_last_30d": number }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-vulnerable-population', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Classify vulnerable population segments requiring priority outreach in this alert region.
Context: ${ctx}
Respond with JSON: { "vulnerable_groups": [{ "group": "...", "size_estimate": number, "location_clusters": [...], "intervention": "..." }], "priority_actions": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-alert-comprehension', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Predict the likely public comprehension rate of this alert message.
Context: ${ctx}
Respond with JSON: { "predicted_comprehension_rate": 0-1, "readability_score": number, "ambiguous_phrases": [...], "improvement_suggestions": [...], "estimated_correct_action_rate": 0-1 }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-rebroadcast', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.dispatchId ? await M().findByPk(req.body.dispatchId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Recommend whether and when to rebroadcast this alert.
Data: ${ctx}
Respond with JSON: { "rebroadcast_recommended": true|false, "recommended_delay_min": number, "channels": [...], "revised_message": "...", "rationale": "..." }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-followup-instruction', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Generate post-event follow-up instructions to send to alerted populations.
Context: ${ctx}
Respond with JSON: { "followup_text": "...", "send_at_utc": "...", "channel": "...", "key_points": [...], "all_clear_included": true|false }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-alert-effectiveness', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.dispatchId ? await M().findByPk(req.body.dispatchId) : null;
    const ctx = rec ? JSON.stringify(rec) : JSON.stringify(req.body);
    const raw = await callAI(`Score the overall effectiveness of this alert dispatch.
Data: ${ctx}
Respond with JSON: { "effectiveness_score": 0-100, "reach_score": 0-100, "timeliness_score": 0-100, "comprehension_score": 0-100, "action_compliance_estimate": 0-1, "lessons_learned": [...] }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-route-test', aiRateLimit, async (req, res) => {
  try {
    const ctx = JSON.stringify(req.body);
    const raw = await callAI(`Suggest a structured test scenario to validate alert routing for this region.
Context: ${ctx}
Respond with JSON: { "test_scenarios": [...], "recommended_schedule": "...", "success_criteria": [...], "estimated_duration_min": number }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-region-by-region-reach', aiRateLimit, async (req, res) => {
  try {
    const dispatches = await M().findAll({ order: [['dispatchedAt', 'DESC']], limit: 200 });
    const raw = await callAI(`Summarize alert reach on a region-by-region basis.
Data: ${JSON.stringify(dispatches.map(d => ({ region: d.region, coverage: d.coveragePercent, acknowledged: d.acknowledgedCount, channel: d.alertChannel, status: d.status })))}
Respond with JSON: { "region_summary": [{ "region": "...", "avg_coverage": number, "dispatch_count": number, "gap_identified": true|false }], "overall_reach_score": 0-100 }`);
    res.json({ success: true, result: parseAIJson(raw) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
