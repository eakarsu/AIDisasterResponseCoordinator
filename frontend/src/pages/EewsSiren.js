import React from 'react';
import EEWSFeaturePage from '../components/EEWSFeaturePage';
import { eewsSirenAPI } from '../services/api';
import { FiRadio } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'sirenId', label: 'Siren ID' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'sirenType', label: 'Type', type: 'badge' },
  { key: 'acousticRangeM', label: 'Range (m)' },
  { key: 'lastTestedAt', label: 'Last Tested', type: 'datetime' },
  { key: 'readinessScore', label: 'Readiness' },
];

const formFields = [
  { name: 'sirenId', label: 'Siren ID', type: 'text', required: true, placeholder: 'e.g. SRN-CA-001' },
  { name: 'location', label: 'Location Description', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['operational', 'maintenance', 'failed', 'offline', 'archived'] },
  { name: 'sirenType', label: 'Siren Type', type: 'select', required: true, options: ['electromechanical', 'electronic', 'voice_broadcast', 'multi_tone', 'other'] },
  { name: 'manufacturer', label: 'Manufacturer', type: 'text' },
  { name: 'model', label: 'Model', type: 'text' },
  { name: 'acousticRangeM', label: 'Acoustic Range (m)', type: 'number' },
  { name: 'decibels', label: 'Decibels (dB)', type: 'number' },
  { name: 'latitude', label: 'Latitude', type: 'number' },
  { name: 'longitude', label: 'Longitude', type: 'number' },
  { name: 'activationProtocol', label: 'Activation Protocol', type: 'select', options: ['automatic', 'manual', 'remote', 'hybrid'] },
  { name: 'lastTestedAt', label: 'Last Tested', type: 'datetime' },
  { name: 'readinessScore', label: 'Readiness Score (0-100)', type: 'number' },
  { name: 'maintenanceDueDateAt', label: 'Maintenance Due Date', type: 'datetime' },
  { name: 'operatorOrg', label: 'Operator Organization', type: 'text' },
];

const aiVerbs = [
  'classify-siren-pattern',
  'recommend-tone-by-event-severity',
  'predict-siren-failure',
  'score-acoustic-coverage',
  'generate-siren-test-schedule',
  'summarize-siren-events',
  'validate-siren-network-status',
  'suggest-additional-siren-placement',
  'detect-stuck-relay',
  'classify-siren-trigger-source',
  'predict-maintenance-need',
  'recommend-redundancy',
  'generate-public-notice-of-test',
  'score-siren-readiness',
  'suggest-siren-decommission',
  'summarize-historical-activations',
];

function EewsSiren() {
  return (
    <EEWSFeaturePage
      title="EEW Siren Network"
      apiService={eewsSirenAPI}
      columns={columns}
      formFields={formFields}
      aiVerbs={aiVerbs}
      icon={FiRadio}
      accentColor="#ef4444"
    />
  );
}

export default EewsSiren;
