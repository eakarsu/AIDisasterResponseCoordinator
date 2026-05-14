import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { mutualAidAPI } from '../services/api';
import { FiShare2, FiPlus, FiCpu, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';

const initialForm = { kind: 'request', agency: '', resourceType: '', quantity: 1, location: '', contact: '', urgency: 'normal', notes: '' };

function MutualAid() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const load = async (page = 1) => {
    try {
      const r = await mutualAidAPI.list({ page, limit: 20, ...(filter ? { kind: filter } : {}) });
      setPosts(r.data?.data || []);
      setPagination(r.data?.pagination || { page: 1, totalPages: 1 });
    } catch (_) {
      toast.error('Failed to load posts');
    }
  };

  useEffect(() => { load(1); }, [filter]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await mutualAidAPI.create(form);
      toast.success('Posted');
      setShowForm(false); setForm(initialForm); load(1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await mutualAidAPI.delete(id);
      load(pagination.page);
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const runMatch = async () => {
    setLoading(true);
    try {
      const r = await mutualAidAPI.match();
      setMatches(r.data?.matches || []);
      toast.success(`${r.data?.matches?.length || 0} matches`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Match failed');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-group">
            <FiShare2 className="page-icon" />
            <h1 className="page-title">Mutual Aid Board</h1>
            <span className="page-count">{pagination.total || posts.length} posts</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={runMatch} disabled={loading}><FiCpu /> AI Match</button>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}><FiPlus /> New Post</button>
          </div>
        </div>

        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label>Filter:</label>
          <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 200 }}>
            <option value="">All</option>
            <option value="request">Requests only</option>
            <option value="offer">Offers only</option>
          </select>
        </div>

        {matches && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>AI Match Suggestions ({matches.length})</h3>
            {matches.length === 0 ? <p>No matches found.</p> : (
              <ul>
                {matches.map((m, i) => (
                  <li key={i}>
                    Request #{m.requestId} ↔ Offer #{m.offerId} (confidence: {m.confidence}) — {m.rationale}
                  </li>
                ))}
              </ul>
            )}
            <button className="btn btn-outline" onClick={() => setMatches(null)}>Dismiss</button>
          </div>
        )}

        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead><tr><th>ID</th><th>Type</th><th>Agency</th><th>Resource</th><th>Qty</th><th>Location</th><th>Urgency</th><th>Posted</th><th></th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td><span className={`status-badge ${p.kind === 'aid-request' ? 'status-warning' : 'status-success'}`}>{p.kind}</span></td>
                  <td>{p.agency}</td>
                  <td>{p.post?.resourceType || '—'}</td>
                  <td>{p.post?.quantity || '—'}</td>
                  <td>{p.post?.location || '—'}</td>
                  <td>{p.post?.urgency || '—'}</td>
                  <td>{new Date(p.created_at).toLocaleString()}</td>
                  <td><button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => del(p.id)}><FiTrash2 /></button></td>
                </tr>
              ))}
              {posts.length === 0 && <tr><td colSpan="9" style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No posts yet.</td></tr>}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            {Array.from({ length: pagination.totalPages }).map((_, i) => (
              <button key={i} className={`btn ${pagination.page === i + 1 ? 'btn-primary' : 'btn-outline'}`} onClick={() => load(i + 1)}>{i + 1}</button>
            ))}
          </div>
        )}

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>New Mutual Aid Post</h2>
                <button className="btn-close" onClick={() => setShowForm(false)}>&times;</button>
              </div>
              <form onSubmit={submit} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                    <option value="request">Request (we need)</option>
                    <option value="offer">Offer (we have surplus)</option>
                  </select>
                </div>
                {['agency', 'resourceType', 'location', 'contact'].map((k) => (
                  <div className="form-group" key={k}>
                    <label className="form-label">{k}</label>
                    <input className="form-input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={['agency', 'resourceType'].includes(k)} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input type="number" className="form-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) })} required min="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Urgency</label>
                  <select className="form-select" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                    <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Post</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default MutualAid;
