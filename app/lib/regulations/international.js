/**
 * International standards library — always injected regardless of jurisdiction.
 * Sources: COSO 2013 Internal Control — Integrated Framework; IIA International Professional Practices Framework (IPPF).
 * Clause-level references only. Do not invent clauses — curated entries only.
 */

export const international = [
  // ─── COSO 2013 — Control Environment ───────────────────────────────────────
  {
    regulation: 'COSO 2013 ICIF',
    area: 'Control Environment',
    clauses: [
      { clause: 'Principle 1', description: 'Demonstrates commitment to integrity and ethical values' },
      { clause: 'Principle 2', description: 'Board exercises oversight responsibility' },
      { clause: 'Principle 3', description: 'Management establishes structure, authority and responsibility' },
      { clause: 'Principle 4', description: 'Demonstrates commitment to competence' },
      { clause: 'Principle 5', description: 'Enforces accountability' },
    ],
    applicableProcesses: ['all'],
  },
  // ─── COSO 2013 — Risk Assessment ───────────────────────────────────────────
  {
    regulation: 'COSO 2013 ICIF',
    area: 'Risk Assessment',
    clauses: [
      { clause: 'Principle 6', description: 'Specifies suitable objectives to identify and assess risk' },
      { clause: 'Principle 7', description: 'Identifies and analyses risks to achievement of objectives' },
      { clause: 'Principle 8', description: 'Assesses fraud risk' },
      { clause: 'Principle 9', description: 'Identifies and analyses significant changes' },
    ],
    applicableProcesses: ['all'],
  },
  // ─── COSO 2013 — Control Activities ────────────────────────────────────────
  {
    regulation: 'COSO 2013 ICIF',
    area: 'Control Activities',
    clauses: [
      { clause: 'Principle 10', description: 'Selects and develops control activities that mitigate risks' },
      { clause: 'Principle 11', description: 'Selects and develops general controls over technology' },
      { clause: 'Principle 12', description: 'Deploys control activities through policies and procedures' },
    ],
    applicableProcesses: ['all'],
  },
  // ─── COSO 2013 — Information & Communication ────────────────────────────────
  {
    regulation: 'COSO 2013 ICIF',
    area: 'Information & Communication',
    clauses: [
      { clause: 'Principle 13', description: 'Uses relevant, quality information to support internal control' },
      { clause: 'Principle 14', description: 'Communicates internally to support functioning of internal control' },
      { clause: 'Principle 15', description: 'Communicates with external parties regarding matters affecting internal control' },
    ],
    applicableProcesses: ['all'],
  },
  // ─── COSO 2013 — Monitoring ─────────────────────────────────────────────────
  {
    regulation: 'COSO 2013 ICIF',
    area: 'Monitoring Activities',
    clauses: [
      { clause: 'Principle 16', description: 'Selects, develops and performs ongoing and/or separate evaluations' },
      { clause: 'Principle 17', description: 'Evaluates and communicates deficiencies in a timely manner' },
    ],
    applicableProcesses: ['all'],
  },
  // ─── IIA IPPF — Performance Standards (2000-series) ─────────────────────────
  {
    regulation: 'IIA IPPF',
    area: 'Managing the Internal Audit Activity',
    clauses: [
      { clause: 'Standard 2010', description: 'Planning — CAE must establish a risk-based plan to prioritise internal audit activity' },
      { clause: 'Standard 2020', description: 'Communication and Approval — CAE communicates plans and resource requirements to senior management and board' },
      { clause: 'Standard 2050', description: 'Coordination and Reliance — CAE shares information and coordinates with other assurance providers' },
    ],
    applicableProcesses: ['all'],
  },
  {
    regulation: 'IIA IPPF',
    area: 'Engagement Planning',
    clauses: [
      { clause: 'Standard 2200', description: 'Internal auditors must develop and document a plan for each engagement' },
      { clause: 'Standard 2201', description: 'Planning considerations — objectives, scope, timing, resources' },
      { clause: 'Standard 2210', description: 'Engagement objectives must address risks, controls and governance processes' },
      { clause: 'Standard 2220', description: 'Engagement scope must be sufficient to achieve objectives' },
    ],
    applicableProcesses: ['all'],
  },
  {
    regulation: 'IIA IPPF',
    area: 'Performing the Engagement',
    clauses: [
      { clause: 'Standard 2300', description: 'Internal auditors must identify, analyse, evaluate and document sufficient information to achieve engagement objectives' },
      { clause: 'Standard 2310', description: 'Identifying information — sufficient, reliable, relevant and useful' },
      { clause: 'Standard 2320', description: 'Analysis and Evaluation — conclusions based on appropriate analyses and evaluations' },
      { clause: 'Standard 2330', description: 'Documenting information — documented in working papers' },
    ],
    applicableProcesses: ['all'],
  },
  {
    regulation: 'IIA IPPF',
    area: 'Communicating Results',
    clauses: [
      { clause: 'Standard 2400', description: 'Internal auditors must communicate engagement results' },
      { clause: 'Standard 2410', description: 'Criteria for communicating — objectives, scope, conclusions, recommendations, action plans' },
      { clause: 'Standard 2420', description: 'Quality of communications — accurate, objective, clear, concise, constructive, complete, timely' },
    ],
    applicableProcesses: ['all'],
  },
];
