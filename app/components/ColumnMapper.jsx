'use client';

import { useState } from 'react';

// Required fields per test ID
const TEST_REQUIRED_FIELDS = {
  'RC-001': ['Invoice Number'],
  'PP-002': ['Invoice Number', 'Vendor ID'],
  'HR-002': ['Employee ID', 'Bank Account Number'],
  'INV-001': ['Quantity on Hand'],
  'IT-003': ['Access Level'],
};

// Fuzzy match: does the file header plausibly map to the required field?
function fuzzyMatch(header, field) {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  const f = field.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (h === f) return true;
  // common aliases
  const aliases = {
    invoicenumber: ['invno', 'invnum', 'invoiceno', 'invoicenum', 'inv'],
    vendorid: ['vendorno', 'vendorcode', 'supplierid', 'suppliercode', 'venid'],
    employeeid: ['empid', 'employeeno', 'empno', 'staffid', 'workerid'],
    bankaccountnumber: ['bankaccount', 'bankaccno', 'accountno', 'accountnumber', 'bankno'],
    quantityonhand: ['qty', 'qtyonhand', 'quantity', 'stockqty', 'onhand'],
    accesslevel: ['access', 'role', 'permission', 'accesstype', 'userrole', 'privilege'],
  };
  return (aliases[f] || []).includes(h);
}

export default function ColumnMapper({ test, headers, onConfirm, onCancel }) {
  const requiredFields = TEST_REQUIRED_FIELDS[test.id] || [];

  // Build initial mapping with fuzzy pre-fill
  const initialMapping = {};
  requiredFields.forEach(field => {
    const match = headers.find(h => fuzzyMatch(h, field));
    initialMapping[field] = match !== undefined ? headers.indexOf(match) : '';
  });

  const [mapping, setMapping] = useState(initialMapping);

  const allMapped = requiredFields.every(f => mapping[f] !== '' && mapping[f] !== undefined);

  const handleConfirm = () => {
    // Convert to { fieldName: columnIndex } with integer indices
    const resolved = {};
    requiredFields.forEach(f => {
      resolved[f] = parseInt(mapping[f]);
    });
    onConfirm(resolved);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="mb-4">
          <span className="font-mono text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5 mr-2">{test.id}</span>
          <span className="font-semibold text-gray-900 text-sm">{test.name}</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Match each required field to a column in your uploaded file. We've pre-filled where we could.
        </p>

        <div className="space-y-3 mb-5">
          {requiredFields.map(field => (
            <div key={field}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{field}</label>
              <select
                value={mapping[field]}
                onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">— select column —</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allMapped}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run Test
          </button>
        </div>
      </div>
    </div>
  );
}
