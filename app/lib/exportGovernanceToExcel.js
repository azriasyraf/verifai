import * as XLSX from 'xlsx';

/**
 * Exports a governance assessment to an Excel workbook.
 *
 * Sheet layout:
 * - "Overview" tab: title, scope, objectives, approach, overall maturity, rationale,
 *   key observations, recommendations
 * - "Governance Assessment" tab: one row per inquiry question across all areas,
 *   columns: Area | Area ID | Question | Purpose | Management Response | Auditor Assessment | Conclusion
 */
export function exportGovernanceToExcel(assessment, auditeeDetails) {
  if (!assessment) return;

  const workbook = XLSX.utils.book_new();
  const date = new Date().toISOString().split('T')[0];

  // ---------------------------------------------------------------------------
  // Helper: add a styled worksheet with column widths
  // ---------------------------------------------------------------------------
  function makeSheet(rows, colWidths) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = colWidths.map(w => ({ wch: w }));
    return ws;
  }

  // ---------------------------------------------------------------------------
  // Tab 1: Overview
  // ---------------------------------------------------------------------------
  const overviewRows = [];

  // Header block
  overviewRows.push(['RISK MANAGEMENT & GOVERNANCE ASSESSMENT']);
  overviewRows.push([assessment.assessmentTitle || '']);
  overviewRows.push(['']);

  if (auditeeDetails) {
    if (auditeeDetails.clientName)       overviewRows.push(['Client:', auditeeDetails.clientName]);
    if (auditeeDetails.department)       overviewRows.push(['Department:', auditeeDetails.department]);
    if (auditeeDetails.engagementRef)    overviewRows.push(['Engagement Ref:', auditeeDetails.engagementRef]);
    if (auditeeDetails.auditorName)      overviewRows.push(['Auditor:', auditeeDetails.auditorName]);
    if (auditeeDetails.primaryContactName) overviewRows.push(['Primary Contact:', `${auditeeDetails.primaryContactName}${auditeeDetails.primaryContactTitle ? ` — ${auditeeDetails.primaryContactTitle}` : ''}`]);
    if (auditeeDetails.periodFrom || auditeeDetails.periodTo) {
      overviewRows.push(['Audit Period:', `${auditeeDetails.periodFrom || ''} to ${auditeeDetails.periodTo || ''}`]);
    }
    overviewRows.push(['Export Date:', date]);
    overviewRows.push(['']);
  }

  // Scope
  overviewRows.push(['SCOPE']);
  overviewRows.push([assessment.scope || '']);
  overviewRows.push(['']);

  // Objectives
  overviewRows.push(['OBJECTIVES']);
  (assessment.objectives || []).forEach((obj, i) => {
    overviewRows.push([`${i + 1}.`, obj]);
  });
  overviewRows.push(['']);

  // Approach
  overviewRows.push(['APPROACH']);
  overviewRows.push([assessment.approach || '']);
  overviewRows.push(['']);

  // Overall maturity
  overviewRows.push(['OVERALL MATURITY RATING', assessment.overallMaturityRating || '']);
  overviewRows.push(['']);
  overviewRows.push(['MATURITY RATIONALE']);
  overviewRows.push([assessment.maturityRationale || '']);
  overviewRows.push(['']);

  // Key observations
  overviewRows.push(['KEY OBSERVATIONS']);
  (assessment.keyObservations || []).forEach((obs, i) => {
    overviewRows.push([`${i + 1}.`, obs]);
  });
  overviewRows.push(['']);

  // Recommendations
  overviewRows.push(['RECOMMENDATIONS']);
  (assessment.recommendations || []).forEach((rec, i) => {
    overviewRows.push([`${i + 1}.`, rec]);
  });
  overviewRows.push(['']);
  overviewRows.push(['Prepared with AI assistance using Verifai (verifai-omega.vercel.app). All content reviewed by the audit team before use.']);

  const overviewSheet = makeSheet(overviewRows, [30, 100]);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

  // ---------------------------------------------------------------------------
  // Tab 2: Governance Assessment (working paper grid)
  // ---------------------------------------------------------------------------
  const gridRows = [];

  // Column headers
  gridRows.push([
    'Area ID',
    'Area',
    'Question #',
    'Question',
    'Purpose',
    'Management Response',
    'Auditor Assessment',
    'Red Flags (Area)',
    'Walkthrough Steps (Area)',
    'Documents to Obtain (Area)',
    'Conclusion (Area)',
  ]);

  (assessment.areas || []).forEach(area => {
    const redFlagsText = (area.redFlags || []).join('\n');
    const walkthroughText = (area.walkthroughSteps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
    const docsText = (area.documentsToObtain || []).join('\n');

    (area.inquiryQuestions || []).forEach((iq, qIndex) => {
      gridRows.push([
        area.areaId || '',
        area.area || '',
        qIndex + 1,
        iq.question || '',
        iq.purpose || '',
        '',   // Management Response — blank for auditor to fill
        '',   // Auditor Assessment — blank for auditor to fill
        // Repeat area-level fields only on the first question row; blank on subsequent rows
        qIndex === 0 ? redFlagsText : '',
        qIndex === 0 ? walkthroughText : '',
        qIndex === 0 ? docsText : '',
        qIndex === 0 ? (area.conclusion || '') : '',
      ]);
    });
  });

  const gridSheet = makeSheet(gridRows, [10, 30, 8, 55, 40, 40, 40, 45, 45, 40, 30]);

  // Enable text wrapping for all cells
  const gridRange = XLSX.utils.decode_range(gridSheet['!ref'] || 'A1');
  for (let R = gridRange.s.r; R <= gridRange.e.r; R++) {
    for (let C = gridRange.s.c; C <= gridRange.e.c; C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!gridSheet[cellAddr]) continue;
      if (!gridSheet[cellAddr].s) gridSheet[cellAddr].s = {};
      gridSheet[cellAddr].s.alignment = { wrapText: true, vertical: 'top' };
    }
  }

  XLSX.utils.book_append_sheet(workbook, gridSheet, 'Governance Assessment');

  // ---------------------------------------------------------------------------
  // Tab 3: Red Flags & Documents summary
  // ---------------------------------------------------------------------------
  const summaryRows = [['Area ID', 'Area', 'Red Flags', 'Documents to Obtain', 'Walkthrough Steps']];
  (assessment.areas || []).forEach(area => {
    summaryRows.push([
      area.areaId || '',
      area.area || '',
      (area.redFlags || []).join('\n'),
      (area.documentsToObtain || []).join('\n'),
      (area.walkthroughSteps || []).map((s, i) => `${i + 1}. ${s}`).join('\n'),
    ]);
  });
  const summarySheet = makeSheet(summaryRows, [10, 30, 55, 45, 55]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Red Flags & Documents');

  // ---------------------------------------------------------------------------
  // Write file
  // ---------------------------------------------------------------------------
  const fileName = `Governance_Assessment_${date}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
