import React from 'react';
import Layout from '../components/Layout';
import IncidentMapView from '../components/IncidentMapView';
import ResourceAllocationChart from '../components/ResourceAllocationChart';
import SituationReportPDF from '../components/SituationReportPDF';
import EscalationRulesEditor from '../components/EscalationRulesEditor';

function CustomViewsPage() {
  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h1 style={{ color: '#f1f5f9', marginTop: 0 }}>Response Views</h1>
        <p style={{ color: '#94a3b8' }}>
          Custom operational views for disaster response coordination - real-time map, resource allocation,
          situation reporting, and escalation policy management.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <IncidentMapView />
          <ResourceAllocationChart />
        </div>
        <div style={{ marginTop: 20 }}>
          <SituationReportPDF />
        </div>
        <div style={{ marginTop: 20 }}>
          <EscalationRulesEditor />
        </div>
      </div>
    </Layout>
  );
}

export default CustomViewsPage;
