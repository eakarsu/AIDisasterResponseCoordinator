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
import AINewTools from './pages/AINewTools';
import LiveMap from './pages/LiveMap';
import CommanderBriefing from './pages/CommanderBriefing';
import ExternalData from './pages/ExternalData';
import MutualAid from './pages/MutualAid';
import AAR from './pages/AAR';

// // === Batch 02 Gaps & Frontend Mounts ===
import CfRealTimeImpactForecasting from './pages/CfRealTimeImpactForecasting';
import CfResourceConstrainedOptimization from './pages/CfResourceConstrainedOptimization';
import CfVulnerabilityAnalysis from './pages/CfVulnerabilityAnalysis';
import CfSupplyChainPrediction from './pages/CfSupplyChainPrediction';
import CfRecoveryTrajectoryModeling from './pages/CfRecoveryTrajectoryModeling';
import GapSupplyroutesLacksOptimizeSupplyDistribution from './pages/GapSupplyroutesLacksOptimizeSupplyDistribution';
import GapDonationroutesLacksMatchDonationToNeed from './pages/GapDonationroutesLacksMatchDonationToNeed';
import GapShelterroutesLacksOptimizeShelterAssignments from './pages/GapShelterroutesLacksOptimizeShelterAssignments';
import GapVolunteerroutesLacksAiVolunteerMatching from './pages/GapVolunteerroutesLacksAiVolunteerMatching';
import GapNoRealTimeCrisisCommandCenterDashboardSurfaceBeyond from './pages/GapNoRealTimeCrisisCommandCenterDashboardSurfaceBeyond';
import GapLimitedMobileAppForFirstResponders from './pages/GapLimitedMobileAppForFirstResponders';
import GapLimitedIntegrationWithEmergencyServices911FemaRedCro from './pages/GapLimitedIntegrationWithEmergencyServices911FemaRedCro';
import GapNoSocialMediaMonitoringForCrisisInformation from './pages/GapNoSocialMediaMonitoringForCrisisInformation';
import GapNoWebhooks from './pages/GapNoWebhooks';
import GapNoPaymentBillingModuleForDonationsBeyondCrud from './pages/GapNoPaymentBillingModuleForDonationsBeyondCrud';
import GapNoCalendarIntegration from './pages/GapNoCalendarIntegration';
import CustomViewsPage from './pages/CustomViewsPage';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

// === EEWS — Early Warning ===
import EewsSeismicFeedIngest from './pages/EewsSeismicFeedIngest';
import EewsPWaveDetection from './pages/EewsPWaveDetection';
import EewsTsunamiPropagation from './pages/EewsTsunamiPropagation';
import EewsPopulationAlertRouter from './pages/EewsPopulationAlertRouter';
import EewsSiren from './pages/EewsSiren';
import EewsShakeAlertGateway from './pages/EewsShakeAlertGateway';

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
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

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
      <Route path="/live-map" element={<ProtectedRoute><LiveMap /></ProtectedRoute>} />
      <Route path="/briefing" element={<ProtectedRoute><CommanderBriefing /></ProtectedRoute>} />
      <Route path="/external-data" element={<ProtectedRoute><ExternalData /></ProtectedRoute>} />
      <Route path="/mutual-aid" element={<ProtectedRoute><MutualAid /></ProtectedRoute>} />
      <Route path="/aar" element={<ProtectedRoute><AAR /></ProtectedRoute>} />
      <Route path="/ai-new-tools" element={<ProtectedRoute><AINewTools /></ProtectedRoute>} />
      <Route path="/custom-views" element={<ProtectedRoute><CustomViewsPage /></ProtectedRoute>} />
      {/* === EEWS — Early Warning === */}
      <Route path="/eews/seismic-feed-ingest" element={<ProtectedRoute><EewsSeismicFeedIngest /></ProtectedRoute>} />
      <Route path="/eews/p-wave-detection" element={<ProtectedRoute><EewsPWaveDetection /></ProtectedRoute>} />
      <Route path="/eews/tsunami-propagation" element={<ProtectedRoute><EewsTsunamiPropagation /></ProtectedRoute>} />
      <Route path="/eews/population-alert-router" element={<ProtectedRoute><EewsPopulationAlertRouter /></ProtectedRoute>} />
      <Route path="/eews/eew-siren" element={<ProtectedRoute><EewsSiren /></ProtectedRoute>} />
      <Route path="/eews/shake-alert-gateway" element={<ProtectedRoute><EewsShakeAlertGateway /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    
        {/* // === Batch 02 Gaps & Frontend Mounts === */}
        <Route path="/cf/real-time-impact-forecasting" element={<CfRealTimeImpactForecasting />} />
        <Route path="/cf/resource-constrained-optimization" element={<CfResourceConstrainedOptimization />} />
        <Route path="/cf/vulnerability-analysis" element={<CfVulnerabilityAnalysis />} />
        <Route path="/cf/supply-chain-prediction" element={<CfSupplyChainPrediction />} />
        <Route path="/cf/recovery-trajectory-modeling" element={<CfRecoveryTrajectoryModeling />} />
        <Route path="/gap/supplyroutes-lacks-optimize-supply-distribution" element={<GapSupplyroutesLacksOptimizeSupplyDistribution />} />
        <Route path="/gap/donationroutes-lacks-match-donation-to-need" element={<GapDonationroutesLacksMatchDonationToNeed />} />
        <Route path="/gap/shelterroutes-lacks-optimize-shelter-assignments" element={<GapShelterroutesLacksOptimizeShelterAssignments />} />
        <Route path="/gap/volunteerroutes-lacks-ai-volunteer-matching" element={<GapVolunteerroutesLacksAiVolunteerMatching />} />
        <Route path="/gap/no-real-time-crisis-command-center-dashboard-surface-beyond" element={<GapNoRealTimeCrisisCommandCenterDashboardSurfaceBeyond />} />
        <Route path="/gap/limited-mobile-app-for-first-responders" element={<GapLimitedMobileAppForFirstResponders />} />
        <Route path="/gap/limited-integration-with-emergency-services-911-fema-red-cro" element={<GapLimitedIntegrationWithEmergencyServices911FemaRedCro />} />
        <Route path="/gap/no-social-media-monitoring-for-crisis-information" element={<GapNoSocialMediaMonitoringForCrisisInformation />} />
        <Route path="/gap/no-webhooks" element={<GapNoWebhooks />} />
        <Route path="/gap/no-payment-billing-module-for-donations-beyond-crud" element={<GapNoPaymentBillingModuleForDonationsBeyondCrud />} />
        <Route path="/gap/no-calendar-integration" element={<GapNoCalendarIntegration />} />
      </Routes>
  );
}

export default App;
