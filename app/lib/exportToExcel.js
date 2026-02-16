import * as XLSX from 'xlsx';

const processes = [
  { id: 'procurement', name: 'Procure-to-Pay (P2P)' },
  { id: 'revenue', name: 'Order-to-Cash (O2C)' },
  { id: 'r2r', name: 'Record-to-Report (R2R)' },
  { id: 'hr', name: 'Hire-to-Retire (H2R)' },
  { id: 'inventory', name: 'Inventory-to-Manufacture (I2M)' },
  { id: 'c2r', name: 'Capital-to-Retire (C2R)' },
  { id: 'treasury', name: 'Treasury & Cash Management' },
  { id: 'it', name: 'IT General Controls (ITGC)' },
];

export function exportToExcel(auditProgram, analyticsTests, auditeeDetails, {
  isEditMode,
  editedProgram,
  sectorContext,
  selectedProcess,
}) {
  const programToExport = isEditMode ? editedProgram : auditProgram;
  if (!programToExport) return;

  const workbook = XLSX.utils.book_new();
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
  summaryData.push([`${processName}${sectorContext ? ` — ${sectorContext}` : ''}`]);
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
  summaryData.push([]);
  summaryData.push(['Prepared with AI assistance using Verifai (verifai-omega.vercel.app). All content reviewed by the audit team before use.']);

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
    if (control.regulatoryRefs && control.regulatoryRefs.length > 0) {
      controlData.push(['Regulatory References:', control.regulatoryRefs.map(r => `${r.regulation} — ${r.clause}`).join('; ')]);
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
          if (risk.regulatoryRefs && risk.regulatoryRefs.length > 0) {
            controlData.push(['Regulatory References:', risk.regulatoryRefs.map(r => `${r.regulation} — ${r.clause}`).join('; ')]);
          }
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
        if (proc.regulatoryRefs && proc.regulatoryRefs.length > 0) {
          controlData.push(['Regulatory References:', proc.regulatoryRefs.map(r => `${r.regulation} — ${r.clause}`).join('; ')]);
        }
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

    // Section D: Testing Execution — sample rows table
    controlData.push(['D. TESTING EXECUTION']);
    controlData.push(['Testing Date:', '']);
    controlData.push(['Performed By:', '']);
    controlData.push(['Reviewed By:', '']);
    controlData.push([]);
    controlData.push([
      'Sample #', 'Document / Reference', 'Period / Date', 'Amount / Value',
      'Exception? (Y/N)', 'Exception Description', 'Auditor Initials'
    ]);
    const sampleRows = (() => {
      const proc = controlProcedures[0];
      if (!proc || !proc.sampleSize) return 10;
      const match = proc.sampleSize.match(/\d+/);
      return match ? Math.min(parseInt(match[0]), 30) : 10;
    })();
    for (let i = 1; i <= sampleRows; i++) {
      controlData.push([i, '', '', '', '', '', '']);
    }
    controlData.push([]);

    // Section E: Findings & Conclusion
    controlData.push(['E. FINDINGS & CONCLUSION']);
    controlData.push(['Finding Identified?', 'Yes [ ]  No [ ]']);
    controlData.push([]);
    controlData.push(['Finding #', 'Control ID', 'Risk ID', 'Finding Description', 'Risk Rating', 'Root Cause', 'Recommendation', 'Management Response', 'Due Date', 'Status']);
    controlData.push([`F001`, control.id, control.mitigatesRisks?.[0] || '', '', 'High [ ] Medium [ ] Low [ ]', '', '', '', '', 'Open']);
    controlData.push([]);
    controlData.push(['Control Effectiveness:', 'Effective [ ]  Needs Improvement [ ]  Ineffective [ ]']);
    controlData.push(['Auditor Notes:', '']);

    const controlSheet = XLSX.utils.aoa_to_sheet(controlData);
    controlSheet['!cols'] = [
      { wch: 14 }, { wch: 38 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 35 }, { wch: 16 }
    ];
    controlSheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    const tabName = control.id.replace(/[^a-zA-Z0-9 -]/g, '').substring(0, 31);
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
  findingsData.push(['Finding #', 'Control ID', 'Risk ID', 'Finding Description', 'Risk Rating', 'Root Cause', 'Recommendation', 'Management Response', 'Due Date', 'Status']);
  // Pre-populate one row per control that has procedures
  controls.filter(c => procedures.some(p => p.controlId === c.id)).forEach((c, i) => {
    findingsData.push([`F${String(i + 1).padStart(3, '0')}`, c.id, c.mitigatesRisks?.[0] || '', '', '', '', '', '', '', 'Open']);
  });

  const findingsSheet = XLSX.utils.aoa_to_sheet(findingsData);
  findingsSheet['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 45 },
    { wch: 12 }, { wch: 30 }, { wch: 35 }, { wch: 35 }, { wch: 12 }, { wch: 12 }
  ];
  findingsSheet['!freeze'] = { xSplit: 0, ySplit: 4 };
  XLSX.utils.book_append_sheet(workbook, findingsSheet, 'Findings Summary');

  // Generate filename and download
  const clientSlug = auditeeDetails.clientName ? `${auditeeDetails.clientName}_` : '';
  const filename = `AuditProgram_${clientSlug}${processName}_${date}.xlsx`.replace(/[^a-zA-Z0-9_.-]/g, '_');
  XLSX.writeFile(workbook, filename);
}
