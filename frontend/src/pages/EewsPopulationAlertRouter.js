import React from 'react';
import EEWSFeaturePage from '../components/EEWSFeaturePage';
import { eewsPopAlertAPI } from '../services/api';
import { FiUsers } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'routeName', label: 'Route Name' },
  { key: 'region', label: 'Region' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'alertChannel', label: 'Channel', type: 'badge' },
  { key: 'populationCovered', label: 'Population Covered' },
  { key: 'lastAlertSent', label: 'Last Alert', type: 'datetime' },
  { key: 'coveragePercent', label: 'Coverage %' },
];

const formFields = [
  { name: 'routeName', label: 'Route Name', type: 'text', required: true },
  { name: 'region', label: 'Region / Area', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['active', 'pending', 'disabled', 'archived'] },
  { name: 'alertChannel', label: 'Alert Channel', type: 'select', required: true, options: ['cell_broadcast', 'WEA', 'IPAWS', 'SMS', 'push_notification', 'siren', 'radio', 'other'] },
  { name: 'populationCovered', label: 'Population Covered', type: 'number' },
  { name: 'coveragePercent', label: 'Coverage %', type: 'number' },
  { name: 'languages', label: 'Languages (comma-separated)', type: 'text', placeholder: 'en,es,zh' },
  { name: 'thresholdMagnitude', label: 'Threshold Magnitude', type: 'number', placeholder: 'e.g. 5.5' },
  { name: 'thresholdMMI', label: 'Threshold MMI', type: 'number', placeholder: 'e.g. 4' },
  { name: 'alertMessageTemplate', label: 'Alert Message Template', type: 'textarea' },
  { name: 'rebroadcastEnabled', label: 'Rebroadcast Enabled', type: 'select', options: ['true', 'false'] },
  { name: 'lastAlertSent', label: 'Last Alert Sent', type: 'datetime' },
  { name: 'operatorOrg', label: 'Operator Organization', type: 'text' },
  { name: 'contactEmail', label: 'Contact Email', type: 'text' },
];

const aiVerbs = [
  'predict-shaking-intensity',
  'classify-alert-population-group',
  'recommend-alert-cadence',
  'score-route-coverage',
  'generate-localized-alert-text',
  'summarize-alert-distribution',
  'validate-cell-broadcast-region',
  'suggest-multi-language-template',
  'detect-alert-fatigue',
  'classify-vulnerable-population',
  'predict-alert-comprehension',
  'recommend-rebroadcast',
  'generate-followup-instruction',
  'score-alert-effectiveness',
  'suggest-route-test',
  'summarize-region-by-region-reach',
];

function EewsPopulationAlertRouter() {
  return (
    <EEWSFeaturePage
      title="Population Alert Router"
      apiService={eewsPopAlertAPI}
      columns={columns}
      formFields={formFields}
      aiVerbs={aiVerbs}
      icon={FiUsers}
      accentColor="#8b5cf6"
    />
  );
}

export default EewsPopulationAlertRouter;
