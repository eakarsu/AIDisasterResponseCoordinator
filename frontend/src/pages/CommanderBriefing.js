import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { briefingAPI } from '../services/api';
import { FiBookOpen, FiCpu, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';

function CommanderBriefing() {
  const [briefing, setBriefing] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRecent = async () => {
    try {
      const r = await briefingAPI.recent(10);
      setRecent(r.data?.data || []);
    } catch (_) {}
  };

  useEffect(() => { loadRecent(); }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const r = await briefingAPI.generate();
      setBriefing(r.data);
      toast.success('Briefing generated');
      loadRecent();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Briefing failed');
    } finally {
      setLoading(false);
    }
  };

  const renderBriefing = (b) => {
    if (!b) return null;
    if (b.raw) return <pre style={{ whiteSpace: 'pre-wrap' }}>{b.raw}</pre>;
    return (
      <div>
        {b.headline && <h2 style={{ marginTop: 0 }}>{b.headline}</h2>}
        {b.summary && <p>{b.summary}</p>}
        {b.highest_priority_incidents && b.highest_priority_incidents.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3>Highest Priority Incidents</h3>
            {b.highest_priority_incidents.map((i, idx) => (
              <div key={idx} style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: 8, marginBottom: 8 }}>
                <strong>#{i.id} (sev {i.severity}):</strong> {i.title}<br />
                <small>{i.rationale}</small>
              </div>
            ))}
          </div>
        )}
        {b.resource_posture && <p><strong>Resource Posture:</strong> {b.resource_posture}</p>}
        {b.recommended_actions && b.recommended_actions.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h3>Recommended Actions</h3>
            <ul>{b.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
        {b.risk_alerts && b.risk_alerts.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h3>Risk Alerts</h3>
            <ul>{b.risk_alerts.map((a, i) => <li key={i} style={{ color: '#b91c1c' }}>{a}</li>)}</ul>
          </div>
        )}
        {b.shift_handoff_notes && (
          <div style={{ marginTop: 12, padding: 12, background: '#eff6ff', borderRadius: 6 }}>
            <strong>Shift Handoff:</strong> {b.shift_handoff_notes}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-group">
            <FiBookOpen className="page-icon" />
            <h1 className="page-title">Commander Briefing</h1>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            <FiCpu /> {loading ? 'Generating...' : 'Generate New Briefing'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            {briefing ? (
              <>
                <div style={{ marginBottom: 12, color: '#64748b' }}>
                  Generated at {briefing.generated_at} · {briefing.incident_count} active incidents
                </div>
                {renderBriefing(briefing.briefing)}
              </>
            ) : (
              <p style={{ color: '#64748b' }}>Click "Generate New Briefing" to compile a real-time incident summary using AI.</p>
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}><FiClock /> Recent Briefings</h3>
            {recent.length === 0 ? (
              <p style={{ color: '#64748b' }}>None yet.</p>
            ) : (
              recent.map((r) => (
                <div key={r.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '8px 0', cursor: 'pointer' }}
                     onClick={() => setBriefing({ briefing: r.ai_results || { raw: r.result_text }, generated_at: r.createdAt, incident_count: '?' })}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(r.createdAt).toLocaleString()}</div>
                  <div style={{ fontSize: 14 }}>{r.input_summary}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default CommanderBriefing;
