import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { weatherAlertAPI } from '../services/api';
import { FiCloud } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'severity', label: 'Severity', type: 'status' },
  { key: 'region', label: 'Region' },
  { key: 'source', label: 'Source' },
  { key: 'startTime', label: 'Start', type: 'datetime' },
  { key: 'endTime', label: 'End', type: 'datetime' },
];

const formFields = [
  { name: 'type', label: 'Type', type: 'select', required: true, options: ['hurricane', 'tornado', 'flood', 'heat', 'winter', 'thunderstorm'] },
  { name: 'severity', label: 'Severity', type: 'select', required: true, options: ['advisory', 'watch', 'warning', 'emergency'] },
  { name: 'region', label: 'Region', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  { name: 'startTime', label: 'Start Time', type: 'datetime' },
  { name: 'endTime', label: 'End Time', type: 'datetime' },
  { name: 'source', label: 'Source', type: 'text' },
  { name: 'windSpeed', label: 'Wind Speed (mph)', type: 'number' },
  { name: 'precipitation', label: 'Precipitation (in)', type: 'number' },
  { name: 'temperature', label: 'Temperature (F)', type: 'number' },
  { name: 'recommendations', label: 'Recommendations', type: 'textarea' },
  { name: 'affectedAreas', label: 'Affected Areas (JSON)', type: 'json', placeholder: '["County A","County B"]' },
];

function WeatherAlerts() {
  return <FeaturePage title="Weather Alerts" apiService={weatherAlertAPI} columns={columns} formFields={formFields} icon={FiCloud} />;
}

export default WeatherAlerts;
