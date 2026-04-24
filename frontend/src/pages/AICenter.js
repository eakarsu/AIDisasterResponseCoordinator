import React, { useState } from 'react';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import { aiAPI } from '../services/api';
import { FiCpu, FiAlertTriangle, FiMap, FiClipboard, FiCloud, FiTruck, FiFileText, FiHeart, FiSearch, FiChevronRight, FiZap } from 'react-icons/fi';
import '../App.css';

const aiModules = [
  { key: 'threat', label: 'Threat Analysis', icon: FiAlertTriangle, color: '#ef4444', desc: 'AI-powered disaster threat risk assessment', api: 'analyzeThreat' },
  { key: 'evacuation', label: 'Evacuation Planner', icon: FiMap, color: '#ec4899', desc: 'Generate AI evacuation plans', api: 'generateEvacuationPlan' },
  { key: 'damage', label: 'Damage Assessment', icon: FiClipboard, color: '#f97316', desc: 'AI structural damage analysis', api: 'assessDamage' },
  { key: 'weather', label: 'Weather Prediction', icon: FiCloud, color: '#3b82f6', desc: 'AI weather impact forecasting', api: 'predictWeather' },
  { key: 'resources', label: 'Resource Optimizer', icon: FiTruck, color: '#10b981', desc: 'AI resource allocation optimization', api: 'optimizeResources' },
  { key: 'report', label: 'After-Action Report', icon: FiFileText, color: '#8b5cf6', desc: 'Generate FEMA-style AAR reports', api: 'generateReport' },
  { key: 'triage', label: 'Medical Triage', icon: FiHeart, color: '#e11d48', desc: 'AI mass casualty triage recommendations', api: 'triageMedical' },
  { key: 'search', label: 'Search Strategy', icon: FiSearch, color: '#eab308', desc: 'AI search & rescue strategy planner', api: 'searchStrategy' },
];

const formConfigs = {
  threat: [
    { name: 'threatType', label: 'Threat Type', type: 'text', placeholder: 'e.g. Category 4 Hurricane' },
    { name: 'region', label: 'Region', type: 'text', placeholder: 'e.g. Gulf Coast, Texas' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the threat scenario...' },
    { name: 'historicalData', label: 'Historical Data', type: 'textarea', placeholder: 'Any relevant historical context...' },
  ],
  evacuation: [
    { name: 'area', label: 'Area', type: 'text', placeholder: 'e.g. Miami-Dade County' },
    { name: 'population', label: 'Population', type: 'text', placeholder: 'e.g. 250,000' },
    { name: 'hazardType', label: 'Hazard Type', type: 'text', placeholder: 'e.g. Hurricane Category 5' },
    { name: 'shelterCapacity', label: 'Shelter Capacity', type: 'text', placeholder: 'e.g. 50,000' },
  ],
  damage: [
    { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Downtown Houston' },
    { name: 'disasterType', label: 'Disaster Type', type: 'text', placeholder: 'e.g. Flood' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the observed damage...' },
    { name: 'reportedInjuries', label: 'Reported Injuries', type: 'text', placeholder: 'e.g. 45 minor, 12 serious' },
  ],
  weather: [
    { name: 'region', label: 'Region', type: 'text', placeholder: 'e.g. Southeast Florida' },
    { name: 'disasterContext', label: 'Disaster Context', type: 'textarea', placeholder: 'Current disaster situation...' },
  ],
  resources: [
    { name: 'availableResources', label: 'Available Resources', type: 'textarea', placeholder: 'List available resources (e.g. 50 buses, 200 personnel, 10 helicopters)' },
    { name: 'activeIncidents', label: 'Active Incidents', type: 'textarea', placeholder: 'Describe active incidents requiring resources...' },
    { name: 'priorities', label: 'Priorities', type: 'textarea', placeholder: 'List priority areas or considerations...' },
  ],
  report: [
    { name: 'incidentDetails', label: 'Incident Details', type: 'textarea', placeholder: 'Describe the incident (type, location, scope)...' },
    { name: 'timeline', label: 'Timeline', type: 'textarea', placeholder: 'Key events timeline...' },
    { name: 'resourcesUsed', label: 'Resources Used', type: 'textarea', placeholder: 'Resources deployed during response...' },
    { name: 'outcomes', label: 'Outcomes', type: 'textarea', placeholder: 'Response outcomes and results...' },
    { name: 'lessonsLearned', label: 'Lessons Learned', type: 'textarea', placeholder: 'Key takeaways and lessons...' },
  ],
  triage: [
    { name: 'casualties', label: 'Estimated Casualties', type: 'textarea', placeholder: 'e.g. ~200 total: 50 critical, 80 moderate, 70 minor' },
    { name: 'availableMedical', label: 'Available Medical Resources', type: 'textarea', placeholder: 'e.g. 5 ambulances, 20 paramedics, 1 field hospital' },
    { name: 'disasterType', label: 'Disaster Type', type: 'text', placeholder: 'e.g. Building Collapse' },
    { name: 'conditions', label: 'Current Conditions', type: 'textarea', placeholder: 'Current scene conditions...' },
  ],
  search: [
    { name: 'searchArea', label: 'Search Area', type: 'textarea', placeholder: 'Describe the search area (terrain, size, landmarks)...' },
    { name: 'missingPersons', label: 'Missing Persons', type: 'textarea', placeholder: 'Number of missing, last known locations, descriptions...' },
    { name: 'terrain', label: 'Terrain', type: 'text', placeholder: 'e.g. Urban debris field, mountainous, coastal' },
    { name: 'availableTeams', label: 'Available Teams', type: 'textarea', placeholder: 'List available SAR teams and resources...' },
  ],
};

function AIOutputDisplay({ data, label }) {
  if (!data) return null;

  const parseAIContent = (content) => {
    if (typeof content !== 'string') return content;
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  };

  const renderValue = (value, depth = 0) => {
    if (value === null || value === undefined) return <span className="ai-null">N/A</span>;
    if (typeof value === 'boolean') return <span className={`ai-bool ${value ? 'ai-true' : 'ai-false'}`}>{value ? 'Yes' : 'No'}</span>;
    if (typeof value === 'number') return <span className="ai-number">{value.toLocaleString()}</span>;
    if (typeof value === 'string') {
      if (value.length > 200) {
        return <p className="ai-text-long">{value}</p>;
      }
      return <span className="ai-text">{value}</span>;
    }
    if (Array.isArray(value)) {
      return (
        <div className="ai-array">
          {value.map((item, i) => (
            <div key={i} className="ai-array-item">
              <span className="ai-bullet">●</span>
              <div className="ai-array-content">{renderValue(item, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      return (
        <div className={`ai-object ${depth > 0 ? 'ai-nested' : ''}`}>
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="ai-field">
              <div className="ai-field-label">{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div>
              <div className="ai-field-value">{renderValue(v, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }
    return String(value);
  };

  const content = typeof data === 'object' ? data : parseAIContent(data);

  if (typeof content === 'string') {
    const sections = content.split(/\n(?=#{1,3}\s|[A-Z][a-z]+:|\*\*)/);
    return (
      <div className="ai-output">
        <div className="ai-output-header">
          <FiZap className="ai-output-icon" />
          <h3>AI Analysis: {label}</h3>
        </div>
        <div className="ai-output-body">
          {sections.map((section, i) => (
            <div key={i} className="ai-text-section">
              {section.split('\n').map((line, j) => {
                if (line.startsWith('###')) return <h5 key={j} className="ai-heading-3">{line.replace(/^###\s*/, '')}</h5>;
                if (line.startsWith('##')) return <h4 key={j} className="ai-heading-2">{line.replace(/^##\s*/, '')}</h4>;
                if (line.startsWith('#')) return <h3 key={j} className="ai-heading-1">{line.replace(/^#\s*/, '')}</h3>;
                if (line.startsWith('- ') || line.startsWith('* ')) return <div key={j} className="ai-array-item"><span className="ai-bullet">●</span><span>{line.replace(/^[-*]\s*/, '')}</span></div>;
                if (line.match(/^\d+\.\s/)) return <div key={j} className="ai-array-item"><span className="ai-bullet-num">{line.match(/^\d+/)[0]}</span><span>{line.replace(/^\d+\.\s*/, '')}</span></div>;
                if (line.includes(':**') || line.match(/^[A-Z][a-zA-Z\s]+:/)) {
                  const [label, ...rest] = line.split(':');
                  return <div key={j} className="ai-field"><div className="ai-field-label">{label.replace(/\*\*/g, '')}</div><div className="ai-field-value">{rest.join(':').replace(/\*\*/g, '')}</div></div>;
                }
                if (line.trim()) return <p key={j} className="ai-paragraph">{line}</p>;
                return null;
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ai-output">
      <div className="ai-output-header">
        <FiZap className="ai-output-icon" />
        <h3>AI Analysis: {label}</h3>
      </div>
      <div className="ai-output-body">
        {typeof content === 'object' && !Array.isArray(content) ? (
          Object.entries(content).map(([key, value]) => (
            <div key={key} className="ai-section">
              <h4 className="ai-section-title">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</h4>
              <div className="ai-section-content">{renderValue(value)}</div>
            </div>
          ))
        ) : (
          <div className="ai-section">
            <div className="ai-section-content">{renderValue(content)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function AICenter() {
  const [activeModule, setActiveModule] = useState(null);
  const [formData, setFormData] = useState({});
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleModuleSelect = (mod) => {
    setActiveModule(mod);
    setFormData({});
    setAiResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAiResult(null);
    try {
      const res = await aiAPI[activeModule.api](formData);
      const resultData = res.data;
      const firstKey = Object.keys(resultData)[0];
      setAiResult({ data: resultData[firstKey], label: activeModule.label });
      toast.success('AI analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI analysis failed. Check your OpenRouter API key.');
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
            <h1 className="page-title">AI Command Center</h1>
          </div>
        </div>

        {!activeModule ? (
          <div className="ai-modules-grid">
            {aiModules.map(mod => (
              <div
                key={mod.key}
                className="ai-module-card"
                onClick={() => handleModuleSelect(mod)}
                style={{ '--card-accent': mod.color }}
              >
                <div className="ai-module-icon" style={{ background: `${mod.color}20`, color: mod.color }}>
                  <mod.icon size={32} />
                </div>
                <h3 className="ai-module-title">{mod.label}</h3>
                <p className="ai-module-desc">{mod.desc}</p>
                <div className="ai-module-action" style={{ color: mod.color }}>
                  Launch Module <FiChevronRight />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ai-workspace">
            <button className="btn btn-outline ai-back-btn" onClick={() => setActiveModule(null)}>
              ← Back to Modules
            </button>

            <div className="ai-workspace-header" style={{ '--module-color': activeModule.color }}>
              <activeModule.icon size={28} style={{ color: activeModule.color }} />
              <h2>{activeModule.label}</h2>
              <p>{activeModule.desc}</p>
            </div>

            <div className="ai-workspace-content">
              <div className="ai-form-panel">
                <h3 className="ai-form-title">Input Parameters</h3>
                <form onSubmit={handleSubmit} className="ai-form">
                  {(formConfigs[activeModule.key] || []).map(field => (
                    <div key={field.name} className="form-group">
                      <label className="form-label">{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea
                          className="form-textarea"
                          value={formData[field.name] || ''}
                          onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                          placeholder={field.placeholder}
                          rows={3}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-input"
                          value={formData[field.name] || ''}
                          onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
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
                {aiResult && <AIOutputDisplay data={aiResult.data} label={aiResult.label} />}
                {!loading && !aiResult && (
                  <div className="ai-placeholder">
                    <FiCpu size={48} />
                    <h3>Ready for Analysis</h3>
                    <p>Fill in the parameters and click "Run AI Analysis" to get AI-powered insights.</p>
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

export default AICenter;
