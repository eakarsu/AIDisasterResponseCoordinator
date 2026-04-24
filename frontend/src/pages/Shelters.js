import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { shelterAPI } from '../services/api';
import { FiHome } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'currentOccupancy', label: 'Occupancy' },
  { key: 'address', label: 'Address' },
  { key: 'contactPerson', label: 'Contact' },
];

const formFields = [
  { name: 'name', label: 'Shelter Name', type: 'text', required: true },
  { name: 'address', label: 'Address', type: 'text', required: true },
  { name: 'capacity', label: 'Capacity', type: 'number', required: true },
  { name: 'currentOccupancy', label: 'Current Occupancy', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['open', 'closed', 'full', 'preparing'] },
  { name: 'type', label: 'Type', type: 'select', required: true, options: ['emergency', 'temporary', 'permanent'] },
  { name: 'contactPerson', label: 'Contact Person', type: 'text' },
  { name: 'contactPhone', label: 'Contact Phone', type: 'text' },
  { name: 'latitude', label: 'Latitude', type: 'number' },
  { name: 'longitude', label: 'Longitude', type: 'number' },
  { name: 'amenities', label: 'Amenities (JSON)', type: 'json', placeholder: '["beds","kitchen","medical"]' },
];

function Shelters() {
  return <FeaturePage title="Shelters" apiService={shelterAPI} columns={columns} formFields={formFields} icon={FiHome} />;
}

export default Shelters;
