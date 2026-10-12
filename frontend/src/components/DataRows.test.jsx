import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import FeaturePage from './FeaturePage';
import EEWSFeaturePage from './EEWSFeaturePage';
import AAR from '../pages/AAR';
import MutualAid from '../pages/MutualAid';
import CommanderBriefing from '../pages/CommanderBriefing';
import { aarAPI, briefingAPI, incidentAPI, mutualAidAPI } from '../services/api';

jest.mock('./Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('react-toastify', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('../services/api', () => ({
  aarAPI: { list: jest.fn(), exportUrl: (id) => `/api/aar/${id}/export` }, incidentAPI: { getAll: jest.fn() }, mutualAidAPI: { list: jest.fn() },
  briefingAPI: { recent: jest.fn() },
}));

const rows = Array.from({ length: 15 }, (_, index) => ({ id: index + 1, title: `Incident ${index + 1}`, stationCode: `BK.${index + 1}` }));

test('shared record and EEWS tables render 15 paginated records without a runtime error', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const service = { getAll: jest.fn().mockResolvedValue({ data: { data: rows, pagination: { total: 15 } } }) };
    const page = render(<FeaturePage title="Incidents" apiService={service} columns={[{ key: 'title', label: 'Title' }]} formFields={[]} />);
    await waitFor(() => expect(page.container.querySelectorAll('tbody tr')).toHaveLength(15));
    page.unmount();
    const eews = render(<EEWSFeaturePage title="Seismic Feed Ingest" apiService={service} columns={[{ key: 'stationCode', label: 'Station' }]} formFields={[]} aiVerbs={[]} />);
    await waitFor(() => expect(eews.container.querySelectorAll('tbody tr')).toHaveLength(15));
    expect(error.mock.calls.filter(([message]) => /TypeError|\.map is not a function|\.reduce is not a function|undefined.length/.test(String(message)))).toHaveLength(0);
  } finally { error.mockRestore(); }
});

test('saved commander briefing opens as labeled structured content', async () => {
  briefingAPI.recent.mockResolvedValue({ data: { data: [{ id: 7, input_summary: 'Flood briefing', createdAt: '2026-10-10T12:00:00Z', ai_results: { safe: false, missing: 0, note: '', actions: ['Confirm shelter capacity'] } }] } });
  const page = render(<CommanderBriefing />);
  fireEvent.click(await screen.findByText('Flood briefing'));
  const report = page.container.querySelector('.ai-report-body');
  expect(within(report).getByText('Safe')).toBeTruthy();
  expect(within(report).getByText('No')).toBeTruthy();
  expect(within(report).getByText('0')).toBeTruthy();
  expect(within(report).getByText('Confirm shelter capacity')).toBeTruthy();
  expect(report.querySelector('pre')).toBeNull();
});

test('mutual aid and AAR lists render 15 paginated records, and AAR detail renders structured output', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    mutualAidAPI.list.mockResolvedValue({ data: { data: rows.map((row) => ({ id: row.id, agency: row.title, kind: 'aid-request', post: { quantity: 1 } })), pagination: { total: 15, totalPages: 1 } } });
    const mutual = render(<MutualAid />);
    await waitFor(() => expect(mutual.container.querySelectorAll('tbody tr')).toHaveLength(15));
    mutual.unmount();
    aarAPI.list.mockResolvedValue({ data: { data: rows.map((row) => ({ id: row.id, incident_id: row.id, status: 'draft', created_at: '2026-10-10T12:00:00Z', approvals: [], report: { report: { approved: false, missing: 0, note: '', actions: ['Review shelter access'] } } })), pagination: { total: 15, totalPages: 1 } } });
    incidentAPI.getAll.mockResolvedValue({ data: { data: rows } });
    const aar = render(<AAR />);
    await waitFor(() => expect(aarAPI.list).toHaveBeenCalledWith({ page: 1, limit: 20 }));
    await waitFor(() => expect(screen.getAllByText(/AAR #\d+ \(Incident #\d+\)/)).toHaveLength(15));
    fireEvent.click(screen.getByText('AAR #1 (Incident #1)'));
    const report = aar.container.querySelector('.ai-report-body');
    expect(within(report).getByText('Approved')).toBeTruthy();
    expect(within(report).getByText('No')).toBeTruthy();
    expect(within(report).getByText('0')).toBeTruthy();
    expect(within(report).getByText('Review shelter access')).toBeTruthy();
    expect(error.mock.calls.filter(([message]) => /TypeError|\.map is not a function|\.reduce is not a function|undefined.length/.test(String(message)))).toHaveLength(0);
  } finally { error.mockRestore(); }
});
