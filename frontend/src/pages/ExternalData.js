import React, { useState } from 'react';
import Layout from '../components/Layout';
import { externalDataAPI } from '../services/api';
import { FiCloud, FiActivity, FiDownload } from 'react-icons/fi';
import { toast } from 'react-toastify';

function ExternalData() {
  const [usgs, setUsgs] = useState([]);
  const [noaa, setNoaa] = useState([]);
  const [minMag, setMinMag] = useState(2.5);
  const [area, setArea] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchUSGS = async () => {
    setLoading(true);
    try {
      const r = await externalDataAPI.usgsEarthquakes(minMag);
      setUsgs(r.data?.events || []);
      toast.success(`Loaded ${r.data?.count || 0} earthquakes`);
    } catch (e) {
      toast.error('USGS fetch failed');
    } finally { setLoading(false); }
  };

  const fetchNOAA = async () => {
    setLoading(true);
    try {
      const r = await externalDataAPI.noaaAlerts(area || undefined);
      setNoaa(r.data?.alerts || []);
      toast.success(`Loaded ${r.data?.count || 0} alerts`);
    } catch (e) {
      toast.error('NOAA fetch failed');
    } finally { setLoading(false); }
  };

  const importNOAA = async () => {
    setLoading(true);
    try {
      const r = await externalDataAPI.importNoaaAlerts(area || undefined);
      toast.success(`Imported ${r.data?.inserted}; skipped ${r.data?.skipped}`);
    } catch (e) {
      toast.error('NOAA import failed');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-group">
            <FiCloud className="page-icon" />
            <h1 className="page-title">External Data Hub</h1>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}><FiActivity /> USGS Earthquakes (24h)</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <label>Min Mag:</label>
              <input type="number" step="0.1" value={minMag} onChange={(e) => setMinMag(parseFloat(e.target.value) || 0)} className="form-input" style={{ width: 100 }} />
              <button className="btn btn-primary" onClick={fetchUSGS} disabled={loading}>Fetch</button>
            </div>
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {usgs.length === 0 ? <p style={{ color: '#64748b' }}>No data yet.</p> : (
                <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
                  <thead><tr><th>Mag</th><th>Place</th><th>Depth</th><th>Tsunami</th></tr></thead>
                  <tbody>
                    {usgs.map((e) => (
                      <tr key={e.id}>
                        <td><strong>{e.mag.toFixed(1)}</strong></td>
                        <td>{e.place}</td>
                        <td>{e.depth_km}km</td>
                        <td>{e.tsunami ? 'YES' : 'no'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}><FiCloud /> NOAA Active Weather Alerts</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <label>State (e.g. CA):</label>
              <input value={area} onChange={(e) => setArea(e.target.value.toUpperCase())} className="form-input" style={{ width: 80 }} maxLength={2} />
              <button className="btn btn-primary" onClick={fetchNOAA} disabled={loading}>Fetch</button>
              <button className="btn btn-outline" onClick={importNOAA} disabled={loading}><FiDownload /> Import</button>
            </div>
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {noaa.length === 0 ? <p style={{ color: '#64748b' }}>No data yet.</p> : (
                noaa.map((a) => (
                  <div key={a.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '8px 0' }}>
                    <div style={{ fontWeight: 'bold' }}>{a.event} <span style={{ color: '#dc2626' }}>({a.severity})</span></div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{a.areaDesc}</div>
                    <div style={{ fontSize: 13 }}>{a.headline}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default ExternalData;
