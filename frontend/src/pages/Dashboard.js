import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { FiAlertTriangle, FiTruck, FiHome, FiUsers, FiPackage, FiMap, FiClipboard, FiRadio, FiCloud, FiDollarSign, FiHeart, FiSearch, FiLayers, FiShield, FiCpu, FiActivity } from 'react-icons/fi';
import { incidentAPI, resourceAPI, shelterAPI, volunteerAPI, supplyAPI, evacuationAPI, damageAssessmentAPI, communicationAPI, weatherAlertAPI, donationAPI, medicalResourceAPI, searchRescueAPI, infrastructureAPI, threatAnalysisAPI } from '../services/api';
import '../App.css';

const features = [
  { key: 'incidents', label: 'Incident Management', icon: FiAlertTriangle, color: '#ef4444', path: '/incidents', api: incidentAPI, desc: 'Track and manage active disaster incidents' },
  { key: 'resources', label: 'Resource Allocation', icon: FiTruck, color: '#3b82f6', path: '/resources', api: resourceAPI, desc: 'Manage vehicles, equipment & personnel' },
  { key: 'shelters', label: 'Shelter Management', icon: FiHome, color: '#10b981', path: '/shelters', api: shelterAPI, desc: 'Track shelters and capacity status' },
  { key: 'volunteers', label: 'Volunteer Coordination', icon: FiUsers, color: '#8b5cf6', path: '/volunteers', api: volunteerAPI, desc: 'Coordinate volunteer deployments' },
  { key: 'supplies', label: 'Supply Chain', icon: FiPackage, color: '#f59e0b', path: '/supplies', api: supplyAPI, desc: 'Track supplies and distribution' },
  { key: 'evacuations', label: 'Evacuation Planning', icon: FiMap, color: '#ec4899', path: '/evacuations', api: evacuationAPI, desc: 'AI-assisted evacuation routes' },
  { key: 'damages', label: 'Damage Assessment', icon: FiClipboard, color: '#f97316', path: '/damage-assessments', api: damageAssessmentAPI, desc: 'AI-powered damage reports' },
  { key: 'comms', label: 'Communication Hub', icon: FiRadio, color: '#06b6d4', path: '/communications', api: communicationAPI, desc: 'Emergency communications center' },
  { key: 'weather', label: 'Weather Monitoring', icon: FiCloud, color: '#64748b', path: '/weather-alerts', api: weatherAlertAPI, desc: 'AI weather analysis & alerts' },
  { key: 'donations', label: 'Donation Management', icon: FiDollarSign, color: '#22c55e', path: '/donations', api: donationAPI, desc: 'Track donations and distribution' },
  { key: 'medical', label: 'Medical Response', icon: FiHeart, color: '#e11d48', path: '/medical-resources', api: medicalResourceAPI, desc: 'Medical resource tracking' },
  { key: 'sar', label: 'Search & Rescue', icon: FiSearch, color: '#eab308', path: '/search-rescue', api: searchRescueAPI, desc: 'S&R operations management' },
  { key: 'infra', label: 'Infrastructure Status', icon: FiLayers, color: '#14b8a6', path: '/infrastructure', api: infrastructureAPI, desc: 'Monitor infrastructure status' },
  { key: 'threats', label: 'Threat Analysis', icon: FiShield, color: '#a855f7', path: '/threat-analysis', api: threatAnalysisAPI, desc: 'AI-powered threat assessment' },
  { key: 'ai', label: 'AI Command Center', icon: FiCpu, color: '#00d4ff', path: '/ai-center', api: null, desc: 'AI-powered analysis & planning' },
];

function Dashboard() {
  const [counts, setCounts] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      const results = {};
      for (const f of features) {
        if (f.api) {
          try {
            const res = await f.api.getAll();
            results[f.key] = Array.isArray(res.data) ? res.data.length : 0;
          } catch {
            results[f.key] = 0;
          }
        }
      }
      setCounts(results);
    };
    fetchCounts();
  }, []);

  return (
    <Layout>
      <div className="page-container">
        <div className="dashboard-header">
          <div className="dashboard-title-group">
            <FiActivity className="dashboard-main-icon" />
            <div>
              <h1 className="dashboard-title">Emergency Operations Center</h1>
              <p className="dashboard-subtitle">AI Disaster Response Coordinator — Real-time Overview</p>
            </div>
          </div>
          <div className="dashboard-stats-bar">
            <div className="stat-chip stat-active">
              <span className="stat-dot"></span>
              {counts.incidents || 0} Active Incidents
            </div>
            <div className="stat-chip stat-deployed">
              {counts.volunteers || 0} Volunteers
            </div>
            <div className="stat-chip stat-shelters">
              {counts.shelters || 0} Shelters
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {features.map(feature => (
            <div
              key={feature.key}
              className="dashboard-card"
              onClick={() => navigate(feature.path)}
              style={{ '--card-accent': feature.color }}
            >
              <div className="card-top">
                <div className="card-icon-wrap" style={{ background: `${feature.color}20`, color: feature.color }}>
                  <feature.icon size={28} />
                </div>
                {feature.api && (
                  <span className="card-count" style={{ background: `${feature.color}20`, color: feature.color }}>
                    {counts[feature.key] !== undefined ? counts[feature.key] : '—'}
                  </span>
                )}
              </div>
              <h3 className="card-title">{feature.label}</h3>
              <p className="card-desc">{feature.desc}</p>
              <div className="card-footer">
                <span className="card-link" style={{ color: feature.color }}>Open Module →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
