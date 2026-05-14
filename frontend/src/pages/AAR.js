import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { aarAPI, incidentAPI } from '../services/api';
import { FiFileText, FiPlus, FiCheckCircle, FiDownload } from 'react-icons/fi';
import { toast } from 'react-toastify';

function AAR() {
  const [aars, setAars] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [incidents, setIncidents] = useState([]);
  const [showStart, setShowStart] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [selected, setSelected] = useState(null);
  const [approver, setApprover] = useState('');
  const [role, setRole] = useState('Reviewer');
  const [comments, setComments] = useState('');

  const load = async (page = 1) => {
    try {
      const r = await aarAPI.list({ page, limit: 10 });
      setAars(r.data?.data || []);
      setPagination(r.data?.pagination || { page: 1, totalPages: 1 });
    } catch (_) {
      toast.error('Failed to load AARs');
    }
  };

  useEffect(() => {
    load(1);
    incidentAPI.getAll().then((r) => setIncidents(r.data?.data || r.data || [])).catch(() => {});
  }, []);

  const start = async () => {
    if (!selectedIncident) return toast.warn('Pick an incident');
    try {
      await aarAPI.start(parseInt(selectedIncident));
      toast.success('AAR draft created');
      setShowStart(false); setSelectedIncident(''); load(1);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const approve = async () => {
    if (!approver || !selected) return;
    try {
      const r = await aarAPI.approve(selected.id, { approver, role, comments });
      toast.success('Approved');
      setApprover(''); setComments('');
      setSelected({ ...selected, status: r.data.status, approvals: r.data.approvals });
      load(pagination.page);
    } catch (e) {
      toast.error('Approve failed');
    }
  };

  const finalize = async () => {
    if (!window.confirm('Finalize this AAR?')) return;
    try {
      const r = await aarAPI.finalize(selected.id);
      toast.success('Finalized');
      setSelected({ ...selected, status: 'finalized', report: r.data.report });
      load(pagination.page);
    } catch (e) {
      toast.error('Finalize failed');
    }
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-group">
            <FiFileText className="page-icon" />
            <h1 className="page-title">After-Action Report Workflow</h1>
            <span className="page-count">{pagination.total || aars.length} AARs</span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowStart(true)}><FiPlus /> Start AAR</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            {aars.length === 0 ? <p style={{ padding: 16, color: '#64748b' }}>No AARs yet.</p> : (
              aars.map((a) => (
                <div key={a.id} onClick={() => setSelected(a)} style={{ padding: 12, borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selected?.id === a.id ? '#eff6ff' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>AAR #{a.id} (Incident #{a.incident_id})</strong>
                    <span className={`status-badge ${a.status === 'finalized' ? 'status-success' : a.status === 'approved' ? 'status-info' : 'status-warning'}`}>{a.status}</span>
                  </div>
                  <small style={{ color: '#64748b' }}>{new Date(a.created_at).toLocaleString()} · {a.approvals?.length || 0} approvals</small>
                </div>
              ))
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            {selected ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0 }}>AAR #{selected.id}</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a className="btn btn-outline" href={aarAPI.exportUrl(selected.id)} target="_blank" rel="noopener noreferrer"><FiDownload /> Export</a>
                    {selected.status !== 'finalized' && <button className="btn btn-primary" onClick={finalize}><FiCheckCircle /> Finalize</button>}
                  </div>
                </div>
                <p style={{ color: '#64748b' }}>Status: <strong>{selected.status}</strong></p>

                {selected.report && (
                  <div style={{ marginTop: 12, maxHeight: 300, overflow: 'auto' }}>
                    <h3>Executive Summary</h3>
                    <p>{selected.report.executiveSummary}</p>
                    {selected.report.strengths && (<><h4>Strengths</h4><ul>{selected.report.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}
                    {selected.report.areasForImprovement && (<><h4>Improvements</h4><ul>{selected.report.areasForImprovement.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}
                    {selected.report.recommendations && (<><h4>Recommendations</h4><ul>{selected.report.recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}
                  </div>
                )}

                <h3 style={{ marginTop: 16 }}>Approvals</h3>
                {(selected.approvals || []).length === 0 ? <p style={{ color: '#64748b' }}>None yet.</p> : (
                  <ul>{(selected.approvals || []).map((a, i) => <li key={i}>{a.approver} ({a.role}) — {a.comments || ''} <small>{new Date(a.at).toLocaleString()}</small></li>)}</ul>
                )}

                {selected.status !== 'finalized' && (
                  <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                    <h4 style={{ marginTop: 0 }}>Add Approval</h4>
                    <input className="form-input" placeholder="Approver name" value={approver} onChange={(e) => setApprover(e.target.value)} style={{ marginBottom: 8 }} />
                    <input className="form-input" placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} style={{ marginBottom: 8 }} />
                    <textarea className="form-textarea" rows={2} placeholder="Comments" value={comments} onChange={(e) => setComments(e.target.value)} style={{ marginBottom: 8 }} />
                    <button className="btn btn-primary" onClick={approve}>Sign Off</button>
                  </div>
                )}
              </>
            ) : <p style={{ color: '#64748b' }}>Select an AAR from the list to view details.</p>}
          </div>
        </div>

        {showStart && (
          <div className="modal-overlay" onClick={() => setShowStart(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Start AAR</h2>
                <button className="btn-close" onClick={() => setShowStart(false)}>&times;</button>
              </div>
              <div className="modal-form">
                <div className="form-group">
                  <label className="form-label">Incident</label>
                  <select className="form-select" value={selectedIncident} onChange={(e) => setSelectedIncident(e.target.value)}>
                    <option value="">Pick an incident...</option>
                    {incidents.map((i) => <option key={i.id} value={i.id}>#{i.id} {i.title} ({i.type})</option>)}
                  </select>
                </div>
                <div className="form-actions">
                  <button className="btn btn-outline" onClick={() => setShowStart(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={start}>Generate Draft</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AAR;
