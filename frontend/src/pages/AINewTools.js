import React, { useState } from 'react';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import api from '../services/api';
import { FiCpu, FiTruck, FiHeart, FiHome, FiChevronRight, FiZap, FiUsers, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';
import '../App.css';

// Local AI helpers for the new endpoints (kept inline so we don't modify api.js).
const aiNewTools = {
  optimizeSupplyDistribution: (data) => api.post('/ai/optimize-supply-distribution', data),
  matchDonationToNeed: (data) => api.post('/ai/match-donation-to-need', data),
  optimizeShelterAssignments: (data) => api.post('/ai/optimize-shelter-assignments', data),
  vulnerabilityAnalysis: (data) => api.post('/ai/vulnerability-analysis', data),
  recoveryTrajectory: (data) => api.post('/ai/recovery-trajectory', data),
  impactForecast: (data) => api.post('/ai/impact-forecast', data),
};

const SAMPLE_SUPPLIES = `[
  { "name": "Bottled Water", "qty": 2000, "location": "Warehouse A" },
  { "name": "Blankets", "qty": 800, "location": "Warehouse B" }
]`;

const SAMPLE_DEMAND_POINTS = `[
  { "location": "Shelter Eagle", "needs": [{ "item": "Bottled Water", "qty": 600 }, { "item": "Blankets", "qty": 200 }] },
  { "location": "Shelter Hawk", "needs": [{ "item": "Bottled Water", "qty": 400 }] }
]`;

const SAMPLE_SUPPLY_CONSTRAINTS = `{ "vehicles_available": 3, "max_distance_miles": 80 }`;

const SAMPLE_DONATIONS = `[
  { "id": "D1", "item": "Bottled Water", "qty": 500, "donor": "Local Co.", "location": "Hub North" },
  { "id": "D2", "item": "Diapers", "qty": 200, "donor": "Anonymous" }
]`;

const SAMPLE_NEEDS = `[
  { "id": "N1", "location": "Shelter Eagle", "item": "Bottled Water", "qty": 600, "urgency": "high" },
  { "id": "N2", "location": "Shelter Hawk", "item": "Diapers", "qty": 150, "urgency": "medium" }
]`;

const SAMPLE_SHELTERS = `[
  { "id": "SH1", "capacity": 200, "accessible": true, "family_friendly": true, "pets_ok": false },
  { "id": "SH2", "capacity": 150, "accessible": false, "family_friendly": true, "pets_ok": true }
]`;

const SAMPLE_EVACUEES = `[
  { "group_id": "G1", "size": 4, "special_needs": ["wheelchair access"] },
  { "group_id": "G2", "size": 3, "special_needs": ["pet (dog)"] }
]`;

const SAMPLE_POPULATION = `[
  { "group": "Elderly (65+)", "count": 1200, "factors": ["limited mobility", "chronic illness"] },
  { "group": "Children (0-12)", "count": 800, "factors": ["dependent on caregivers"] },
  { "group": "Low-income households", "count": 2400, "factors": ["no transport", "no insurance"] }
]`;

const SAMPLE_INCIDENT_SUMMARY = `Category 4 hurricane made landfall 72 hours ago; widespread power outages, partial flooding in low-lying neighborhoods, two shelters at capacity.`;
const SAMPLE_CURRENT_STATUS = `{ "power_restored_pct": 35, "shelters_open": 4, "displaced_persons": 1850, "roads_blocked": 12 }`;
const SAMPLE_RESOURCES = `{ "crews": 45, "generators": 18, "medical_teams": 6, "food_water_pallets": 220 }`;

const SAMPLE_FORECAST_HAZARD = `Wildfire (Red Flag Warning, dry foehn winds 45mph)`;
const SAMPLE_FORECAST_REGION = `Foothills suburbs north of city, 15-mile WUI zone`;

const tools = [
  {
    key: 'supply',
    label: 'Supply Distribution Optimizer',
    icon: FiTruck,
    color: '#10b981',
    desc: 'Optimize allocations from supplies to demand points.',
    fields: [
      { name: 'supplies', label: 'Supplies (JSON array)', placeholder: SAMPLE_SUPPLIES, requireArray: true },
      { name: 'demand_points', label: 'Demand Points (JSON array)', placeholder: SAMPLE_DEMAND_POINTS, requireArray: true },
      { name: 'constraints', label: 'Constraints (optional, JSON)', placeholder: SAMPLE_SUPPLY_CONSTRAINTS, optional: true },
    ],
    apiFn: aiNewTools.optimizeSupplyDistribution,
    resultKey: 'plan',
  },
  {
    key: 'donation',
    label: 'Donation-to-Need Matcher',
    icon: FiHeart,
    color: '#e11d48',
    desc: 'Match incoming donations to verified needs.',
    fields: [
      { name: 'donations', label: 'Donations (JSON array)', placeholder: SAMPLE_DONATIONS, requireArray: true },
      { name: 'needs', label: 'Needs (JSON array)', placeholder: SAMPLE_NEEDS, requireArray: true },
    ],
    apiFn: aiNewTools.matchDonationToNeed,
    resultKey: 'matches',
  },
  {
    key: 'shelter',
    label: 'Shelter Assignment Optimizer',
    icon: FiHome,
    color: '#3b82f6',
    desc: 'Assign evacuee groups to shelters respecting needs and capacity.',
    fields: [
      { name: 'shelters', label: 'Shelters (JSON array)', placeholder: SAMPLE_SHELTERS, requireArray: true },
      { name: 'evacuees', label: 'Evacuees (JSON array)', placeholder: SAMPLE_EVACUEES, requireArray: true },
    ],
    apiFn: aiNewTools.optimizeShelterAssignments,
    resultKey: 'assignments',
  },
  {
    key: 'vulnerability',
    label: 'Vulnerability Analysis',
    icon: FiUsers,
    color: '#a855f7',
    desc: 'Identify the most at-risk population groups for a given hazard.',
    fields: [
      { name: 'population', label: 'Population (JSON array)', placeholder: SAMPLE_POPULATION, requireArray: true },
      { name: 'hazard', label: 'Hazard (text)', placeholder: 'e.g. Hurricane Cat 3', optional: true, plain: true },
      { name: 'location', label: 'Location (text)', placeholder: 'e.g. Coastal county X', optional: true, plain: true },
    ],
    apiFn: aiNewTools.vulnerabilityAnalysis,
    resultKey: 'analysis',
  },
  {
    key: 'recovery',
    label: 'Recovery Trajectory',
    icon: FiTrendingUp,
    color: '#0ea5e9',
    desc: 'Project recovery phases, durations, dependencies, and risks.',
    fields: [
      { name: 'incident_summary', label: 'Incident Summary (text)', placeholder: SAMPLE_INCIDENT_SUMMARY, plain: true },
      { name: 'current_status', label: 'Current Status (JSON)', placeholder: SAMPLE_CURRENT_STATUS },
      { name: 'resources_available', label: 'Resources Available (optional, JSON)', placeholder: SAMPLE_RESOURCES, optional: true },
    ],
    apiFn: aiNewTools.recoveryTrajectory,
    resultKey: 'trajectory',
  },
  {
    key: 'impact',
    label: 'Impact Forecast',
    icon: FiAlertTriangle,
    color: '#f59e0b',
    desc: 'Pre-event forecast of casualties, displacement, and infrastructure impact.',
    fields: [
      { name: 'hazard', label: 'Hazard (text)', placeholder: SAMPLE_FORECAST_HAZARD, plain: true },
      { name: 'region', label: 'Region (text)', placeholder: SAMPLE_FORECAST_REGION, plain: true },
      { name: 'population_at_risk', label: 'Population at Risk (optional, number)', placeholder: '12000', optional: true, plain: true },
      { name: 'time_horizon_hours', label: 'Time Horizon Hours (optional, number)', placeholder: '24', optional: true, plain: true },
    ],
    apiFn: aiNewTools.impactForecast,
    resultKey: 'forecast',
  },
];

function ResultBlock({ label, data }) {
  if (!data) return null;
  let content;
  if (typeof data === 'string') {
    content = data;
  } else {
    try { content = JSON.stringify(data, null, 2); } catch { content = String(data); }
  }
  return (
    <div className="ai-output">
      <div className="ai-output-header">
        <FiZap className="ai-output-icon" />
        <h3>AI Result: {label}</h3>
      </div>
      <div className="ai-output-body">
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          {content}
        </pre>
      </div>
    </div>
  );
}

function AINewTools() {
  const [activeTool, setActiveTool] = useState(null);
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const select = (tool) => {
    setActiveTool(tool);
    setFormData({});
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeTool) return;
    setError(null);

    const payload = {};
    for (const field of activeTool.fields) {
      const raw = formData[field.name];
      if (!raw || !String(raw).trim()) {
        if (field.optional) continue;
        setError(`${field.label} is required`);
        return;
      }
      if (field.plain) {
        payload[field.name] = String(raw).trim();
        continue;
      }
      try {
        const parsed = JSON.parse(raw);
        if (field.requireArray && !Array.isArray(parsed)) {
          setError(`${field.label} must be a JSON array`);
          return;
        }
        payload[field.name] = parsed;
      } catch {
        setError(`${field.label} must be valid JSON`);
        return;
      }
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await activeTool.apiFn(payload);
      const data = res.data;
      const main = data[activeTool.resultKey] ?? data;
      setResult({ data: main, label: activeTool.label });
      toast.success('AI analysis complete!');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Request failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-group">
            <FiCpu className="page-icon" />
            <h1 className="page-title">AI New Tools</h1>
          </div>
        </div>

        {!activeTool ? (
          <div className="ai-modules-grid">
            {tools.map((t) => (
              <div
                key={t.key}
                className="ai-module-card"
                onClick={() => select(t)}
                style={{ '--card-accent': t.color }}
              >
                <div className="ai-module-icon" style={{ background: `${t.color}20`, color: t.color }}>
                  <t.icon size={32} />
                </div>
                <h3 className="ai-module-title">{t.label}</h3>
                <p className="ai-module-desc">{t.desc}</p>
                <div className="ai-module-action" style={{ color: t.color }}>
                  Launch Module <FiChevronRight />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ai-workspace">
            <button className="btn btn-outline ai-back-btn" onClick={() => select(null)}>
              ← Back to Tools
            </button>

            <div className="ai-workspace-header" style={{ '--module-color': activeTool.color }}>
              <activeTool.icon size={28} style={{ color: activeTool.color }} />
              <h2>{activeTool.label}</h2>
              <p>{activeTool.desc}</p>
            </div>

            <div className="ai-workspace-content">
              <div className="ai-form-panel">
                <h3 className="ai-form-title">Input Parameters</h3>
                <form onSubmit={handleSubmit} className="ai-form">
                  {activeTool.fields.map((field) => (
                    <div key={field.name} className="form-group">
                      <label className="form-label">
                        {field.label}{field.optional ? '' : ' *'}
                      </label>
                      <textarea
                        className="form-textarea"
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        rows={6}
                        style={{ fontFamily: 'monospace', fontSize: 13 }}
                      />
                    </div>
                  ))}

                  {error && (
                    <div style={{
                      padding: 10,
                      marginBottom: 12,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      borderRadius: 6,
                      fontSize: 13,
                    }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    {loading ? (
                      <span className="btn-loading">
                        <span className="loading-spinner-small"></span>
                        AI Processing...
                      </span>
                    ) : (
                      <span><FiZap /> Run AI Analysis</span>
                    )}
                  </button>
                </form>
              </div>

              <div className="ai-result-panel">
                {loading && (
                  <div className="ai-loading">
                    <div className="loading-spinner"></div>
                    <p>AI is analyzing your request...</p>
                    <p className="ai-loading-sub">Powered by OpenRouter AI</p>
                  </div>
                )}
                {result && <ResultBlock data={result.data} label={result.label} />}
                {!loading && !result && (
                  <div className="ai-placeholder">
                    <FiCpu size={48} />
                    <h3>Ready for Analysis</h3>
                    <p>Provide the JSON inputs and run the analysis.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AINewTools;
