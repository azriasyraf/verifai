'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

// Data structures
const industries = [
  { id: 'distribution', name: 'Distribution & Sales (Import/Export)' },
  { id: 'manufacturing', name: 'Manufacturing' },
  { id: 'services', name: 'Services' },
  { id: 'construction', name: 'Construction' }
];

const processes = [
  { id: 'revenue', name: 'Revenue to Cash' },
  { id: 'hr', name: 'HR (Recruitment & Payroll)' },
  { id: 'procurement', name: 'Procurement to Payment' },
  { id: 'inventory', name: 'Inventory' },
  { id: 'it', name: 'IT/Cybersecurity' }
];


// Strips invalid cross-references from AI-generated data
function sanitizeProgram(program) {
  if (!program) return program;
  const controlIds = new Set((program.controls || []).map(c => c.id));
  const riskIds = new Set((program.risks || []).map(r => r.id));

  const risks = (program.risks || []).map(risk => ({
    ...risk,
    relatedControls: (risk.relatedControls || []).filter(id => controlIds.has(id))
  }));

  const controls = (program.controls || []).map(control => ({
    ...control,
    mitigatesRisks: (control.mitigatesRisks || []).filter(id => riskIds.has(id))
  }));

  const auditProcedures = (program.auditProcedures || []).filter(
    proc => controlIds.has(proc.controlId)
  );

  return { ...program, risks, controls, auditProcedures };
}

// Analytics test library — curated per process
const analyticsLibrary = {
  revenue: [
    {
      id: 'RC-001', name: 'Duplicate Invoice Numbers',
      purpose: 'Detect double billing or duplicate revenue entries.',
      dataneeded: 'Sales ledger — Invoice Number, Customer ID, Invoice Date, Amount',
      steps: ['Add helper column: =COUNTIF($A$2:$A$1000,A2) on Invoice Number', 'Filter for count > 1, then confirm Customer ID matches'],
      redflags: 'Same invoice number + same customer = investigate whether revenue was recognised twice.',
      keywords: ['invoice', 'billing', 'revenue recognition', 'receivable']
    },
    {
      id: 'RC-002', name: 'Round Number Transactions',
      purpose: 'Flag potentially estimated or fictitious entries.',
      dataneeded: 'Sales ledger — Invoice Number, Amount, Date',
      steps: ['Add helper column: =MOD(A2,1000)=0 on Amount', 'Filter for TRUE'],
      redflags: 'Clusters of round-number transactions near period end may indicate estimates posted instead of actuals.',
      keywords: ['invoice', 'revenue', 'transaction', 'journal entry']
    },
    {
      id: 'RC-003', name: 'Transactions Outside Business Hours',
      purpose: 'Identify unauthorized or unusual postings.',
      dataneeded: 'Sales ledger with timestamp — Transaction ID, Amount, Timestamp',
      steps: ['Add helper column: =HOUR(A2) on Timestamp', 'Filter for values < 7 or > 19'],
      redflags: 'High-value transactions posted late at night or on weekends with no business justification.',
      keywords: ['posting', 'transaction', 'journal', 'access', 'unauthorized', 'improper', 'fictitious', 'fraud', 'segregation']
    },
    {
      id: 'RC-004', name: 'Credit Notes After Period End',
      purpose: 'Test for revenue cut-off manipulation.',
      dataneeded: 'Credit note listing — Credit Note Number, Customer ID, Date, Amount, Original Invoice Reference',
      steps: ['Filter Transaction Type = "Credit Note"', 'Filter Date > period end date'],
      redflags: 'Large credit notes shortly after period close may indicate revenue was overstated in the prior period.',
      keywords: ['credit note', 'reversal', 'cut-off', 'period end', 'revenue', 'manipulation', 'overstatement', 'recognition']
    },
    {
      id: 'RC-005', name: 'Credit Limit Breaches',
      purpose: 'Identify sales approved beyond customer credit limits.',
      dataneeded: 'Customer master + AR aging — Customer ID, Outstanding Balance, Credit Limit',
      steps: ['Add helper column: =B2-C2 (Outstanding Balance minus Credit Limit)', 'Filter for values > 0'],
      redflags: 'Customers consistently over their limit may indicate weak approval controls or undisclosed related-party arrangements.',
      keywords: ['credit limit', 'customer', 'receivable', 'credit approval']
    },
    {
      id: 'RC-006', name: 'Revenue Spikes Near Period End',
      purpose: 'Test for window-dressing or premature revenue recognition.',
      dataneeded: 'Daily sales summary — Date, Total Revenue',
      steps: ['Filter last 5 business days of the period', 'Add average: =AVERAGE($B$2:$B$1000) for comparison', 'Flag days where revenue > 2x the daily average'],
      redflags: 'Unusual spikes in the last few days of the period that reverse early in the next period.',
      keywords: ['revenue', 'period end', 'recognition', 'sales', 'cut-off']
    },
  ],
  procurement: [
    {
      id: 'PP-001', name: 'Duplicate Vendor IDs',
      purpose: 'Detect fictitious or duplicate vendors in the master file.',
      dataneeded: 'Vendor master — Vendor ID, Vendor Name, Address, Bank Account',
      steps: ['Add helper column: =COUNTIF($A$2:$A$1000,A2) on Vendor ID', 'Filter for count > 1, check if Name or Bank Account differs'],
      redflags: 'Same Vendor ID with different bank accounts, or slight name variations (ACME Corp vs Acme Corporation) suggesting duplicates.',
      keywords: ['vendor', 'supplier', 'master file', 'vendor master', 'onboarding']
    },
    {
      id: 'PP-002', name: 'Duplicate Invoices',
      purpose: 'Identify invoices that may have been paid twice.',
      dataneeded: 'AP transaction listing — Invoice Number, Vendor ID, Invoice Date, Amount',
      steps: ['Add helper column: =COUNTIF($A$2:$A$1000,A2) on Invoice Number', 'Filter for count > 1, then confirm Vendor ID matches'],
      redflags: 'Same invoice number + same vendor = investigate whether both were paid and whether one was recovered.',
      keywords: ['invoice', 'payment', 'accounts payable', 'AP', 'three-way match']
    },
    {
      id: 'PP-003', name: 'Split Purchases Below Approval Threshold',
      purpose: 'Detect intentional splitting to bypass approval limits.',
      dataneeded: 'Purchase order listing — PO Number, Vendor ID, Date, Amount, Requestor',
      steps: ['Sort by Vendor ID then Date', 'Add helper: =COUNTIFS($A$2:$A$1000,A2,$B$2:$B$1000,B2) — same vendor, same date', 'Filter count > 1 where individual amounts are below threshold but combined exceed it'],
      redflags: 'Multiple POs to the same vendor on the same day, each just under the approval limit.',
      keywords: ['purchase order', 'approval', 'threshold', 'authorization', 'procurement']
    },
    {
      id: 'PP-004', name: 'Payments Just Below Approval Threshold',
      purpose: 'Flag transactions clustered just under approval limits.',
      dataneeded: 'Payment listing — Payment ID, Vendor ID, Amount, Approver',
      steps: ['Filter Amount between (threshold × 0.9) and threshold (e.g. $9,000–$9,999 if threshold is $10,000)', 'Sort by Requestor to identify repeat offenders'],
      redflags: 'High concentration of payments just under the threshold from the same requestor or to the same vendor.',
      keywords: ['payment', 'approval', 'threshold', 'authorization', 'limit']
    },
    {
      id: 'PP-005', name: 'Employee-Vendor Conflict of Interest',
      purpose: 'Identify employees who may have set up vendors for personal gain.',
      dataneeded: 'Employee master (Name, Address) + Vendor master (Vendor Name, Address, Bank Account)',
      steps: ['Copy employee names into a separate column', 'Use =ISNUMBER(SEARCH(D2,B2)) to check if employee name appears in vendor name', 'Separately compare address columns using the same approach'],
      redflags: 'Employee name matching a vendor name, or shared address between an employee and a vendor.',
      keywords: ['vendor', 'conflict of interest', 'related party', 'supplier', 'master', 'fraud', 'fictitious', 'unauthorized', 'employee']
    },
    {
      id: 'PP-006', name: 'Vendors with Incomplete Details',
      purpose: 'Flag potentially fictitious vendors missing key information.',
      dataneeded: 'Vendor master — Vendor ID, Name, Address, Registration Number, Bank Account',
      steps: ['Use Conditional Formatting → Highlight Cell Rules → Blanks across Name, Address, Registration, Bank Account columns', 'Filter for any row with at least one blank'],
      redflags: 'Vendors missing registration numbers or bank details that have received payments.',
      keywords: ['vendor', 'master', 'registration', 'supplier', 'due diligence']
    },
    {
      id: 'PP-007', name: 'Round Number Invoices',
      purpose: 'Identify potentially estimated or fictitious invoices.',
      dataneeded: 'AP transaction listing — Invoice Number, Vendor ID, Amount',
      steps: ['Add helper column: =MOD(A2,1000)=0 on Amount', 'Filter for TRUE'],
      redflags: 'Multiple round-number invoices from the same vendor may indicate fabricated amounts.',
      keywords: ['invoice', 'payment', 'amount', 'accounts payable']
    },
  ],
  hr: [
    {
      id: 'HR-001', name: 'Terminated Employees Still Receiving Pay',
      purpose: 'Detect ghost payroll payments after termination.',
      dataneeded: 'Payroll run + HR termination records — Employee ID, Pay Date, Termination Date',
      steps: ['VLOOKUP Termination Date from HR records into payroll using Employee ID', 'Add helper column: =B2>C2 (Pay Date > Termination Date)', 'Filter for TRUE'],
      redflags: 'Any employee receiving pay after their termination date requires immediate investigation.',
      keywords: ['termination', 'payroll', 'offboarding', 'employee', 'separation']
    },
    {
      id: 'HR-002', name: 'Duplicate Bank Accounts',
      purpose: 'Identify two employees sharing a bank account — a ghost employee indicator.',
      dataneeded: 'Payroll master — Employee ID, Employee Name, Bank Account Number',
      steps: ['Add helper column: =COUNTIF($C$2:$C$1000,C2) on Bank Account Number', 'Filter for count > 1'],
      redflags: 'Two different employees with the same bank account number is a strong indicator of a ghost employee.',
      keywords: ['payroll', 'bank account', 'employee', 'payment', 'disbursement']
    },
    {
      id: 'HR-003', name: 'Salary Changes Without Supporting Records',
      purpose: 'Detect unauthorized pay increases.',
      dataneeded: 'Payroll change log — Employee ID, Change Date, Old Salary, New Salary, Approver',
      steps: ['Filter Transaction Type = "Salary Change"', 'Filter Approver column for blank'],
      redflags: 'Salary changes with no approver recorded, or approver is the same person whose salary changed.',
      keywords: ['salary', 'compensation', 'payroll', 'approval', 'change']
    },
    {
      id: 'HR-004', name: 'Excessive Overtime',
      purpose: 'Flag potential timesheet fraud or approval gaps.',
      dataneeded: 'Timesheet data — Employee ID, Week, Regular Hours, Overtime Hours',
      steps: ['Filter Overtime Hours > 20 per week (adjust to company policy)', 'Sort by Employee ID to identify repeat patterns'],
      redflags: 'Same employees consistently at the overtime threshold, or overtime spikes with no corresponding project activity.',
      keywords: ['overtime', 'timesheet', 'hours', 'payroll', 'time']
    },
    {
      id: 'HR-005', name: 'Salaries Outside Approved Grade Band',
      purpose: 'Identify salaries that fall outside approved ranges.',
      dataneeded: 'Payroll master + grade band table — Employee ID, Grade, Salary, Band Min, Band Max',
      steps: ['VLOOKUP Band Min and Band Max from grade table using Grade', 'Add helper column: =OR(C2<D2, C2>E2) (salary outside band)', 'Filter for TRUE'],
      redflags: 'Salaries above band maximum may indicate unauthorized increases; below minimum may indicate classification errors.',
      keywords: ['salary', 'grade', 'compensation', 'band', 'range']
    },
    {
      id: 'HR-006', name: 'New Employees Added Near Period End',
      purpose: 'Detect timing anomalies in headcount that inflate payroll.',
      dataneeded: 'HR master — Employee ID, Name, Hire Date',
      steps: ['Filter Hire Date within the last 30 days of the period', 'Cross-check first payroll date against hire date'],
      redflags: 'Employees hired in the last week of the period receiving a full month\'s pay, or hire dates that don\'t match onboarding records.',
      keywords: ['hire', 'onboarding', 'new employee', 'payroll', 'headcount']
    },
  ],
  inventory: [
    {
      id: 'INV-001', name: 'Negative Inventory Balances',
      purpose: 'Identify system errors or recording failures.',
      dataneeded: 'Inventory listing — Item ID, Description, Quantity on Hand',
      steps: ['Filter Quantity on Hand < 0'],
      redflags: 'Negative balances indicate items were recorded as issued before being received — a timing or system error.',
      keywords: ['inventory', 'stock', 'quantity', 'balance', 'receiving']
    },
    {
      id: 'INV-002', name: 'Slow-Moving or Zero-Movement Items',
      purpose: 'Flag obsolescence risk.',
      dataneeded: 'Inventory movement report — Item ID, Description, Last Movement Date, Value',
      steps: ['Add helper column: =TODAY()-C2 (days since last movement)', 'Filter for > 180 days (adjust to policy)', 'Sort by Value descending — focus on high-value slow movers'],
      redflags: 'High-value items with no movement in over 6 months may need write-down or write-off assessment.',
      keywords: ['inventory', 'movement', 'obsolescence', 'slow-moving', 'stock']
    },
    {
      id: 'INV-003', name: 'Unexplained Inventory Adjustments',
      purpose: 'Detect unauthorized write-offs or stock manipulation.',
      dataneeded: 'Inventory adjustment log — Adjustment ID, Item ID, Date, Quantity, Reason Code, Approver',
      steps: ['Filter Transaction Type = "Adjustment"', 'Filter Reason Code or Approver for blank'],
      redflags: 'Adjustments with no reason code or approver are a control gap — particularly if high-value or recurring.',
      keywords: ['adjustment', 'inventory', 'write-off', 'stock', 'approval']
    },
    {
      id: 'INV-004', name: "Benford's Law on Inventory Values",
      purpose: 'Statistical test for fabricated quantities or values.',
      dataneeded: 'Inventory listing — Item ID, Unit Value or Quantity on Hand',
      steps: ['Add helper column: =LEFT(TEXT(A2,"0"),1) to extract first digit', 'Count frequency of each digit (1–9) using COUNTIF', 'Compare to expected: 1=30.1%, 2=17.6%, 3=12.5%, 4=9.7%, 5=7.9%, 6=6.7%, 7=5.8%, 8=5.1%, 9=4.6%', 'Flag digits with > 5% deviation from expected'],
      redflags: 'Significant deviation from Benford\'s distribution — particularly overrepresentation of a specific digit — warrants further investigation.',
      keywords: ['inventory', 'valuation', 'quantity', 'value', 'fabricated']
    },
    {
      id: 'INV-005', name: 'High-Value Items with No Reorder Point',
      purpose: 'Identify control gaps in replenishment.',
      dataneeded: 'Inventory master — Item ID, Description, Unit Cost, Reorder Point',
      steps: ['Filter Reorder Point = 0 or blank', 'Sort by Unit Cost descending', 'Focus review on top 20% by value'],
      redflags: 'High-value items with no reorder point set are at risk of stockout or are potentially obsolete and not being monitored.',
      keywords: ['reorder', 'inventory', 'replenishment', 'stock', 'control']
    },
    {
      id: 'INV-006', name: 'Physical Count vs System Discrepancies',
      purpose: 'Test accuracy of inventory records.',
      dataneeded: 'Physical count sheet + system inventory — Item ID, Physical Quantity, System Quantity',
      steps: ['VLOOKUP System Quantity against Physical Count using Item ID', 'Add helper column: =B2-C2 (Physical minus System)', 'Filter for non-zero differences, sort by absolute value descending'],
      redflags: 'Large or recurring variances on the same items may indicate theft, recording errors, or measurement issues.',
      keywords: ['physical count', 'stocktake', 'reconciliation', 'inventory', 'variance']
    },
  ],
  it: [
    {
      id: 'IT-001', name: 'Terminated Users with Active Accounts',
      purpose: 'Confirm access is revoked after offboarding.',
      dataneeded: 'Active user list + HR termination records — User ID, Account Status, Termination Date',
      steps: ['VLOOKUP Termination Date from HR records into user list using Employee ID', 'Filter Account Status = "Active" where Termination Date is not blank'],
      redflags: 'Any active account belonging to a terminated employee is an immediate access control failure.',
      keywords: ['access', 'user', 'account', 'termination', 'offboarding', 'deprovisioning']
    },
    {
      id: 'IT-002', name: 'Users with Multiple Active Accounts',
      purpose: 'Detect unauthorized account creation.',
      dataneeded: 'Active user list — User ID, Employee ID, Account Status',
      steps: ['Add helper column: =COUNTIF($B$2:$B$1000,B2) on Employee ID', 'Filter Account Status = "Active" and count > 1'],
      redflags: 'One employee with multiple active accounts may indicate a shared account or unauthorized account created for privileged access.',
      keywords: ['user', 'account', 'access', 'privilege', 'provisioning']
    },
    {
      id: 'IT-003', name: 'Privileged Access Review',
      purpose: 'Confirm admin rights are limited to roles that require them.',
      dataneeded: 'User access listing — User ID, Employee Name, Role, Access Level',
      steps: ['Filter Access Level = "Admin" or "Super User"', 'Cross-check Role against approved privileged access list'],
      redflags: 'Admin access assigned to non-IT roles (e.g. Finance Clerk with admin rights) indicates access provisioning control gaps.',
      keywords: ['admin', 'privilege', 'access', 'role', 'super user', 'access control']
    },
    {
      id: 'IT-004', name: 'Logins Outside Business Hours',
      purpose: 'Identify unauthorized or suspicious system access.',
      dataneeded: 'System access log — User ID, Login Timestamp',
      steps: ['Add helper column: =HOUR(B2) on Login Timestamp', 'Filter for values < 7 or > 19', 'Separately filter weekends: =WEEKDAY(B2,2)>5'],
      redflags: 'Privileged users logging in outside business hours without documented justification, particularly on weekends or public holidays.',
      keywords: ['login', 'access', 'monitoring', 'log', 'audit trail']
    },
    {
      id: 'IT-005', name: 'Excessive Failed Login Attempts',
      purpose: 'Detect brute force attempts or credential sharing.',
      dataneeded: 'Security event log — User ID, Event Type, Date',
      steps: ['Filter Event Type = "Failed Login"', 'Add helper: =COUNTIFS($A$2:$A$1000,A2,$B$2:$B$1000,"Failed Login") per user', 'Filter for count > 10 in a single day'],
      redflags: 'High failed login counts on a single account in a short window, especially followed by a successful login.',
      keywords: ['login', 'password', 'authentication', 'security', 'failed']
    },
    {
      id: 'IT-006', name: 'Segregation of Duties Conflicts',
      purpose: 'Identify users who can both create and approve transactions.',
      dataneeded: 'User access matrix — User ID, Module, Create Permission, Approve Permission',
      steps: ['Filter Create Permission = "Yes" AND Approve Permission = "Yes" in same module', 'List all flagged users and their modules'],
      redflags: 'Any user with end-to-end access in a financial module (e.g. can raise and approve a purchase order) is a segregation of duties violation.',
      keywords: ['segregation', 'access', 'approval', 'create', 'duties', 'SOD']
    },
    {
      id: 'IT-007', name: 'Password Age Analysis',
      purpose: 'Identify accounts with stale passwords posing a security risk.',
      dataneeded: 'User account listing — User ID, Last Password Change Date',
      steps: ['Add helper column: =TODAY()-B2 (days since last password change)', 'Filter for > 90 days (adjust to company policy)'],
      redflags: 'Accounts — especially privileged ones — with passwords unchanged for over 90 days, or accounts that have never had a password change.',
      keywords: ['password', 'authentication', 'security', 'access', 'credential']
    },
  ],
};

// Maps analytics tests to risks by keyword matching
function mapAnalyticsToRisks(program, process) {
  const tests = analyticsLibrary[process] || [];
  const risks = program.risks || [];
  return tests.map(test => {
    const matched = risks.find(risk =>
      test.keywords.some(kw => risk.description.toLowerCase().includes(kw.toLowerCase()))
    );
    return { ...test, riskId: matched?.id || null, included: true };
  });
}

export default function Verifai() {
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedProcess, setSelectedProcess] = useState('');
  const [assessmentType, setAssessmentType] = useState('program-only');
  const [showResults, setShowResults] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [auditProgram, setAuditProgram] = useState(null);
  const [error, setError] = useState(null);

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProgram, setEditedProgram] = useState(null);
  const [originalProgram, setOriginalProgram] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Analytics tests state
  const [analyticsTests, setAnalyticsTests] = useState([]);

  // Auditee / engagement details
  const [auditeeDetails, setAuditeeDetails] = useState({
    clientName: '',
    department: '',
    periodFrom: '',
    periodTo: '',
    engagementRef: '',
    auditorName: '',
    primaryContactName: '',
    primaryContactTitle: '',
  });

  const updateAuditeeDetail = (field, value) => {
    setAuditeeDetails(prev => ({ ...prev, [field]: value }));
  };

  const canGenerate = selectedIndustry && selectedProcess;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: selectedIndustry,
          process: selectedProcess,
          assessmentType
        })
      });

      const result = await response.json();

      if (result.success) {
        const cleanData = sanitizeProgram(result.data);
        setAuditProgram(cleanData);
        setOriginalProgram(JSON.parse(JSON.stringify(cleanData)));
        setEditedProgram(JSON.parse(JSON.stringify(cleanData)));
        setAnalyticsTests(mapAnalyticsToRisks(cleanData, selectedProcess));
        setShowResults(true);
        setIsEditMode(false);
      } else {
        setError(result.error || 'Failed to generate audit program');
      }
    } catch (err) {
      setError('Failed to connect to generation service');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const enterEditMode = () => {
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setEditedProgram(JSON.parse(JSON.stringify(originalProgram)));
    setIsEditMode(false);
    setConfirmReset(false);
  };

  const resetToAI = () => {
    if (confirmReset) {
      setEditedProgram(JSON.parse(JSON.stringify(originalProgram)));
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
    }
  };

  const saveEdits = () => {
    setAuditProgram(editedProgram);
    setIsEditMode(false);
  };

  // Helper functions for editing
  const updateObjective = (index, value) => {
    const updated = [...editedProgram.auditObjectives];
    updated[index] = value;
    setEditedProgram({...editedProgram, auditObjectives: updated});
  };

  const deleteObjective = (index) => {
    const updated = editedProgram.auditObjectives.filter((_, i) => i !== index);
    setEditedProgram({...editedProgram, auditObjectives: updated});
  };

  const addObjective = () => {
    const updated = [...(editedProgram.auditObjectives || []), 'New objective'];
    setEditedProgram({...editedProgram, auditObjectives: updated});
  };

  const updateRisk = (index, field, value) => {
    const updated = [...editedProgram.risks];
    updated[index] = {...updated[index], [field]: value};
    setEditedProgram({...editedProgram, risks: updated});
  };

  const deleteRisk = (index) => {
    const riskToDelete = editedProgram.risks[index];
    const updated = editedProgram.risks.filter((_, i) => i !== index);

    // Renumber risk IDs
    const renumbered = updated.map((risk, i) => ({
      ...risk,
      id: `R${String(i + 1).padStart(3, '0')}`
    }));

    // Update control references to risks
    const updatedControls = editedProgram.controls.map(control => ({
      ...control,
      mitigatesRisks: control.mitigatesRisks
        ?.filter(rId => rId !== riskToDelete.id)
        .map(rId => {
          const oldIndex = parseInt(rId.substring(1));
          const newIndex = oldIndex > (index + 1) ? oldIndex - 1 : oldIndex;
          return `R${String(newIndex).padStart(3, '0')}`;
        })
    }));

    setEditedProgram({...editedProgram, risks: renumbered, controls: updatedControls});
  };

  const addRisk = () => {
    const newId = `R${String((editedProgram.risks?.length || 0) + 1).padStart(3, '0')}`;
    const newRisk = {
      id: newId,
      category: 'Financial',
      description: 'New risk description',
      rating: 'Medium',
      assertion: 'Completeness',
      relatedControls: [],
      frameworkReference: ''
    };
    const updated = [...(editedProgram.risks || []), newRisk];
    setEditedProgram({...editedProgram, risks: updated});
  };

  const updateControl = (index, field, value) => {
    const updated = [...editedProgram.controls];
    updated[index] = {...updated[index], [field]: value};
    setEditedProgram({...editedProgram, controls: updated});
  };

  const deleteControl = (index) => {
    const controlToDelete = editedProgram.controls[index];
    const updated = editedProgram.controls.filter((_, i) => i !== index);

    // Renumber control IDs
    const renumbered = updated.map((control, i) => ({
      ...control,
      id: `C${String(i + 1).padStart(3, '0')}`
    }));

    // Update risk references to controls
    const updatedRisks = editedProgram.risks.map(risk => ({
      ...risk,
      relatedControls: risk.relatedControls
        ?.filter(cId => cId !== controlToDelete.id)
        .map(cId => {
          const oldIndex = parseInt(cId.substring(1));
          const newIndex = oldIndex > (index + 1) ? oldIndex - 1 : oldIndex;
          return `C${String(newIndex).padStart(3, '0')}`;
        })
    }));

    // Update procedure references to controls
    const updatedProcedures = editedProgram.auditProcedures
      .filter(proc => proc.controlId !== controlToDelete.id)
      .map(proc => {
        const oldIndex = parseInt(proc.controlId.substring(1));
        const newIndex = oldIndex > (index + 1) ? oldIndex - 1 : oldIndex;
        return {...proc, controlId: `C${String(newIndex).padStart(3, '0')}`};
      });

    setEditedProgram({...editedProgram, controls: renumbered, risks: updatedRisks, auditProcedures: updatedProcedures});
  };

  const addControl = () => {
    const newId = `C${String((editedProgram.controls?.length || 0) + 1).padStart(3, '0')}`;
    const newControl = {
      id: newId,
      description: 'New control description',
      type: 'Preventive',
      frequency: 'Monthly',
      owner: '',
      ownerRole: '',
      ownerDepartment: '',
      mitigatesRisks: [],
      frameworkReference: ''
    };
    const updated = [...(editedProgram.controls || []), newControl];
    setEditedProgram({...editedProgram, controls: updated});
  };

  const updateProcedure = (index, field, value) => {
    const updated = [...editedProgram.auditProcedures];
    updated[index] = {...updated[index], [field]: value};
    setEditedProgram({...editedProgram, auditProcedures: updated});
  };

  const deleteProcedure = (index) => {
    const updated = editedProgram.auditProcedures.filter((_, i) => i !== index);
    setEditedProgram({...editedProgram, auditProcedures: updated});
  };

  const addProcedure = () => {
    // Default to first control if exists
    const defaultControlId = editedProgram.controls?.length > 0 ? editedProgram.controls[0].id : 'C001';
    const newProcedure = {
      controlId: defaultControlId,
      procedure: 'New audit procedure description',
      testingMethod: 'Inquiry',
      sampleSize: '25 samples',
      expectedEvidence: 'Documentation or evidence to be reviewed',
      frameworkReference: 'IIA Standard 2310: Identifying Information'
    };
    const updated = [...(editedProgram.auditProcedures || []), newProcedure];
    setEditedProgram({...editedProgram, auditProcedures: updated});
  };

  const updateAnalyticsRisk = (index, riskId) => {
    const updated = [...analyticsTests];
    updated[index] = { ...updated[index], riskId };
    setAnalyticsTests(updated);
  };

  const toggleAnalyticsTest = (index) => {
    const updated = [...analyticsTests];
    updated[index] = { ...updated[index], included: !updated[index].included };
    setAnalyticsTests(updated);
  };

  const exportToExcel = () => {
    const programToExport = isEditMode ? editedProgram : auditProgram;
    if (!programToExport) return;

    const workbook = XLSX.utils.book_new();
    const industryName = industries.find(i => i.id === selectedIndustry)?.name || selectedIndustry;
    const processName = processes.find(p => p.id === selectedProcess)?.name || selectedProcess;
    const date = new Date().toISOString().split('T')[0];

    // Pre-compute data quality checks once
    const risks = programToExport.risks || [];
    const controls = programToExport.controls || [];
    const procedures = programToExport.auditProcedures || [];

    const orphanedRisks = risks.filter(r => !r.relatedControls || r.relatedControls.length === 0);
    const orphanedControls = controls.filter(c => !c.mitigatesRisks || c.mitigatesRisks.length === 0);
    const untestedControls = controls.filter(c => !procedures.some(p => p.controlId === c.id));
    const hasWarnings = orphanedRisks.length > 0 || orphanedControls.length > 0 || untestedControls.length > 0;

    // TAB 1: SUMMARY & DASHBOARD
    const summaryData = [];

    // Header
    summaryData.push(['AUDIT PROGRAM']);
    summaryData.push([`${processName} - ${industryName}`]);
    summaryData.push([]);
    summaryData.push(['Client / Company:', auditeeDetails.clientName || '']);
    summaryData.push(['Department Under Audit:', auditeeDetails.department || '']);
    summaryData.push(['Audit Period:', auditeeDetails.periodFrom && auditeeDetails.periodTo
      ? `${auditeeDetails.periodFrom} to ${auditeeDetails.periodTo}`
      : auditeeDetails.periodFrom || auditeeDetails.periodTo || '']);
    summaryData.push(['Engagement Reference:', auditeeDetails.engagementRef || '']);
    summaryData.push(['Prepared By:', auditeeDetails.auditorName || '']);
    summaryData.push(['Primary Contact:', auditeeDetails.primaryContactName
      ? `${auditeeDetails.primaryContactName}${auditeeDetails.primaryContactTitle ? ` · ${auditeeDetails.primaryContactTitle}` : ''}`
      : '']);
    summaryData.push(['Date Generated:', date]);
    summaryData.push(['Version:', '1.0']);
    summaryData.push(['Reviewed By:', '']);
    summaryData.push([]);

    // Data Quality Warnings — at top so auditor sees them immediately
    if (hasWarnings) {
      summaryData.push(['⚠️ DATA QUALITY WARNINGS — REVIEW BEFORE FIELDWORK']);
      if (orphanedRisks.length > 0) {
        summaryData.push([`Risks with no mitigating controls (${orphanedRisks.length}):`]);
        orphanedRisks.forEach(r => summaryData.push(['', `${r.id}: ${r.description.substring(0, 80)}`]));
      }
      if (orphanedControls.length > 0) {
        summaryData.push([`Controls not linked to any risk (${orphanedControls.length}):`]);
        orphanedControls.forEach(c => summaryData.push(['', `${c.id}: ${c.description.substring(0, 80)}`]));
      }
      if (untestedControls.length > 0) {
        summaryData.push([`Controls with no audit procedures (${untestedControls.length}):`]);
        untestedControls.forEach(c => summaryData.push(['', `${c.id}: ${c.description.substring(0, 80)}`]));
      }
      summaryData.push([]);
    }

    // Framework
    if (programToExport.framework) {
      summaryData.push(['FRAMEWORK']);
      summaryData.push(['Audit Methodology:', programToExport.framework.auditMethodology]);
      summaryData.push(['Control Framework:', programToExport.framework.controlFramework]);
      summaryData.push([]);
    }

    // Audit Objectives
    if (programToExport.auditObjectives) {
      summaryData.push(['AUDIT OBJECTIVES']);
      programToExport.auditObjectives.forEach((obj, i) => summaryData.push([`${i + 1}.`, obj]));
      summaryData.push([]);
    }

    // Risk Overview
    if (risks.length > 0) {
      summaryData.push(['RISK OVERVIEW']);
      summaryData.push(['Total Risks:', risks.length]);
      summaryData.push(['High:', risks.filter(r => r.rating === 'High').length]);
      summaryData.push(['Medium:', risks.filter(r => r.rating === 'Medium').length]);
      summaryData.push(['Low:', risks.filter(r => r.rating === 'Low').length]);
      summaryData.push(['Risks without controls:', orphanedRisks.length]);
      summaryData.push([]);
    }

    // Dashboard — one row per control with live status flags
    if (controls.length > 0) {
      summaryData.push(['CONTROL STATUS DASHBOARD']);
      summaryData.push([
        'Control ID', 'Description', 'Type', 'Frequency', 'Owner',
        'Risks Linked', 'Procedures Defined',
        'Assigned To', 'Status', 'Findings?', 'Conclusion'
      ]);
      controls.forEach(control => {
        const hasRisks = control.mitigatesRisks && control.mitigatesRisks.length > 0;
        const hasProcedures = procedures.some(p => p.controlId === control.id);
        summaryData.push([
          control.id,
          control.description.substring(0, 60),
          control.type,
          control.frequency || '',
          control.owner || '',
          hasRisks ? 'Yes' : 'NO ⚠️',
          hasProcedures ? 'Yes' : 'NO ⚠️',
          '', // Assigned To
          'Not Started',
          '',
          ''
        ]);
      });
      summaryData.push([]);
    }

    // Sign-off
    summaryData.push(['OVERALL AUDIT CONCLUSION']);
    summaryData.push(['(To be completed after testing)']);
    summaryData.push([]);
    summaryData.push(['REVIEW SIGN-OFF']);
    summaryData.push(['Manager Comments:', '']);
    summaryData.push(['Reviewer Signature:', '']);
    summaryData.push(['Date:', '']);

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 24 }, { wch: 48 }, { wch: 15 }, { wch: 15 },
      { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 20 },
      { wch: 15 }, { wch: 12 }, { wch: 20 }
    ];
    summarySheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // TAB 2-N: CONTROL WORKPAPERS — one per control, all controls included
    controls.forEach(control => {
      const controlData = [];
      const hasRisks = control.mitigatesRisks && control.mitigatesRisks.length > 0;
      const controlProcedures = procedures.filter(p => p.controlId === control.id);
      const hasProcedures = controlProcedures.length > 0;

      // Warning banner at top if incomplete
      if (!hasRisks || !hasProcedures) {
        controlData.push(['⚠️ INCOMPLETE WORKPAPER — ACTION REQUIRED']);
        if (!hasRisks) controlData.push(['', 'This control is not linked to any risks. Link it before testing.']);
        if (!hasProcedures) controlData.push(['', 'No audit procedures defined. Add procedures before testing.']);
        controlData.push([]);
      }

      // Section A: Control Details
      controlData.push(['A. CONTROL DETAILS']);
      controlData.push(['Control ID:', control.id]);
      controlData.push(['Description:', control.description]);
      controlData.push(['Type:', control.type]);
      controlData.push(['Frequency:', control.frequency || 'Not specified']);
      controlData.push(['Control Owner:', control.owner || '']);
      if (control.ownerRole) controlData.push(['Owner Role:', control.ownerRole]);
      if (control.ownerDepartment) controlData.push(['Owner Department:', control.ownerDepartment]);
      if (auditeeDetails.clientName) controlData.push(['Client:', auditeeDetails.clientName]);
      if (auditeeDetails.engagementRef) controlData.push(['Engagement Ref:', auditeeDetails.engagementRef]);
      if (control.frameworkReference) {
        controlData.push(['Framework Reference:', control.frameworkReference]);
      }
      controlData.push([]);

      // Section B: Associated Risks
      controlData.push(['B. ASSOCIATED RISKS']);
      if (hasRisks) {
        control.mitigatesRisks.forEach(riskId => {
          const risk = risks.find(r => r.id === riskId);
          if (risk) {
            controlData.push([risk.id, risk.description]);
            controlData.push(['Category / Rating:', `${risk.category} / ${risk.rating}`]);
            if (risk.assertion) controlData.push(['Assertion:', risk.assertion]);
            if (risk.frameworkReference) controlData.push(['Framework Reference:', risk.frameworkReference]);
            controlData.push([]);
          }
        });
      } else {
        controlData.push(['⚠️ No risks linked to this control.']);
        controlData.push([]);
      }

      // Section C: Testing Plan
      controlData.push(['C. TESTING PLAN']);
      if (hasProcedures) {
        controlProcedures.forEach((proc, i) => {
          controlData.push([`Procedure ${i + 1}:`, proc.procedure]);
          controlData.push(['Testing Method:', proc.testingMethod]);
          controlData.push(['Sample Size:', proc.sampleSize]);
          controlData.push(['Expected Evidence:', proc.expectedEvidence]);
          if (proc.frameworkReference) controlData.push(['IIA Reference:', proc.frameworkReference]);
          if (proc.analyticsTest) {
            controlData.push(['Analytics Type:', proc.analyticsTest.type]);
            controlData.push(['Analytics Description:', proc.analyticsTest.description]);
            controlData.push(['Population:', proc.analyticsTest.population || '']);
          }
          controlData.push([]);
        });
      } else {
        controlData.push(['⚠️ No audit procedures defined for this control.']);
        controlData.push([]);
      }

      // Section D: Testing Execution
      controlData.push(['D. TESTING EXECUTION']);
      controlData.push(['Sample Selected:', '']);
      controlData.push(['Testing Date:', '']);
      controlData.push(['Performed By:', '']);
      controlData.push(['Results Observed:', '']);
      controlData.push(['Exceptions Noted:', '']);
      controlData.push([]);

      // Section E: Findings & Conclusion
      controlData.push(['E. FINDINGS & CONCLUSION']);
      controlData.push(['Finding Identified?', 'Yes [ ]  No [ ]']);
      controlData.push(['Finding Description:', '']);
      controlData.push(['Root Cause:', '']);
      controlData.push(['Risk Rating:', 'High [ ]  Medium [ ]  Low [ ]']);
      controlData.push(['Control Effectiveness:', 'Effective [ ]  Needs Improvement [ ]  Ineffective [ ]']);
      controlData.push(['Auditor Notes:', '']);

      const controlSheet = XLSX.utils.aoa_to_sheet(controlData);
      controlSheet['!cols'] = [{ wch: 24 }, { wch: 75 }];
      controlSheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      const tabName = `${control.id} - ${control.description.substring(0, 20)}`.replace(/[^a-zA-Z0-9 -]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, controlSheet, tabName);
    });

    // ANALYTICS TESTS tab
    const includedTests = analyticsTests.filter(t => t.included);
    if (includedTests.length > 0) {
      const analyticsData = [];
      analyticsData.push(['DATA ANALYTICS']);
      analyticsData.push(['Population-based analytics procedures — run on full dataset, not a sample.']);
      analyticsData.push([]);
      analyticsData.push(['Test ID', 'Test Name', 'Risk Addressed', 'Status', 'Exceptions Found', 'Notes']);

      includedTests.forEach(test => {
        const linkedRisk = risks.find(r => r.id === test.riskId);
        analyticsData.push([test.id, test.name, test.riskId || 'Unassigned', 'Not Started', '', '']);
        analyticsData.push(['Purpose:', test.purpose]);
        analyticsData.push(['Data Needed:', test.dataneeded]);
        analyticsData.push(['Steps:']);
        test.steps.forEach((step, i) => analyticsData.push(['', `${i + 1}. ${step}`]));
        analyticsData.push(['Red Flags:', test.redflags]);
        if (linkedRisk) analyticsData.push(['Risk Addressed:', `${linkedRisk.id}: ${linkedRisk.description.substring(0, 60)}`]);
        analyticsData.push([]);
      });

      const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData);
      analyticsSheet['!cols'] = [
        { wch: 12 }, { wch: 55 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 30 }
      ];
      analyticsSheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Data Analytics');
    }

    // FINDINGS SUMMARY tab
    const findingsData = [];
    findingsData.push(['FINDINGS SUMMARY']);
    findingsData.push(['(Populate as testing progresses)']);
    findingsData.push([]);
    findingsData.push(['Finding #', 'Control ID', 'Risk ID', 'Finding Description', 'Risk Rating', 'Root Cause', 'Management Response', 'Due Date', 'Status']);
    // Pre-populate one row per control that has procedures
    controls.filter(c => procedures.some(p => p.controlId === c.id)).forEach((c, i) => {
      findingsData.push([`F${String(i + 1).padStart(3, '0')}`, c.id, c.mitigatesRisks?.[0] || '', '', '', '', '', '', 'Open']);
    });

    const findingsSheet = XLSX.utils.aoa_to_sheet(findingsData);
    findingsSheet['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 45 },
      { wch: 12 }, { wch: 30 }, { wch: 35 }, { wch: 12 }, { wch: 12 }
    ];
    findingsSheet['!freeze'] = { xSplit: 0, ySplit: 4 };
    XLSX.utils.book_append_sheet(workbook, findingsSheet, 'Findings Summary');

    // Generate filename and download
    const clientSlug = auditeeDetails.clientName ? `${auditeeDetails.clientName}_` : '';
    const filename = `AuditProgram_${clientSlug}${processName}_${date}.xlsx`.replace(/[^a-zA-Z0-9_.-]/g, '_');
    XLSX.writeFile(workbook, filename);
  };

  const resetForm = () => {
    setSelectedIndustry('');
    setSelectedProcess('');
    setShowResults(false);
    setAuditProgram(null);
    setError(null);
    setAnalyticsTests([]);
    // Note: auditeeDetails intentionally NOT reset — persists across multiple generates in same session
  };

  if (showResults && auditProgram) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#1e3a8a]">
                  Audit Program Generated
                </h1>
                <p className="text-[#64748b] mt-1">
                  {industries.find(i => i.id === selectedIndustry)?.name} - {processes.find(p => p.id === selectedProcess)?.name}
                </p>
              </div>
              <div className="flex gap-3">
                {!isEditMode ? (
                  <>
                    <button
                      onClick={enterEditMode}
                      className="bg-[#3b82f6] text-white px-6 py-3 rounded-lg hover:bg-[#2563eb] transition-colors font-semibold"
                    >
                      ✏️ Edit Program
                    </button>
                    <button
                      onClick={exportToExcel}
                      className="bg-[#0d9488] text-white px-6 py-3 rounded-lg hover:bg-[#0f766e] transition-colors font-semibold"
                    >
                      📊 Export to Excel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={saveEdits}
                      className="bg-[#10b981] text-white px-6 py-3 rounded-lg hover:bg-[#059669] transition-colors font-semibold"
                    >
                      ✓ Save Changes
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-[#6b7280] text-white px-6 py-3 rounded-lg hover:bg-[#4b5563] transition-colors"
                    >
                      Cancel
                    </button>
                    {confirmReset ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#ef4444] font-medium">Reset all changes?</span>
                        <button onClick={resetToAI} className="bg-[#ef4444] text-white px-4 py-2 rounded-lg hover:bg-[#dc2626] transition-colors text-sm font-medium">Yes, reset</button>
                        <button onClick={() => setConfirmReset(false)} className="bg-[#e2e8f0] text-[#475569] px-4 py-2 rounded-lg hover:bg-[#cbd5e1] transition-colors text-sm">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={resetToAI}
                        className="bg-[#ef4444] text-white px-6 py-3 rounded-lg hover:bg-[#dc2626] transition-colors"
                      >
                        ↺ Reset to AI
                      </button>
                    )}
                    <button
                      onClick={exportToExcel}
                      className="bg-[#0d9488] text-white px-6 py-3 rounded-lg hover:bg-[#0f766e] transition-colors font-semibold"
                    >
                      📊 Export
                    </button>
                  </>
                )}
                <button
                  onClick={resetForm}
                  className="bg-[#475569] text-white px-6 py-3 rounded-lg hover:bg-[#334155] transition-colors"
                >
                  Generate Another
                </button>
              </div>
            </div>
          </div>

          {/* Framework */}
          {auditProgram.framework && (
            <div className="bg-gradient-to-r from-[#0d9488] to-[#0f766e] rounded-lg shadow-sm p-6 mb-6 text-white">
              <h2 className="text-2xl font-semibold mb-3">📋 Frameworks</h2>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="text-white/70 text-sm">Audit Methodology:</span>
                  <p className="font-semibold">{auditProgram.framework.auditMethodology || auditProgram.framework.name}</p>
                </div>
                <div>
                  <span className="text-white/70 text-sm">Control Framework:</span>
                  <p className="font-semibold">{auditProgram.framework.controlFramework || 'COSO 2013'}</p>
                </div>
              </div>
              <p className="text-white/90 leading-relaxed text-sm">{auditProgram.framework.description}</p>
            </div>
          )}

          {/* Process Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-4">Process Overview</h2>
            <p className="text-[#475569] leading-relaxed">{auditProgram.processOverview}</p>
          </div>

          {/* Risk Management & Governance Assessment */}
          {auditProgram.riskManagementAssessment && (
            <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
              <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-4">
                🎯 Risk Management & Governance Assessment
              </h2>

              {/* Maturity Level */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-blue-900">Risk Management Maturity:</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium text-sm">
                    {auditProgram.riskManagementAssessment.maturityLevel}
                  </span>
                </div>
                <p className="text-blue-800 text-sm">{auditProgram.riskManagementAssessment.maturityDescription}</p>
              </div>

              {/* Governance Structure */}
              <div className="mb-4">
                <h3 className="font-semibold text-[#1e3a8a] mb-2">Governance Structure</h3>
                <p className="text-[#475569] text-sm leading-relaxed">{auditProgram.riskManagementAssessment.governanceStructure}</p>
              </div>

              {/* Assessment Procedures */}
              <div className="mb-4">
                <h3 className="font-semibold text-[#1e3a8a] mb-2">Assessment Procedures</h3>
                <ul className="space-y-2">
                  {auditProgram.riskManagementAssessment.assessmentProcedures.map((proc, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <span className="text-[#0d9488] mr-2">▸</span>
                      <span className="text-[#475569]">{proc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key Questions */}
              <div className="mb-4">
                <h3 className="font-semibold text-[#1e3a8a] mb-2">Key Questions for Management</h3>
                <ul className="space-y-2">
                  {auditProgram.riskManagementAssessment.keyQuestions.map((question, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <span className="text-purple-500 mr-2">?</span>
                      <span className="text-[#475569]">{question}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Red Flags */}
              <div className="mb-4">
                <h3 className="font-semibold text-red-700 mb-2">🚩 Red Flags to Watch For</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <ul className="space-y-2">
                    {auditProgram.riskManagementAssessment.redFlags.map((flag, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-red-500 mr-2">⚠</span>
                        <span className="text-red-800">{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              {auditProgram.riskManagementAssessment.recommendations && auditProgram.riskManagementAssessment.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#0d9488] mb-2">💡 Recommendations</h3>
                  <ul className="space-y-2">
                    {auditProgram.riskManagementAssessment.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-[#0d9488] mr-2">→</span>
                        <span className="text-[#475569]">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Audit Objectives */}
          {(isEditMode ? editedProgram?.auditObjectives : auditProgram?.auditObjectives) && (
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-[#1e3a8a]">
                Audit Objectives {isEditMode && <span className="text-sm text-blue-600">(Editing)</span>}
              </h2>
              {isEditMode && (
                <button
                  onClick={addObjective}
                  className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
                >
                  + Add Objective
                </button>
              )}
            </div>
            <ul className="space-y-3">
              {(isEditMode ? editedProgram.auditObjectives : auditProgram.auditObjectives).map((obj, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#0d9488] mr-2 mt-2">•</span>
                  {isEditMode ? (
                    <>
                      <input
                        type="text"
                        value={obj}
                        onChange={(e) => updateObjective(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => deleteObjective(index)}
                        className="text-red-600 hover:text-red-800 px-3 py-2"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <span className="text-[#475569]">{obj}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          )}

          {/* Risks */}
          {(isEditMode ? editedProgram?.risks : auditProgram?.risks) && (
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-[#1e3a8a]">
                Risk Assessment {isEditMode && <span className="text-sm text-blue-600">(Editing)</span>}
              </h2>
              {isEditMode && (
                <button
                  onClick={addRisk}
                  className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
                >
                  + Add Risk
                </button>
              )}
            </div>
            <div className="space-y-4">
              {(isEditMode ? editedProgram.risks : auditProgram.risks).map((risk, index) => (
                <div key={index} className="border-l-4 border-[#0d9488] pl-4 py-2">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {risk.id && (
                      <span className="font-mono text-sm bg-[#f8fafc] px-2 py-1 rounded border border-[#e2e8f0]">
                        {risk.id}
                      </span>
                    )}
                    {isEditMode ? (
                      <select
                        value={risk.category}
                        onChange={(e) => updateRisk(index, 'category', e.target.value)}
                        className="px-2 py-1 border border-blue-300 rounded text-sm"
                      >
                        <option>Financial</option>
                        <option>Operational</option>
                        <option>Compliance</option>
                        <option>IT</option>
                        <option>Strategic</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-[#1e3a8a]">{risk.category}</span>
                    )}
                    {isEditMode ? (
                      <select
                        value={risk.rating}
                        onChange={(e) => updateRisk(index, 'rating', e.target.value)}
                        className="px-2 py-1 border border-blue-300 rounded text-sm"
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        risk.rating === 'High' ? 'bg-red-100 text-red-700' :
                        risk.rating === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {risk.rating}
                      </span>
                    )}
                    {isEditMode ? (
                      <select
                        value={risk.assertion || ''}
                        onChange={(e) => updateRisk(index, 'assertion', e.target.value)}
                        className="px-2 py-1 border border-blue-300 rounded text-sm"
                      >
                        <option value="">Select...</option>
                        <option>Completeness</option>
                        <option>Existence</option>
                        <option>Accuracy</option>
                        <option>Valuation</option>
                        <option>Rights</option>
                        <option>Presentation</option>
                      </select>
                    ) : (
                      risk.assertion && (
                        <span className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {risk.assertion}
                        </span>
                      )
                    )}
                    {isEditMode && (
                      <button
                        onClick={() => deleteRisk(index)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Risk"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {/* Orphan warning */}
                  {(!risk.relatedControls || risk.relatedControls.length === 0) && (
                    <div className="bg-red-50 border border-red-200 rounded px-3 py-2 mb-2">
                      <span className="text-red-700 text-sm">⚠️ Warning: No controls mitigate this risk</span>
                    </div>
                  )}

                  {isEditMode ? (
                    <>
                      <textarea
                        value={risk.description}
                        onChange={(e) => updateRisk(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        rows="2"
                      />
                      {/* Link to controls */}
                      <div className="mb-2 bg-blue-50 p-3 rounded border border-blue-200">
                        <label className="text-sm font-semibold text-[#1e3a8a] block mb-2">🔗 Link to Controls:</label>
                        {editedProgram.controls && editedProgram.controls.length > 0 ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {editedProgram.controls.map(ctrl => (
                              <label key={ctrl.id} className="flex items-start gap-2 cursor-pointer hover:bg-blue-100 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={(risk.relatedControls || []).includes(ctrl.id)}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    // Single atomic update for both risks and controls
                                    setEditedProgram(prev => ({
                                      ...prev,
                                      risks: prev.risks.map((r, i) => i === index
                                        ? { ...r, relatedControls: isChecked
                                            ? [...(r.relatedControls || []).filter(id => id !== ctrl.id), ctrl.id]
                                            : (r.relatedControls || []).filter(id => id !== ctrl.id) }
                                        : r
                                      ),
                                      controls: prev.controls.map(c => c.id === ctrl.id
                                        ? { ...c, mitigatesRisks: isChecked
                                            ? [...(c.mitigatesRisks || []).filter(id => id !== risk.id), risk.id]
                                            : (c.mitigatesRisks || []).filter(id => id !== risk.id) }
                                        : c
                                      )
                                    }));
                                  }}
                                  className="mt-0.5"
                                />
                                <span className="text-sm">
                                  <span className="font-mono text-xs">{ctrl.id}</span> - {ctrl.description.substring(0, 60)}...
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No controls available - add controls first</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[#475569] mb-2">{risk.description}</p>
                  )}
                  {risk.frameworkReference && (
                    <div className="text-xs text-purple-600 mb-2 italic">
                      📚 {risk.frameworkReference}
                    </div>
                  )}
                  {risk.relatedControls && risk.relatedControls.length > 0 && (
                    <div className="text-sm text-[#64748b] mt-2">
                      <span className="font-medium">Mitigated by controls: </span>
                      {risk.relatedControls.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Controls */}
          {(isEditMode ? editedProgram?.controls : auditProgram?.controls) && (
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-[#1e3a8a]">
                Control Activities {isEditMode && <span className="text-sm text-blue-600">(Editing)</span>}
              </h2>
              {isEditMode && (
                <button
                  onClick={addControl}
                  className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
                >
                  + Add Control
                </button>
              )}
            </div>
            <div className="grid gap-4">
              {(isEditMode ? editedProgram.controls : auditProgram.controls).map((control, index) => (
                <div key={index} className="border border-[#e2e8f0] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-mono text-sm bg-[#f8fafc] px-2 py-1 rounded border border-[#e2e8f0]">{control.id}</span>
                    {isEditMode ? (
                      <select
                        value={control.type}
                        onChange={(e) => updateControl(index, 'type', e.target.value)}
                        className="px-2 py-1 border border-blue-300 rounded text-sm"
                      >
                        <option>Preventive</option>
                        <option>Detective</option>
                        <option>Corrective</option>
                      </select>
                    ) : (
                      <span className="text-sm text-[#0d9488] font-medium">{control.type}</span>
                    )}
                    {isEditMode ? (
                      <select
                        value={control.frequency || ''}
                        onChange={(e) => updateControl(index, 'frequency', e.target.value)}
                        className="px-2 py-1 border border-blue-300 rounded text-sm"
                      >
                        <option value="">Select...</option>
                        <option>Continuous</option>
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                        <option>Quarterly</option>
                        <option>Annual</option>
                      </select>
                    ) : (
                      control.frequency && (
                        <span className="text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded">
                          {control.frequency}
                        </span>
                      )
                    )}
                    {isEditMode ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={control.owner || ''}
                          onChange={(e) => updateControl(index, 'owner', e.target.value)}
                          className="px-2 py-1 border border-blue-300 rounded text-sm w-28"
                          placeholder="Owner name"
                        />
                        <input
                          type="text"
                          value={control.ownerRole || ''}
                          onChange={(e) => updateControl(index, 'ownerRole', e.target.value)}
                          className="px-2 py-1 border border-blue-300 rounded text-sm w-24"
                          placeholder="Role"
                        />
                        <input
                          type="text"
                          value={control.ownerDepartment || ''}
                          onChange={(e) => updateControl(index, 'ownerDepartment', e.target.value)}
                          className="px-2 py-1 border border-blue-300 rounded text-sm w-24"
                          placeholder="Dept"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-[#64748b]">
                        Owner: {control.owner}
                        {control.ownerRole ? ` · ${control.ownerRole}` : ''}
                        {control.ownerDepartment ? ` · ${control.ownerDepartment}` : ''}
                      </span>
                    )}
                    {isEditMode && (
                      <button
                        onClick={() => deleteControl(index)}
                        className="text-red-600 hover:text-red-800 ml-auto"
                        title="Delete Control"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {/* Orphan warning - no risks */}
                  {(!control.mitigatesRisks || control.mitigatesRisks.length === 0) && (
                    <div className="bg-red-50 border border-red-200 rounded px-3 py-2 mb-2">
                      <span className="text-red-700 text-sm">⚠️ Warning: This control doesn't mitigate any risks</span>
                    </div>
                  )}
                  {/* Orphan warning - no procedures */}
                  {!(isEditMode ? editedProgram : auditProgram)?.auditProcedures?.some(p => p.controlId === control.id) && (
                    <div className="bg-orange-50 border border-orange-200 rounded px-3 py-2 mb-2">
                      <span className="text-orange-700 text-sm">⚠️ Warning: No audit procedures test this control</span>
                    </div>
                  )}

                  {isEditMode ? (
                    <>
                      <textarea
                        value={control.description}
                        onChange={(e) => updateControl(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        rows="2"
                      />
                      {/* Link to risks */}
                      <div className="mb-2 bg-blue-50 p-3 rounded border border-blue-200">
                        <label className="text-sm font-semibold text-[#1e3a8a] block mb-2">🔗 Link to Risks:</label>
                        {editedProgram.risks && editedProgram.risks.length > 0 ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {editedProgram.risks.map(r => (
                              <label key={r.id} className="flex items-start gap-2 cursor-pointer hover:bg-blue-100 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={(control.mitigatesRisks || []).includes(r.id)}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    // Single atomic update for both controls and risks
                                    setEditedProgram(prev => ({
                                      ...prev,
                                      controls: prev.controls.map((c, i) => i === index
                                        ? { ...c, mitigatesRisks: isChecked
                                            ? [...(c.mitigatesRisks || []).filter(id => id !== r.id), r.id]
                                            : (c.mitigatesRisks || []).filter(id => id !== r.id) }
                                        : c
                                      ),
                                      risks: prev.risks.map(risk => risk.id === r.id
                                        ? { ...risk, relatedControls: isChecked
                                            ? [...(risk.relatedControls || []).filter(id => id !== control.id), control.id]
                                            : (risk.relatedControls || []).filter(id => id !== control.id) }
                                        : risk
                                      )
                                    }));
                                  }}
                                  className="mt-0.5"
                                />
                                <span className="text-sm">
                                  <span className="font-mono text-xs">{r.id}</span> - {r.description.substring(0, 60)}...
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No risks available - add risks first</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[#475569] mb-2">{control.description}</p>
                  )}
                  {control.frameworkReference && (
                    <div className="text-xs text-purple-600 mb-2 italic">
                      📚 {control.frameworkReference}
                    </div>
                  )}
                  {control.mitigatesRisks && control.mitigatesRisks.length > 0 && (
                    <div className="text-sm text-[#64748b] mt-2">
                      <span className="font-medium">Mitigates risks: </span>
                      {control.mitigatesRisks.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Audit Procedures */}
          {(isEditMode ? editedProgram?.auditProcedures : auditProgram?.auditProcedures) && (
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-[#1e3a8a]">
                Audit Procedures {isEditMode && <span className="text-sm text-blue-600">(Editing)</span>}
              </h2>
              {isEditMode && (
                <button
                  onClick={addProcedure}
                  className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
                >
                  + Add Procedure
                </button>
              )}
            </div>
            <div className="space-y-6">
              {(isEditMode ? editedProgram.auditProcedures : auditProgram.auditProcedures).map((proc, index) => (
                <div key={index} className="border border-[#e2e8f0] rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-sm bg-[#1e3a8a] text-white px-3 py-1 rounded">
                      Procedure {index + 1}
                    </span>
                    {isEditMode ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#64748b]">Control:</span>
                        <select
                          value={proc.controlId}
                          onChange={(e) => updateProcedure(index, 'controlId', e.target.value)}
                          className="px-2 py-1 border border-blue-300 rounded text-sm"
                        >
                          {editedProgram.controls?.map(ctrl => (
                            <option key={ctrl.id} value={ctrl.id}>
                              {ctrl.id} - {ctrl.description.substring(0, 30)}...
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-sm text-[#64748b]">Control: {proc.controlId}</span>
                    )}
                    {proc.testingMethod === 'Data Analytics' && (
                      <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
                        📊 Analytics
                      </span>
                    )}
                    {isEditMode && (
                      <button
                        onClick={() => deleteProcedure(index)}
                        className="text-red-600 hover:text-red-800 ml-auto"
                        title="Delete Procedure"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  {isEditMode ? (
                    <textarea
                      value={proc.procedure}
                      onChange={(e) => updateProcedure(index, 'procedure', e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      rows="3"
                    />
                  ) : (
                    <p className="text-[#475569] mb-2 font-medium">{proc.procedure}</p>
                  )}
                  {proc.frameworkReference && (
                    <div className="text-xs text-purple-600 mb-4 italic">
                      📚 {proc.frameworkReference}
                    </div>
                  )}

                  {/* Analytics Test Details */}
                  {proc.analyticsTest && proc.analyticsTest.type && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-orange-900 mb-2">📊 Analytics Test Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-orange-700 font-medium">Type: </span>
                          <span className="text-[#475569]">{proc.analyticsTest.type}</span>
                        </div>
                        <div>
                          <span className="text-orange-700 font-medium">Description: </span>
                          <span className="text-[#475569]">{proc.analyticsTest.description}</span>
                        </div>
                        <div>
                          <span className="text-orange-700 font-medium">Population: </span>
                          <span className="text-[#475569]">{proc.analyticsTest.population}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-[#64748b]">Testing Method:</span>
                      {isEditMode ? (
                        <select
                          value={proc.testingMethod}
                          onChange={(e) => updateProcedure(index, 'testingMethod', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm mt-1"
                        >
                          <option>Inquiry</option>
                          <option>Observation</option>
                          <option>Inspection</option>
                          <option>Reperformance</option>
                          <option>Data Analytics</option>
                        </select>
                      ) : (
                        <p className="text-[#1e3a8a] font-medium">{proc.testingMethod}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-[#64748b]">Sample Size:</span>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={proc.sampleSize}
                          onChange={(e) => updateProcedure(index, 'sampleSize', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm mt-1"
                        />
                      ) : (
                        <p className="text-[#1e3a8a] font-medium">{proc.sampleSize}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-[#64748b]">Expected Evidence:</span>
                      {isEditMode ? (
                        <textarea
                          value={proc.expectedEvidence}
                          onChange={(e) => updateProcedure(index, 'expectedEvidence', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm mt-1"
                          rows="2"
                        />
                      ) : (
                        <p className="text-[#475569]">{proc.expectedEvidence}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
          {/* Analytics Tests */}
          {analyticsTests.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#1e3a8a]">
                    📊 Data Analytics {isEditMode && <span className="text-sm text-blue-600">(Editing)</span>}
                  </h2>
                  <p className="text-sm text-[#64748b] mt-1">
                    {analyticsTests.filter(t => t.included).length} population-based tests recommended for this process
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {analyticsTests.map((test, index) => (
                  <div key={test.id} className={`border rounded-lg p-4 ${!test.included ? 'opacity-50 bg-gray-50' : 'border-[#e2e8f0]'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">{test.id}</span>
                        <span className="font-semibold text-[#1e3a8a]">{test.name}</span>
                        {test.riskId ? (
                          <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">→ {test.riskId}</span>
                        ) : (
                          <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">⚠ Unassigned</span>
                        )}
                      </div>
                      {isEditMode && (
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={test.riskId || ''}
                            onChange={(e) => updateAnalyticsRisk(index, e.target.value || null)}
                            className="px-2 py-1 border border-blue-300 rounded text-sm"
                          >
                            <option value="">Unassigned</option>
                            {(editedProgram?.risks || auditProgram?.risks || []).map(r => (
                              <option key={r.id} value={r.id}>{r.id} — {r.description.substring(0, 30)}...</option>
                            ))}
                          </select>
                          <button
                            onClick={() => toggleAnalyticsTest(index)}
                            className={`px-3 py-1 rounded text-sm font-medium ${test.included ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                          >
                            {test.included ? 'Remove' : 'Include'}
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-[#475569] mb-3">{test.purpose}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-xs font-medium text-[#64748b] block mb-1">Data Needed</span>
                        <span className="text-[#475569]">{test.dataneeded}</span>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-[#64748b] block mb-1">Steps</span>
                        <ol className="space-y-1">
                          {test.steps.map((step, i) => (
                            <li key={i} className="text-[#475569] flex gap-1">
                              <span className="text-[#0d9488] font-medium shrink-0">{i + 1}.</span>
                              <span className="font-mono text-xs bg-gray-50 px-1 rounded">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 rounded px-3 py-2 text-sm">
                      <span className="font-medium text-orange-800">Red flags: </span>
                      <span className="text-orange-700">{test.redflags}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#1e3a8a] mb-3">
            Verif<span className="text-[#0d9488]">ai</span>
          </h1>
          <p className="text-xl text-[#475569]">
            AI-Powered Audit Program Generator
          </p>
          <p className="text-sm text-[#64748b] mt-2">
            Generate comprehensive audit programs in minutes, not hours
          </p>
        </div>

        {/* Framework & Methodology Info */}
        <div className="bg-gradient-to-r from-[#0d9488] to-[#0f766e] rounded-lg shadow-sm p-6 mb-8 text-white">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>🎯</span> Built on Professional Standards
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="font-semibold mb-1">Audit Methodology</p>
              <p className="text-white/90">IIA IPPF (International Professional Practices Framework)</p>
              <p className="text-white/70 text-xs mt-2">Defines how to plan, execute, and report on internal audits</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="font-semibold mb-1">Control Frameworks</p>
              <p className="text-white/90">COSO 2013 for financial/operational processes</p>
              <p className="text-white/90">COBIT 2019 for IT/cybersecurity processes</p>
              <p className="text-white/70 text-xs mt-2">Guides risk identification and control design</p>
            </div>
          </div>
          <p className="text-white/80 text-xs mt-4 text-center">
            All audit programs include risk-control linkage, financial statement assertions, and data analytics procedures
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Selection Card */}
        <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-8">
          <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-6">
            Configure Your Audit Program
          </h2>

          {/* Industry Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#475569] mb-2">
              Select Industry
            </label>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white text-[#475569]"
            >
              <option value="">Choose an industry...</option>
              {industries.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </div>

          {/* Process Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#475569] mb-2">
              Select Process
            </label>
            <select
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white text-[#475569]"
            >
              <option value="">Choose a process...</option>
              {processes.map((process) => (
                <option key={process.id} value={process.id}>
                  {process.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assessment Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#475569] mb-2">
              Assessment Type
            </label>
            <select
              value={assessmentType}
              onChange={(e) => setAssessmentType(e.target.value)}
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white text-[#475569]"
            >
              <option value="program-only">Process Audit Program Only (Most Common)</option>
              <option value="governance-only">Risk Management & Governance Assessment Only</option>
              <option value="comprehensive">Comprehensive Assessment (Both)</option>
            </select>
            <p className="text-xs text-[#64748b] mt-2">
              {assessmentType === 'program-only' && '✓ Generates audit program for the selected process (assumes governance already assessed)'}
              {assessmentType === 'governance-only' && '✓ Entity-level assessment of risk management and governance structures'}
              {assessmentType === 'comprehensive' && '✓ Includes both governance assessment and process audit program (for initial engagements)'}
            </p>
          </div>


          {/* Engagement Details */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#475569] mb-3 uppercase tracking-wide">Engagement Details <span className="text-[#94a3b8] font-normal normal-case">(optional — carries across all programs this session)</span></h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Client / Company Name</label>
                <input type="text" value={auditeeDetails.clientName} onChange={(e) => updateAuditeeDetail('clientName', e.target.value)} placeholder="e.g. Acme Corporation" className="w-full px-3 py-2 border border-[#e2e8f0] rounded focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Department Under Audit</label>
                <input type="text" value={auditeeDetails.department} onChange={(e) => updateAuditeeDetail('department', e.target.value)} placeholder="e.g. Finance & Accounting" className="w-full px-3 py-2 border border-[#e2e8f0] rounded focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Audit Period From</label>
                <input type="date" value={auditeeDetails.periodFrom} onChange={(e) => updateAuditeeDetail('periodFrom', e.target.value)} className="w-full px-3 py-2 border border-[#e2e8f0] rounded focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Audit Period To</label>
                <input type="date" value={auditeeDetails.periodTo} onChange={(e) => updateAuditeeDetail('periodTo', e.target.value)} className="w-full px-3 py-2 border border-[#e2e8f0] rounded focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Engagement Reference</label>
                <input type="text" value={auditeeDetails.engagementRef} onChange={(e) => updateAuditeeDetail('engagementRef', e.target.value)} placeholder="e.g. IA-2026-001" className="w-full px-3 py-2 border border-[#e2e8f0] rounded focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Auditor Name</label>
                <input type="text" value={auditeeDetails.auditorName} onChange={(e) => updateAuditeeDetail('auditorName', e.target.value)} placeholder="Lead auditor" className="w-full px-3 py-2 border border-[#e2e8f0] rounded focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Primary Contact Name</label>
                <input type="text" value={auditeeDetails.primaryContactName} onChange={(e) => updateAuditeeDetail('primaryContactName', e.target.value)} placeholder="Client-side point of contact" className="w-full px-3 py-2 border border-[#e2e8f0] rounded focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1">Primary Contact Title</label>
                <input type="text" value={auditeeDetails.primaryContactTitle} onChange={(e) => updateAuditeeDetail('primaryContactTitle', e.target.value)} placeholder="e.g. Finance Manager" className="w-full px-3 py-2 border border-[#e2e8f0] rounded focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-sm" />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
              canGenerate && !isGenerating
                ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white cursor-pointer'
                : 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Audit Program...
              </span>
            ) : 'Generate Audit Program'}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-[#64748b]">
          <p>Powered by AI • Built for Internal Auditors</p>
        </div>
      </div>
    </div>
  );
}
