import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { resourceAPI } from '../services/api';
import { FiTruck } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'quantity', label: 'Qty' },
  { key: 'location', label: 'Location' },
  { key: 'condition', label: 'Condition' },
  { key: 'costPerUnit', label: 'Cost/Unit', type: 'currency' },
];

const formFields = [
  { name: 'name', label: 'Resource Name', type: 'text', required: true },
  { name: 'type', label: 'Type', type: 'select', required: true, options: ['vehicle', 'equipment', 'personnel', 'aircraft', 'boat'] },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['available', 'deployed', 'maintenance', 'unavailable'] },
  { name: 'quantity', label: 'Quantity', type: 'number', required: true },
  { name: 'location', label: 'Location', type: 'text', required: true },
  { name: 'condition', label: 'Condition', type: 'text' },
  { name: 'costPerUnit', label: 'Cost Per Unit', type: 'number' },
  { name: 'lastInspection', label: 'Last Inspection', type: 'date' },
  { name: 'assignedIncidentId', label: 'Assigned Incident ID', type: 'number' },
];

function Resources() {
  return <FeaturePage title="Resources" apiService={resourceAPI} columns={columns} formFields={formFields} icon={FiTruck} />;
}

export default Resources;
