// Analytics test library — curated per process
export const analyticsLibrary = {
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
