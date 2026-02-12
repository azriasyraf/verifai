'use client';

import { useState } from 'react';

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
  selectedIndustry,
  auditeeDetails,
  isGenerating,
  isGeneratingGovernance,
  error,
  setSelectedIndustry,
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
}) {
  const isAudit = generationMode === 'audit';
  const isGovernance = generationMode === 'governance';



  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-semibold text-gray-900 mb-3 tracking-tight">
              Verif<span className="text-indigo-600">ai</span>
            </h1>
            <p className="text-gray-400 text-base">
              AI-powered audit program generator
            </p>
          </div>

          {/* Framework Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Built on professional standards</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-900 mb-1">Audit Methodology</p>
                <p className="text-xs text-gray-600">IIA IPPF</p>
                <p className="text-xs text-gray-400 mt-1">Plan, execute, and report on internal audits</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-900 mb-1">Control Frameworks</p>
                <p className="text-xs text-gray-600">COSO 2013, COSO ERM &amp; COBIT 2019</p>
                <p className="text-xs text-gray-400 mt-1">Risk identification, control design and governance</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              Audit programs include risk-control linkage, assertions, and data analytics procedures
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Mode selector — two large clickable cards */}
          {/* ---------------------------------------------------------------- */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">What would you like to generate?</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Audit Program card */}
              <button
                type="button"
                onClick={() => setGenerationMode('audit')}
                className={`text-left rounded-xl border p-4 transition-all ${
                  isAudit
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-offset-1'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${isAudit ? 'border-indigo-600' : 'border-gray-300'}`}>
                    {isAudit && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Generate Audit Program</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Risks, controls, and audit procedures for a specific process. Includes data analytics tests.
                    </p>
                  </div>
                </div>
              </button>

              {/* Governance Assessment card */}
              <button
                type="button"
                onClick={() => setGenerationMode('governance')}
                className={`text-left rounded-xl border p-4 transition-all ${
                  isGovernance
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-offset-1'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${isGovernance ? 'border-indigo-600' : 'border-gray-300'}`}>
                    {isGovernance && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Generate Governance Assessment</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Entity-level RMGA working paper with inquiry questions, walkthrough steps, and red flags. Based on IIA IPPF and COSO ERM.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Configuration card — content changes with mode */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
              {isAudit ? 'Configure Audit Program' : 'Configure Governance Assessment'}
            </h2>

            <div className="space-y-4">
              {/* Industry — shown in both modes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Industry
                </label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select an industry...</option>
                  {industries.map((industry) => (
                    <option key={industry.id} value={industry.id}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ----- AUDIT PROGRAM fields ----- */}
              {isAudit && (
                <>
                  {/* Process */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Process
                    </label>
                    <select
                      value={selectedProcess}
                      onChange={(e) => setSelectedProcess(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Select a process...</option>
                      {processes.map((process) => (
                        <option key={process.id} value={process.id}>
                          {process.name}
                        </option>
                      ))}
                    </select>
                  </div>

                </>
              )}

              {/* ----- GOVERNANCE ASSESSMENT fields ----- */}
              {isGovernance && (
                <>
                  {/* Company Type */}
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

                </>
              )}
            </div>
          </div>

          {/* Engagement Details — shown in both modes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Engagement Details</h3>
              <span className="text-xs text-gray-400">optional — persists across programs this session</span>
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
          </div>

          {/* Generate Button */}
          {isAudit && (
            <>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  canGenerate && !isGenerating
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm'
                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
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
                <p className="text-center text-xs text-gray-400 mt-2">Select an industry and process to continue</p>
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
                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
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
                <p className="text-center text-xs text-gray-400 mt-2">Select industry, company type, and at least one process to continue</p>
              )}
            </>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-5 border-t border-gray-100">
        <p className="text-xs text-gray-400">Powered by AI &nbsp;&middot;&nbsp; Built for Internal Auditors</p>
      </div>
    </div>
  );
}
