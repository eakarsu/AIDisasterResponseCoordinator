import React from 'react';
import EEWSFeaturePage from '../components/EEWSFeaturePage';
import { eewsSeismicFeedAPI } from '../services/api';
import { FiActivity } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'stationCode', label: 'Station' },
  { key: 'networkCode', label: 'Network' },
  { key: 'channelCode', label: 'Channel' },
  { key: 'protocol', label: 'Protocol', type: 'badge' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'latencyMs', label: 'Latency (ms)' },
  { key: 'qualityScore', label: 'Quality Score' },
  { key: 'lastHeartbeat', label: 'Last Heartbeat', type: 'datetime' },
];

const formFields = [
  { name: 'stationCode', label: 'Station Code', type: 'text', required: true, placeholder: 'e.g. BK.BKS' },
  { name: 'networkCode', label: 'Network Code', type: 'text', required: true, placeholder: 'e.g. BK' },
  { name: 'channelCode', label: 'Channel Code', type: 'text', placeholder: 'e.g. HHZ' },
  { name: 'locationCode', label: 'Location Code', type: 'text', placeholder: 'e.g. 00' },
  { name: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['SeedLink', 'FDSNWS', 'Earthworm', 'Winston', 'GeoNet', 'other'] },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['active', 'degraded', 'offline', 'archived'] },
  { name: 'instrumentType', label: 'Instrument Type', type: 'select', options: ['broadband', 'short_period', 'strong_motion', 'MEMS', 'infrasound', 'other'] },
  { name: 'sampleRateHz', label: 'Sample Rate (Hz)', type: 'number', placeholder: 'e.g. 100' },
  { name: 'latencyMs', label: 'Latency (ms)', type: 'number' },
  { name: 'qualityScore', label: 'Quality Score (0-100)', type: 'number' },
  { name: 'latitude', label: 'Latitude', type: 'number' },
  { name: 'longitude', label: 'Longitude', type: 'number' },
  { name: 'elevationM', label: 'Elevation (m)', type: 'number' },
  { name: 'operatorOrg', label: 'Operator Organization', type: 'text' },
  { name: 'backupStationCode', label: 'Backup Station Code', type: 'text' },
  { name: 'lastHeartbeat', label: 'Last Heartbeat', type: 'datetime' },
];

const aiVerbs = [
  'detect-feed-drop',
  'classify-station-quality',
  'predict-feed-latency',
  'recommend-backup-station',
  'score-feed-completeness',
  'generate-feed-health-report',
  'summarize-network-status',
  'validate-station-metadata',
  'suggest-station-calibration',
  'detect-noise-burst',
  'classify-instrument-type',
  'predict-data-gap',
  'recommend-network-densification',
  'generate-station-config',
  'score-redundancy',
  'summarize-feed-anomalies',
];

function EewsSeismicFeedIngest() {
  return (
    <EEWSFeaturePage
      title="Seismic Feed Ingest"
      apiService={eewsSeismicFeedAPI}
      columns={columns}
      formFields={formFields}
      aiVerbs={aiVerbs}
      icon={FiActivity}
      accentColor="#f97316"
    />
  );
}

export default EewsSeismicFeedIngest;
