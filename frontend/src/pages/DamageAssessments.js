import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { damageAssessmentAPI } from '../services/api';
import { FiClipboard } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'location', label: 'Location' },
  { key: 'damageLevel', label: 'Damage Level', type: 'status' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'assessorName', label: 'Assessor' },
  { key: 'estimatedCost', label: 'Est. Cost', type: 'currency' },
  { key: 'assessmentDate', label: 'Date', type: 'date' },
];

const formFields = [
  { name: 'location', label: 'Location', type: 'text', required: true },
  { name: 'incidentId', label: 'Incident ID', type: 'number' },
  { name: 'assessorName', label: 'Assessor Name', type: 'text', required: true },
  { name: 'damageLevel', label: 'Damage Level', type: 'select', required: true, options: ['minor', 'moderate', 'severe', 'catastrophic'] },
  { name: 'structuralDamage', label: 'Structural Damage', type: 'textarea' },
  { name: 'infrastructureDamage', label: 'Infrastructure Damage', type: 'textarea' },
  { name: 'estimatedCost', label: 'Estimated Cost ($)', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['pending', 'in_progress', 'completed'] },
  { name: 'recommendations', label: 'Recommendations', type: 'textarea' },
  { name: 'assessmentDate', label: 'Assessment Date', type: 'date' },
  { name: 'photosUrl', label: 'Photos URL', type: 'text' },
];

function DamageAssessments() {
  return <FeaturePage title="Damage Assessments" apiService={damageAssessmentAPI} columns={columns} formFields={formFields} icon={FiClipboard} />;
}

export default DamageAssessments;
