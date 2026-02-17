'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

import { PROCESSES as processes } from '../lib/processNames.js';

const companyTypes = [
  { id: 'public', name: 'Public Company' },
  { id: 'private', name: 'Private Company' },
  { id: 'nonprofit', name: 'Non-profit' },
  { id: 'government', name: 'Government' },
  { id: 'other', name: 'Other' }
];

export default function GenerationForm({
  // shared state
  generationMode,
  setGenerationMode,
  sectorContext,
  setSectorContext,
  auditeeDetails,
  isGenerating,
  isGeneratingGovernance,
  error,
  updateAuditeeDetail,
  // audit-program mode
  selectedProcess,
  canGenerate,
  setSelectedProcess,
  handleGenerate,
  // governance mode
  companyType,
  setCompanyType,
  canGenerateGovernance,
  handleGenerateGovernance,
  // report mode
  handleGenerateReport,
  isGeneratingReport,
  // rmga enrichment
  governanceAssessment,
  // analytics raised findings
  raisedFindings,
  // walkthrough mode
  isGeneratingWalkthrough,
  handleGenerateWalkthrough,
  walkthroughClientContext,
  // jurisdiction
  jurisdiction,
  setJurisdiction,
}) {
  const isAudit = generationMode === 'audit';
  const isGovernance = generationMode === 'governance';
  const isReport = generationMode === 'report';
  const isWalkthrough = generationMode === 'walkthrough';

  // Report upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedFindings, setParsedFindings] = useState(null);
  const [parseError, setParseError] = useState(null);
  const fileInputRef = useRef(null);


  // Client context enrichment state (audit mode only)
  // Pre-populate from walkthrough if the user came from a walkthrough working paper
  const [clientContext, setClientContext] = useState(walkthroughClientContext || '');
  const [showContextPanel, setShowContextPanel] = useState(!!(walkthroughClientContext));

  // Document upload state (audit mode only)
  const [docType, setDocType] = useState('pp');
  const [uploadedDocName, setUploadedDocName] = useState('');
  const [documentContext, setDocumentContext] = useState('');
  const [docUploadError, setDocUploadError] = useState('');
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const docInputRef = useRef(null);

  const DOC_TYPES = [
    { id: 'pp',           label: 'Policies & Procedures' },
    { id: 'prior-report', label: 'Prior Audit Report' },
    { id: 'rmga',         label: 'RMGA Assessment' },
    { id: 'walkthrough',  label: 'Walkthrough Working Paper' },
  ];

  const MAX_DOC_CHARS = 8000;

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocUploadError('');
    setDocumentContext('');
    setUploadedDocName('');
    setIsParsingDoc(true);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let text = '';

      if (ext === 'txt') {
        text = await file.text();
      } else if (ext === 'pdf') {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/parse-doc', { method: 'POST', body: fd });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'PDF parse failed');
        text = json.text;
      } else if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (ext === 'xlsx' || ext === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        text = wb.SheetNames.map(name => {
          const ws = wb.Sheets[name];
          return `[Sheet: ${name}]\n${XLSX.utils.sheet_to_csv(ws)}`;
        }).join('\n\n');
      } else {
        setDocUploadError('Unsupported file type. Please upload .pdf, .txt, .docx, or .xlsx.');
        setIsParsingDoc(false);
        return;
      }

      text = text.trim();
      if (!text) {
        setDocUploadError('File appears to be empty or could not be read.');
        setIsParsingDoc(false);
        return;
      }

      const truncated = text.length > MAX_DOC_CHARS ? text.slice(0, MAX_DOC_CHARS) + '\n\n[Document truncated for prompt length]' : text;
      setDocumentContext(truncated);
      setUploadedDocName(file.name);
    } catch (err) {
      setDocUploadError('Failed to parse file. Check the file is not password-protected.');
    } finally {
      setIsParsingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const clearDocUpload = () => {
    setDocumentContext('');
    setUploadedDocName('');
    setDocUploadError('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParseError(null);
    setParsedFindings(null);
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

        const rows = XLSX.utils.sheet_to_json(findingsSheet, { header: 1 });
        // Header row is row index 3 (0-based), data starts at row index 4
        // Include any row with at least one non-blank cell in cols 0-9 — blank description detection happens in the UI
        const dataRows = rows.slice(4).filter(row =>
          row.slice(0, 10).some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
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
          ref: String(row[0] || ''),
          controlId: String(row[1] || ''),
          riskId: String(row[2] || ''),
          findingDescription: String(row[3] || ''),
          riskRating: normaliseRating(row[4]) || 'Medium',
          rootCause: String(row[5] || ''),
          recommendation: String(row[6] || ''),
          managementResponse: String(row[7] || ''),
          dueDate: String(row[8] || ''),
          status: String(row[9] || 'Open'),
        }));

        setParsedFindings({ engagementDetails, findings });
        setUploadedFile(file.name);
      } catch (err) {
        setParseError('Failed to read the file. Please ensure it is a valid Excel workbook.');
      }
    };
    reader.readAsArrayBuffer(file);
  };



  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-16">
        <div className="w-full max-w-2xl">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight">
              Verif<span className="text-indigo-600">ai</span>
            </h1>
            <p className="text-gray-500 text-base">
              AI-assisted working papers for internal audit teams
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Walkthrough context loaded banner */}
          {/* ---------------------------------------------------------------- */}
          {/* Mode selector — audit pipeline + RMGA secondary               */}
          {/* ---------------------------------------------------------------- */}
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-600 mb-3">What would you like to do?</p>

            {/* Primary pipeline: Audit Program → Walkthrough → Report */}
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Process-Level Assessment</p>
            <div className="flex items-stretch gap-2 mb-4">

              {/* Audit Program */}
              <button
                type="button"
                onClick={() => setGenerationMode('audit')}
                className={`flex-1 text-left rounded-xl border p-4 transition-all ${
                  isAudit
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-offset-1'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">Audit Program</p>
                <p className="text-xs text-gray-500 leading-relaxed">Risks, controls, and procedures for a process.</p>
              </button>

              {/* Walkthrough */}
              <button
                type="button"
                onClick={() => setGenerationMode('walkthrough')}
                className={`flex-1 text-left rounded-xl border p-4 transition-all ${
                  isWalkthrough
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-offset-1'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">Walkthrough</p>
                <p className="text-xs text-gray-500 leading-relaxed">Document process interviews and assess control design.</p>
              </button>

              {/* Report */}
              <button
                type="button"
                onClick={() => setGenerationMode('report')}
                className={`flex-1 text-left rounded-xl border p-4 transition-all ${
                  isReport
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-offset-1'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">Audit Report</p>
                <p className="text-xs text-gray-500 leading-relaxed">Upload findings. Verifai drafts the full report.</p>
              </button>
            </div>

            {/* RMGA — secondary, entity-level */}
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Entity-Level Assessment</p>
              <button
                type="button"
                onClick={() => setGenerationMode('governance')}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  isGovernance
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-offset-1'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-700">Risk Management &amp; Governance Assessment (RMGA)</p>
                  <p className="text-xs text-gray-500">Assess the entity&apos;s governance framework, risk management maturity, and overall control environment.</p>
                </div>
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Configuration card — content changes with mode */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
              {isAudit ? 'Configure Audit Program' : isGovernance ? 'Configure Governance Assessment' : isWalkthrough ? 'Configure Walkthrough Working Paper' : 'Configure Audit Report'}
            </h2>

            <div className="space-y-4">

              {/* ----- REPORT: raised findings ready banner ----- */}
              {isReport && raisedFindings?.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <p className="text-xs text-green-700 font-medium">{raisedFindings.length} analytics finding{raisedFindings.length !== 1 ? 's' : ''} ready — scroll down to generate, or upload a workbook to add more.</p>
                  </div>
                </div>
              )}

              {/* ----- REPORT UPLOAD fields ----- */}
              {isReport && (
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
              )}

              {/* Process, company type, optional sector — audit and governance only */}
              {!isReport && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Sector <span className="normal-case font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={sectorContext}
                      onChange={(e) => setSectorContext(e.target.value)}
                      placeholder="e.g. Financial services, Healthcare, Government, Mining..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  {/* ----- AUDIT PROGRAM + WALKTHROUGH fields ----- */}
                  {(isAudit || isWalkthrough) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Process
                      </label>
                      <select
                        value={selectedProcess}
                        onChange={(e) => setSelectedProcess(e.target.value)}
                        className={`w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-transparent transition-colors ${isWalkthrough ? 'focus:ring-2 focus:ring-indigo-500' : 'focus:ring-2 focus:ring-indigo-500'}`}
                      >
                        <option value="">Select a process...</option>
                        {processes.map((process) => (
                          <option key={process.id} value={process.id}>
                            {process.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* ----- JURISDICTION (audit + walkthrough) ----- */}
                  {(isAudit || isWalkthrough) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Jurisdiction
                      </label>
                      <select
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      >
                        <option value="International">International (COSO + IIA IPPF)</option>
                        <option value="Malaysia">Malaysia (COSO + IIA IPPF + Malaysian regulations)</option>
                      </select>
                    </div>
                  )}

                  {/* ----- GOVERNANCE ASSESSMENT fields ----- */}
                  {isGovernance && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Company Type
                      </label>
                      <select
                        value={companyType}
                        onChange={(e) => setCompanyType(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Select company type...</option>
                        {companyTypes.map((ct) => (
                          <option key={ct.id} value={ct.name}>
                            {ct.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

          {/* Engagement Details — shown in audit and governance modes only */}
          {!isReport &&
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-medium text-gray-600">Engagement Details</h3>
              <span className="text-xs text-gray-500">optional — persists across programs this session</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client / Company Name</label>
                <input type="text" value={auditeeDetails.clientName} onChange={(e) => updateAuditeeDetail('clientName', e.target.value)} placeholder="e.g. Acme Corporation" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department Under Audit</label>
                <input type="text" value={auditeeDetails.department} onChange={(e) => updateAuditeeDetail('department', e.target.value)} placeholder="e.g. Finance & Accounting" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Audit Period From</label>
                <input type="date" value={auditeeDetails.periodFrom} onChange={(e) => updateAuditeeDetail('periodFrom', e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Audit Period To</label>
                <input type="date" value={auditeeDetails.periodTo} onChange={(e) => updateAuditeeDetail('periodTo', e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Engagement Reference</label>
                <input type="text" value={auditeeDetails.engagementRef} onChange={(e) => updateAuditeeDetail('engagementRef', e.target.value)} placeholder="e.g. IA-2026-001" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Auditor Name</label>
                <input type="text" value={auditeeDetails.auditorName} onChange={(e) => updateAuditeeDetail('auditorName', e.target.value)} placeholder="Lead auditor" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Primary Contact Name</label>
                <input type="text" value={auditeeDetails.primaryContactName} onChange={(e) => updateAuditeeDetail('primaryContactName', e.target.value)} placeholder="Client-side point of contact" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Primary Contact Title</label>
                <input type="text" value={auditeeDetails.primaryContactTitle} onChange={(e) => updateAuditeeDetail('primaryContactTitle', e.target.value)} placeholder="e.g. Finance Manager" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" />
              </div>
            </div>
          </div>}

          {/* Client context enrichment — audit mode only */}
          {isAudit && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => setShowContextPanel(prev => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm text-sm text-gray-600 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <span className="font-medium text-gray-700">Enrich with client context</span>
                  <span className="text-xs text-gray-500">optional — paste walkthrough notes or interview observations</span>
                </div>
                <span className="text-gray-500 text-xs">{showContextPanel ? '▲' : '▼'}</span>
              </button>

              {showContextPanel && (
                <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 px-5 pb-5 pt-4 space-y-3">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Paste walkthrough notes, interview summaries, or process observations below. Verifai will use these to adjust risk ratings, flag control gaps, and add client-specific evidence to the audit program.
                  </p>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-indigo-700 font-medium">Best practice: provide both walkthrough notes and a P&P document for gap analysis.</p>
                    <p className="text-xs text-indigo-500 mt-0.5">Paste walkthrough notes or interview summaries above, or upload a document below (P&P, prior report, RMGA, walkthrough) — AI will adjust risks and flag control gaps accordingly.</p>
                  </div>
                  {governanceAssessment && (
                    <div className="flex items-start justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-indigo-800">RMGA findings available</p>
                        <p className="text-xs text-indigo-600 mt-0.5">Import entity-level observations from your governance assessment to inform process-level risk ratings and controls.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const lines = [
                            `Governance Assessment: ${governanceAssessment.assessmentTitle || ''}`,
                            `Overall Maturity: ${governanceAssessment.overallMaturityRating || ''}`,
                            governanceAssessment.maturityRationale ? `Rationale: ${governanceAssessment.maturityRationale}` : '',
                            governanceAssessment.keyObservations?.length
                              ? 'Key Observations:\n' + governanceAssessment.keyObservations.map(o => `- ${o}`).join('\n')
                              : '',
                            governanceAssessment.recommendations?.length
                              ? 'Governance Recommendations:\n' + governanceAssessment.recommendations.map(r => `- ${r}`).join('\n')
                              : '',
                          ].filter(Boolean).join('\n\n');
                          setClientContext(lines);
                          setShowContextPanel(true);
                        }}
                        className="shrink-0 text-xs font-semibold text-indigo-700 bg-white border border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                      >
                        Import findings
                      </button>
                    </div>
                  )}
                  <textarea
                    value={clientContext}
                    onChange={e => setClientContext(e.target.value)}
                    placeholder="e.g. During the walkthrough, the Finance Manager confirmed that purchase orders are verbally approved and not recorded in the system. The approval matrix document has not been updated since 2022. Paste walkthrough observations, interview notes, or completed walkthrough narrative here."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                    rows={6}
                  />
                  {clientContext.trim().length > 0 && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ Context provided — AI will use this to adjust risks and flag control gaps
                    </p>
                  )}

                  {/* Document upload */}
                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <p className="text-xs font-medium text-gray-700 mb-2">Upload a reference document</p>
                    <div className="flex gap-2 items-center flex-wrap">
                      <select
                        value={docType}
                        onChange={e => setDocType(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {DOC_TYPES.map(d => (
                          <option key={d.id} value={d.id}>{d.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        disabled={isParsingDoc}
                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        {isParsingDoc ? 'Parsing…' : 'Choose file'}
                      </button>
                      <span className="text-xs text-gray-400">.pdf · .docx · .txt · .xlsx</span>
                    </div>
                    <input
                      ref={docInputRef}
                      type="file"
                      accept=".pdf,.txt,.docx,.xlsx,.xls"
                      onChange={handleDocUpload}
                      className="hidden"
                    />
                    {docUploadError && (
                      <p className="mt-1.5 text-xs text-red-600">{docUploadError}</p>
                    )}
                    {uploadedDocName && !docUploadError && (
                      <div className="mt-2 flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-green-800">
                            ✓ {DOC_TYPES.find(d => d.id === docType)?.label} loaded
                          </p>
                          <p className="text-xs text-green-600 mt-0.5">{uploadedDocName} · {documentContext.length.toLocaleString()} characters</p>
                        </div>
                        <button
                          type="button"
                          onClick={clearDocUpload}
                          className="text-xs text-green-700 hover:text-red-600 transition-colors shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Generate Button */}
          {isAudit && (
            <>
              <button
                onClick={() => handleGenerate(clientContext.trim() || undefined, documentContext || undefined, documentContext ? docType : undefined)}
                disabled={!canGenerate || isGenerating}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  canGenerate && !isGenerating
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm'
                    : 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating audit program...
                  </span>
                ) : 'Generate Audit Program'}
              </button>
              {!canGenerate && !isGenerating && (
                <p className="text-center text-xs text-gray-500 mt-2">Select a process to continue</p>
              )}
            </>
          )}

          {isGovernance && (
            <>
              <button
                onClick={handleGenerateGovernance}
                disabled={!canGenerateGovernance || isGeneratingGovernance}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  canGenerateGovernance && !isGeneratingGovernance
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm'
                    : 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed'
                }`}
              >
                {isGeneratingGovernance ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating governance assessment...
                  </span>
                ) : 'Generate Governance Assessment'}
              </button>
              {!canGenerateGovernance && !isGeneratingGovernance && (
                <p className="text-center text-xs text-gray-500 mt-2">Select a company type to continue</p>
              )}
            </>
          )}

          {isWalkthrough && (() => {
            const canGenerateWalkthrough = !!selectedProcess;
            return (
              <>
                <button
                  onClick={handleGenerateWalkthrough}
                  disabled={!canGenerateWalkthrough || isGeneratingWalkthrough}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                    canGenerateWalkthrough && !isGeneratingWalkthrough
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm'
                      : 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed'
                  }`}
                >
                  {isGeneratingWalkthrough ? (
                    <span className="flex items-center justify-center gap-2.5">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating walkthrough...
                    </span>
                  ) : 'Generate Walkthrough Working Paper'}
                </button>
                {!canGenerateWalkthrough && !isGeneratingWalkthrough && (
                  <p className="text-center text-xs text-gray-500 mt-2">Select a process to continue</p>
                )}
              </>
            );
          })()}

          {isReport && (() => {
            const hasRaised = raisedFindings?.length > 0;
            const uploadedFindings = (parsedFindings?.findings || []).filter(f =>
              !!(f.findingDescription?.trim() || f.rootCause?.trim() || f.recommendation?.trim() || f.managementResponse?.trim() || f.dueDate?.trim())
            );
            const hasDescriptionErrors = uploadedFindings.some(f => !f.findingDescription?.trim());
            const canGenerate = (parsedFindings || hasRaised) && !hasDescriptionErrors;
            const allFindings = [
              ...uploadedFindings,
              ...(raisedFindings || []),
            ];
            const engagementDetails = parsedFindings?.engagementDetails || {};

            return (
              <>
                {/* Raised findings from analytics */}
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

                {/* AI disclosure */}
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
          })()}

          {walkthroughClientContext && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mt-4 flex items-start gap-3">
              <svg className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <p className="text-xs text-indigo-700">Your walkthrough observations have been loaded. Click <span className="font-semibold">Generate Audit Program</span> above to create a program informed by your findings.</p>
            </div>
          )}

          {/* Framework Info — below generate button as reassurance */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mt-5">
            <p className="text-sm font-medium text-gray-600 mb-3">Built on professional standards</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-900 mb-1">Audit Methodology</p>
                <p className="text-xs text-gray-600">IIA IPPF</p>
                <p className="text-xs text-gray-500 mt-1">Plan, execute, and report on internal audits</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-900 mb-1">Control Frameworks</p>
                <p className="text-xs text-gray-600">COSO 2013, COSO ERM &amp; COBIT 2019</p>
                <p className="text-xs text-gray-500 mt-1">Risk identification, control design and governance</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Audit programs include risk-control linkage, assertions, and data analytics procedures
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-5 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Powered by AI &nbsp;&middot;&nbsp; Built for Internal Auditors &nbsp;&middot;&nbsp;{' '}
          <a href="/about" className="text-indigo-400 hover:text-indigo-600 underline underline-offset-2 transition-colors">Features &amp; updates</a>
        </p>
      </div>
    </div>
  );
}
