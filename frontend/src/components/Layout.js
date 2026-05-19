import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiAlertTriangle, FiTruck, FiUsers, FiPackage, FiMap, FiClipboard, FiRadio, FiCloud, FiDollarSign, FiHeart, FiSearch, FiLayers, FiShield, FiCpu, FiLogOut, FiActivity, FiGlobe, FiFileText, FiShare2, FiBookOpen } from 'react-icons/fi';
import '../App.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: FiHome },
  { path: '/incidents', label: 'Incidents', icon: FiAlertTriangle },
  { path: '/resources', label: 'Resources', icon: FiTruck },
  { path: '/shelters', label: 'Shelters', icon: FiHome },
  { path: '/volunteers', label: 'Volunteers', icon: FiUsers },
  { path: '/supplies', label: 'Supplies', icon: FiPackage },
  { path: '/evacuations', label: 'Evacuations', icon: FiMap },
  { path: '/damage-assessments', label: 'Damage Assessments', icon: FiClipboard },
  { path: '/communications', label: 'Communications', icon: FiRadio },
  { path: '/weather-alerts', label: 'Weather Alerts', icon: FiCloud },
  { path: '/donations', label: 'Donations', icon: FiDollarSign },
  { path: '/medical-resources', label: 'Medical Resources', icon: FiHeart },
  { path: '/search-rescue', label: 'Search & Rescue', icon: FiSearch },
  { path: '/infrastructure', label: 'Infrastructure', icon: FiLayers },
  { path: '/threat-analysis', label: 'Threat Analysis', icon: FiShield },
  { path: '/live-map', label: 'Live Map', icon: FiGlobe },
  { path: '/briefing', label: 'Commander Briefing', icon: FiBookOpen },
  { path: '/external-data', label: 'External Data', icon: FiCloud },
  { path: '/mutual-aid', label: 'Mutual Aid Board', icon: FiShare2 },
  { path: '/aar', label: 'AAR Workflow', icon: FiFileText },
  { path: '/ai-center', label: 'AI Command Center', icon: FiCpu },
  { path: '/ai-new-tools', label: 'AI New Tools', icon: FiCpu },
  { path: '/custom-views', label: 'Response Views', icon: FiLayers },
];

function Layout({ children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <FiActivity className="sidebar-logo-icon" />
          <div>
            <h2 className="sidebar-title">ADRC</h2>
            <p className="sidebar-subtitle">Disaster Response</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{(user.name || 'A')[0]}</div>
            <div>
              <p className="user-name">{user.name || 'Admin'}</p>
              <p className="user-role">{user.role || 'admin'}</p>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
