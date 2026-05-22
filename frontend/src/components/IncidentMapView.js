import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

function IncidentMapView() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/custom-views/incident-map')
      .then((r) => setData(r.data.data))
      .catch((e) => setErr(e.message || 'Failed to load map'));
  }, []);

  if (err) return <div style={{ padding: 12, color: '#ef4444' }}>Map error: {err}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading incident map...</div>;

  return (
    <div data-testid="incident-map" style={{ background: '#0f172a', borderRadius: 8, padding: 12 }}>
      <h3 style={{ color: '#f1f5f9', marginTop: 0 }}>Active Incidents (color-coded by severity)</h3>
      <div style={{ height: 420, borderRadius: 6, overflow: 'hidden' }}>
        <MapContainer center={[data.centerLat, data.centerLng]} zoom={data.zoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data.incidents.map((i) => (
            <CircleMarker
              key={i.id}
              center={[i.lat, i.lng]}
              radius={8 + i.severity / 12}
              pathOptions={{ color: i.color, fillColor: i.color, fillOpacity: 0.75 }}
            >
              <Popup>
                <strong>{i.name}</strong>
                <br />Type: {i.type}
                <br />Severity: {i.severity}
                <br />Status: {i.status}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, color: '#cbd5e1', fontSize: 12 }}>
        <span><span style={{ background: '#dc2626', display: 'inline-block', width: 12, height: 12, marginRight: 4 }} />Critical 80+</span>
        <span><span style={{ background: '#f59e0b', display: 'inline-block', width: 12, height: 12, marginRight: 4 }} />High 60-79</span>
        <span><span style={{ background: '#facc15', display: 'inline-block', width: 12, height: 12, marginRight: 4 }} />Moderate 40-59</span>
        <span><span style={{ background: '#22c55e', display: 'inline-block', width: 12, height: 12, marginRight: 4 }} />Low &lt;40</span>
      </div>
    </div>
  );
}

export default IncidentMapView;
