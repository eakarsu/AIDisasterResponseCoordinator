import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { threatAnalysisAPI } from '../services/api';
import { FiShield } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'threatType', label: 'Threat Type' },
  { key: 'region', label: 'Region' },
  { key: 'riskLevel', label: 'Risk Level', type: 'status' },
  { key: 'probability', label: 'Probability' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'affectedPopulation', label: 'Affected Pop.' },
  { key: 'aiConfidence', label: 'AI Confidence' },
];

const formFields = [
  { name: 'threatType', label: 'Threat Type', type: 'text', required: true },
  { name: 'region', label: 'Region', type: 'text', required: true },
  { name: 'riskLevel', label: 'Risk Level', type: 'select', required: true, options: ['low', 'moderate', 'high', 'extreme'] },
  { name: 'probability', label: 'Probability (0-1)', type: 'number' },
  { name: 'potentialImpact', label: 'Potential Impact', type: 'textarea' },
  { name: 'affectedPopulation', label: 'Affected Population', type: 'number' },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['identified', 'monitoring', 'escalated', 'mitigated'] },
  { name: 'analyzedBy', label: 'Analyzed By', type: 'text' },
  { name: 'analysisDate', label: 'Analysis Date', type: 'date' },
  { name: 'aiConfidence', label: 'AI Confidence (0-1)', type: 'number' },
  { name: 'mitigationSteps', label: 'Mitigation Steps (JSON)', type: 'json', placeholder: '["step 1","step 2"]' },
];

function ThreatAnalysis() {
  return <FeaturePage title="Threat Analysis" apiService={threatAnalysisAPI} columns={columns} formFields={formFields} icon={FiShield} />;
}

export default ThreatAnalysis;
