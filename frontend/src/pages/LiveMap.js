import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { mapAPI } from '../services/api';
import { FiGlobe, FiAlertTriangle, FiHome, FiTruck, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';

/**
 * Lightweight live map view that does not require a third-party JS map library.
 * Renders entities on an SVG canvas projected from current bounds.
 * Each marker is clickable for details.
 */
function project(lng, lat, bounds, width, height) {
  const [minLng, minLat] = bounds.sw;
  const [maxLng, maxLat] = bounds.ne;
  const x = ((lng - minLng) / Math.max(0.0001, (maxLng - minLng))) * width;
  const y = height - ((lat - minLat) / Math.max(0.0001, (maxLat - minLat))) * height;
  return { x, y };
}

function LiveMap() {
  const [features, setFeatures] = useState([]);
  const [counts, setCounts] = useState({});
  const [bounds, setBounds] = useState({ sw: [-125, 24], ne: [-66, 49] });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, b] = await Promise.all([
        mapAPI.getGeo(statusFilter ? { incidentStatus: statusFilter } : {}),
        mapAPI.getBounds(),
      ]);
      setFeatures(g.data.features || []);
      setCounts(g.data.counts || {});
      // expand a small margin so points aren't on the edge
      const sw = b.data.sw; const ne = b.data.ne;
      const lngPad = Math.max(1, (ne[0] - sw[0]) * 0.08);
      const latPad = Math.max(1, (ne[1] - sw[1]) * 0.08);
      setBounds({ sw: [sw[0] - lngPad, sw[1] - latPad], ne: [ne[0] + lngPad, ne[1] + latPad] });
    } catch (e) {
      toast.error('Failed to load map data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(t);
  }, [load]);

  const W = 900, H = 480;

  const colorFor = (kind) => kind === 'incident' ? '#ef4444' : kind === 'shelter' ? '#22c55e' : '#3b82f6';
  const sizeFor = (f) => f.properties.kind === 'incident' ? Math.max(5, (f.properties.severity || 1) * 2.5) : 5;

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-group">
            <FiGlobe className="page-icon" />
            <h1 className="page-title">Live Operations Map</h1>
            <span className="page-count">
              {counts.incidents || 0} incidents, {counts.shelters || 0} shelters, {counts.resources || 0} resources
            </span>
          </div>
          <button className="btn btn-primary" onClick={load} disabled={loading}>
            <FiRefreshCw /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>Incident Status:</label>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 200 }}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <span style={{ color: '#64748b', fontSize: 12 }}>Auto-refreshes every 30s</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#0f172a' }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
              <rect x="0" y="0" width={W} height={H} fill="#0f172a" />
              {/* grid */}
              {[...Array(10)].map((_, i) => (
                <line key={`v${i}`} x1={i * (W / 10)} y1={0} x2={i * (W / 10)} y2={H} stroke="#1e293b" strokeWidth="1" />
              ))}
              {[...Array(6)].map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i * (H / 6)} x2={W} y2={i * (H / 6)} stroke="#1e293b" strokeWidth="1" />
              ))}

              {features.map((f, i) => {
                const [lng, lat] = f.geometry.coordinates;
                const p = project(lng, lat, bounds, W, H);
                return (
                  <g key={i} style={{ cursor: 'pointer' }} onClick={() => setSelected(f)}>
                    <circle cx={p.x} cy={p.y} r={sizeFor(f)} fill={colorFor(f.properties.kind)} fillOpacity="0.75" stroke="#fff" strokeWidth="1" />
                  </g>
                );
              })}

              <text x="10" y="20" fill="#94a3b8" fontSize="12">SW: [{bounds.sw[0].toFixed(2)}, {bounds.sw[1].toFixed(2)}]</text>
              <text x="10" y="35" fill="#94a3b8" fontSize="12">NE: [{bounds.ne[0].toFixed(2)}, {bounds.ne[1].toFixed(2)}]</text>
            </svg>
            <div style={{ padding: 8, color: '#cbd5e1', fontSize: 12, borderTop: '1px solid #1e293b', display: 'flex', gap: 18 }}>
              <span><FiAlertTriangle style={{ color: '#ef4444' }} /> Incidents (size = severity)</span>
              <span><FiHome style={{ color: '#22c55e' }} /> Shelters</span>
              <span><FiTruck style={{ color: '#3b82f6' }} /> Resources</span>
            </div>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: 'white', maxHeight: 480, overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Selection</h3>
            {selected ? (
              <div>
                <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, color: 'white', background: colorFor(selected.properties.kind), marginBottom: 8 }}>
                  {selected.properties.kind}
                </div>
                {Object.entries(selected.properties).filter(([k]) => k !== 'kind').map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 6 }}>
                    <strong style={{ fontSize: 12, color: '#475569' }}>{k}:</strong>{' '}
                    <span style={{ fontSize: 14 }}>{v == null ? '—' : String(v)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                  Coords: {selected.geometry.coordinates.map((c) => c.toFixed(3)).join(', ')}
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>Click any marker on the map to view details.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default LiveMap;
