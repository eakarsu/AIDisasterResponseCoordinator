import React, { useEffect, useState } from 'react';
import api from '../services/api';

const blank = {
  tier: '',
  severityMin: 0,
  response: '',
  notifyChannels: '',
  escalateMinutes: 30,
};

function EscalationRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => {
    api.get('/custom-views/escalation-rules')
      .then((r) => setRules(r.data.data))
      .catch((e) => setErr(e.message || 'Load failed'));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const payload = {
      tier: form.tier,
      severityMin: Number(form.severityMin),
      response: form.response,
      notifyChannels: form.notifyChannels ? form.notifyChannels.split(',').map((s) => s.trim()).filter(Boolean) : [],
      escalateMinutes: Number(form.escalateMinutes) || 30,
    };
    try {
      if (editingId) {
        await api.put(`/custom-views/escalation-rules/${editingId}`, payload);
      } else {
        await api.post('/custom-views/escalation-rules', payload);
      }
      setForm(blank);
      setEditingId(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message || 'Save failed');
    }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({
      tier: r.tier,
      severityMin: r.severityMin,
      response: r.response,
      notifyChannels: (r.notifyChannels || []).join(', '),
      escalateMinutes: r.escalateMinutes,
    });
  };

  const remove = async (id) => {
    try {
      await api.delete(`/custom-views/escalation-rules/${id}`);
      load();
    } catch (e) {
      setErr(e.message || 'Delete failed');
    }
  };

  const cellStyle = { padding: 8, borderBottom: '1px solid #1e293b', color: '#e2e8f0', fontSize: 13 };

  return (
    <div data-testid="escalation-rules" style={{ background: '#0f172a', borderRadius: 8, padding: 16 }}>
      <h3 style={{ color: '#f1f5f9', marginTop: 0 }}>Escalation Rules Editor (Severity Tiers + Response)</h3>
      {err && <div style={{ color: '#ef4444', marginBottom: 10 }}>{err}</div>}

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr 1fr auto', gap: 8, marginBottom: 16 }}>
        <input placeholder="Tier (e.g. HIGH)" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} required style={{ padding: 8 }} />
        <input type="number" placeholder="Severity min" value={form.severityMin} onChange={(e) => setForm({ ...form, severityMin: e.target.value })} required style={{ padding: 8 }} />
        <input placeholder="Response action" value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} required style={{ padding: 8 }} />
        <input placeholder="Notify (CSV)" value={form.notifyChannels} onChange={(e) => setForm({ ...form, notifyChannels: e.target.value })} style={{ padding: 8 }} />
        <input type="number" placeholder="Escalate min" value={form.escalateMinutes} onChange={(e) => setForm({ ...form, escalateMinutes: e.target.value })} style={{ padding: 8 }} />
        <button type="submit" style={{ background: editingId ? '#f59e0b' : '#10b981', color: '#fff', border: 0, padding: '8px 14px', borderRadius: 4, cursor: 'pointer' }}>
          {editingId ? 'Update' : 'Add'}
        </button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#1e293b' }}>
            <th style={cellStyle}>Tier</th>
            <th style={cellStyle}>Severity Min</th>
            <th style={cellStyle}>Response</th>
            <th style={cellStyle}>Notify Channels</th>
            <th style={cellStyle}>Escalate (min)</th>
            <th style={cellStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id}>
              <td style={cellStyle}><strong>{r.tier}</strong></td>
              <td style={cellStyle}>{r.severityMin}</td>
              <td style={cellStyle}>{r.response}</td>
              <td style={cellStyle}>{(r.notifyChannels || []).join(', ')}</td>
              <td style={cellStyle}>{r.escalateMinutes}</td>
              <td style={cellStyle}>
                <button onClick={() => startEdit(r)} style={{ marginRight: 6, background: '#3b82f6', color: '#fff', border: 0, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => remove(r.id)} style={{ background: '#ef4444', color: '#fff', border: 0, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EscalationRulesEditor;
