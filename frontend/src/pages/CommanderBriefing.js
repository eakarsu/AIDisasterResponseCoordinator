import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { briefingAPI } from '../services/api';
import { FiBookOpen, FiCpu, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import AIReport from '../components/AIReport';

function CommanderBriefing() {
  const [briefing, setBriefing] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRecent = async () => {
    try {
      const r = await briefingAPI.recent(20);
      setRecent(Array.isArray(r.data?.data) ? r.data.data : []);
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
                <AIReport response={briefing.briefing} title="Commander briefing" />
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
