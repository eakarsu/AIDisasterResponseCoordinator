const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../models');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter, persistAnalysis } = require('../controllers/aiController');
const { parseAIJson } = require('../utils/parseAIJson');

router.use(auth);

/**
 * GET /api/aar
 * List AAR workflow states (paginated). Stored under analysis_type='aar-workflow'.
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where = { analysis_type: 'aar-workflow' };
    if (req.query.incident_id) where.reference_id = parseInt(req.query.incident_id);

    const { count, rows } = await db.AiAnalysis.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows.map((r) => ({
        id: r.id,
        incident_id: r.reference_id,
        report: r.ai_results,
        result_text: r.result_text,
        approvals: r.ai_results?.approvals || [],
        status: r.ai_results?.status || 'draft',
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      })),
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list AARs.', message: error.message });
  }
});

/**
 * POST /api/aar/start
 * Body: { incident_id }
 * Creates an AAR draft, AI-generates initial content, status=draft.
 */
router.post('/start', aiRateLimiter, async (req, res) => {
  try {
    const { incident_id } = req.body;
    if (!incident_id) return res.status(400).json({ error: 'incident_id required.' });

    const incident = await db.Incident.findByPk(incident_id);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });

    const [communications, damageAssessments, resources, volunteers, sar] = await Promise.all([
      db.Communication.findAll({ where: { incidentId: incident_id }, order: [['timestamp', 'ASC']], limit: 100 }),
      db.DamageAssessment.findAll({ where: { incidentId: incident_id }, order: [['createdAt', 'ASC']], limit: 50 }),
      db.Resource.findAll({ where: { assignedIncidentId: incident_id } }),
      db.Volunteer.findAll({ where: { assignedIncidentId: incident_id } }),
      db.SearchRescue.findAll({ where: { incidentId: incident_id }, order: [['createdAt', 'ASC']], limit: 50 }),
    ]);

    const systemPrompt = `You are an expert FEMA AAR/IP report writer. Produce structured JSON only:
{
  "executiveSummary": "string",
  "incidentOverview": "string",
  "responseActions": ["string"],
  "resourceUtilization": "string",
  "strengths": ["string"],
  "areasForImprovement": ["string"],
  "recommendations": ["string"],
  "correctiveActionPlan": [{ "action": "string", "owner": "string", "due": "YYYY-MM-DD" }],
  "financialSummary": "string",
  "appendices": ["string"]
}`;
    const userMessage = `Compile an AAR for:
Incident #${incident.id}: ${incident.title} (${incident.type}, sev ${incident.severity}) at ${incident.location}
Affected: ${incident.affectedPopulation || '?'}, Damage: ${incident.estimatedDamage || '?'}
Communications (${communications.length}): ${communications.slice(0, 8).map((c) => `[${c.timestamp}] ${c.subject || c.type}`).join('; ')}
Damage Assessments: ${damageAssessments.length}
Resources Deployed: ${resources.length}
Volunteers: ${volunteers.length}
SAR Ops: ${sar.length}`;

    const result = await callOpenRouter(systemPrompt, userMessage);
    const { parsed } = parseAIJson(result);

    const aarPayload = {
      status: 'draft',
      report: parsed || { raw: result },
      timeline: communications.slice(0, 20).map((c) => ({ at: c.timestamp, type: c.type, subject: c.subject })),
      approvals: [],
      created_by: req.user?.id,
    };

    const row = await db.AiAnalysis.create({
      analysis_type: 'aar-workflow',
      reference_id: incident_id,
      reference_type: 'incident',
      input_summary: `AAR for incident ${incident_id}`,
      result_text: result,
      ai_results: aarPayload,
      user_id: req.user?.id,
    });

    res.status(201).json({ id: row.id, incident_id, ...aarPayload });
  } catch (error) {
    res.status(500).json({ error: 'AAR start failed.', message: error.message });
  }
});

/**
 * POST /api/aar/:id/approve
 * Body: { approver, role, comments }
 * Adds an approval signature.
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { approver, role, comments } = req.body;
    if (!approver) return res.status(400).json({ error: 'approver name required.' });

    const row = await db.AiAnalysis.findByPk(req.params.id);
    if (!row || row.analysis_type !== 'aar-workflow') return res.status(404).json({ error: 'AAR not found.' });

    const ar = row.ai_results || {};
    ar.approvals = ar.approvals || [];
    ar.approvals.push({ approver, role: role || 'approver', comments: comments || '', at: new Date().toISOString(), user_id: req.user?.id });
    if (ar.approvals.length >= 2) ar.status = 'approved';
    else if (ar.approvals.length === 1) ar.status = 'partially_approved';

    row.ai_results = ar;
    row.changed('ai_results', true);
    await row.save();

    res.json({ id: row.id, status: ar.status, approvals: ar.approvals });
  } catch (error) {
    res.status(500).json({ error: 'AAR approval failed.', message: error.message });
  }
});

/**
 * POST /api/aar/:id/finalize
 * Marks the AAR as finalized; produces a printable text version.
 */
router.post('/:id/finalize', async (req, res) => {
  try {
    const row = await db.AiAnalysis.findByPk(req.params.id);
    if (!row || row.analysis_type !== 'aar-workflow') return res.status(404).json({ error: 'AAR not found.' });

    const ar = row.ai_results || {};
    ar.status = 'finalized';
    ar.finalized_at = new Date().toISOString();
    ar.finalized_by = req.user?.id;
    row.ai_results = ar;
    row.changed('ai_results', true);
    await row.save();

    res.json({ id: row.id, status: ar.status, report: ar.report });
  } catch (error) {
    res.status(500).json({ error: 'AAR finalize failed.', message: error.message });
  }
});

/**
 * GET /api/aar/:id/export
 * Returns a printable text version of the AAR.
 */
router.get('/:id/export', async (req, res) => {
  try {
    const row = await db.AiAnalysis.findByPk(req.params.id);
    if (!row || row.analysis_type !== 'aar-workflow') return res.status(404).json({ error: 'AAR not found.' });
    const r = row.ai_results || {};
    const report = r.report || {};

    const text = `AFTER-ACTION REPORT
Incident ID: ${row.reference_id}
Status: ${r.status || 'draft'}
Generated: ${row.createdAt}

EXECUTIVE SUMMARY
${report.executiveSummary || '(none)'}

INCIDENT OVERVIEW
${report.incidentOverview || '(none)'}

RESPONSE ACTIONS
${(report.responseActions || []).map((a, i) => `${i + 1}. ${a}`).join('\n') || '(none)'}

STRENGTHS
${(report.strengths || []).map((s) => `- ${s}`).join('\n') || '(none)'}

AREAS FOR IMPROVEMENT
${(report.areasForImprovement || []).map((a) => `- ${a}`).join('\n') || '(none)'}

RECOMMENDATIONS
${(report.recommendations || []).map((a) => `- ${a}`).join('\n') || '(none)'}

CORRECTIVE ACTION PLAN
${(report.correctiveActionPlan || []).map((c) => `- ${c.action} (Owner: ${c.owner || '?'}, Due: ${c.due || '?'})`).join('\n') || '(none)'}

FINANCIAL SUMMARY
${report.financialSummary || '(none)'}

APPROVALS
${(r.approvals || []).map((a) => `- ${a.approver} (${a.role}) at ${a.at}: ${a.comments || ''}`).join('\n') || '(none yet)'}
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aar-${row.id}.txt"`);
    res.send(text);
  } catch (error) {
    res.status(500).json({ error: 'AAR export failed.', message: error.message });
  }
});

module.exports = router;
