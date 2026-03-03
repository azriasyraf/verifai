'use client';

import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

import { PROCESSES as processes } from '../lib/processNames.js';
import ReportForm from './forms/ReportForm';

// Keywords used to score paragraph relevance during smart extraction
const PROCESS_KEYWORDS = {
  hr:          ['employee', 'employment', 'salary', 'wages', 'leave', 'termination', 'contract', 'payroll', 'overtime', 'benefit', 'hire', 'dismiss', 'conduct', 'grievance', 'notice', 'redundancy', 'maternity', 'annual leave', 'sick leave', 'public holiday', 'allowance', 'deduction', 'epf', 'socso', 'pcb'],
  procurement: ['purchase', 'procurement', 'vendor', 'supplier', 'tender', 'contract', 'approval', 'order', 'bid', 'quotation', 'rfq', 'rfp', 'competitive', 'sourcing', 'evaluation', 'invoice', 'payment term'],
  revenue:     ['invoice', 'customer', 'sales', 'revenue', 'collection', 'receipt', 'credit', 'payment', 'billing', 'receivable', 'credit limit', 'discount', 'return', 'order'],
  r2r:         ['journal', 'reconciliation', 'ledger', 'financial statement', 'closing', 'accrual', 'report', 'trial balance', 'period end', 'variance', 'chart of accounts'],
  inventory:   ['inventory', 'stock', 'warehouse', 'goods', 'receipt', 'issue', 'count', 'valuation', 'obsolete', 'reorder', 'physical count', 'spoilage'],
  c2r:         ['asset', 'capital', 'depreciation', 'disposal', 'acquisition', 'fixed asset', 'useful life', 'impairment', 'capex', 'register'],
  treasury:    ['cash', 'bank', 'payment', 'transfer', 'investment', 'treasury', 'liquidity', 'cheque', 'petty cash', 'reconciliation', 'forex'],
  it:          ['access', 'user', 'password', 'backup', 'change management', 'incident', 'security', 'data', 'system', 'privileged', 'patch', 'disaster recovery', 'log', 'access control'],
};

function smartExtract(text, process, maxChars) {
  if (text.length <= maxChars) return text;

  const keywords = PROCESS_KEYWORDS[process] || [];

  // Split into paragraphs; fall back to ~600-char chunks if formatting is dense
  let segments = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 40);
  if (segments.length < 15) {
    const words = text.split(/\s+/);
    const chunks = [];
    let cur = '';
    for (const word of words) {
      cur += word + ' ';
      if (cur.length >= 600) { chunks.push(cur.trim()); cur = ''; }
    }
    if (cur.trim()) chunks.push(cur.trim());
    segments = chunks;
  }

  const scored = segments.map((para, index) => {
    const lower = para.toLowerCase();
    const score = keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
    return { para, score, index };
  });

  const selected = new Set();
  let total = 0;

  // Pass 1: highly relevant (score >= 2)
  for (const { para, score, index } of scored) {
    if (score < 2) continue;
    if (total + para.length + 2 > maxChars) continue;
    selected.add(index); total += para.length + 2;
  }
  // Pass 2: somewhat relevant (score >= 1)
  for (const { para, score, index } of scored) {
    if (score < 1 || selected.has(index)) continue;
    if (total + para.length + 2 > maxChars) continue;
    selected.add(index); total += para.length + 2;
  }
  // Pass 3: fill from beginning (definitions, scope, intro)
  for (const { para, index } of scored) {
    if (selected.has(index)) continue;
    if (total + para.length + 2 > maxChars) break;
    selected.add(index); total += para.length + 2;
  }

  const extracted = scored
    .filter(({ index }) => selected.has(index))
    .sort((a, b) => a.index - b.index)
    .map(({ para }) => para)
    .join('\n\n');

  return extracted + '\n\n[Relevant sections extracted — some content omitted for length]';
}

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
  // persistence
  engagementId,
  clientGroup,
}) {
  const isAudit = generationMode === 'audit';
  const isGovernance = generationMode === 'governance';
  const isReport = generationMode === 'report';
  const isWalkthrough = generationMode === 'walkthrough';

  // Client name typeahead — fetches distinct existing client names for consistent matching
  const [existingClientNames, setExistingClientNames] = useState([]);
  useEffect(() => {
    fetch('/api/engagements/client-names')
      .then(r => r.json())
      .then(result => { if (result.success) setExistingClientNames(result.data); })
      .catch(() => {}); // fail silently — typeahead is best-effort
  }, []);

  // Findings history state (audit mode only — fetched when engagementId is known)
  const [findingsHistory, setFindingsHistory] = useState([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [selectedHistoryCategories, setSelectedHistoryCategories] = useState(new Set());
  const [showHistoryPanel, setShowHistoryPanel] = useState(true);

  useEffect(() => {
    if (!engagementId || (!isAudit && !isGovernance)) { setFindingsHistory([]); return; }
    setIsFetchingHistory(true);
    fetch(`/api/engagements/${engagementId}/findings-history`)
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          setFindingsHistory(result.data);
          // Auto-select categories that meet the REPEAT threshold (2+ engagements)
          setSelectedHistoryCategories(new Set(
            result.data.filter(h => h.engagement_count >= 2).map(h => h.control_category)
          ));
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingHistory(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId, isAudit]);

  const toggleHistoryCategory = (cat) => {
    setSelectedHistoryCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Client context enrichment state (audit mode only)
  // Pre-populate from walkthrough if the user came from a walkthrough working paper
  const [clientContext, setClientContext] = useState(walkthroughClientContext || '');
  const [showContextPanel, setShowContextPanel] = useState(!!(walkthroughClientContext));

  // Document upload state (audit mode only)
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [currentDocType, setCurrentDocType] = useState('pp');
  const [docUploadError, setDocUploadError] = useState('');
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const docInputRef = useRef(null);

  const DOC_TYPES = [
    { id: 'pp',           label: 'Policies & Procedures' },
    { id: 'prior-report', label: 'Prior Audit Report' },
    { id: 'rmga',         label: 'RMGA Assessment' },
    { id: 'walkthrough',  label: 'Walkthrough Working Paper' },
    { id: 'laws',         label: 'Laws & Regulations' },
    { id: 'guidelines',   label: 'Industry Guidelines / Circulars' },
  ];

  const MAX_DOC_CHARS = 30000;

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocUploadError('');
    setIsParsingDoc(true);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let text = '';

      if (ext === 'txt') {
        text = await file.text();
      } else if (ext === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfDoc = await loadingTask.promise;
        const pages = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map(item => item.str).join(' '));
        }
        text = pages.join('\n');
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

      const extracted = smartExtract(text, selectedProcess, MAX_DOC_CHARS);
      setUploadedDocs(prev => [...prev, { fileName: file.name, docType: currentDocType, text: extracted }]);
    } catch (err) {
      setDocUploadError(err.message || 'Failed to parse file. Check the file is not password-protected.');
    } finally {
      setIsParsingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const removeDoc = (index) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
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
          {/* Configuration card — hidden in report mode (ReportForm has its own) */}
          {/* ---------------------------------------------------------------- */}
          {!isReport && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
              {isAudit ? 'Configure Audit Program' : isGovernance ? 'Configure Governance Assessment' : 'Configure Walkthrough Working Paper'}
            </h2>

            <div className="space-y-4">

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
          </div>}

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
                <input type="text" list="verifai-client-names" value={auditeeDetails.clientName} onChange={(e) => updateAuditeeDetail('clientName', e.target.value)} placeholder="e.g. Acme Corporation" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" />
                {existingClientNames.length > 0 && (
                  <datalist id="verifai-client-names">
                    {existingClientNames.map(name => <option key={name} value={name} />)}
                  </datalist>
                )}
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
                  <span className="font-medium text-gray-700">Make it specific</span>
                  <span className="text-xs text-gray-500">optional — upload P&P, prior reports, or paste walkthrough notes</span>
                </div>
                <span className="text-gray-500 text-xs">{showContextPanel ? '▲' : '▼'}</span>
              </button>

              {showContextPanel && (
                <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 px-5 pb-5 pt-4 space-y-3">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Paste walkthrough notes, interview summaries, or process observations below. Verifai will use these to adjust risk ratings, flag control gaps, and add client-specific evidence to the audit program.
                  </p>
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
                    walkthroughClientContext && clientContext === walkthroughClientContext ? (
                      <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-teal-800">Walkthrough observations loaded from your in-session working paper</p>
                        <p className="text-xs text-teal-600 mt-0.5">AI will use these to adjust risk ratings and flag control gaps. You do not need to upload a walkthrough document below.</p>
                      </div>
                    ) : (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ Context provided — AI will use this to adjust risks and flag control gaps
                      </p>
                    )
                  )}

                  {/* Document upload */}
                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <p className="text-xs font-medium text-gray-700 mb-2">Upload a reference document</p>
                    <div className="flex gap-2 items-center flex-wrap">
                      <select
                        value={currentDocType}
                        onChange={e => setCurrentDocType(e.target.value)}
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
                        {isParsingDoc ? 'Parsing…' : uploadedDocs.length > 0 ? 'Add another' : 'Choose file'}
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
                    {uploadedDocs.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {uploadedDocs.map((doc, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-green-800 truncate">
                                ✓ {DOC_TYPES.find(d => d.id === doc.docType)?.label}
                              </p>
                              <p className="text-xs text-green-600 mt-0.5 truncate">{doc.fileName} · {doc.text.length.toLocaleString()} chars</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDoc(i)}
                              className="text-xs text-green-700 hover:text-red-600 transition-colors shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Prior Findings History Panel — shown when engagementId is known */}
          {isAudit && engagementId && (isFetchingHistory || findingsHistory.length > 0) && (
            <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50">
              <button
                onClick={() => setShowHistoryPanel(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-amber-800">
                    Prior Findings
                    {findingsHistory.length > 0 && (
                      <span className="ml-1.5 text-xs font-normal text-amber-600">
                        ({findingsHistory.length} repeat area{findingsHistory.length !== 1 ? 's' : ''} detected)
                      </span>
                    )}
                  </span>
                </div>
                <svg className={`w-4 h-4 text-amber-500 transition-transform ${showHistoryPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showHistoryPanel && (
                <div className="px-4 pb-4 space-y-3 border-t border-amber-100">
                  {isFetchingHistory ? (
                    <div className="flex items-center gap-2 pt-3">
                      <svg className="animate-spin h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs text-amber-600">Checking prior findings…</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-amber-700 pt-3">
                        Select categories to elevate risk ratings and expand testing scope in this audit program.
                      </p>
                      <div className="space-y-1.5">
                        {findingsHistory.map(h => (
                          <label key={h.control_category} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedHistoryCategories.has(h.control_category)}
                              onChange={() => toggleHistoryCategory(h.control_category)}
                              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="flex-1 text-sm text-amber-900 group-hover:text-amber-700">
                              {h.control_category}
                            </span>
                            <span className="text-xs text-amber-500 shrink-0">
                              {h.finding_count} finding{h.finding_count !== 1 ? 's' : ''} · {h.engagement_count} engagement{h.engagement_count !== 1 ? 's' : ''}
                            </span>
                            {h.engagement_count >= 2 && (
                              <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">REPEAT</span>
                            )}
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => setSelectedHistoryCategories(new Set(findingsHistory.map(h => h.control_category)))}
                          className="text-xs text-amber-600 hover:text-amber-800"
                        >
                          Select all
                        </button>
                        <span className="text-amber-300">·</span>
                        <button
                          onClick={() => setSelectedHistoryCategories(new Set())}
                          className="text-xs text-amber-600 hover:text-amber-800"
                        >
                          Clear
                        </button>
                        <span className="ml-auto text-xs text-amber-500">
                          {selectedHistoryCategories.size} of {findingsHistory.length} selected
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Generate Button */}
          {isAudit && (
            <>
              <button
                onClick={() => handleGenerate(
                  clientContext.trim() || undefined,
                  uploadedDocs.length ? uploadedDocs : undefined,
                  selectedHistoryCategories.size > 0
                    ? findingsHistory.filter(h => selectedHistoryCategories.has(h.control_category))
                    : undefined
                )}
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
              {canGenerate && !isGenerating && !showContextPanel && !clientContext.trim() && !uploadedDocs.length && (
                <p className="text-center text-xs text-gray-400 mt-2">Output will be generic. Open <span className="text-indigo-500 cursor-pointer" onClick={() => setShowContextPanel(true)}>"Make it specific"</span> above to upload reference documents or add context for a tailored program.</p>
              )}
            </>
          )}

          {/* Cross-process Findings History Panel — governance mode */}
          {isGovernance && engagementId && (isFetchingHistory || findingsHistory.length > 0) && (
            <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50">
              <button
                onClick={() => setShowHistoryPanel(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-amber-800">
                    Cross-process Findings
                    {findingsHistory.length > 0 && (
                      <span className="ml-1.5 text-xs font-normal text-amber-600">
                        ({findingsHistory.length} control area{findingsHistory.length !== 1 ? 's' : ''} with history)
                      </span>
                    )}
                  </span>
                </div>
                <svg className={`w-4 h-4 text-amber-500 transition-transform ${showHistoryPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showHistoryPanel && (
                <div className="px-4 pb-4 space-y-3 border-t border-amber-100">
                  {isFetchingHistory ? (
                    <div className="flex items-center gap-2 pt-3">
                      <svg className="animate-spin h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs text-amber-600">Checking prior findings…</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-amber-700 pt-3">
                        Select categories to surface as cross-process patterns in the governance assessment. Repeat weaknesses across processes indicate entity-level governance gaps.
                      </p>
                      <div className="space-y-1.5">
                        {findingsHistory.map(h => (
                          <label key={h.control_category} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedHistoryCategories.has(h.control_category)}
                              onChange={() => toggleHistoryCategory(h.control_category)}
                              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="flex-1 text-sm text-amber-900 group-hover:text-amber-700">
                              {h.control_category}
                            </span>
                            <span className="text-xs text-amber-500 shrink-0">
                              {h.processes?.length > 1
                                ? `${h.processes.length} processes · ${h.engagement_count} engagement${h.engagement_count !== 1 ? 's' : ''}`
                                : `${h.finding_count} finding${h.finding_count !== 1 ? 's' : ''} · ${h.engagement_count} engagement${h.engagement_count !== 1 ? 's' : ''}`
                              }
                            </span>
                            {h.processes?.length > 1 && (
                              <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">CROSS-PROCESS</span>
                            )}
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => setSelectedHistoryCategories(new Set(findingsHistory.map(h => h.control_category)))}
                          className="text-xs text-amber-600 hover:text-amber-800"
                        >
                          Select all
                        </button>
                        <span className="text-amber-300">·</span>
                        <button
                          onClick={() => setSelectedHistoryCategories(new Set())}
                          className="text-xs text-amber-600 hover:text-amber-800"
                        >
                          Clear
                        </button>
                        <span className="ml-auto text-xs text-amber-500">
                          {selectedHistoryCategories.size} of {findingsHistory.length} selected
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {isGovernance && (
            <>
              <button
                onClick={() => handleGenerateGovernance(
                  selectedHistoryCategories.size > 0
                    ? findingsHistory.filter(h => selectedHistoryCategories.has(h.control_category))
                    : undefined
                )}
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

          {isReport && (
            <ReportForm
              handleGenerateReport={handleGenerateReport}
              isGeneratingReport={isGeneratingReport}
              raisedFindings={raisedFindings}
              engagementId={engagementId}
              clientName={auditeeDetails?.clientName}
              clientGroup={clientGroup}
              selectedProcess={selectedProcess}
            />
          )}

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
