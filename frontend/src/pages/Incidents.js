import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { incidentAPI } from '../services/api';
import { FiAlertTriangle } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'severity', label: 'Severity', type: 'severity' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'location', label: 'Location' },
  { key: 'affectedPopulation', label: 'Affected Pop.' },
  { key: 'commanderName', label: 'Commander' },
];

const formFields = [
  { name: 'title', label: 'Incident Title', type: 'text', required: true },
  { name: 'type', label: 'Type', type: 'select', required: true, options: ['earthquake', 'hurricane', 'flood', 'wildfire', 'tornado', 'tsunami', 'pandemic', 'chemical_spill'] },
  { name: 'severity', label: 'Severity (1-5)', type: 'number', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['active', 'monitoring', 'resolved', 'closed'] },
  { name: 'location', label: 'Location', type: 'text', required: true },
  { name: 'latitude', label: 'Latitude', type: 'number' },
  { name: 'longitude', label: 'Longitude', type: 'number' },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  { name: 'affectedPopulation', label: 'Affected Population', type: 'number' },
  { name: 'commanderName', label: 'Incident Commander', type: 'text' },
  { name: 'estimatedDamage', label: 'Estimated Damage ($)', type: 'number' },
  { name: 'startDate', label: 'Start Date', type: 'date' },
  { name: 'endDate', label: 'End Date', type: 'date' },
];

function Incidents() {
  return <FeaturePage title="Incidents" apiService={incidentAPI} columns={columns} formFields={formFields} icon={FiAlertTriangle} />;
}

export default Incidents;
