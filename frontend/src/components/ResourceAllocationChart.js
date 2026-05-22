import React, { useEffect, useState } from 'react';
import api from '../services/api';

function Bar({ label, value, max, color, suffix }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', fontSize: 13 }}>
        <span>{label}</span>
        <span>{value}{suffix ? ` ${suffix}` : ''} ({pct}%)</span>
      </div>
      <div style={{ background: '#1e293b', height: 18, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', transition: 'width .4s' }} />
      </div>
    </div>
  );
}

function ResourceAllocationChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/custom-views/resource-allocation')
      .then((r) => setData(r.data.data))
      .catch((e) => setErr(e.message || 'Failed to load allocation'));
  }, []);

  if (err) return <div style={{ padding: 12, color: '#ef4444' }}>Allocation error: {err}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading allocation...</div>;

  return (
    <div data-testid="resource-allocation" style={{ background: '#0f172a', borderRadius: 8, padding: 16 }}>
      <h3 style={{ color: '#f1f5f9', marginTop: 0 }}>Resource Allocation - Teams</h3>
      {data.teams.map((t) => (
        <Bar key={t.name} label={t.name} value={t.deployed} max={t.personnel} color="#3b82f6" suffix={`/${t.personnel} personnel`} />
      ))}
      <h3 style={{ color: '#f1f5f9', marginTop: 16 }}>Asset Utilization</h3>
      {data.assets.map((a) => (
        <Bar key={a.category} label={a.category} value={a.inUse} max={a.total} color="#10b981" suffix={`/${a.total}`} />
      ))}
    </div>
  );
}

export default ResourceAllocationChart;
