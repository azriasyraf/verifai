'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import ColumnMapper from './ColumnMapper';
import { exportAnalyticsToExcel } from '../lib/exportAnalyticsToExcel';

// Tests that have executable Phase 1 logic (single-file, simple filter)
const EXECUTABLE_TESTS = new Set(['RC-001', 'PP-002', 'HR-002', 'INV-001', 'IT-003']);

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

export default function AuditProgramView({
  auditProgram,
  editedProgram,
  isEditMode,
  analyticsTests,
  confirmReset,
  selectedProcess,
  selectedIndustry,
  enterEditMode,
  saveEdits,
  cancelEdit,
  resetToAI,
  setConfirmReset,
  exportToExcel,
  resetForm,
  addObjective,
  deleteObjective,
  updateObjective,
  addRisk,
  deleteRisk,
  updateRisk,
  setEditedProgram,
  addControl,
  deleteControl,
  updateControl,
  addProcedure,
  deleteProcedure,
  updateProcedure,
  updateAnalyticsRisk,
  toggleAnalyticsTest,
  analyticsFile,
  analyticsResults,
  analyticsErrors,
  onAnalyticsFileLoad,
  onRunAnalyticsTest,
  onUpdateAnalyticsField,
  onRaiseFinding,
  raisedFindings,
  auditeeDetails,
}) {
  const [columnMapperTest, setColumnMapperTest] = useState(null); // test object being mapped
  const [runningTestId, setRunningTestId] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Max 4.5 MB
    if (file.size > 4.5 * 1024 * 1024) {
      alert('File is too large. Maximum size is 4.5 MB.');
      return;
    }
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (data.length < 2) {
      alert('File appears to be empty or has no data rows.');
      return;
    }
    const headers = (data[0] || []).map(h => String(h));
    const rows = data.slice(1);
    onAnalyticsFileLoad({ headers, rows });
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRunTest = (test) => {
    setColumnMapperTest(test);
  };

  const handleColumnMapperConfirm = async (columns) => {
    const test = columnMapperTest;
    setColumnMapperTest(null);
    setRunningTestId(test.id);
    await onRunAnalyticsTest(test.id, columns);
    setRunningTestId(null);
  };

  const handleExportWorkingPaper = (test) => {
    const result = analyticsResults[test.id];
    if (!result || !analyticsFile) return;
    exportAnalyticsToExcel({
      test,
      headers: result.headers,
      allRows: analyticsFile.rows,
      exceptionRows: result.sampleRows,
      exceptionCount: result.exceptionCount,
      totalRows: result.totalRows,
      conclusion: result.conclusion || '',
      workDone: result.workDone || '',
      auditeeDetails,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Column Mapper popup */}
      {columnMapperTest && analyticsFile && (
        <ColumnMapper
          test={columnMapperTest}
          headers={analyticsFile.headers}
          onConfirm={handleColumnMapperConfirm}
          onCancel={() => setColumnMapperTest(null)}
        />
      )}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">Audit Program</span>
                {isEditMode && (
                  <span className="bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-medium">
                    Editing
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {processes.find(p => p.id === selectedProcess)?.name}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {industries.find(i => i.id === selectedIndustry)?.name}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isEditMode ? (
                <>
                  <button
                    onClick={enterEditMode}
                    className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Edit Program
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Export to Excel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={saveEdits}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  {confirmReset ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600 font-medium">Reset all changes?</span>
                      <button onClick={resetToAI} className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-medium rounded-lg px-3 py-2 text-sm transition-colors">Yes, reset</button>
                      <button onClick={() => setConfirmReset(false)} className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg px-3 py-2 text-sm transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={resetToAI}
                      className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                    >
                      Reset to AI
                    </button>
                  )}
                  <button
                    onClick={exportToExcel}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Export
                  </button>
                </>
              )}
              <button
                onClick={resetForm}
                className="bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
              >
                New Program
              </button>
            </div>
          </div>
        </div>

        {/* Framework */}
        {auditProgram.framework && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Frameworks &amp; Methodology</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide block mb-1">Audit Methodology</span>
                <p className="font-semibold text-gray-900 text-sm">{auditProgram.framework.auditMethodology || auditProgram.framework.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide block mb-1">Control Framework</span>
                <p className="font-semibold text-gray-900 text-sm">{auditProgram.framework.controlFramework || 'COSO 2013'}</p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm">{auditProgram.framework.description}</p>
          </div>
        )}

        {/* Phase 1: Risk Assessment */}
        <div className="mb-4 pl-4 border-l-4 border-teal-500 bg-teal-50 rounded-r-lg py-3 pr-4">
          <span className="text-xs font-bold text-teal-500 uppercase tracking-widest">Phase 1</span>
          <h2 className="text-base font-semibold text-teal-900">Risk Assessment</h2>
          <p className="text-xs text-teal-700 mt-0.5">Understand the process, identify what can go wrong, and define audit objectives.</p>
        </div>

        {/* Process Overview */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Process Overview</h2>
          </div>
          <p className="text-gray-600 leading-relaxed text-sm">{auditProgram.processOverview}</p>
        </div>

        {/* Risk Management & Governance Assessment */}
        {auditProgram.riskManagementAssessment && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Risk Management &amp; Governance Assessment</h2>
            </div>

            {/* Maturity Level */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-gray-900">Risk Management Maturity:</span>
                <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2 py-0.5 text-xs font-medium">
                  {auditProgram.riskManagementAssessment.maturityLevel}
                </span>
              </div>
              <p className="text-gray-600 text-sm">{auditProgram.riskManagementAssessment.maturityDescription}</p>
            </div>

            {/* Governance Structure */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Governance Structure</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{auditProgram.riskManagementAssessment.governanceStructure}</p>
            </div>

            {/* Assessment Procedures */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Assessment Procedures</h3>
              <ul className="space-y-1.5">
                {auditProgram.riskManagementAssessment.assessmentProcedures.map((proc, index) => (
                  <li key={index} className="flex items-start text-sm gap-2">
                    <span className="text-indigo-500 mt-0.5 shrink-0">▸</span>
                    <span className="text-gray-600">{proc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Questions */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Key Questions for Management</h3>
              <ul className="space-y-1.5">
                {auditProgram.riskManagementAssessment.keyQuestions.map((question, index) => (
                  <li key={index} className="flex items-start text-sm gap-2">
                    <span className="text-indigo-400 mt-0.5 shrink-0 font-bold">?</span>
                    <span className="text-gray-600">{question}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Red Flags */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Red Flags to Watch For</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <ul className="space-y-1.5">
                  {auditProgram.riskManagementAssessment.redFlags.map((flag, index) => (
                    <li key={index} className="flex items-start text-sm gap-2">
                      <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
                      <span className="text-red-600">{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommendations */}
            {auditProgram.riskManagementAssessment.recommendations && auditProgram.riskManagementAssessment.recommendations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Recommendations</h3>
                <ul className="space-y-1.5">
                  {auditProgram.riskManagementAssessment.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start text-sm gap-2">
                      <span className="text-indigo-500 mt-0.5 shrink-0">→</span>
                      <span className="text-gray-600">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Audit Objectives */}
        {(isEditMode ? editedProgram?.auditObjectives : auditProgram?.auditObjectives) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Audit Objectives</h2>
            </div>
            {isEditMode && (
              <button
                onClick={addObjective}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded px-2 py-1 text-xs transition-colors"
              >
                + Add Objective
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {(isEditMode ? editedProgram.auditObjectives : auditProgram.auditObjectives).map((obj, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-indigo-500 mt-1 shrink-0 font-semibold text-xs">{String(index + 1).padStart(2, '0')}</span>
                {isEditMode ? (
                  <>
                    <input
                      type="text"
                      value={obj}
                      onChange={(e) => updateObjective(index, e.target.value)}
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => deleteObjective(index)}
                      className="text-gray-500 hover:text-red-500 px-2 py-2 transition-colors text-sm"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span className="text-gray-700 text-sm leading-relaxed">{obj}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        )}

        {/* Risks */}
        {(isEditMode ? editedProgram?.risks : auditProgram?.risks) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-red-500 rounded-full"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Risk Assessment</h2>
              <span className="text-xs text-gray-500 ml-1">
                {(isEditMode ? editedProgram.risks : auditProgram.risks).length} risks
              </span>
            </div>
            {isEditMode && (
              <button
                onClick={addRisk}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded px-2 py-1 text-xs transition-colors"
              >
                + Add Risk
              </button>
            )}
          </div>
          <div className="space-y-3">
            {(isEditMode ? editedProgram.risks : auditProgram.risks).map((risk, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {risk.id && (
                    <span className="font-mono text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">
                      {risk.id}
                    </span>
                  )}
                  {isEditMode ? (
                    <select
                      value={risk.category}
                      onChange={(e) => updateRisk(index, 'category', e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option>Financial</option>
                      <option>Operational</option>
                      <option>Compliance</option>
                      <option>IT</option>
                      <option>Strategic</option>
                    </select>
                  ) : (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">{risk.category}</span>
                  )}
                  {isEditMode ? (
                    <select
                      value={risk.rating}
                      onChange={(e) => updateRisk(index, 'rating', e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      risk.rating === 'High' ? 'bg-red-50 text-red-600 border-red-200' :
                      risk.rating === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-green-50 text-green-600 border-green-200'
                    }`}>
                      {risk.rating}
                    </span>
                  )}
                  {isEditMode ? (
                    <select
                      value={risk.assertion || ''}
                      onChange={(e) => updateRisk(index, 'assertion', e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                      <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2 py-0.5 text-xs font-medium">
                        {risk.assertion}
                      </span>
                    )
                  )}
                  {isEditMode && (
                    <button
                      onClick={() => deleteRisk(index)}
                      className="text-gray-500 hover:text-red-500 ml-auto transition-colors text-sm"
                      title="Delete Risk"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Orphan warning */}
                {(!risk.relatedControls || risk.relatedControls.length === 0) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                    <span className="text-red-600 text-xs font-medium">No controls mitigate this risk</span>
                  </div>
                )}

                {isEditMode ? (
                  <>
                    <textarea
                      value={risk.description}
                      onChange={(e) => updateRisk(index, 'description', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3"
                      rows="2"
                    />
                    {/* Link to controls */}
                    <div className="mb-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-sm font-medium text-gray-600 block mb-2">Link to Controls:</label>
                      {editedProgram.controls && editedProgram.controls.length > 0 ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {editedProgram.controls.map(ctrl => (
                            <label key={ctrl.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded transition-colors">
                              <input
                                type="checkbox"
                                checked={(risk.relatedControls || []).includes(ctrl.id)}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
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
                                className="mt-0.5 accent-indigo-500"
                              />
                              <span className="text-xs text-gray-600">
                                <span className="font-mono text-gray-500">{ctrl.id}</span> — {ctrl.description.substring(0, 60)}...
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">No controls available — add controls first</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-700 text-sm leading-relaxed mb-2">{risk.description}</p>
                )}
                {risk.clientEvidence && (
                  <div className="flex items-start gap-1.5 mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-amber-500 text-xs shrink-0 mt-0.5">📋</span>
                    <p className="text-xs text-amber-700"><span className="font-semibold">Client observation:</span> {risk.clientEvidence}</p>
                  </div>
                )}
                {risk.frameworkReference && (
                  <div className="text-xs text-indigo-500 mb-2 font-mono">
                    {risk.frameworkReference}
                  </div>
                )}
                {risk.relatedControls && risk.relatedControls.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-xs text-gray-500">Mitigated by:</span>
                    {risk.relatedControls.map(id => (
                      <span key={id} className="font-mono text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">{id}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Phase 2: Test of Controls */}
        <div className="mb-4 pl-4 border-l-4 border-violet-500 bg-violet-50 rounded-r-lg py-3 pr-4">
          <span className="text-xs font-bold text-violet-500 uppercase tracking-widest">Phase 2</span>
          <h2 className="text-base font-semibold text-violet-900">Test of Controls</h2>
          <p className="text-xs text-violet-700 mt-0.5">Verify that controls exist and are operating effectively. Analytics tests in this phase are control-linked — they check whether a specific control caught what it should (e.g. "Did the approval workflow flag this exception?").</p>
        </div>

        {/* Controls */}
        {(isEditMode ? editedProgram?.controls : auditProgram?.controls) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Control Activities</h2>
              <span className="text-xs text-gray-500 ml-1">
                {(isEditMode ? editedProgram.controls : auditProgram.controls).length} controls
              </span>
            </div>
            {isEditMode && (
              <button
                onClick={addControl}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded px-2 py-1 text-xs transition-colors"
              >
                + Add Control
              </button>
            )}
          </div>
          <div className="grid gap-3">
            {(isEditMode ? editedProgram.controls : auditProgram.controls).map((control, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="font-mono text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">{control.id}</span>
                  {isEditMode ? (
                    <select
                      value={control.type}
                      onChange={(e) => updateControl(index, 'type', e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option>Preventive</option>
                      <option>Detective</option>
                      <option>Corrective</option>
                    </select>
                  ) : (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      control.type === 'Preventive' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      control.type === 'Detective' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                      'bg-orange-50 text-orange-600 border-orange-200'
                    }`}>{control.type}</span>
                  )}
                  {isEditMode ? (
                    <select
                      value={control.frequency || ''}
                      onChange={(e) => updateControl(index, 'frequency', e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                      <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                        {control.frequency}
                      </span>
                    )
                  )}
                  {isEditMode ? (
                    <div className="flex gap-1 flex-wrap">
                      <input
                        type="text"
                        value={control.owner || ''}
                        onChange={(e) => updateControl(index, 'owner', e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-900 w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Owner name"
                      />
                      <input
                        type="text"
                        value={control.ownerRole || ''}
                        onChange={(e) => updateControl(index, 'ownerRole', e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-900 w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Role"
                      />
                      <input
                        type="text"
                        value={control.ownerDepartment || ''}
                        onChange={(e) => updateControl(index, 'ownerDepartment', e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-900 w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Dept"
                      />
                    </div>
                  ) : (
                    (control.owner || control.ownerRole) && (
                      <span className="text-xs text-gray-500">
                        {control.owner}
                        {control.ownerRole ? ` · ${control.ownerRole}` : ''}
                        {control.ownerDepartment ? ` · ${control.ownerDepartment}` : ''}
                      </span>
                    )
                  )}
                  {isEditMode && (
                    <button
                      onClick={() => deleteControl(index)}
                      className="text-gray-500 hover:text-red-500 ml-auto transition-colors text-sm"
                      title="Delete Control"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Orphan warning - no risks */}
                {(!control.mitigatesRisks || control.mitigatesRisks.length === 0) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                    <span className="text-red-600 text-xs font-medium">This control does not mitigate any risks</span>
                  </div>
                )}
                {/* Orphan warning - no procedures */}
                {!(isEditMode ? editedProgram : auditProgram)?.auditProcedures?.some(p => p.controlId === control.id) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    <span className="text-amber-600 text-xs font-medium">No audit procedures test this control</span>
                  </div>
                )}

                {isEditMode ? (
                  <>
                    <textarea
                      value={control.description}
                      onChange={(e) => updateControl(index, 'description', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3"
                      rows="2"
                    />
                    {/* Link to risks */}
                    <div className="mb-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-sm font-medium text-gray-600 block mb-2">Link to Risks:</label>
                      {editedProgram.risks && editedProgram.risks.length > 0 ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {editedProgram.risks.map(r => (
                            <label key={r.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded transition-colors">
                              <input
                                type="checkbox"
                                checked={(control.mitigatesRisks || []).includes(r.id)}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
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
                                className="mt-0.5 accent-indigo-500"
                              />
                              <span className="text-xs text-gray-600">
                                <span className="font-mono text-gray-500">{r.id}</span> — {r.description.substring(0, 60)}...
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">No risks available — add risks first</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-700 text-sm leading-relaxed mb-2">{control.description}</p>
                )}
                {control.gapFlag && (
                  <div className="flex items-start gap-1.5 mb-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <span className="text-red-500 text-xs shrink-0 mt-0.5">⚠</span>
                    <p className="text-xs text-red-700"><span className="font-semibold">Control gap flagged:</span> {control.gapNote || 'Walkthrough suggests this control may not be operating as expected.'}</p>
                  </div>
                )}
                {control.frameworkReference && (
                  <div className="text-xs text-indigo-500 mb-2 font-mono">
                    {control.frameworkReference}
                  </div>
                )}
                {control.mitigatesRisks && control.mitigatesRisks.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-xs text-gray-500">Mitigates:</span>
                    {control.mitigatesRisks.map(id => (
                      <span key={id} className="font-mono text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">{id}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Audit Procedures */}
        {(isEditMode ? editedProgram?.auditProcedures : auditProgram?.auditProcedures) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Audit Procedures</h2>
              <span className="text-xs text-gray-500 ml-1">
                {(isEditMode ? editedProgram.auditProcedures : auditProgram.auditProcedures).length} procedures
              </span>
            </div>
            {isEditMode && (
              <button
                onClick={addProcedure}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded px-2 py-1 text-xs transition-colors"
              >
                + Add Procedure
              </button>
            )}
          </div>
          <div className="space-y-4">
            {(isEditMode ? editedProgram.auditProcedures : auditProgram.auditProcedures).map((proc, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="font-mono text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded px-1.5 py-0.5 font-semibold">
                    P{String(index + 1).padStart(2, '0')}
                  </span>
                  {isEditMode ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Control:</span>
                      <select
                        value={proc.controlId}
                        onChange={(e) => updateProcedure(index, 'controlId', e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {editedProgram.controls?.map(ctrl => (
                          <option key={ctrl.id} value={ctrl.id}>
                            {ctrl.id} - {ctrl.description.substring(0, 30)}...
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="font-mono text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">{proc.controlId}</span>
                  )}
                  {proc.testingMethod === 'Data Analytics' && (
                    <span className="bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-medium">
                      Analytics
                    </span>
                  )}
                  {isEditMode && (
                    <button
                      onClick={() => deleteProcedure(index)}
                      className="text-gray-500 hover:text-red-500 ml-auto transition-colors text-sm"
                      title="Delete Procedure"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {isEditMode ? (
                  <textarea
                    value={proc.procedure}
                    onChange={(e) => updateProcedure(index, 'procedure', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3"
                    rows="3"
                  />
                ) : (
                  <p className="text-gray-900 text-sm leading-relaxed mb-3 font-medium">{proc.procedure}</p>
                )}
                {proc.frameworkReference && (
                  <div className="text-xs text-indigo-500 mb-3 font-mono">
                    {proc.frameworkReference}
                  </div>
                )}


                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">Testing Method</span>
                    {isEditMode ? (
                      <select
                        value={proc.testingMethod}
                        onChange={(e) => updateProcedure(index, 'testingMethod', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option>Inquiry</option>
                        <option>Observation</option>
                        <option>Inspection</option>
                        <option>Reperformance</option>
                        <option>Data Analytics</option>
                      </select>
                    ) : (
                      <p className="text-gray-700 text-sm font-medium">{proc.testingMethod}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">Sample Size</span>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={proc.sampleSize}
                        onChange={(e) => updateProcedure(index, 'sampleSize', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-700 text-sm font-medium">{proc.sampleSize}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">Expected Evidence</span>
                    {isEditMode ? (
                      <textarea
                        value={proc.expectedEvidence}
                        onChange={(e) => updateProcedure(index, 'expectedEvidence', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        rows="2"
                      />
                    ) : (
                      <p className="text-gray-600 text-sm">{proc.expectedEvidence}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Phase 3: Substantive Analytics */}
        {analyticsTests.length > 0 && (
          <>
          <div className="mb-4 pl-4 border-l-4 border-emerald-500 bg-emerald-50 rounded-r-lg py-3 pr-4">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Phase 3</span>
            <h2 className="text-base font-semibold text-emerald-900">Substantive Analytics</h2>
            <p className="text-xs text-emerald-700 mt-0.5">Run directly against the full dataset — not tied to any specific control. Designed to surface anomalies, duplicates, and outliers that control-based testing is not designed to detect.</p>
          </div>

          {/* File upload area */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Upload Client Data File</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">Upload a CSV or XLSX file (max 4.5 MB) to run tests directly from this program. The file stays in-session only — nothing is sent to any server until you click Run Test.</p>
            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {analyticsFile ? (
                <div>
                  <p className="text-sm font-medium text-emerald-700">✓ File loaded</p>
                  <p className="text-xs text-gray-500 mt-1">{analyticsFile.headers.length} columns · {analyticsFile.rows.length.toLocaleString()} rows</p>
                  <p className="text-xs text-indigo-500 mt-2 underline">Click to replace</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Click to upload CSV or XLSX</p>
                  <p className="text-xs text-gray-500 mt-1">Max 4.5 MB · First row must be headers</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Substantive Analytics</h2>
            </div>
            <p className="text-xs text-gray-500 mb-2 ml-3">
              {analyticsTests.filter(t => t.included).length} population-based tests recommended for this process
            </p>
            <div className="space-y-3">
              {analyticsTests.map((test, index) => {
                const isExecutable = EXECUTABLE_TESTS.has(test.id);
                const result = analyticsResults[test.id];
                const isRunning = runningTestId === test.id;
                const testError = analyticsErrors?.[test.id];

                return (
                <div key={test.id} className={`border rounded-lg p-4 transition-opacity ${!test.included ? 'opacity-40 bg-gray-50 border-gray-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5">{test.id}</span>
                      <span className="font-semibold text-gray-900 text-sm">{test.name}</span>
                      {test.riskId ? (
                        <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2 py-0.5 text-xs font-medium font-mono" title={`Testing risk ${test.riskId} — exceptions indicate a control deficiency`}>
                          Testing {test.riskId}
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">Risk not mapped</span>
                      )}
                      {result && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${result.exceptionCount > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                          {result.exceptionCount > 0 ? `${result.exceptionCount} exceptions` : 'No exceptions'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isExecutable && (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() => handleRunTest(test)}
                            disabled={!analyticsFile || isRunning}
                            title={!analyticsFile ? 'Upload a file first' : ''}
                            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isRunning ? 'Running…' : result ? 'Re-run Test' : 'Run Test'}
                          </button>
                          {!analyticsFile && (
                            <span className="text-xs text-gray-500 text-right max-w-[180px] leading-tight">Needs: {test.dataneeded.split('—')[1]?.trim() || test.dataneeded}</span>
                          )}
                          {testError && (
                            <span className="text-xs text-red-600 text-right max-w-[220px] leading-tight">{testError}</span>
                          )}
                        </div>
                      )}
                      {isEditMode && (
                        <>
                          <select
                            value={test.riskId || ''}
                            onChange={(e) => updateAnalyticsRisk(index, e.target.value || null)}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="">Unassigned</option>
                            {(editedProgram?.risks || auditProgram?.risks || []).map(r => (
                              <option key={r.id} value={r.id}>{r.id} — {r.description.substring(0, 30)}...</option>
                            ))}
                          </select>
                          <button
                            onClick={() => toggleAnalyticsTest(index)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${test.included ? 'bg-white text-red-600 border-red-200 hover:bg-red-50' : 'bg-white text-green-600 border-green-200 hover:bg-green-50'}`}
                          >
                            {test.included ? 'Remove' : 'Include'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">{test.purpose}</p>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600 block mb-1.5">Data Needed</span>
                      <span className="text-xs text-gray-600 leading-relaxed">{test.dataneeded}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 block mb-1.5">Steps</span>
                      <ol className="space-y-1.5">
                        {test.steps.map((step, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-indigo-500 font-bold text-xs shrink-0">{i + 1}.</span>
                            <span className="font-mono text-xs text-gray-600 bg-white px-1.5 py-0.5 rounded border border-gray-200 leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    <span className="text-xs font-semibold text-amber-600">Red flags: </span>
                    <span className="text-xs text-amber-700">{test.redflags}</span>
                  </div>

                  {/* Results section — only shown after running */}
                  {result && (
                    <div className="mt-3 border-t border-gray-200 pt-3 space-y-3">
                      {/* Summary */}
                      <div className={`rounded-lg px-4 py-3 flex items-center gap-3 ${result.exceptionCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                        <span className={`text-lg ${result.exceptionCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {result.exceptionCount > 0 ? '⚠' : '✓'}
                        </span>
                        <div>
                          <p className={`text-sm font-semibold ${result.exceptionCount > 0 ? 'text-red-800' : 'text-green-800'}`}>
                            {result.exceptionCount.toLocaleString()} exception{result.exceptionCount !== 1 ? 's' : ''} found out of {result.totalRows.toLocaleString()} rows
                          </p>
                          {result.exceptionCount > 100 && (
                            <p className="text-xs text-gray-500 mt-0.5">Showing first 100 exceptions below. Export working paper for full list.</p>
                          )}
                        </div>
                      </div>

                      {/* Sample exception rows */}
                      {result.exceptionCount > 0 && result.sampleRows.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="text-xs w-full min-w-max">
                            <thead className="bg-gray-100 text-gray-600 uppercase tracking-wide">
                              <tr>
                                {result.headers.map((h, i) => (
                                  <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {result.sampleRows.map((row, ri) => (
                                <tr key={ri} className="hover:bg-amber-50/40 transition-colors">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{String(cell ?? '')}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Audit Work Done */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Audit Work Done</label>
                        <textarea
                          value={result.workDone || ''}
                          onChange={e => onUpdateAnalyticsField(test.id, 'workDone', e.target.value)}
                          rows={4}
                          placeholder="Document what you did — e.g. interviewed Mr X who confirmed these were data entry errors, or noted that controls failed because the system allows changes without approval…"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Conclusion</label>
                        <textarea
                          value={result.conclusion || ''}
                          onChange={e => onUpdateAnalyticsField(test.id, 'conclusion', e.target.value)}
                          rows={2}
                          placeholder="Summarise your overall conclusion on this test…"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                      </div>

                      {/* Actions row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Raise as Finding */}
                        {result.exceptionCount > 0 && (() => {
                          const alreadyRaised = (raisedFindings || []).some(f => f.ref === `ANA-${test.id}`);
                          return alreadyRaised ? (
                            <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                              ✓ Finding raised — visible in Report tab
                            </span>
                          ) : (
                            <button
                              onClick={() => onRaiseFinding(test, result)}
                              className="px-4 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Raise as Finding
                            </button>
                          );
                        })()}
                        <div className="flex gap-2 ml-auto">
                          <button
                            onClick={() => handleExportWorkingPaper(test)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-xs transition-colors"
                          >
                            Export Working Paper
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
          </>
        )}

      </div>
    </div>
  );
}
