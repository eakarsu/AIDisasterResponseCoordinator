'use strict';
process.env.JWT_SECRET = 'wave33b-test-secret-with-at-least-32-chars!!';
process.env.OPENROUTER_API_KEY = '';
process.env.OPENAI_API_KEY = '';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
// Production wires the DB-backed auth middleware in server.js; it needs a live user row,
// so tests inject the same contract (Bearer token -> req.user, otherwise 401).
const authenticate = (req, res, next) => {
  const match = /^Bearer user-(\d+)$/.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ error: 'Access denied. No token provided.' });
  req.user = { id: Number(match[1]) };
  return next();
};
const wave = require('../routes/wave33b');

function sign(payload) {
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

const records = [
  { id: 1, title: 'River flood', type: 'flood', severity: 4, status: 'active', location: 'Riverside', commanderName: 'Lee', affectedPopulation: 0, flagged: false, score: 0, note: '' },
  { id: 2, title: 'Hill wildfire', type: 'wildfire', severity: 2, status: 'monitoring', location: 'Hillcrest', commanderName: '', affectedPopulation: 120, flagged: true, score: 5, note: 'check' },
];
const app = wave.createApp({ authenticate, fetchRecords: async () => records });
let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const asUser = (id) => ({ Authorization: `Bearer user-${id}`, 'Content-Type': 'application/json' });

test('tasks require authentication', async () => {
  const res = await fetch(`${base}/api/tasks`);
  assert.equal(res.status, 401);
});

test('tasks create, list, update preserve empty and false values and stay user-scoped', async () => {
  const created = await fetch(`${base}/api/tasks`, { method: 'POST', headers: asUser(1), body: JSON.stringify({ title: 'Stage water supplies', notes: '', flagged: false }) });
  assert.equal(created.status, 201);
  const task = await created.json();
  assert.equal(task.notes, '');
  assert.equal(task.flagged, false);

  const listed = await (await fetch(`${base}/api/tasks`, { headers: asUser(1) })).json();
  assert.equal(listed.total, 1);

  const updated = await (await fetch(`${base}/api/tasks/${task.id}`, { method: 'PUT', headers: asUser(1), body: JSON.stringify({ status: 'done', notes: '' }) })).json();
  assert.equal(updated.status, 'done');
  assert.equal(updated.notes, '');

  const otherUser = await fetch(`${base}/api/tasks/${task.id}`, { method: 'PUT', headers: asUser(2), body: JSON.stringify({ status: 'open' }) });
  assert.equal(otherUser.status, 404);

  const invalid = await fetch(`${base}/api/tasks`, { method: 'POST', headers: asUser(1), body: JSON.stringify({ title: '' }) });
  assert.equal(invalid.status, 400);
});

test('search filter matches text and exact fields', () => {
  assert.equal(wave.filterRecords(records, { q: 'flood' }).length, 1);
  assert.equal(wave.filterRecords(records, { status: 'monitoring' }).length, 1);
  assert.equal(wave.filterRecords(records, { severity: '4' }).length, 1);
  assert.equal(wave.filterRecords(records, { type: 'flood' }).length, 1);
  assert.equal(wave.filterRecords(records, { q: 'river', status: 'active' }).length, 1);
});

test('export returns CSV preserving 0 and false, JSON, and rejects bad format', async () => {
  const csvRes = await fetch(`${base}/api/incidents/export?format=csv`, { headers: asUser(1) });
  assert.equal(csvRes.status, 200);
  const csv = await csvRes.text();
  assert.match(csv, /affectedPopulation/);
  assert.match(csv, /"false"/);
  assert.match(csv, /"0"/);

  const json = await (await fetch(`${base}/api/incidents/export?format=json`, { headers: asUser(1) })).json();
  assert.equal(json.total, 2);
  assert.equal(json.records[0].score, 0);
  assert.equal(json.records[0].flagged, false);

  const bad = await fetch(`${base}/api/incidents/export?format=xml`, { headers: asUser(1) });
  assert.equal(bad.status, 400);
});

test('AI features fall back deterministically with labelled sections and zero counts preserved', async () => {
  for (const feature of wave.AI_FEATURES) {
    const res = await fetch(`${base}/api/ai/${feature}`, { method: 'POST', headers: asUser(1), body: '{}' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.aiGenerated, false);
    assert.equal(body.provider, null);
    assert.ok(body.sections.length >= 3);
    assert.ok(body.sections.every((s) => s.label && typeof s.content === 'string'));
  }
  const outlook = wave.buildAiResult('incident-triage-brief', []);
  assert.equal(outlook.summary.total, 0);
  assert.equal(outlook.summary.severe, 0);
  assert.equal(wave.hasProviderKey({}), false);
  assert.equal(wave.hasProviderKey({ OPENAI_API_KEY: ' set ' }), true);
});
