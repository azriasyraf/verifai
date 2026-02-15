/**
 * Malaysian regulations library — injected when jurisdiction = 'Malaysia'.
 * Process-specific. Only HR is fully populated; others are stubs for future expansion.
 * Sources: Employment Act 1955 (Act 265), EPF Act 1991 (Act 452), SOCSO Act 1969 (Act 4),
 *          PDPA 2010 (Act 709), Income Tax Act 1967 (Act 53), Companies Act 2016 (Act 777),
 *          MACC Act 2009 (Act 694), Minimum Wages Order (latest gazetted version).
 * DISCLAIMER: Verify applicability before use in a formal engagement.
 */

export const malaysia = [
  // ════════════════════════════════════════════════════════════════════════════
  // HR / PAYROLL
  // ════════════════════════════════════════════════════════════════════════════
  {
    regulation: 'Employment Act 1955 (Act 265)',
    area: 'Employment Terms & Conditions',
    clauses: [
      { clause: 'Section 7A', description: 'Minimum employment terms — employer cannot contract out of Act provisions' },
      { clause: 'Section 12', description: 'Termination — notice period requirements (4 weeks for ≥5 years service)' },
      { clause: 'Section 14', description: 'Dismissal for misconduct — inquiry required before dismissal' },
      { clause: 'Section 18', description: 'Prohibition on restriction of joining another employer after termination' },
      { clause: 'Section 22', description: 'Contract of service must be in writing for employment ≥1 month' },
      { clause: 'Section 25', description: 'Wages must be paid in legal tender; no unauthorised deductions' },
      { clause: 'Section 25A', description: 'Wages must be paid through bank payment into employee\'s account' },
      { clause: 'Section 60A', description: 'Hours of work — not more than 45 hours per week' },
      { clause: 'Section 60C', description: 'Shift work — rest day entitlement' },
      { clause: 'Section 60D', description: 'Public holidays — entitlement to 11 gazetted public holidays per year' },
      { clause: 'Section 60E', description: 'Annual leave entitlement — 8 days (< 2 years), 12 days (2–5 years), 16 days (> 5 years)' },
      { clause: 'Section 60F', description: 'Sick leave — 14 days (< 2 years), 18 days (2–5 years), 22 days (> 5 years)' },
      { clause: 'Section 60I', description: 'Maternity leave — 98 consecutive days' },
      { clause: 'Section 69', description: 'Director General may inquire into complaints of contract breach' },
    ],
    applicableProcesses: ['Human Resources', 'HR', 'Payroll', 'Human Resources & Payroll'],
  },
  {
    regulation: 'Minimum Wages Order (Gazetted)',
    area: 'Minimum Wage Compliance',
    clauses: [
      { clause: 'Order 3', description: 'Minimum wage rate — RM1,700/month (peninsular Malaysia); verify current gazette for latest rate' },
      { clause: 'Order 4', description: 'Applicability — all employees regardless of citizenship or employment type' },
      { clause: 'Order 7', description: 'Employer must display minimum wage notice at workplace' },
    ],
    applicableProcesses: ['Human Resources', 'HR', 'Payroll', 'Human Resources & Payroll'],
  },
  {
    regulation: 'Employees Provident Fund Act 1991 (Act 452)',
    area: 'EPF Contributions',
    clauses: [
      { clause: 'Section 43', description: 'Employer must register with EPF and deduct employee contribution from wages' },
      { clause: 'Section 44', description: 'Contribution rates — employer 13% (wages ≤ RM5,000) or 12%; employee 11% (or 9% at employee option)' },
      { clause: 'Section 45', description: 'Contributions must be paid by 15th of following month; late payment attracts dividend and penalty' },
      { clause: 'Section 48', description: 'Employer must maintain accurate payroll records for inspection' },
      { clause: 'Section 59', description: 'Failure to contribute — criminal offence; fine up to RM10,000 per offence' },
    ],
    applicableProcesses: ['Human Resources', 'HR', 'Payroll', 'Human Resources & Payroll'],
  },
  {
    regulation: 'Employees Social Security Act 1969 (Act 4)',
    area: 'SOCSO Contributions',
    clauses: [
      { clause: 'Section 7', description: 'Compulsory registration — all employees earning ≤ RM4,000/month must be insured' },
      { clause: 'Section 14', description: 'Contribution rates — based on contribution table published by SOCSO' },
      { clause: 'Section 19', description: 'Contributions due monthly; employer liable for both employer and employee portions' },
      { clause: 'Section 38', description: 'Employer must maintain register of employees and contributions' },
      { clause: 'Section 94', description: 'Late contribution — 6% per annum on outstanding amount' },
    ],
    applicableProcesses: ['Human Resources', 'HR', 'Payroll', 'Human Resources & Payroll'],
  },
  {
    regulation: 'Income Tax Act 1967 (Act 53)',
    area: 'Payroll Tax (PCB/MTD)',
    clauses: [
      { clause: 'Section 83', description: 'Employer must deduct Monthly Tax Deduction (PCB/MTD) from employee wages' },
      { clause: 'Section 83(3)', description: 'Employer liable if insufficient PCB deducted; employee\'s tax liability does not absolve employer' },
      { clause: 'Section 107', description: 'PCB must be remitted to LHDN by 15th of following month' },
      { clause: 'Section 107C', description: 'Year-end reconciliation (CP8D) must be submitted by last day of February' },
    ],
    applicableProcesses: ['Human Resources', 'HR', 'Payroll', 'Human Resources & Payroll'],
  },
  {
    regulation: 'Personal Data Protection Act 2010 (Act 709)',
    area: 'Employee Personal Data',
    clauses: [
      { clause: 'Section 5', description: 'General principle — personal data must be processed lawfully; purpose must be disclosed' },
      { clause: 'Section 6', description: 'Notice and choice — employee must be informed of data processing purpose' },
      { clause: 'Section 8', description: 'Security principle — employer must protect personal data from loss, misuse and unauthorised access' },
      { clause: 'Section 9', description: 'Retention principle — data not retained longer than necessary for purpose' },
      { clause: 'Section 10', description: 'Data integrity principle — employer ensures personal data is accurate, complete and not misleading' },
      { clause: 'Section 11', description: 'Access principle — data subject has right to access and correct personal data' },
    ],
    applicableProcesses: ['Human Resources', 'HR', 'Payroll', 'Human Resources & Payroll', 'all'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PROCUREMENT / VENDOR MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════
  {
    regulation: 'Malaysian Anti-Corruption Commission Act 2009 (Act 694)',
    area: 'Anti-Bribery in Procurement',
    clauses: [
      { clause: 'Section 17', description: 'Corrupt practice by agent — giving or receiving gratification in business transactions is an offence' },
      { clause: 'Section 23', description: 'Corrupt practice — abuse of position; gratification from bidders/suppliers is an offence' },
      { clause: 'Section 17A', description: 'Corporate liability — commercial organisation liable if associated person bribes to obtain business advantage; adequate procedures is a defence' },
    ],
    applicableProcesses: ['Procurement', 'Vendor Management', 'Purchasing', 'Procurement to Payment'],
  },
  {
    regulation: 'Companies Act 2016 (Act 777)',
    area: 'Financial Controls & Governance',
    clauses: [
      { clause: 'Section 213', description: 'Duty of directors to act in best interest of company; procurement decisions must be at arm\'s length' },
      { clause: 'Section 245', description: 'Financial statements must give a true and fair view; directors responsible for internal controls over expenditure' },
      { clause: 'Section 247', description: 'Directors must maintain proper accounting records for all transactions including purchases' },
      { clause: 'Section 248', description: 'Accounting records must be kept for 7 years; procurement documents (invoices, POs, GRNs) fall under this requirement' },
    ],
    applicableProcesses: ['Finance', 'Revenue', 'Procurement', 'Procurement to Payment', 'all'],
  },
  {
    regulation: 'Customs Act 1967 (Act 235)',
    area: 'Import Controls (Procurement)',
    clauses: [
      { clause: 'Section 78', description: 'Importer must maintain accurate records of all imported goods including cost, quantity, and supplier details' },
      { clause: 'Section 135', description: 'Goods imported must be declared accurately; false declaration is an offence' },
    ],
    applicableProcesses: ['Procurement', 'Procurement to Payment', 'Inventory'],
  },
  {
    regulation: 'Sales and Service Tax Act 2018 (Act 806)',
    area: 'SST Compliance in Procurement',
    clauses: [
      { clause: 'Section 35', description: 'Registered person must issue tax invoice for taxable supply; buyer must maintain tax invoices for input tax claims' },
      { clause: 'Section 56', description: 'Records of purchases, SST paid, and supply must be retained for 7 years' },
    ],
    applicableProcesses: ['Procurement', 'Procurement to Payment', 'Revenue', 'Revenue to Cash'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // REVENUE / CASH MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════
  {
    regulation: 'Income Tax Act 1967 (Act 53)',
    area: 'Revenue Recognition & Corporate Tax',
    clauses: [
      { clause: 'Section 22', description: 'Basis period for assessment — revenue recognised on accrual basis for companies' },
      { clause: 'Section 33', description: 'Deductible expenses must be wholly and exclusively incurred in producing income' },
      { clause: 'Section 107C', description: 'Instalment payment of estimated tax (CP204) — company must submit estimate and pay by due dates' },
      { clause: 'Section 140', description: 'Director General may disregard or vary transactions not at arm\'s length (transfer pricing)' },
      { clause: 'Section 140A', description: 'Transfer pricing — transactions between related parties must be at arm\'s length; contemporaneous documentation required' },
    ],
    applicableProcesses: ['Revenue', 'Revenue to Cash', 'Finance'],
  },
  {
    regulation: 'Sales and Service Tax Act 2018 (Act 806)',
    area: 'SST on Revenue',
    clauses: [
      { clause: 'Section 11', description: 'SST registered person must charge and collect service tax on taxable services' },
      { clause: 'Section 26', description: 'Return must be filed and tax remitted bimonthly; late submission attracts penalty' },
      { clause: 'Section 35', description: 'Tax invoice must be issued for every taxable supply; must show SST registration number, amount, and rate' },
      { clause: 'Section 56', description: 'Business records relating to SST must be retained for 7 years and be available for inspection' },
    ],
    applicableProcesses: ['Revenue', 'Revenue to Cash', 'Finance'],
  },
  {
    regulation: 'Financial Services Act 2013 (Act 758)',
    area: 'Banking & Cash Receipts',
    clauses: [
      { clause: 'Section 16', description: 'Financial institution must comply with AML/CFT requirements; entities receiving large cash payments must be aware of reporting obligations' },
      { clause: 'Section 47', description: 'Customer due diligence requirements for financial transactions' },
    ],
    applicableProcesses: ['Revenue', 'Revenue to Cash', 'Finance'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INVENTORY
  // ════════════════════════════════════════════════════════════════════════════
  {
    regulation: 'Companies Act 2016 (Act 777)',
    area: 'Inventory Records & Valuation',
    clauses: [
      { clause: 'Section 247', description: 'Directors must maintain proper accounting records including stock records' },
      { clause: 'Section 248', description: 'Inventory records must be retained for 7 years' },
      { clause: 'Section 245', description: 'Inventory must be accurately valued in financial statements (lower of cost or NRV under MFRS 102)' },
    ],
    applicableProcesses: ['Inventory', 'Warehouse', 'Supply Chain'],
  },
  {
    regulation: 'Customs Act 1967 (Act 235)',
    area: 'Import & Bonded Warehouse Controls',
    clauses: [
      { clause: 'Section 65', description: 'Licensed warehouse — goods in bonded warehouse must be under customs supervision; records of receipt and release required' },
      { clause: 'Section 78', description: 'Importers must maintain accurate inventory records of all imported goods including customs value' },
      { clause: 'Section 135', description: 'Goods must be declared accurately on entry; discrepancies in inventory vs customs records is an offence' },
    ],
    applicableProcesses: ['Inventory', 'Warehouse', 'Supply Chain', 'Procurement to Payment'],
  },
  {
    regulation: 'Occupational Safety and Health Act 1994 (Act 514)',
    area: 'Warehouse & Storage Safety',
    clauses: [
      { clause: 'Section 15', description: 'Employer must ensure safe workplace including safe storage systems, racking, and handling equipment' },
      { clause: 'Section 16', description: 'Employer must prepare and review safety policy; relevant for warehouse operations' },
      { clause: 'Section 32', description: 'Accidents, dangerous occurrences, and occupational diseases must be notified and reported' },
    ],
    applicableProcesses: ['Inventory', 'Warehouse', 'Manufacturing'],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // IT / DATA MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════
  {
    regulation: 'Personal Data Protection Act 2010 (Act 709)',
    area: 'Data Governance & IT Security',
    clauses: [
      { clause: 'Section 5', description: 'General principle — personal data processed only for disclosed, lawful purposes; consent required' },
      { clause: 'Section 8', description: 'Security principle — implement technical and organisational measures against unauthorised access, loss, misuse, and disclosure' },
      { clause: 'Section 9', description: 'Retention principle — data deleted or destroyed when no longer required for original purpose' },
      { clause: 'Section 10', description: 'Data integrity principle — reasonable steps to ensure data is accurate, complete, and up-to-date' },
      { clause: 'Section 11', description: 'Access principle — data subject may request access and correction; response required within 21 days' },
      { clause: 'Section 129', description: 'Security principle offence — fine up to RM500,000 or imprisonment up to 3 years' },
    ],
    applicableProcesses: ['IT', 'Information Technology', 'Data Management', 'IT/Cybersecurity'],
  },
  {
    regulation: 'Computer Crimes Act 1997 (Act 563)',
    area: 'Cybersecurity & Unauthorised Access',
    clauses: [
      { clause: 'Section 3', description: 'Unauthorised access to computer — offence; organisation must implement access controls to avoid liability' },
      { clause: 'Section 5', description: 'Unauthorised modification of computer contents — offence; change management controls prevent inadvertent violations' },
      { clause: 'Section 6', description: 'Wrongful communication of access codes — privileged access management controls required' },
    ],
    applicableProcesses: ['IT', 'Information Technology', 'IT/Cybersecurity'],
  },
  {
    regulation: 'Communications and Multimedia Act 1998 (Act 588)',
    area: 'Network & Communications Security',
    clauses: [
      { clause: 'Section 233', description: 'Improper use of network facilities — organisation responsible for ensuring its network is not used for improper purposes' },
      { clause: 'Section 234', description: 'Fraud — fraudulent use of network services; IT access and billing controls must prevent misuse' },
    ],
    applicableProcesses: ['IT', 'Information Technology', 'IT/Cybersecurity'],
  },
  {
    regulation: 'Bank Negara Malaysia — Risk Management in Technology (RMiT)',
    area: 'IT Risk Management (Financial Sector)',
    clauses: [
      { clause: 'Para 10.1', description: 'Board and senior management accountable for technology risk management framework' },
      { clause: 'Para 10.51', description: 'Change management — all changes to production systems must be tested, authorised and documented' },
      { clause: 'Para 10.65', description: 'Access management — privileged access must be strictly controlled, monitored and reviewed periodically' },
      { clause: 'Para 10.102', description: 'Cyber risk — entity must establish cyber resilience programme including threat detection and incident response' },
    ],
    applicableProcesses: ['IT', 'Information Technology', 'IT/Cybersecurity'],
  },
];
