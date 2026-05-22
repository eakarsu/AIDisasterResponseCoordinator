import React from 'react';
import EEWSFeaturePage from '../components/EEWSFeaturePage';
import { eewsShakeAlertAPI } from '../services/api';
import { FiWifi } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'messageId', label: 'Message ID' },
  { key: 'eventId', label: 'Event ID' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'qualityBand', label: 'Quality Band', type: 'badge' },
  { key: 'magnitude', label: 'Magnitude' },
  { key: 'endToEndLatencyMs', label: 'E2E Latency (ms)' },
  { key: 'receivedAt', label: 'Received', type: 'datetime' },
];

const formFields = [
  { name: 'messageId', label: 'Message ID', type: 'text', required: true, placeholder: 'e.g. SA-2024-0001' },
  { name: 'eventId', label: 'Event ID', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['received', 'processing', 'distributed', 'suppressed', 'failed', 'archived'] },
  { name: 'qualityBand', label: 'Quality Band', type: 'select', options: ['A', 'B', 'C', 'D', 'unassigned'] },
  { name: 'messageVersion', label: 'Message Version', type: 'number', placeholder: '1' },
  { name: 'magnitude', label: 'Magnitude', type: 'number' },
  { name: 'magnitudeType', label: 'Magnitude Type', type: 'text', placeholder: 'Mw' },
  { name: 'epicenterLat', label: 'Epicenter Latitude', type: 'number' },
  { name: 'epicenterLon', label: 'Epicenter Longitude', type: 'number' },
  { name: 'depthKm', label: 'Depth (km)', type: 'number' },
  { name: 'originTime', label: 'Origin Time', type: 'datetime' },
  { name: 'receivedAt', label: 'Received At', type: 'datetime' },
  { name: 'endToEndLatencyMs', label: 'End-to-End Latency (ms)', type: 'number' },
  { name: 'sourceSystem', label: 'Source System', type: 'select', options: ['ShakeAlert', 'PLUM', 'FinDer', 'GMM', 'EPIC', 'other'] },
  { name: 'regionalMapping', label: 'Regional Mapping', type: 'text' },
  { name: 'duplicateFlag', label: 'Duplicate Flag', type: 'select', options: ['false', 'true'] },
];

const aiVerbs = [
  'classify-shakealert-event-message',
  'validate-shakealert-cap',
  'predict-message-delay',
  'recommend-message-republication',
  'score-message-reliability',
  'generate-bridge-translation',
  'summarize-shakealert-events',
  'suggest-regional-mapping',
  'detect-message-duplicate',
  'classify-event-quality-band',
  'predict-revision-needed',
  'recommend-downstream-suppression',
  'generate-operator-narrative',
  'score-end-to-end-latency',
  'suggest-failover-source',
  'summarize-shakealert-vs-local',
];

function EewsShakeAlertGateway() {
  return (
    <EEWSFeaturePage
      title="ShakeAlert Gateway"
      apiService={eewsShakeAlertAPI}
      columns={columns}
      formFields={formFields}
      aiVerbs={aiVerbs}
      icon={FiWifi}
      accentColor="#10b981"
    />
  );
}

export default EewsShakeAlertGateway;
