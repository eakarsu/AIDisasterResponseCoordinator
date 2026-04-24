import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { volunteerAPI } from '../services/api';
import { FiUsers } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'availability', label: 'Availability', type: 'status' },
  { key: 'location', label: 'Location' },
  { key: 'hoursLogged', label: 'Hours' },
  { key: 'phone', label: 'Phone' },
];

const formFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text', required: true },
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'availability', label: 'Availability', type: 'select', required: true, options: ['available', 'deployed', 'unavailable'] },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'hoursLogged', label: 'Hours Logged', type: 'number' },
  { name: 'emergencyContact', label: 'Emergency Contact', type: 'text' },
  { name: 'assignedIncidentId', label: 'Assigned Incident ID', type: 'number' },
  { name: 'skills', label: 'Skills (JSON)', type: 'json', placeholder: '["first aid","logistics"]' },
  { name: 'certifications', label: 'Certifications (JSON)', type: 'json', placeholder: '["CPR","EMT"]' },
];

function Volunteers() {
  return <FeaturePage title="Volunteers" apiService={volunteerAPI} columns={columns} formFields={formFields} icon={FiUsers} />;
}

export default Volunteers;
