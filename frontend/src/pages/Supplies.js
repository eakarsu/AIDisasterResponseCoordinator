import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { supplyAPI } from '../services/api';
import { FiPackage } from 'react-icons/fi';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category', type: 'badge' },
  { key: 'quantity', label: 'Qty' },
  { key: 'unit', label: 'Unit' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'location', label: 'Location' },
  { key: 'supplier', label: 'Supplier' },
];

const formFields = [
  { name: 'name', label: 'Supply Name', type: 'text', required: true },
  { name: 'category', label: 'Category', type: 'select', required: true, options: ['food', 'water', 'medical', 'clothing', 'shelter', 'tools', 'fuel'] },
  { name: 'quantity', label: 'Quantity', type: 'number', required: true },
  { name: 'unit', label: 'Unit', type: 'text', required: true, placeholder: 'e.g. cases, gallons, units' },
  { name: 'location', label: 'Location', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['in_stock', 'low_stock', 'out_of_stock', 'in_transit'] },
  { name: 'reorderLevel', label: 'Reorder Level', type: 'number' },
  { name: 'supplier', label: 'Supplier', type: 'text' },
  { name: 'cost', label: 'Cost', type: 'number' },
  { name: 'expirationDate', label: 'Expiration Date', type: 'date' },
];

function Supplies() {
  return <FeaturePage title="Supplies" apiService={supplyAPI} columns={columns} formFields={formFields} icon={FiPackage} />;
}

export default Supplies;
