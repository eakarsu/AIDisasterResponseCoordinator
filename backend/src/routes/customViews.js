// customViews.js - Custom Response Views for Disaster Response Coordination
// Provides: incident map data, resource allocation chart, situation report PDF,
// and escalation rules CRUD (severity tiers + response).

const express = require('express');
const router = express.Router();

// In-memory store for escalation rules (seeded with sensible defaults).
let escalationRules = [
  {
    id: 1,
    tier: 'CRITICAL',
    severityMin: 90,
    response: 'Activate full Emergency Operations Center; deploy all available teams; notify FEMA + state.',
    notifyChannels: ['SMS', 'Radio', 'Email', 'PagerDuty'],
    escalateMinutes: 5,
  },
  {
    id: 2,
    tier: 'HIGH',
    severityMin: 70,
    response: 'Activate regional command post; deploy specialty teams; notify county leadership.',
    notifyChannels: ['SMS', 'Radio', 'Email'],
    escalateMinutes: 15,
  },
  {
    id: 3,
    tier: 'MODERATE',
    severityMin: 40,
    response: 'Dispatch primary response unit; monitor situation; on-call supervisors notified.',
    notifyChannels: ['Email', 'Radio'],
    escalateMinutes: 30,
  },
  {
    id: 4,
    tier: 'LOW',
    severityMin: 0,
    response: 'Log incident; assign nearest available responder; standard reporting cycle.',
    notifyChannels: ['Email'],
    escalateMinutes: 60,
  },
];
let nextRuleId = 5;

// Sample seeded incident map data (color-coded by severity).
function buildIncidentMap() {
  const incidents = [
    { id: 'INC-001', name: 'Wildfire - Ridge Canyon', lat: 34.0522, lng: -118.2437, severity: 95, type: 'Wildfire', status: 'Active' },
    { id: 'INC-002', name: 'Flooding - River Basin', lat: 29.7604, lng: -95.3698, severity: 78, type: 'Flood', status: 'Active' },
    { id: 'INC-003', name: 'Earthquake Aftershock', lat: 37.7749, lng: -122.4194, severity: 62, type: 'Earthquake', status: 'Monitoring' },
    { id: 'INC-004', name: 'Hurricane Landfall', lat: 25.7617, lng: -80.1918, severity: 88, type: 'Hurricane', status: 'Active' },
    { id: 'INC-005', name: 'Chemical Spill', lat: 41.8781, lng: -87.6298, severity: 45, type: 'HazMat', status: 'Contained' },
    { id: 'INC-006', name: 'Power Grid Failure', lat: 40.7128, lng: -74.0060, severity: 35, type: 'Infrastructure', status: 'Recovery' },
    { id: 'INC-007', name: 'Tornado Touchdown', lat: 35.2271, lng: -97.4395, severity: 82, type: 'Tornado', status: 'Active' },
    { id: 'INC-008', name: 'Landslide - Coastal', lat: 47.6062, lng: -122.3321, severity: 55, type: 'Landslide', status: 'Monitoring' },
  ];
  return {
    centerLat: 39.5,
    centerLng: -98.35,
    zoom: 4,
    incidents: incidents.map((i) => ({
      ...i,
      color: i.severity >= 80 ? '#dc2626' : i.severity >= 60 ? '#f59e0b' : i.severity >= 40 ? '#facc15' : '#22c55e',
    })),
  };
}

function buildAllocation() {
  return {
    teams: [
      { name: 'Search & Rescue Alpha', personnel: 24, vehicles: 6, supplies: 320, deployed: 18 },
      { name: 'Medical Strike Team', personnel: 18, vehicles: 4, supplies: 580, deployed: 15 },
      { name: 'Hazmat Unit Bravo', personnel: 12, vehicles: 3, supplies: 210, deployed: 8 },
      { name: 'Logistics Charlie', personnel: 30, vehicles: 12, supplies: 1480, deployed: 22 },
      { name: 'Engineering Delta', personnel: 16, vehicles: 5, supplies: 260, deployed: 12 },
      { name: 'Communications Echo', personnel: 9, vehicles: 2, supplies: 120, deployed: 9 },
    ],
    assets: [
      { category: 'Helicopters', total: 8, inUse: 5 },
      { category: 'Boats', total: 14, inUse: 9 },
      { category: 'Heavy Equipment', total: 22, inUse: 17 },
      { category: 'Field Hospitals', total: 4, inUse: 3 },
      { category: 'Emergency Shelters', total: 36, inUse: 28 },
    ],
  };
}

// GET /api/custom-views/incident-map
router.get('/incident-map', (req, res) => {
  res.json({ ok: true, data: buildIncidentMap() });
});

// GET /api/custom-views/resource-allocation
router.get('/resource-allocation', (req, res) => {
  res.json({ ok: true, data: buildAllocation() });
});

// GET /api/custom-views/situation-report (PDF)
// Returns a minimal valid PDF generated on-the-fly (no external dep).
router.get('/situation-report', (req, res) => {
  const generated = new Date().toISOString();
  const map = buildIncidentMap();
  const alloc = buildAllocation();
  const lines = [
    'AI Disaster Response Coordinator',
    'Situation Report (SITREP)',
    `Generated: ${generated}`,
    '',
    `Active Incidents: ${map.incidents.length}`,
    ...map.incidents.slice(0, 6).map((i) => `  - [${i.severity}] ${i.id} ${i.name} (${i.status})`),
    '',
    `Teams Engaged: ${alloc.teams.length}`,
    ...alloc.teams.map((t) => `  - ${t.name}: ${t.deployed}/${t.personnel} deployed, ${t.vehicles} veh`),
    '',
    `Escalation Tiers Configured: ${escalationRules.length}`,
    ...escalationRules.map((r) => `  - ${r.tier} (>=${r.severityMin}) -> ${r.response.slice(0, 60)}...`),
  ];

  // Build a tiny single-page PDF manually.
  const escapePdf = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  let y = 760;
  const textOps = lines.map((line) => {
    const op = `BT /F1 11 Tf 50 ${y} Td (${escapePdf(line)}) Tj ET\n`;
    y -= 16;
    return op;
  }).join('');
  const stream = textOps;
  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n');
  objects.push(`4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream\nendobj\n`);
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="sitrep.pdf"');
  res.send(Buffer.from(pdf, 'binary'));
});

// CRUD: escalation rules
// GET list
router.get('/escalation-rules', (req, res) => {
  res.json({ ok: true, data: escalationRules });
});

// POST create
router.post('/escalation-rules', (req, res) => {
  const { tier, severityMin, response, notifyChannels, escalateMinutes } = req.body || {};
  if (!tier || severityMin == null || !response) {
    return res.status(400).json({ ok: false, error: 'tier, severityMin, response are required' });
  }
  const rule = {
    id: nextRuleId++,
    tier: String(tier).toUpperCase(),
    severityMin: Number(severityMin),
    response: String(response),
    notifyChannels: Array.isArray(notifyChannels) ? notifyChannels : [],
    escalateMinutes: Number(escalateMinutes) || 30,
  };
  escalationRules.push(rule);
  res.status(201).json({ ok: true, data: rule });
});

// PUT update
router.put('/escalation-rules/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = escalationRules.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'not found' });
  const cur = escalationRules[idx];
  const next = { ...cur, ...req.body, id: cur.id };
  if (next.tier) next.tier = String(next.tier).toUpperCase();
  if (next.severityMin != null) next.severityMin = Number(next.severityMin);
  if (next.escalateMinutes != null) next.escalateMinutes = Number(next.escalateMinutes);
  escalationRules[idx] = next;
  res.json({ ok: true, data: next });
});

// DELETE
router.delete('/escalation-rules/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = escalationRules.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'not found' });
  const removed = escalationRules.splice(idx, 1)[0];
  res.json({ ok: true, data: removed });
});

module.exports = router;
