const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../models');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter, persistAnalysis } = require('../controllers/aiController');
const { parseAIJson } = require('../utils/parseAIJson');

router.use(auth);

/**
 * POST /api/briefing/commander
 * Aggregates all active incidents and generates an AI commander briefing.
 * Returns structured JSON when possible, otherwise raw text.
 */
router.post('/commander', aiRateLimiter, async (req, res) => {
  try {
    const activeIncidents = await db.Incident.findAll({
      where: { status: ['active', 'monitoring'] },
      order: [['severity', 'DESC'], ['createdAt', 'DESC']],
    });

    if (activeIncidents.length === 0) {
      return res.json({
        briefing: { headline: 'No active incidents.', summary: 'All-clear status.', priorities: [] },
        incident_count: 0,
      });
    }

    const [resources, volunteers, shelters] = await Promise.all([
      db.Resource.findAll({ where: { status: 'available' } }),
      db.Volunteer.findAll({ where: { availability: 'available' } }),
      db.Shelter.findAll({ where: { status: ['operational', 'open'] } }),
    ]);

    const systemPrompt = `You are the AI Chief of Staff for an emergency operations center, producing an executive incident commander briefing.
Return ONLY valid JSON with this exact structure:
{
  "headline": "one-sentence top-level status",
  "summary": "2-3 sentence overall situation summary",
  "highest_priority_incidents": [
    { "id": number, "title": "string", "severity": number, "rationale": "why this is top priority" }
  ],
  "resource_posture": "string describing overall resource availability",
  "recommended_actions": ["short, actionable item"],
  "risk_alerts": ["risk to monitor"],
  "shift_handoff_notes": "string for the next watch"
}`;

    const userMessage = `Generate a commander briefing.

Active Incidents (${activeIncidents.length}):
${activeIncidents.map((i) => `- #${i.id} [SEV ${i.severity}] ${i.title} — ${i.type} @ ${i.location} — affected: ${i.affectedPopulation || '?'}`).join('\n')}

Available Resources: ${resources.length}
Available Volunteers: ${volunteers.length}
Operational Shelters: ${shelters.length}`;

    const result = await callOpenRouter(systemPrompt, userMessage);
    const { parsed } = parseAIJson(result);

    await persistAnalysis(
      'commander-briefing',
      null,
      'briefing',
      `Active incidents: ${activeIncidents.length}`,
      result,
      req.user?.id,
      parsed
    );

    res.json({
      briefing: parsed || { raw: result },
      incident_count: activeIncidents.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Briefing generation failed.', message: error.message });
  }
});

/**
 * GET /api/briefing/recent
 * Returns the latest commander briefings for quick recall.
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const briefings = await db.AiAnalysis.findAll({
      where: { analysis_type: 'commander-briefing' },
      order: [['createdAt', 'DESC']],
      limit,
    });
    res.json({ data: briefings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load briefings.', message: error.message });
  }
});

module.exports = router;
