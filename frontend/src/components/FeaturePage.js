import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Layout from './Layout';

function FeaturePage({ title, apiService, columns, formFields, renderDetailContent, icon: Icon }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.getAll();
      // Backend may return either an array or a paginated { data, pagination } shape
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
      setItems(list);
    } catch (err) {
      toast.error(`Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [apiService, title]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRowClick = async (item) => {
    try {
      const res = await apiService.getById(item.id);
      setSelectedItem(res.data);
      setShowDetail(true);
    } catch {
      setSelectedItem(item);
      setShowDetail(true);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    const initial = {};
    formFields.forEach(f => { initial[f.name] = f.defaultValue || ''; });
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
    if (!window.confirm(`Are you sure you want to delete this ${title.slice(0, -1).toLowerCase()}?`)) return;
    try {
      await apiService.delete(item.id);
      toast.success('Deleted successfully');
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
        toast.success('Updated successfully');
      } else {
        await apiService.create(submitData);
        toast.success('Created successfully');
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

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    return Object.values(item).some(v =>
      String(v).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusClass = (status) => {
    if (!status) return '';
    const s = status.toLowerCase();
    if (['active', 'available', 'open', 'operational', 'in_stock', 'sent', 'received'].includes(s)) return 'status-success';
    if (['monitoring', 'watch', 'low_stock', 'maintenance', 'pending', 'planning', 'advisory', 'pledged', 'moderate'].includes(s)) return 'status-warning';
    if (['critical', 'emergency', 'destroyed', 'catastrophic', 'extreme', 'out_of_stock', 'failed', 'depleted', 'unavailable'].includes(s)) return 'status-danger';
    if (['resolved', 'completed', 'closed', 'distributed', 'mitigated'].includes(s)) return 'status-info';
    return 'status-default';
  };

  const formatValue = (val, col) => {
    if (val === null || val === undefined) return '—';
    if (col.type === 'status' || col.type === 'badge') {
      return <span className={`status-badge ${getStatusClass(val)}`}>{String(val).replace(/_/g, ' ')}</span>;
    }
    if (col.type === 'date') {
      return new Date(val).toLocaleDateString();
    }
    if (col.type === 'datetime') {
      return new Date(val).toLocaleString();
    }
    if (col.type === 'currency') {
      return '$' + Number(val).toLocaleString();
    }
    if (col.type === 'severity') {
      const colors = { 1: '#10b981', 2: '#3b82f6', 3: '#f59e0b', 4: '#f97316', 5: '#ef4444' };
      return <span className="severity-indicator" style={{ background: colors[val] || '#94a3b8' }}>{val}</span>;
    }
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val).length > 50 ? String(val).substring(0, 50) + '...' : String(val);
  };

  const renderDetail = (item) => {
    if (renderDetailContent) return renderDetailContent(item);
    return (
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
        <div className="detail-field">
          <label className="detail-label">Created</label>
          <div className="detail-value">{new Date(item.createdAt).toLocaleString()}</div>
        </div>
        <div className="detail-field">
          <label className="detail-label">Last Updated</label>
          <div className="detail-value">{new Date(item.updatedAt).toLocaleString()}</div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-group">
            {Icon && <Icon className="page-icon" />}
            <h1 className="page-title">{title}</h1>
            <span className="page-count">{items.length} total</span>
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>+ Add New</button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            className="form-input search-input"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading {title.toLowerCase()}...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>No {title.toLowerCase()} found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr className="table-header">
                  {columns.map(col => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => (
                  <tr key={item.id || idx} className="table-row" onClick={() => handleRowClick(item)}>
                    {columns.map(col => (
                      <td key={col.key}>{formatValue(item[col.key], col)}</td>
                    ))}
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
              <div className="detail-header">
                <h2>{selectedItem.title || selectedItem.name || selectedItem.operationName || selectedItem.subject || `${title.slice(0,-1)} #${selectedItem.id}`}</h2>
                <button className="btn-close" onClick={() => setShowDetail(false)}>&times;</button>
              </div>
              <div className="detail-body">
                {renderDetail(selectedItem)}
              </div>
              <div className="detail-actions">
                <button className="btn btn-primary" onClick={() => handleEdit(selectedItem)}>Edit</button>
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
                <h2>{editingItem ? 'Edit' : 'Add New'} {title.slice(0, -1)}</h2>
                <button className="btn-close" onClick={() => setShowForm(false)}>&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {formFields.map(field => (
                  <div key={field.name} className="form-group">
                    <label className="form-label">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        className="form-select"
                        required={field.required}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' || field.type === 'json' ? (
                      <textarea
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        className="form-textarea"
                        rows={field.type === 'json' ? 4 : 3}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'datetime' ? 'datetime-local' : 'text'}
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        className="form-input"
                        required={field.required}
                        placeholder={field.placeholder || ''}
                        step={field.type === 'number' ? 'any' : undefined}
                      />
                    )}
                  </div>
                ))}
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingItem ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default FeaturePage;
