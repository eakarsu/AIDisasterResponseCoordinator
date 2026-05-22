import React, { useState } from 'react';

function SituationReportPDF() {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(null);

  const generate = async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/custom-views/situation-report', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    } catch (e) {
      setErr(e.message || 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="sitrep-pdf" style={{ background: '#0f172a', borderRadius: 8, padding: 16 }}>
      <h3 style={{ color: '#f1f5f9', marginTop: 0 }}>Situation Report (PDF)</h3>
      <p style={{ color: '#94a3b8' }}>
        Generate a downloadable PDF SITREP summarizing active incidents, deployed teams, and configured escalation tiers.
      </p>
      <button
        onClick={generate}
        disabled={loading}
        style={{ background: '#3b82f6', color: '#fff', padding: '10px 16px', border: 0, borderRadius: 4, cursor: 'pointer' }}
      >
        {loading ? 'Generating...' : 'Generate SITREP PDF'}
      </button>
      {err && <div style={{ color: '#ef4444', marginTop: 10 }}>Error: {err}</div>}
      {url && (
        <div style={{ marginTop: 12 }}>
          <a href={url} download="sitrep.pdf" style={{ color: '#60a5fa' }}>Download sitrep.pdf</a>
          <iframe title="sitrep-preview" src={url} style={{ display: 'block', width: '100%', height: 380, marginTop: 8, background: '#fff' }} />
        </div>
      )}
    </div>
  );
}

export default SituationReportPDF;
