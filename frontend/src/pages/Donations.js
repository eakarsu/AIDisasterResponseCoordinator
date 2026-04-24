import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { donationAPI } from '../services/api';
import { FiDollarSign } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'donorName', label: 'Donor' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'receivedDate', label: 'Received', type: 'date' },
  { key: 'itemDescription', label: 'Description' },
];

const formFields = [
  { name: 'donorName', label: 'Donor Name', type: 'text', required: true },
  { name: 'donorEmail', label: 'Donor Email', type: 'text' },
  { name: 'type', label: 'Type', type: 'select', required: true, options: ['monetary', 'supplies', 'services'] },
  { name: 'amount', label: 'Amount', type: 'number' },
  { name: 'currency', label: 'Currency', type: 'text', defaultValue: 'USD' },
  { name: 'itemDescription', label: 'Item Description', type: 'textarea' },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['pledged', 'received', 'distributed', 'acknowledged'] },
  { name: 'receivedDate', label: 'Received Date', type: 'date' },
  { name: 'distributedDate', label: 'Distributed Date', type: 'date' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

function Donations() {
  return <FeaturePage title="Donations" apiService={donationAPI} columns={columns} formFields={formFields} icon={FiDollarSign} />;
}

export default Donations;
