import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { infrastructureAPI } from '../services/api';
import { FiLayers } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'damageLevel', label: 'Damage', type: 'status' },
  { key: 'priority', label: 'Priority', type: 'status' },
  { key: 'location', label: 'Location' },
  { key: 'repairEstimate', label: 'Repair Est.', type: 'currency' },
];

const formFields = [
  { name: 'name', label: 'Infrastructure Name', type: 'text', required: true },
  { name: 'type', label: 'Type', type: 'select', required: true, options: ['bridge', 'road', 'power_grid', 'water_system', 'communication_tower', 'hospital', 'school', 'government_building'] },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['operational', 'damaged', 'destroyed', 'under_repair', 'offline'] },
  { name: 'location', label: 'Location', type: 'text', required: true },
  { name: 'damageLevel', label: 'Damage Level', type: 'select', options: ['none', 'minor', 'moderate', 'severe', 'destroyed'] },
  { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { name: 'repairEstimate', label: 'Repair Estimate ($)', type: 'number' },
  { name: 'lastInspected', label: 'Last Inspected', type: 'date' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
  { name: 'incidentId', label: 'Incident ID', type: 'number' },
];

function Infrastructure() {
  return <FeaturePage title="Infrastructure" apiService={infrastructureAPI} columns={columns} formFields={formFields} icon={FiLayers} />;
}

export default Infrastructure;
