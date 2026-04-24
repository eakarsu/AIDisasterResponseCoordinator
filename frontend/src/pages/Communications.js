import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { communicationAPI } from '../services/api';
import { FiRadio } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'subject', label: 'Subject' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'priority', label: 'Priority', type: 'status' },
  { key: 'channel', label: 'Channel', type: 'badge' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'sender', label: 'Sender' },
];

const formFields = [
  { name: 'type', label: 'Type', type: 'select', required: true, options: ['alert', 'update', 'request', 'broadcast'] },
  { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['low', 'medium', 'high', 'critical'] },
  { name: 'subject', label: 'Subject', type: 'text', required: true },
  { name: 'message', label: 'Message', type: 'textarea', required: true },
  { name: 'sender', label: 'Sender', type: 'text', required: true },
  { name: 'channel', label: 'Channel', type: 'select', required: true, options: ['radio', 'email', 'sms', 'satellite', 'app'] },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['sent', 'delivered', 'read', 'failed'] },
  { name: 'incidentId', label: 'Incident ID', type: 'number' },
  { name: 'recipients', label: 'Recipients (JSON)', type: 'json', placeholder: '["team-a","team-b"]' },
];

function Communications() {
  return <FeaturePage title="Communications" apiService={communicationAPI} columns={columns} formFields={formFields} icon={FiRadio} />;
}

export default Communications;
