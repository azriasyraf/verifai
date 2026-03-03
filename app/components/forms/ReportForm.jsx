'use client';

import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import FindingsStagingList from '../FindingsStagingList';

export default function ReportForm({
  handleGenerateReport,
  isGeneratingReport,
  raisedFindings,
  engagementId,
  clientName,
  clientGroup,
  selectedProcess,
}) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedFindings, setParsedFindings] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [stagedFindings, setStagedFindings] = useState([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState(null);
  const fileInputRef = useRef(null);

  // Auto-classify + repeat-check whenever parsed findings change
  useEffect(() => {
    if (!parsedFindings?.findings?.length) {
      setStagedFindings([]);
      return;
    }
    const eligible = parsedFindings.findings.filter(f =>
      !!(f.findingDescription?.trim() || f.rootCause?.trim() || f.recommendation?.trim())
    );
    if (!eligible.length) { setStagedFindings([]); return; }

    const run = async () => {
      setIsClassifying(true);
      setClassifyError(null);
      try {
        // Step 1: classify
        const classifyRes = await fetch('/api/findings/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ findings: eligible, process: selectedProcess }),
        });
        const classifyData = await classifyRes.json();
        if (!classifyData.success) throw new Error(classifyData.error);

        const classMap = {};
        for (const c of classifyData.data) { classMap[c.ref] = c; }

        const classified = eligible.map(f => ({
          ...f,
          control_category: classMap[f.ref]?.control_category || null,
          regulatory_refs: classMap[f.ref]?.regulatory_refs || [],
        }));

        // Step 2: repeat-check
        const repeatRes = await fetch('/api/findings/repeat-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: clientName || '',
            client_group: clientGroup || null,
            process: selectedProcess || '',
            engagement_id: engagementId || null,
            findings: classified.map(f => ({ ref: f.ref, control_category: f.control_category })),
          }),
        });
        const repeatData = await repeatRes.json();
        const badgeMap = repeatData.success ? repeatData.data : {};

        setStagedFindings(classified.map(f => ({
          ...f,
          badges: badgeMap[f.ref]?.badges || [],
          badgeSummary: badgeMap[f.ref]?.badgeSummary || {},
        })));
      } catch {
        setClassifyError('Classification failed — categories set to Unclassified. You can still generate.');
        setStagedFindings(eligible.map(f => ({ ...f, control_category: null, regulatory_refs: [], badges: [] })));
      } finally {
        setIsClassifying(false);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedFindings]);

  const handleCategoryChange = (ref, category) => {
    setStagedFindings(prev => prev.map(f => f.ref === ref ? { ...f, control_category: category || null } : f));
  };

  const handleRemoveStaged = (ref) => {
    setStagedFindings(prev => prev.filter(f => f.ref !== ref));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParseError(null);
    setParsedFindings(null);
    setStagedFindings([]);
    setClassifyError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'array' });

        // Read engagement details from Summary tab
        const summarySheet = workbook.Sheets['Summary'];
        const engagementDetails = {};
        if (summarySheet) {
          const rows = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
          rows.forEach(row => {
            const label = String(row[0] || '').toLowerCase();
            const value = String(row[1] || '');
            if (label.includes('client')) engagementDetails.clientName = value;
            if (label.includes('department')) engagementDetails.department = value;
            if (label.includes('audit period')) engagementDetails.auditPeriod = value;
            if (label.includes('engagement ref')) engagementDetails.engagementRef = value;
            if (label.includes('prepared by')) engagementDetails.preparedBy = value;
          });
        }

        // Read findings from Findings Summary tab
        const findingsSheet = workbook.Sheets['Findings Summary'];
        if (!findingsSheet) {
          setParseError('Could not find a "Findings Summary" tab. Make sure you are uploading a Verifai audit program workbook.');
          return;
        }

        // Read metadata from _verifai_data hidden sheet (process_id etc. for findings mapping)
        const metaSheet = workbook.Sheets['_verifai_data'];
        const meta = {};
        if (metaSheet) {
          XLSX.utils.sheet_to_json(metaSheet, { header: 1 }).forEach(row => {
            if (row[0]) meta[String(row[0]).trim()] = String(row[1] || '');
          });
        }

        const rows = XLSX.utils.sheet_to_json(findingsSheet, { header: 1 });
        // Find header row dynamically — robust against auditor-added rows or columns
        const headerRowIndex = rows.findIndex(row =>
          row.some(cell => String(cell || '').trim().toLowerCase() === 'finding description')
        );
        if (headerRowIndex === -1) {
          setParseError('Could not find the header row in the Findings Summary tab. Make sure you are uploading a Verifai-exported workbook.');
          return;
        }

        const headerRow = rows[headerRowIndex];
        const colMap = {};
        headerRow.forEach((cell, idx) => { colMap[String(cell || '').trim().toLowerCase()] = idx; });

        const dataRows = rows.slice(headerRowIndex + 1).filter(row =>
          row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
        );

        if (dataRows.length === 0) {
          setParseError('No findings found in the Findings Summary tab. Please fill in the Finding Description column before uploading.');
          return;
        }

        const normaliseRating = (raw) => {
          const r = String(raw || '').trim().toLowerCase();
          if (['high', 'critical', 'very high', 'severe'].includes(r)) return 'High';
          if (['medium', 'moderate', 'significant', 'med'].includes(r)) return 'Medium';
          if (['low', 'minor', 'info', 'informational', 'low risk'].includes(r)) return 'Low';
          return String(raw || '').trim(); // return as-is so hint can show the original value
        };

        const findings = dataRows.map(row => ({
          ref: String(row[colMap['finding #'] ?? colMap['ref'] ?? 0] || ''),
          controlId: String(row[colMap['control id'] ?? 1] || ''),
          riskId: String(row[colMap['risk id'] ?? 2] || ''),
          findingDescription: String(row[colMap['finding description'] ?? 3] || ''),
          riskRating: normaliseRating(row[colMap['risk rating'] ?? 4]) || 'Medium',
          rootCause: String(row[colMap['root cause'] ?? 5] || ''),
          recommendation: String(row[colMap['recommendation'] ?? 6] || ''),
          managementResponse: String(row[colMap['management response'] ?? 7] || ''),
          dueDate: String(row[colMap['due date'] ?? 8] || ''),
          status: String(row[colMap['status'] ?? 9] || 'Open'),
        }));

        setParsedFindings({ engagementDetails, findings, meta });
        setUploadedFile(file.name);
      } catch (err) {
        setParseError('Failed to read the file. Please ensure it is a valid Excel workbook.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const hasRaised = raisedFindings?.length > 0;
  // uploadedFindings still used for quality hints display (pre-staging)
  const uploadedFindings = (parsedFindings?.findings || []).filter(f =>
    !!(f.findingDescription?.trim() || f.rootCause?.trim() || f.recommendation?.trim() || f.managementResponse?.trim() || f.dueDate?.trim())
  );
  const hasDescriptionErrors = uploadedFindings.some(f => !f.findingDescription?.trim());
  const canGenerate = (stagedFindings.length > 0 || hasRaised) && !hasDescriptionErrors && !isClassifying;
  const allFindings = [
    ...stagedFindings.map(f => ({ ...f, process: selectedProcess || null, source: 'generated' })),
    ...(raisedFindings || []).map(f => ({ ...f, source: 'analytics_raised' })),
  ];
  const engagementDetails = parsedFindings?.engagementDetails || {};

  return (
    <>
      {/* Config card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">Configure Audit Report</h2>

        <div className="space-y-4">
          {/* Raised findings ready banner */}
          {hasRaised && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <p className="text-xs text-green-700 font-medium">{raisedFindings.length} analytics finding{raisedFindings.length !== 1 ? 's' : ''} ready — scroll down to generate, or upload a workbook to add more.</p>
              </div>
            </div>
          )}

          {/* File upload dropzone */}
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                uploadedFile ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              {uploadedFile ? (
                <>
                  <p className="text-sm font-semibold text-green-700">{uploadedFile}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {parsedFindings?.findings?.length || 0} finding{parsedFindings?.findings?.length !== 1 ? 's' : ''} found. Click to replace.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-600">Click to upload your completed audit workbook</p>
                  <p className="text-xs text-gray-500 mt-1">.xlsx files only. Must be a Verifai-exported workbook with a completed Findings Summary tab.</p>
                </>
              )}
            </div>
            {parseError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{parseError}</p>
            )}
            {parsedFindings?.findings?.length > 0 && (() => {
              const droppedRefs = [];
              const findingsWithHints = parsedFindings.findings.map(f => {
                const hasOtherFields = !!(f.rootCause?.trim() || f.recommendation?.trim() || f.managementResponse?.trim() || f.dueDate?.trim());
                if (!f.findingDescription?.trim() && !hasOtherFields) {
                  if (f.ref?.trim()) droppedRefs.push(f.ref.trim());
                  return null;
                }
                const errors = [];
                const hints = [];
                if (!f.findingDescription?.trim() && hasOtherFields) {
                  errors.push({ text: 'Finding description is missing — check for accidental deletion', field: 'Condition' });
                } else {
                  const descWords = (f.findingDescription || '').trim().split(/\s+/).filter(Boolean).length;
                  if (descWords < 8)
                    hints.push({ text: 'Description too brief — AI will expand but Condition may lack specificity', field: 'Condition' });
                }
                if (!f.rootCause || f.rootCause.trim().length === 0)
                  hints.push({ text: 'No root cause — Cause will be blank, add your draft in ReportView', field: 'Cause' });
                if (!f.managementResponse || f.managementResponse.trim().length === 0)
                  hints.push({ text: 'No management response — add this in the report before exporting', field: 'Mgmt Response' });
                if (!f.dueDate || f.dueDate.trim().length === 0)
                  hints.push({ text: 'No due date — QC flag will appear in the report', field: 'Due Date' });
                if (!['High', 'Medium', 'Low'].includes(f.riskRating))
                  hints.push({ text: `Risk rating '${f.riskRating}' not recognised — accepted values: High, Medium, Low. Will default to Medium.`, field: 'Risk Rating' });
                return { ...f, hints, errors };
              }).filter(Boolean);

              // Detect numeric gaps in ref sequence (e.g. F005 → F008 skips F006, F007)
              const numericRefs = findingsWithHints
                .map(f => parseInt((f.ref || '').replace(/\D/g, ''), 10))
                .filter(n => !isNaN(n))
                .sort((a, b) => a - b);
              const gapRefs = [];
              for (let i = 1; i < numericRefs.length; i++) {
                for (let n = numericRefs[i - 1] + 1; n < numericRefs[i]; n++) {
                  gapRefs.push(`F${String(n).padStart(3, '0')}`);
                }
              }

              const errorCount = findingsWithHints.filter(f => f.errors.length > 0).length;
              const hintCount = findingsWithHints.reduce((sum, f) => sum + f.hints.length, 0);
              return (
                <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-600">
                      {findingsWithHints.length} finding{findingsWithHints.length !== 1 ? 's' : ''} detected
                    </p>
                    <div className="flex items-center gap-2">
                      {errorCount > 0 && (
                        <p className="text-xs text-red-600 font-medium">{errorCount} error{errorCount !== 1 ? 's' : ''} — fix before generating</p>
                      )}
                      {hintCount > 0 && (
                        <p className="text-xs text-amber-600 font-medium">{hintCount} quality hint{hintCount !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                  {droppedRefs.length > 0 && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-700">
                      <span className="shrink-0 mt-0.5">⚠</span>
                      <span><span className="font-semibold">{droppedRefs.length} row{droppedRefs.length !== 1 ? 's' : ''} dropped — no content found ({droppedRefs.join(', ')}).</span> Check your workbook if these deletions were unintentional.</span>
                    </div>
                  )}
                  {gapRefs.length > 0 && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-700">
                      <span className="shrink-0 mt-0.5">⚠</span>
                      <span><span className="font-semibold">Ref gap detected — {gapRefs.join(', ')} not found in this workbook.</span> If these findings exist, check your workbook before generating.</span>
                    </div>
                  )}
                  {findingsWithHints.map((f, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
                          f.riskRating === 'High' ? 'bg-red-100 text-red-700' :
                          f.riskRating === 'Low' ? 'bg-green-100 text-green-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>{f.riskRating || 'Medium'}</span>
                        <span className="font-medium shrink-0">{f.ref}</span>
                        <span className="text-gray-300">·</span>
                        <span className="truncate text-gray-500">{(f.findingDescription || '[description missing]').substring(0, 60)}{(f.findingDescription?.length > 60) ? '…' : ''}</span>
                      </div>
                      {f.errors?.map((e, ei) => (
                        <p key={ei} className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5 ml-1 flex items-center gap-1.5">
                          <span className="shrink-0">✕</span>
                          <span>{e.text}</span>
                        </p>
                      ))}
                      {f.hints.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 ml-1 mt-0.5">
                          {f.hints.map((h, hi) => (
                            <span key={hi} className="relative group inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 cursor-default">
                              <span className="shrink-0">⚠</span>
                              <span>{h.field}</span>
                              <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-max max-w-xs bg-white border border-amber-200 rounded-lg shadow-sm px-2.5 py-1.5 text-xs text-gray-700 leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                                {h.text}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Staging list — shown after classification completes */}
      {(isClassifying || stagedFindings.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Findings Staging</h3>
          {classifyError && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">{classifyError}</p>
          )}
          <FindingsStagingList
            findings={stagedFindings}
            isClassifying={isClassifying}
            onCategoryChange={handleCategoryChange}
            onRemove={handleRemoveStaged}
          />
        </div>
      )}

      {/* Generate button section */}
      {hasRaised && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 space-y-2">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Findings from Analytics ({raisedFindings.length})</p>
          {raisedFindings.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">{f.riskRating}</span>
              <span className="font-mono text-gray-500">{f.ref}</span>
              <span className="truncate">{f.findingDescription.substring(0, 70)}{f.findingDescription.length > 70 ? '…' : ''}</span>
            </div>
          ))}
          <p className="text-xs text-red-600 mt-1">These will be included when you generate the report. Upload a workbook to add more findings, or generate directly from analytics findings.</p>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 mb-3">
        <p className="text-xs text-amber-700">AI-generated content requires review by a competent auditor before issue. Verifai does not replace professional judgement.</p>
      </div>

      <button
        onClick={() => canGenerate && handleGenerateReport({ engagementDetails, findings: allFindings })}
        disabled={!canGenerate || isGeneratingReport}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
          canGenerate && !isGeneratingReport
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm'
            : 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed'
        }`}
      >
        {isGeneratingReport ? (
          <span className="flex items-center justify-center gap-2.5">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Drafting report...
          </span>
        ) : 'Generate Audit Report'}
      </button>
      {!canGenerate && !isGeneratingReport && (
        <p className="text-center text-xs text-gray-500 mt-2">Upload a completed Verifai workbook, or raise findings from analytics tests</p>
      )}
    </>
  );
}
