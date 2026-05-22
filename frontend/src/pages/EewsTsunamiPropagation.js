import React from 'react';
import EEWSFeaturePage from '../components/EEWSFeaturePage';
import { eewsTsunamiAPI } from '../services/api';
import { FiDroplet } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'eventId', label: 'Event ID' },
  { key: 'sourceRegion', label: 'Source Region' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'magnitude', label: 'Magnitude' },
  { key: 'sourceDepthKm', label: 'Depth (km)' },
  { key: 'estimatedArrivalTime', label: 'Est. Arrival', type: 'datetime' },
  { key: 'maxRunupM', label: 'Max Runup (m)' },
  { key: 'warningLevel', label: 'Warning Level', type: 'badge' },
];

const formFields = [
  { name: 'eventId', label: 'Event ID', type: 'text', required: true },
  { name: 'sourceRegion', label: 'Source Region', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['pending', 'active', 'warning', 'evacuate', 'cancelled', 'archived'] },
  { name: 'warningLevel', label: 'Warning Level', type: 'select', options: ['advisory', 'watch', 'warning', 'evacuation', 'none'] },
  { name: 'magnitude', label: 'Magnitude', type: 'number' },
  { name: 'sourceDepthKm', label: 'Source Depth (km)', type: 'number' },
  { name: 'sourceLat', label: 'Source Latitude', type: 'number' },
  { name: 'sourceLon', label: 'Source Longitude', type: 'number' },
  { name: 'estimatedArrivalTime', label: 'Est. Arrival Time', type: 'datetime' },
  { name: 'leadTimeMinutes', label: 'Lead Time (min)', type: 'number' },
  { name: 'maxRunupM', label: 'Max Runup Height (m)', type: 'number' },
  { name: 'waveHeightM', label: 'Wave Height (m)', type: 'number' },
  { name: 'wavePeriodS', label: 'Wave Period (s)', type: 'number' },
  { name: 'affectedCoastline', label: 'Affected Coastline', type: 'text' },
  { name: 'modelConfidence', label: 'Model Confidence (0-1)', type: 'number' },
  { name: 'bathymetrySource', label: 'Bathymetry Source', type: 'text' },
];

const aiVerbs = [
  'model-tsunami-arrival',
  'classify-tsunami-source',
  'predict-runup-height',
  'recommend-evacuation-zone',
  'score-model-confidence',
  'generate-tsunami-bulletin',
  'summarize-coastal-impact',
  'validate-bathymetry-input',
  'suggest-buoy-deployment',
  'detect-coastal-amplification',
  'classify-wave-period',
  'predict-second-wave',
  'recommend-shelter-locations',
  'generate-evacuation-narrative',
  'score-warning-lead-time',
  'summarize-historical-comparison',
];

function EewsTsunamiPropagation() {
  return (
    <EEWSFeaturePage
      title="Tsunami Propagation"
      apiService={eewsTsunamiAPI}
      columns={columns}
      formFields={formFields}
      aiVerbs={aiVerbs}
      icon={FiDroplet}
      accentColor="#0ea5e9"
    />
  );
}

export default EewsTsunamiPropagation;
