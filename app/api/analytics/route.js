import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../lib/rateLimit.js';

// Pure JS analytics logic — no AI involved.
// Receives: testId, columns (mapping of required field → column index), rows (array of arrays)
// Returns: { exceptions, exceptionCount, totalRows }

function runTest(testId, columns, rows) {
  switch (testId) {
    case 'RC-001': return testDuplicateInvoiceNumbers(columns, rows);
    case 'PP-002': return testDuplicateAPInvoices(columns, rows);
    case 'HR-002': return testDuplicateBankAccounts(columns, rows);
    case 'INV-001': return testNegativeInventory(columns, rows);
    case 'IT-003': return testPrivilegedAccess(columns, rows);
    default: throw new Error(`Unknown test ID: ${testId}`);
  }
}

// RC-001: Invoice numbers that appear more than once
function testDuplicateInvoiceNumbers(columns, rows) {
  const invCol = columns['Invoice Number'];
  const counts = {};
  rows.forEach(row => {
    const val = String(row[invCol] ?? '').trim();
    if (val) counts[val] = (counts[val] || 0) + 1;
  });
  const exceptions = rows.filter(row => {
    const val = String(row[invCol] ?? '').trim();
    return val && counts[val] > 1;
  });
  return { exceptions, exceptionCount: exceptions.length, totalRows: rows.length };
}

// PP-002: AP invoice numbers that appear more than once (same logic, AP side)
function testDuplicateAPInvoices(columns, rows) {
  const invCol = columns['Invoice Number'];
  const vendorCol = columns['Vendor ID'];
  // Group by Invoice Number + Vendor ID
  const counts = {};
  rows.forEach(row => {
    const key = `${String(row[invCol] ?? '').trim()}||${String(row[vendorCol] ?? '').trim()}`;
    if (key !== '||') counts[key] = (counts[key] || 0) + 1;
  });
  const exceptions = rows.filter(row => {
    const key = `${String(row[invCol] ?? '').trim()}||${String(row[vendorCol] ?? '').trim()}`;
    return key !== '||' && counts[key] > 1;
  });
  return { exceptions, exceptionCount: exceptions.length, totalRows: rows.length };
}

// HR-002: Two employees sharing the same bank account
function testDuplicateBankAccounts(columns, rows) {
  const bankCol = columns['Bank Account Number'];
  const empCol = columns['Employee ID'];
  // Group rows by bank account, find accounts used by more than one unique employee
  const accountToEmployees = {};
  rows.forEach(row => {
    const bank = String(row[bankCol] ?? '').trim();
    const emp = String(row[empCol] ?? '').trim();
    if (bank) {
      if (!accountToEmployees[bank]) accountToEmployees[bank] = new Set();
      if (emp) accountToEmployees[bank].add(emp);
    }
  });
  const duplicateAccounts = new Set(
    Object.keys(accountToEmployees).filter(k => accountToEmployees[k].size > 1)
  );
  const exceptions = rows.filter(row => {
    const bank = String(row[bankCol] ?? '').trim();
    return bank && duplicateAccounts.has(bank);
  });
  return { exceptions, exceptionCount: exceptions.length, totalRows: rows.length };
}

// INV-001: Items with Quantity on Hand below zero
function testNegativeInventory(columns, rows) {
  const qtyCol = columns['Quantity on Hand'];
  const exceptions = rows.filter(row => {
    const qty = parseFloat(row[qtyCol]);
    return !isNaN(qty) && qty < 0;
  });
  return { exceptions, exceptionCount: exceptions.length, totalRows: rows.length };
}

// IT-003: Users with Admin or Super User access level
function testPrivilegedAccess(columns, rows) {
  const accessCol = columns['Access Level'];
  const privileged = new Set(['admin', 'super user', 'superuser', 'super_user']);
  const exceptions = rows.filter(row => {
    const level = String(row[accessCol] ?? '').trim().toLowerCase();
    return privileged.has(level);
  });
  return { exceptions, exceptionCount: exceptions.length, totalRows: rows.length };
}

export async function POST(req) {
  const limited = await checkRateLimit();
  if (limited) return limited;
  try {
    const { testId, columns, rows, headers } = await req.json();

    if (!testId || !columns || !rows) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const result = runTest(testId, columns, rows);

    // Return up to 100 exception rows with headers for display, plus full count
    const sampleRows = result.exceptions.slice(0, 100);

    return NextResponse.json({
      success: true,
      testId,
      exceptionCount: result.exceptionCount,
      totalRows: result.totalRows,
      headers,
      sampleRows,
    });
  } catch (err) {
    console.error('Analytics route error:', err);
    return NextResponse.json({ success: false, error: 'Analytics failed. Please try again.' }, { status: 500 });
  }
}
