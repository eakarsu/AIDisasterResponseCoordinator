import React from 'react';
import EEWSFeaturePage from '../components/EEWSFeaturePage';
import { eewsPWaveAPI } from '../services/api';
import { FiZap } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'stationCode', label: 'Station' },
  { key: 'networkCode', label: 'Network' },
  { key: 'eventId', label: 'Event ID' },
  { key: 'pickTime', label: 'Pick Time', type: 'datetime' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'magnitude', label: 'Magnitude' },
  { key: 'confidenceScore', label: 'Confidence' },
  { key: 'detectionLatencyMs', label: 'Latency (ms)' },
];

const formFields = [
  { name: 'stationCode', label: 'Station Code', type: 'text', required: true },
  { name: 'networkCode', label: 'Network Code', type: 'text', required: true },
  { name: 'eventId', label: 'Event ID', type: 'text', placeholder: 'e.g. USGS-2024-001' },
  { name: 'pickTime', label: 'Pick Time', type: 'datetime' },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['pending', 'confirmed', 'rejected', 'archived'] },
  { name: 'algorithm', label: 'Detection Algorithm', type: 'select', options: ['STA/LTA', 'template_matching', 'PhaseNet', 'EQTransformer', 'other'] },
  { name: 'magnitude', label: 'Magnitude', type: 'number' },
  { name: 'magnitudeType', label: 'Magnitude Type', type: 'select', options: ['Ml', 'Mw', 'mb', 'Ms', 'Md', 'Pd'] },
  { name: 'depth', label: 'Depth (km)', type: 'number' },
  { name: 'latitude', label: 'Latitude', type: 'number' },
  { name: 'longitude', label: 'Longitude', type: 'number' },
  { name: 'staLtaRatio', label: 'STA/LTA Ratio', type: 'number' },
  { name: 'confidenceScore', label: 'Confidence Score (0-1)', type: 'number' },
  { name: 'detectionLatencyMs', label: 'Detection Latency (ms)', type: 'number' },
  { name: 'channelCode', label: 'Channel Code', type: 'text' },
  { name: 'sourceType', label: 'Source Type', type: 'select', options: ['earthquake', 'explosion', 'noise', 'unknown'] },
];

const aiVerbs = [
  'detect-p-wave-arrival',
  'estimate-magnitude',
  'classify-event-type',
  'predict-final-magnitude',
  'recommend-additional-stations',
  'score-pick-confidence',
  'generate-event-narrative',
  'summarize-pick-quality',
  'validate-stalta-threshold',
  'suggest-template-match',
  'detect-false-pick',
  'classify-source-mechanism',
  'predict-aftershock-rate',
  'recommend-magnitude-method',
  'generate-eq-bulletin',
  'score-detection-latency',
];

function EewsPWaveDetection() {
  return (
    <EEWSFeaturePage
      title="P-Wave Detection"
      apiService={eewsPWaveAPI}
      columns={columns}
      formFields={formFields}
      aiVerbs={aiVerbs}
      icon={FiZap}
      accentColor="#eab308"
    />
  );
}

export default EewsPWaveDetection;
