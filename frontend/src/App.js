import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import Resources from './pages/Resources';
import Shelters from './pages/Shelters';
import Volunteers from './pages/Volunteers';
import Supplies from './pages/Supplies';
import Evacuations from './pages/Evacuations';
import DamageAssessments from './pages/DamageAssessments';
import Communications from './pages/Communications';
import WeatherAlerts from './pages/WeatherAlerts';
import Donations from './pages/Donations';
import MedicalResources from './pages/MedicalResources';
import SearchRescue from './pages/SearchRescue';
import Infrastructure from './pages/Infrastructure';
import ThreatAnalysis from './pages/ThreatAnalysis';
import AICenter from './pages/AICenter';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incidents"
        element={
          <ProtectedRoute>
            <Incidents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources"
        element={
          <ProtectedRoute>
            <Resources />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shelters"
        element={
          <ProtectedRoute>
            <Shelters />
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteers"
        element={
          <ProtectedRoute>
            <Volunteers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supplies"
        element={
          <ProtectedRoute>
            <Supplies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/evacuations"
        element={
          <ProtectedRoute>
            <Evacuations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/damage-assessments"
        element={
          <ProtectedRoute>
            <DamageAssessments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/communications"
        element={
          <ProtectedRoute>
            <Communications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/weather-alerts"
        element={
          <ProtectedRoute>
            <WeatherAlerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donations"
        element={
          <ProtectedRoute>
            <Donations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-resources"
        element={
          <ProtectedRoute>
            <MedicalResources />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search-rescue"
        element={
          <ProtectedRoute>
            <SearchRescue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/infrastructure"
        element={
          <ProtectedRoute>
            <Infrastructure />
          </ProtectedRoute>
        }
      />
      <Route
        path="/threat-analysis"
        element={
          <ProtectedRoute>
            <ThreatAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-center"
        element={
          <ProtectedRoute>
            <AICenter />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
