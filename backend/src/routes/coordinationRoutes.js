const crypto = require('crypto');
const express = require('express');
const auth = require('../middleware/auth');
const db = require('../models');
const { assertTransition, assessSource, prioritizeNeed } = require('../services/coordinationPolicy');

const router = express.Router();
router.use(auth);

const q = (sql, replacements = {}, transaction) => db.sequelize.query(sql, { replacements, transaction, type: db.Sequelize.QueryTypes.SELECT });
const mutate = (sql, replacements = {}, transaction) => db.sequelize.query(sql, { replacements, transaction });
const fail = (res, error) => res.status(error.status || (error.message?.startsWith('Assignment cannot') ? 409 : 400)).json({ error: error.message });

async function membership(req, roles) {
  const workspaceId = req.params.workspaceId || req.body.workspaceId;
  if (!workspaceId) throw new Error('workspaceId is required');
  const rows = await q('SELECT role FROM coordination_memberships WHERE workspace_id = :workspaceId AND user_id = :userId', { workspaceId, userId: req.user.id });
  if (!rows[0] || (roles && !roles.includes(rows[0].role))) {
    const error = new Error('Workspace role is not authorized');
    error.status = 403;
    throw error;
  }
  return { workspaceId, role: rows[0].role };
}

async function audit(transaction, workspaceId, actorId, action, entityType, entityId, reason, metadata = {}) {
  await mutate(`INSERT INTO coordination_audit_events
    (workspace_id, actor_user_id, action, entity_type, entity_id, reason, metadata)
    VALUES (:workspaceId, :actorId, :action, :entityType, :entityId, :reason, CAST(:metadata AS jsonb))`,
  { workspaceId, actorId, action, entityType, entityId, reason: reason || null, metadata: JSON.stringify(metadata) }, transaction);
}

router.post('/workspaces', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (name.length < 3) throw new Error('name must contain at least 3 characters');
    const id = crypto.randomUUID();
    await db.sequelize.transaction(async transaction => {
      await mutate('INSERT INTO coordination_workspaces (id, name, created_by) VALUES (:id, :name, :userId)', { id, name, userId: req.user.id }, transaction);
      await mutate("INSERT INTO coordination_memberships (workspace_id, user_id, role) VALUES (:id, :userId, 'command')", { id, userId: req.user.id }, transaction);
      await audit(transaction, id, req.user.id, 'workspace.created', 'workspace', id);
    });
    res.status(201).json({ id, name, role: 'command' });
  } catch (error) { fail(res, error); }
});

router.post('/workspaces/:workspaceId/incidents', async (req, res) => {
  try {
    const { workspaceId } = await membership(req, ['command', 'operations']);
    const { name, incidentType, operationalPeriodStart, operationalPeriodEnd, sourceUri, sourceConfidence } = req.body;
    if (!name || !incidentType || !sourceUri) throw new Error('name, incidentType, and sourceUri are required');
    if (new Date(operationalPeriodEnd) <= new Date(operationalPeriodStart)) throw new Error('operational period end must follow start');
    assessSource({ observedAt: operationalPeriodStart, confidence: sourceConfidence, maxAgeMinutes: 1000000 });
    const id = crypto.randomUUID();
    await db.sequelize.transaction(async transaction => {
      await mutate(`INSERT INTO coordinated_incidents
        (id, workspace_id, name, incident_type, operational_period_start, operational_period_end, source_uri, source_confidence, created_by)
        VALUES (:id,:workspaceId,:name,:incidentType,:start,:end,:sourceUri,:confidence,:userId)`,
      { id, workspaceId, name: String(name).trim(), incidentType, start: operationalPeriodStart, end: operationalPeriodEnd, sourceUri, confidence: Number(sourceConfidence), userId: req.user.id }, transaction);
      await audit(transaction, workspaceId, req.user.id, 'incident.created', 'incident', id, null, { sourceUri });
    });
    res.status(201).json({ id, workspaceId, status: 'monitoring' });
  } catch (error) { fail(res, error); }
});

router.post('/workspaces/:workspaceId/incidents/:incidentId/needs', async (req, res) => {
  try {
    const { workspaceId } = await membership(req, ['command', 'operations', 'logistics']);
    const incident = await q('SELECT id FROM coordinated_incidents WHERE id=:incidentId AND workspace_id=:workspaceId', { incidentId: req.params.incidentId, workspaceId });
    if (!incident[0]) return res.status(404).json({ error: 'Incident not found in this workspace' });
    const idempotencyKey = req.get('Idempotency-Key');
    if (!idempotencyKey || idempotencyKey.length > 160) throw new Error('A valid Idempotency-Key header is required');
    const { category, description, severity, affectedPeople = 0, observedAt, sourceUri, sourceConfidence } = req.body;
    if (!category || !description || !sourceUri) throw new Error('category, description, and sourceUri are required');
    const assessment = assessSource({ observedAt, confidence: sourceConfidence });
    const priorityScore = prioritizeNeed({ severity, affectedPeople, sourceConfidence, stale: assessment.stale });
    const verificationStatus = assessment.stale ? 'stale' : assessment.requiresVerification ? 'unverified' : 'verified';
    const id = crypto.randomUUID();
    try {
      await db.sequelize.transaction(async transaction => {
        await mutate(`INSERT INTO incident_needs
          (id,workspace_id,incident_id,idempotency_key,category,description,severity,affected_people,observed_at,source_uri,source_confidence,priority_score,verification_status,created_by)
          VALUES (:id,:workspaceId,:incidentId,:key,:category,:description,:severity,:affectedPeople,:observedAt,:sourceUri,:confidence,:priorityScore,:verificationStatus,:userId)`,
        { id, workspaceId, incidentId: req.params.incidentId, key: idempotencyKey, category, description, severity: Number(severity), affectedPeople: Number(affectedPeople), observedAt, sourceUri, confidence: Number(sourceConfidence), priorityScore, verificationStatus, userId: req.user.id }, transaction);
        await audit(transaction, workspaceId, req.user.id, 'need.recorded', 'need', id, null, { priorityScore, verificationStatus });
      });
      res.status(201).json({ id, priorityScore, verificationStatus });
    } catch (error) {
      if (error.original?.code !== '23505') throw error;
      const existing = await q('SELECT id, priority_score, verification_status FROM incident_needs WHERE workspace_id=:workspaceId AND idempotency_key=:key', { workspaceId, key: idempotencyKey });
      res.status(200).json({ ...existing[0], duplicate: true });
    }
  } catch (error) { fail(res, error); }
});

router.post('/workspaces/:workspaceId/incidents/:incidentId/assignments', async (req, res) => {
  try {
    const { workspaceId } = await membership(req, ['command', 'operations', 'logistics']);
    const incident = await q('SELECT id FROM coordinated_incidents WHERE id=:incidentId AND workspace_id=:workspaceId', { incidentId: req.params.incidentId, workspaceId });
    if (!incident[0]) return res.status(404).json({ error: 'Incident not found in this workspace' });
    const { resourceRef, needId, instructions } = req.body;
    if (!resourceRef || !instructions) throw new Error('resourceRef and instructions are required');
    const id = crypto.randomUUID();
    await db.sequelize.transaction(async transaction => {
      await mutate(`INSERT INTO resource_assignments
        (id,workspace_id,incident_id,need_id,resource_ref,instructions,created_by)
        VALUES (:id,:workspaceId,:incidentId,:needId,:resourceRef,:instructions,:userId)`,
      { id, workspaceId, incidentId: req.params.incidentId, needId: needId || null, resourceRef, instructions, userId: req.user.id }, transaction);
      await audit(transaction, workspaceId, req.user.id, 'assignment.drafted', 'assignment', id);
    });
    res.status(201).json({ id, status: 'draft', version: 1 });
  } catch (error) { fail(res, error); }
});

router.post('/workspaces/:workspaceId/assignments/:assignmentId/transition', async (req, res) => {
  try {
    const { workspaceId, role } = await membership(req, ['command', 'operations', 'logistics']);
    const { toStatus, expectedVersion, overrideReason } = req.body;
    const rows = await q('SELECT * FROM resource_assignments WHERE id=:id AND workspace_id=:workspaceId', { id: req.params.assignmentId, workspaceId });
    const current = rows[0];
    if (!current) return res.status(404).json({ error: 'Assignment not found' });
    assertTransition(current.status, toStatus);
    if (toStatus === 'approved' && role !== 'command') return res.status(403).json({ error: 'Incident command approval is required' });
    if (overrideReason !== undefined && (role !== 'command' || String(overrideReason).trim().length < 12)) throw new Error('Manual override requires incident command and a meaningful reason');
    const [, metadata] = await mutate(`UPDATE resource_assignments SET status=:toStatus, version=version+1,
      approved_by=CASE WHEN :toStatus='approved' THEN :userId ELSE approved_by END,
      manual_override_reason=COALESCE(:overrideReason,manual_override_reason), updated_at=NOW()
      WHERE id=:id AND workspace_id=:workspaceId AND version=:expectedVersion`,
    { toStatus, userId: req.user.id, overrideReason: overrideReason || null, id: req.params.assignmentId, workspaceId, expectedVersion: Number(expectedVersion) });
    if (!metadata.rowCount) return res.status(409).json({ error: 'Assignment was changed by another operator' });
    await audit(null, workspaceId, req.user.id, 'assignment.transitioned', 'assignment', req.params.assignmentId, overrideReason, { from: current.status, to: toStatus });
    res.json({ id: req.params.assignmentId, status: toStatus, version: Number(expectedVersion) + 1 });
  } catch (error) { fail(res, error); }
});

router.get('/workspaces/:workspaceId/incidents/:incidentId/snapshot', async (req, res) => {
  try {
    const { workspaceId } = await membership(req);
    const [incident, needs, assignments, handoffs] = await Promise.all([
      q('SELECT * FROM coordinated_incidents WHERE id=:incidentId AND workspace_id=:workspaceId', { incidentId: req.params.incidentId, workspaceId }),
      q('SELECT * FROM incident_needs WHERE incident_id=:incidentId AND workspace_id=:workspaceId ORDER BY priority_score DESC, created_at', { incidentId: req.params.incidentId, workspaceId }),
      q('SELECT * FROM resource_assignments WHERE incident_id=:incidentId AND workspace_id=:workspaceId ORDER BY updated_at DESC', { incidentId: req.params.incidentId, workspaceId }),
      q('SELECT * FROM incident_handoffs WHERE incident_id=:incidentId AND workspace_id=:workspaceId ORDER BY created_at DESC', { incidentId: req.params.incidentId, workspaceId }),
    ]);
    if (!incident[0]) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident: incident[0], needs, assignments, handoffs, generatedAt: new Date().toISOString() });
  } catch (error) { res.status(error.status || 400).json({ error: error.message }); }
});

module.exports = router;
