import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { evacuationAPI } from '../services/api';
import { FiMap } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'zone', label: 'Zone' },
  { key: 'routeName', label: 'Route' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'priority', label: 'Priority', type: 'status' },
  { key: 'estimatedPopulation', label: 'Est. Pop.' },
  { key: 'evacuatedCount', label: 'Evacuated' },
  { key: 'destination', label: 'Destination' },
];

const formFields = [
  { name: 'zone', label: 'Evacuation Zone', type: 'text', required: true },
  { name: 'routeName', label: 'Route Name', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['planned', 'active', 'completed', 'cancelled'] },
  { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['low', 'medium', 'high', 'critical'] },
  { name: 'estimatedPopulation', label: 'Estimated Population', type: 'number' },
  { name: 'evacuatedCount', label: 'Evacuated Count', type: 'number' },
  { name: 'destination', label: 'Destination', type: 'text' },
  { name: 'transportMode', label: 'Transport Mode', type: 'text' },
  { name: 'startTime', label: 'Start Time', type: 'datetime' },
  { name: 'endTime', label: 'End Time', type: 'datetime' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
  { name: 'incidentId', label: 'Incident ID', type: 'number' },
];

function Evacuations() {
  return <FeaturePage title="Evacuations" apiService={evacuationAPI} columns={columns} formFields={formFields} icon={FiMap} />;
}

export default Evacuations;
