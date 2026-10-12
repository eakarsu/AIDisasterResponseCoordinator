import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CompleteAIExamples from './CompleteAIExamples';
import AIReport from './AIReport';
import Login from '../pages/Login';
import EEWSFeaturePage from './EEWSFeaturePage';
import AINewTools from '../pages/AINewTools';
import AICenter from '../pages/AICenter';
import AIWorkspace from './AIWorkspace';
import { authAPI } from '../services/api';

jest.mock('../services/api', () => ({ authAPI: { login: jest.fn() } }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('./Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function FormFixture() {
  const [fields, setFields] = useState({ required: '', optional: '', recordId: 'saved-42', json: '' });
  const [submitted, setSubmitted] = useState(0);
  const change = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.value }));
  return <CompleteAIExamples context="Disaster planning review" presets={[0, 1, 2].map((index) => ({ label: `Scenario ${index}`, values: { required: `Flood plan ${index}`, optional: `Shelter capacity review ${index}`, json: JSON.stringify({ teams: index + 1 }) } }))}>
    <form onSubmit={(event) => { event.preventDefault(); setSubmitted((count) => count + 1); }}>
      <label>Required<input name="required" required value={fields.required} onChange={change} /></label>
      <label>Optional<textarea name="optional" value={fields.optional} onChange={change} /></label>
      <label>Record<select name="recordId" value={fields.recordId} onChange={change}><option value="saved-42">Saved record</option></select></label>
      <label>JSON<textarea name="json" value={fields.json} onChange={change} /></label>
      <label>Upload<input name="upload" type="file" /></label>
      <button type="submit">Generate</button>
    </form>
    <output data-testid="submitted">{submitted}</output>
  </CompleteAIExamples>;
}

test('three presets fill required and optional controlled fields without submitting or replacing saved references and uploads', () => {
  const view = render(<FormFixture />);
  const file = new File(['source'], 'evidence.txt', { type: 'text/plain' });
  fireEvent.change(screen.getByLabelText('Upload'), { target: { files: [file] } });
  for (let index = 0; index < 3; index++) {
    fireEvent.click(screen.getByText(`Scenario ${index}`));
    expect(screen.getByLabelText('Required').value).toBe(`Flood plan ${index}`);
    expect(screen.getByLabelText('Optional').value).toBe(`Shelter capacity review ${index}`);
    expect(JSON.parse(screen.getByLabelText('JSON').value).teams).toBe(index + 1);
    expect(screen.getByLabelText('Record').value).toBe('saved-42');
    expect(screen.getByLabelText('Upload').files[0]).toBe(file);
    expect(screen.getByTestId('submitted').textContent).toBe('0');
  }
  view.unmount();
});

test('returned and saved structured reports show sections, facts, tables and lossless scalar values', () => {
  const report = { incident_summary: { safe: false, missing: 0, note: '' }, allocations: [{ team: 'A', count: 0 }, { team: 'B', count: 2 }], actions: ['Verify shelter capacity'] };
  for (const response of [report, { id: 7, result_json: report, result: JSON.stringify(report) }]) {
    const view = render(<AIReport response={response} title="Flood review" />);
    const body = view.container.querySelector('.ai-report-body');
    expect(within(body).getByText('Incident summary')).toBeTruthy();
    expect(within(body).getByText('Safe')).toBeTruthy();
    expect(within(body).getByText('No')).toBeTruthy();
    expect(within(body).getByText('Missing')).toBeTruthy();
    expect(within(body).getAllByText('0').length).toBeGreaterThan(0);
    expect(within(body).getByText('Note').nextSibling.textContent).toBe('');
    expect(body.querySelector('table')).toBeTruthy();
    expect(within(body).getByText('Verify shelter capacity')).toBeTruthy();
    expect(body.querySelector('pre')).toBeNull();
    view.unmount();
  }
});

test('demo button fills only configured credentials and never submits', () => {
  const previousEmail = process.env.REACT_APP_DEMO_EMAIL;
  const previousPassword = process.env.REACT_APP_DEMO_PASSWORD;
  process.env.REACT_APP_DEMO_EMAIL = 'configured@example.test';
  process.env.REACT_APP_DEMO_PASSWORD = 'fixture-password';
  const view = render(<Login />);
  fireEvent.click(screen.getByText('Fill Demo Credentials'));
  expect(screen.getByPlaceholderText('Enter your email').value).toBe('configured@example.test');
  expect(screen.getByPlaceholderText('Enter your password').value).toBe('fixture-password');
  expect(authAPI.login).not.toHaveBeenCalled();
  view.unmount();
  if (previousEmail === undefined) delete process.env.REACT_APP_DEMO_EMAIL; else process.env.REACT_APP_DEMO_EMAIL = previousEmail;
  if (previousPassword === undefined) delete process.env.REACT_APP_DEMO_PASSWORD; else process.env.REACT_APP_DEMO_PASSWORD = previousPassword;
});

test('demo button explains missing frontend credentials without submitting', () => {
  const previousEmail = process.env.REACT_APP_DEMO_EMAIL;
  const previousPassword = process.env.REACT_APP_DEMO_PASSWORD;
  delete process.env.REACT_APP_DEMO_EMAIL;
  delete process.env.REACT_APP_DEMO_PASSWORD;
  render(<Login />);
  fireEvent.click(screen.getByText('Fill Demo Credentials'));
  expect(screen.getByRole('status').textContent).toMatch(/not configured/);
  expect(authAPI.login).not.toHaveBeenCalled();
  if (previousEmail !== undefined) process.env.REACT_APP_DEMO_EMAIL = previousEmail;
  if (previousPassword !== undefined) process.env.REACT_APP_DEMO_PASSWORD = previousPassword;
});


test('EEWS preset uses an actual fetched record ID and does not run AI', async () => {
  const apiService = { getAll: jest.fn().mockResolvedValue({ data: [{ id: 42, stationCode: 'BK.BKS' }] }), ai: jest.fn() };
  render(<EEWSFeaturePage title="Seismic Feed Ingest" apiService={apiService} columns={[]} formFields={[]} aiVerbs={['detect-feed-drop']} />);
  await waitFor(() => expect(screen.getByText('1 total')).toBeTruthy());
  fireEvent.click(screen.getByText('⚡ AI Verbs'));
  fireEvent.click(screen.getByText('detect-feed-drop'));
  fireEvent.click(screen.getByText('First saved record'));
  expect(JSON.parse(document.querySelector('[data-ai-field="aiInput"]').value)).toEqual({ feedId: 42 });
  expect(apiService.ai).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Second saved record'));
  expect(screen.getByRole('status').textContent).toMatch(/actual saved record/);
  expect(apiService.ai).not.toHaveBeenCalled();
});


test('native supply optimizer presets fill both required JSON arrays and optional constraints', () => {
  render(<AINewTools />);
  fireEvent.click(screen.getByText('Supply Distribution Optimizer'));
  for (const label of ['Coastal response', 'Regional response', 'High impact response']) {
    fireEvent.click(screen.getByText(label));
    const fields = [...document.querySelectorAll('[data-ai-field]')];
    expect(fields).toHaveLength(3);
    expect(fields.every((field) => field.value.trim())).toBe(true);
    expect(Array.isArray(JSON.parse(fields[0].value))).toBe(true);
    expect(Array.isArray(JSON.parse(fields[1].value))).toBe(true);
    expect(JSON.parse(fields[2].value).vehicles_available).toBeGreaterThan(0);
  }
  expect(screen.getByRole('status').textContent).toMatch(/No AI request was sent/);
});


test('AI Center threat presets fill every native input with coherent disaster facts', () => {
  render(<AICenter />);
  fireEvent.click(screen.getByText('Threat Analysis'));
  for (const label of ['Coastal flood drill', 'Wildfire drill', 'Earthquake drill']) {
    fireEvent.click(screen.getByText(label));
    const fields = [...document.querySelectorAll('[data-ai-field]')];
    expect(fields).toHaveLength(4);
    expect(fields.every((field) => field.value.trim())).toBe(true);
    expect(fields[0].value).toMatch(/flood|wildfire|earthquake/i);
  }
  expect(screen.getByRole('status').textContent).toMatch(/No AI request was sent/);
});


test('saved history opens a structured detail report without contacting a provider', async () => {
  const previousFetch = global.fetch;
  const saved = { id: 12, input: { goal: 'Shelter review' }, created_at: '2026-10-10T12:00:00Z', model: 'fixture', result_json: { approved: false, unassigned: 0, note: '', priorities: ['Check access routes'] } };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [saved] }) });
  try {
    render(<AIWorkspace feature={{ id: 'fixture', title: 'Shelter review', description: 'Fixture review' }} token="fixture-token" />);
    const row = await screen.findByText('Open report →');
    fireEvent.click(row);
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy();
    expect(screen.getByText('Unassigned')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('Check access routes')).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally { global.fetch = previousFetch; }
});
