const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../models');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter, persistAnalysis } = require('../controllers/aiController');
const { parseAIJson } = require('../utils/parseAIJson');

router.use(auth);

// In-memory mutual aid board until a dedicated table exists. Persisted to AiAnalysis as audit trail.
// We use ai_analyses with analysis_type='mutual-aid-post' for durable storage of posts.

/**
 * GET /api/mutual-aid
 * Lists active mutual aid postings (paginated)
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = { analysis_type: 'mutual-aid-post' };
    if (req.query.kind === 'request') where.reference_type = 'aid-request';
    if (req.query.kind === 'offer') where.reference_type = 'aid-offer';

    const { count, rows } = await db.AiAnalysis.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows.map((r) => ({
        id: r.id,
        kind: r.reference_type,
        agency: r.input_summary,
        post: r.ai_results || (r.result_text ? { description: r.result_text } : null),
        created_at: r.createdAt,
      })),
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load mutual aid board.', message: error.message });
  }
});

/**
 * POST /api/mutual-aid
 * Body: { kind: 'request'|'offer', agency, resourceType, quantity, location, contact, urgency, notes }
 */
router.post('/', async (req, res) => {
  try {
    const { kind, agency, resourceType, quantity, location, contact, urgency, notes } = req.body;
    if (!['request', 'offer'].includes(kind)) {
      return res.status(400).json({ error: 'kind must be "request" or "offer".' });
    }
    if (!agency || !resourceType || !quantity) {
      return res.status(400).json({ error: 'agency, resourceType, and quantity are required.' });
    }
    const post = { agency, resourceType, quantity: Number(quantity), location, contact, urgency, notes, postedBy: req.user?.id };
    const row = await db.AiAnalysis.create({
      analysis_type: 'mutual-aid-post',
      reference_type: kind === 'request' ? 'aid-request' : 'aid-offer',
      input_summary: String(agency).substring(0, 250),
      result_text: notes || `${kind}: ${quantity} ${resourceType}`,
      ai_results: post,
      user_id: req.user?.id,
    });
    res.status(201).json({ id: row.id, kind, post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create mutual aid post.', message: error.message });
  }
});

/**
 * DELETE /api/mutual-aid/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const row = await db.AiAnalysis.findByPk(req.params.id);
    if (!row || row.analysis_type !== 'mutual-aid-post') {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (row.user_id && row.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'You can only delete your own posts.' });
    }
    await row.destroy();
    res.json({ message: 'Deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post.', message: error.message });
  }
});

/**
 * POST /api/mutual-aid/match
 * Uses AI to match open requests with available offers.
 */
router.post('/match', aiRateLimiter, async (req, res) => {
  try {
    const requests = await db.AiAnalysis.findAll({ where: { analysis_type: 'mutual-aid-post', reference_type: 'aid-request' }, order: [['createdAt', 'DESC']], limit: 50 });
    const offers = await db.AiAnalysis.findAll({ where: { analysis_type: 'mutual-aid-post', reference_type: 'aid-offer' }, order: [['createdAt', 'DESC']], limit: 50 });

    if (requests.length === 0 || offers.length === 0) {
      return res.json({ matches: [], message: 'Need both open requests and offers to match.' });
    }

    const systemPrompt = `You are a mutual aid logistics matchmaker for emergency operations.
Match open RESOURCE REQUESTS with available OFFERS based on resource type, quantity, location proximity, and urgency.
Return ONLY valid JSON:
{
  "matches": [
    { "requestId": number, "offerId": number, "confidence": 0.0-1.0, "rationale": "why these match" }
  ],
  "unmet_requests": [number],
  "surplus_offers": [number],
  "summary": "string"
}`;

    const userMessage = `OPEN REQUESTS:
${requests.map((r) => `#${r.id} ${JSON.stringify(r.ai_results || {})}`).join('\n')}

AVAILABLE OFFERS:
${offers.map((o) => `#${o.id} ${JSON.stringify(o.ai_results || {})}`).join('\n')}`;

    const result = await callOpenRouter(systemPrompt, userMessage);
    const { parsed } = parseAIJson(result);
    await persistAnalysis('mutual-aid-match', null, 'mutual-aid', `${requests.length} req / ${offers.length} offers`, result, req.user?.id, parsed);

    res.json({ matches: parsed?.matches || [], result: parsed || { raw: result } });
  } catch (error) {
    res.status(500).json({ error: 'Mutual aid matching failed.', message: error.message });
  }
});

module.exports = router;
