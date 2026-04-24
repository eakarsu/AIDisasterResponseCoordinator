import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { medicalResourceAPI } from '../services/api';
import { FiHeart } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'quantity', label: 'Qty' },
  { key: 'location', label: 'Location' },
  { key: 'supplier', label: 'Supplier' },
];

const formFields = [
  { name: 'name', label: 'Resource Name', type: 'text', required: true },
  { name: 'type', label: 'Type', type: 'select', required: true, options: ['ambulance', 'hospital_bed', 'ventilator', 'blood_supply', 'medication', 'ppe', 'first_aid'] },
  { name: 'quantity', label: 'Quantity', type: 'number', required: true },
  { name: 'location', label: 'Location', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['available', 'in_use', 'maintenance', 'depleted'] },
  { name: 'assignedIncidentId', label: 'Assigned Incident ID', type: 'number' },
  { name: 'expirationDate', label: 'Expiration Date', type: 'date' },
  { name: 'certificationRequired', label: 'Certification Required', type: 'text' },
  { name: 'supplier', label: 'Supplier', type: 'text' },
];

function MedicalResources() {
  return <FeaturePage title="Medical Resources" apiService={medicalResourceAPI} columns={columns} formFields={formFields} icon={FiHeart} />;
}

export default MedicalResources;
