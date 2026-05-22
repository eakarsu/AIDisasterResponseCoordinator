import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Layout from './Layout';

function EEWSFeaturePage({ title, apiService, columns, formFields, aiVerbs, icon: Icon, accentColor }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [activeVerb, setActiveVerb] = useState(null);
  const [aiInput, setAiInput] = useState('{}');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const color = accentColor || '#f97316';

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.getAll();
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
      setItems(list);
    } catch {
      toast.error(`Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [apiService, title]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleRowClick = async (item) => {
    try {
      const res = await apiService.getById(item.id);
      const payload = res.data;
      setSelectedItem(payload?.data || payload);
      setShowDetail(true);
    } catch {
      setSelectedItem(item);
      setShowDetail(true);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    const initial = {};
    formFields.forEach(f => { initial[f.name] = f.defaultValue !== undefined ? f.defaultValue : ''; });
    setFormData(initial);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    const data = {};
    formFields.forEach(f => {
      let val = item[f.name];
      if (f.type === 'json' && typeof val === 'object') val = JSON.stringify(val, null, 2);
      data[f.name] = val !== undefined && val !== null ? val : '';
    });
    setFormData(data);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete this record?`)) return;
    try {
      await apiService.delete(item.id);
      toast.success('Deleted');
      setShowDetail(false);
      fetchItems();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      formFields.forEach(f => {
        if (f.type === 'json' && typeof submitData[f.name] === 'string') {
          try { submitData[f.name] = JSON.parse(submitData[f.name]); } catch {}
        }
        if (f.type === 'number' && submitData[f.name] !== '') {
          submitData[f.name] = Number(submitData[f.name]);
        }
      });
      if (editingItem) {
        await apiService.update(editingItem.id, submitData);
        toast.success('Updated');
      } else {
        await apiService.create(submitData);
        toast.success('Created');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRunAI = async () => {
    if (!activeVerb) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      let body = {};
      try { body = JSON.parse(aiInput); } catch { toast.error('Invalid JSON input'); setAiLoading(false); return; }
      const res = await apiService.ai(activeVerb, body);
      setAiResult(res.data);
    } catch (err) {
      setAiResult({ error: err.response?.data?.error || err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    return Object.values(item).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const getStatusClass = (status) => {
    if (!status) return '';
    const s = String(status).toLowerCase();
    if (['active', 'online', 'operational', 'open', 'available', 'sent', 'received', 'passed'].includes(s)) return 'status-success';
    if (['degraded', 'monitoring', 'watch', 'pending', 'planning', 'advisory', 'warning'].includes(s)) return 'status-warning';
    if (['offline', 'failed', 'critical', 'error', 'emergency', 'evacuate'].includes(s)) return 'status-danger';
    if (['archived', 'resolved', 'completed', 'closed', 'cancelled'].includes(s)) return 'status-info';
    return 'status-default';
  };

  const formatValue = (val, col) => {
    if (val === null || val === undefined) return '—';
    if (col.type === 'status' || col.type === 'badge') {
      return <span className={`status-badge ${getStatusClass(val)}`}>{String(val).replace(/_/g, ' ')}</span>;
    }
    if (col.type === 'date') return new Date(val).toLocaleDateString();
    if (col.type === 'datetime') return new Date(val).toLocaleString();
    if (col.type === 'currency') return '$' + Number(val).toLocaleString();
    if (col.type === 'severity') {
      const colors = { 1: '#10b981', 2: '#3b82f6', 3: '#f59e0b', 4: '#f97316', 5: '#ef4444' };
      return <span className="severity-indicator" style={{ background: colors[val] || '#94a3b8' }}>{val}</span>;
    }
    if (typeof val === 'object') return JSON.stringify(val).substring(0, 60) + '…';
    return String(val).length > 60 ? String(val).substring(0, 60) + '…' : String(val);
  };

  const renderDetail = (item) => (
    <div className="detail-fields">
      {Object.entries(item).filter(([k]) => k !== 'createdAt' && k !== 'updatedAt').map(([key, val]) => (
        <div key={key} className="detail-field">
          <label className="detail-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
          <div className="detail-value">
            {typeof val === 'object' && val !== null ? (
              <pre className="detail-json">{JSON.stringify(val, null, 2)}</pre>
            ) : val === null || val === undefined ? '—' : (
              <span className={key.toLowerCase().includes('status') ? `status-badge ${getStatusClass(String(val))}` : ''}>
                {String(val).replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      ))}
      {item.createdAt && (
        <div className="detail-field">
          <label className="detail-label">Created</label>
          <div className="detail-value">{new Date(item.createdAt).toLocaleString()}</div>
        </div>
      )}
      {item.updatedAt && (
        <div className="detail-field">
          <label className="detail-label">Last Updated</label>
          <div className="detail-value">{new Date(item.updatedAt).toLocaleString()}</div>
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="page-container">
        {/* Page header */}
        <div className="page-header">
          <div className="page-title-group">
            {Icon && <Icon className="page-icon" style={{ color }} />}
            <h1 className="page-title">{title}</h1>
            <span className="page-count">{items.length} total</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-outline"
              onClick={() => { setShowAIPanel(true); setActiveVerb(null); setAiResult(null); setAiInput('{}'); }}
              style={{ borderColor: color, color }}
            >
              ⚡ AI Verbs
            </button>
            <button className="btn btn-primary" style={{ background: color, borderColor: color }} onClick={handleAdd}>
              + Add New
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <input
            type="text"
            className="form-input search-input"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading {title.toLowerCase()}…</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state"><p>No {title.toLowerCase()} found</p></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr className="table-header">
                  {columns.map(col => <th key={col.key}>{col.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => (
                  <tr key={item.id || idx} className="table-row" onClick={() => handleRowClick(item)}>
                    {columns.map(col => <td key={col.key}>{formatValue(item[col.key], col)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Panel */}
        {showDetail && selectedItem && (
          <div className="detail-overlay" onClick={() => setShowDetail(false)}>
            <div className="detail-panel" onClick={e => e.stopPropagation()}>
              <div className="detail-header" style={{ borderLeft: `4px solid ${color}` }}>
                <h2>{selectedItem.stationCode || selectedItem.name || selectedItem.title || `Record #${selectedItem.id}`}</h2>
                <button className="btn-close" onClick={() => setShowDetail(false)}>&times;</button>
              </div>
              <div className="detail-body">{renderDetail(selectedItem)}</div>
              <div className="detail-actions">
                <button className="btn btn-primary" style={{ background: color, borderColor: color }} onClick={() => handleEdit(selectedItem)}>Edit</button>
                <button className="btn btn-danger" onClick={() => handleDelete(selectedItem)}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingItem ? 'Edit' : 'Add New'} {title.replace(/s$/, '')}</h2>
                <button className="btn-close" onClick={() => setShowForm(false)}>&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {formFields.map(field => (
                  <div key={field.name} className="form-group">
                    <label className="form-label">{field.label}{field.required && ' *'}</label>
                    {field.type === 'select' ? (
                      <select name={field.name} value={formData[field.name] || ''} onChange={handleInputChange} className="form-select" required={field.required}>
                        <option value="">Select {field.label}</option>
                        {field.options.map(opt => <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>)}
                      </select>
                    ) : field.type === 'textarea' || field.type === 'json' ? (
                      <textarea name={field.name} value={formData[field.name] || ''} onChange={handleInputChange} className="form-textarea" rows={field.type === 'json' ? 4 : 3} required={field.required} placeholder={field.placeholder || ''} />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'datetime' ? 'datetime-local' : 'text'}
                        name={field.name} value={formData[field.name] || ''} onChange={handleInputChange}
                        className="form-input" required={field.required} placeholder={field.placeholder || ''} step={field.type === 'number' ? 'any' : undefined}
                      />
                    )}
                  </div>
                ))}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ background: color, borderColor: color }}>{editingItem ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Verbs Panel */}
        {showAIPanel && (
          <div className="detail-overlay" onClick={() => setShowAIPanel(false)}>
            <div className="detail-panel" style={{ width: '680px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
              <div className="detail-header" style={{ borderLeft: `4px solid ${color}` }}>
                <h2>⚡ AI Verbs — {title}</h2>
                <button className="btn-close" onClick={() => setShowAIPanel(false)}>&times;</button>
              </div>
              <div className="detail-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                  {aiVerbs.map(verb => (
                    <button
                      key={verb}
                      onClick={() => { setActiveVerb(verb); setAiResult(null); setAiInput('{}'); }}
                      style={{
                        padding: '0.3rem 0.7rem', borderRadius: '6px', border: `1px solid ${color}`,
                        background: activeVerb === verb ? color : 'transparent',
                        color: activeVerb === verb ? '#fff' : color,
                        cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'monospace'
                      }}
                    >
                      {verb}
                    </button>
                  ))}
                </div>

                {activeVerb && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">JSON Input (optional — add feedId, eventId, etc.)</label>
                      <textarea
                        className="form-textarea"
                        rows={4}
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ background: color, borderColor: color }}
                      onClick={handleRunAI}
                      disabled={aiLoading}
                    >
                      {aiLoading ? 'Running…' : `Run: ${activeVerb}`}
                    </button>
                  </div>
                )}

                {aiResult && (
                  <div style={{ marginTop: '1rem' }}>
                    <label className="form-label">AI Response</label>
                    <pre style={{
                      background: '#0d1117', color: '#e6edf3', padding: '1rem', borderRadius: '8px',
                      fontSize: '0.82rem', overflow: 'auto', maxHeight: '340px', whiteSpace: 'pre-wrap'
                    }}>
                      {JSON.stringify(aiResult, null, 2)}
                    </pre>
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

export default EEWSFeaturePage;
