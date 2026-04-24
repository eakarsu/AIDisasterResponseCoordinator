import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { searchRescueAPI } from '../services/api';
import { FiSearch } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'operationName', label: 'Operation' },
  { key: 'teamLeader', label: 'Team Leader' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'teamSize', label: 'Team Size' },
  { key: 'searchArea', label: 'Search Area' },
  { key: 'personsFound', label: 'Found' },
  { key: 'personsRescued', label: 'Rescued' },
];

const formFields = [
  { name: 'operationName', label: 'Operation Name', type: 'text', required: true },
  { name: 'incidentId', label: 'Incident ID', type: 'number' },
  { name: 'teamLeader', label: 'Team Leader', type: 'text', required: true },
  { name: 'teamSize', label: 'Team Size', type: 'number', required: true },
  { name: 'searchArea', label: 'Search Area', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['planning', 'active', 'suspended', 'completed'] },
  { name: 'personsFound', label: 'Persons Found', type: 'number' },
  { name: 'personsRescued', label: 'Persons Rescued', type: 'number' },
  { name: 'startTime', label: 'Start Time', type: 'datetime' },
  { name: 'endTime', label: 'End Time', type: 'datetime' },
  { name: 'hazards', label: 'Hazards', type: 'textarea' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
  { name: 'equipment', label: 'Equipment (JSON)', type: 'json', placeholder: '["rope","radio","flashlight"]' },
];

function SearchRescue() {
  return <FeaturePage title="Search & Rescue Operations" apiService={searchRescueAPI} columns={columns} formFields={formFields} icon={FiSearch} />;
}

export default SearchRescue;
