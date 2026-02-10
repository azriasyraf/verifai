'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

// Data structures
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

const sampleMethods = [
  {
    id: 'rule-of-thumb',
    name: 'Rule-of-Thumb',
    description: 'Quick guidance based on audit best practices'
  },
  {
    id: 'statistical',
    name: 'Statistical Sampling',
    description: 'Formula-based calculation with confidence levels'
  },
  {
    id: 'custom',
    name: 'Custom Input',
    description: 'Define your own sample size and methodology'
  }
];

export default function Verifai() {
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedProcess, setSelectedProcess] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [assessmentType, setAssessmentType] = useState('program-only');
  const [showResults, setShowResults] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [auditProgram, setAuditProgram] = useState(null);
  const [error, setError] = useState(null);

  // Statistical sampling fields
  const [populationSize, setPopulationSize] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState('95');
  const [errorRate, setErrorRate] = useState('5');

  // Custom fields
  const [customSampleSize, setCustomSampleSize] = useState('');
  const [customMethodology, setCustomMethodology] = useState('');
  const [customJustification, setCustomJustification] = useState('');

  const canGenerate = selectedIndustry && selectedProcess && selectedMethod &&
    (selectedMethod !== 'statistical' || populationSize) &&
    (selectedMethod !== 'custom' || (customSampleSize && customMethodology && customJustification));

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const sampleData = selectedMethod === 'statistical'
        ? { populationSize, confidenceLevel, errorRate }
        : selectedMethod === 'custom'
        ? { customSampleSize, customMethodology, customJustification }
        : {};

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: selectedIndustry,
          process: selectedProcess,
          sampleMethod: selectedMethod,
          sampleData,
          assessmentType
        })
      });

      const result = await response.json();

      if (result.success) {
        setAuditProgram(result.data);
        setShowResults(true);
      } else {
        setError(result.error || 'Failed to generate audit program');
      }
    } catch (err) {
      setError('Failed to connect to generation service');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToExcel = () => {
    if (!auditProgram) return;

    const workbook = XLSX.utils.book_new();
    const industryName = industries.find(i => i.id === selectedIndustry)?.name || selectedIndustry;
    const processName = processes.find(p => p.id === selectedProcess)?.name || selectedProcess;
    const date = new Date().toISOString().split('T')[0];

    // TAB 1: SUMMARY & DASHBOARD
    const summaryData = [];

    // Header section
    summaryData.push(['AUDIT PROGRAM']);
    summaryData.push([`${processName} - ${industryName}`]);
    summaryData.push(['Date Generated:', date]);
    summaryData.push(['Version:', '1.0']);
    summaryData.push(['Prepared By:', '']);
    summaryData.push(['Reviewed By:', '']);
    summaryData.push([]);

    // Framework info
    if (auditProgram.framework) {
      summaryData.push(['FRAMEWORK']);
      summaryData.push(['Audit Methodology:', auditProgram.framework.auditMethodology]);
      summaryData.push(['Control Framework:', auditProgram.framework.controlFramework]);
      summaryData.push([]);
    }

    // Audit Objectives
    if (auditProgram.auditObjectives) {
      summaryData.push(['AUDIT OBJECTIVES']);
      auditProgram.auditObjectives.forEach((obj, i) => {
        summaryData.push([`${i + 1}.`, obj]);
      });
      summaryData.push([]);
    }

    // Risk Overview
    if (auditProgram.risks) {
      summaryData.push(['RISK OVERVIEW']);
      summaryData.push(['Total Risks:', auditProgram.risks.length]);
      const highRisks = auditProgram.risks.filter(r => r.rating === 'High').length;
      const medRisks = auditProgram.risks.filter(r => r.rating === 'Medium').length;
      const lowRisks = auditProgram.risks.filter(r => r.rating === 'Low').length;
      summaryData.push(['High Risk:', highRisks]);
      summaryData.push(['Medium Risk:', medRisks]);
      summaryData.push(['Low Risk:', lowRisks]);
      summaryData.push([]);
    }

    // Dashboard Table
    if (auditProgram.controls && auditProgram.auditProcedures) {
      summaryData.push(['DASHBOARD - CONTROL STATUS']);
      summaryData.push(['Control ID', 'Description', 'Type', 'Owner', 'Assigned To', 'Status', 'Findings?', 'Conclusion']);

      auditProgram.controls.forEach(control => {
        summaryData.push([
          control.id,
          control.description.substring(0, 50) + '...',
          control.type,
          control.owner,
          '', // Assigned To - to be filled
          'Not Started', // Status - to be filled
          'TBD', // Findings - to be filled
          'TBD'  // Conclusion - to be filled
        ]);
      });
      summaryData.push([]);
    }

    // Overall Conclusion section
    summaryData.push(['OVERALL AUDIT CONCLUSION']);
    summaryData.push(['(To be completed after testing)']);
    summaryData.push(['']);
    summaryData.push(['REVIEW NOTES']);
    summaryData.push(['Manager Comments:', '']);
    summaryData.push(['Reviewer Signature:', '']);
    summaryData.push(['Date:', '']);

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // TAB 2-N: CONTROL WORKPAPERS (One per control)
    if (auditProgram.controls && auditProgram.auditProcedures) {
      auditProgram.controls.forEach((control, controlIndex) => {
        const controlData = [];

        // Section A: Control Details
        controlData.push(['CONTROL DETAILS']);
        controlData.push(['Control ID:', control.id]);
        controlData.push(['Control Description:', control.description]);
        controlData.push(['Control Type:', control.type]);
        controlData.push(['Control Frequency:', control.frequency || 'Not specified']);
        controlData.push(['Control Owner:', control.owner]);
        if (control.frameworkReference) {
          controlData.push(['Framework Reference:', control.frameworkReference]);
        }
        controlData.push([]);

        // Associated Risks (full details)
        if (control.mitigatesRisks && control.mitigatesRisks.length > 0 && auditProgram.risks) {
          controlData.push(['ASSOCIATED RISKS']);
          control.mitigatesRisks.forEach(riskId => {
            const risk = auditProgram.risks.find(r => r.id === riskId);
            if (risk) {
              controlData.push([`${risk.id}:`, risk.description]);
              controlData.push(['Risk Category:', risk.category]);
              controlData.push(['Risk Rating:', risk.rating]);
              if (risk.assertion) {
                controlData.push(['Assertion:', risk.assertion]);
              }
              if (risk.frameworkReference) {
                controlData.push(['Framework Reference:', risk.frameworkReference]);
              }
              controlData.push([]);
            }
          });
        }

        // Section B: Testing Plan
        const procedures = auditProgram.auditProcedures.filter(p => p.controlId === control.id);
        if (procedures.length > 0) {
          controlData.push(['TESTING PLAN']);
          procedures.forEach((proc, i) => {
            controlData.push([`Procedure ${i + 1}:`, proc.procedure]);
            controlData.push(['Testing Method:', proc.testingMethod]);
            controlData.push(['Sample Size:', proc.sampleSize]);
            controlData.push(['Expected Evidence:', proc.expectedEvidence]);
            if (proc.frameworkReference) {
              controlData.push(['Framework Reference:', proc.frameworkReference]);
            }
            if (proc.analyticsTest) {
              controlData.push(['Analytics Type:', proc.analyticsTest.type]);
              controlData.push(['Analytics Description:', proc.analyticsTest.description]);
            }
            controlData.push([]);
          });
        }

        // Section C: Testing Execution (Blank - to be filled)
        controlData.push(['TESTING EXECUTION']);
        controlData.push(['Sample Selected:', '']);
        controlData.push(['Testing Date:', '']);
        controlData.push(['Performed By:', '']);
        controlData.push(['Results Observed:', '']);
        controlData.push(['Exceptions Noted:', '']);
        controlData.push([]);

        // Section D: Findings & Conclusion (Blank - to be filled)
        controlData.push(['FINDINGS & CONCLUSION']);
        controlData.push(['Finding Identified?', 'Yes [ ]  No [ ]']);
        controlData.push(['Finding Description:', '']);
        controlData.push(['Root Cause:', '']);
        controlData.push(['Risk Rating:', 'High [ ]  Medium [ ]  Low [ ]']);
        controlData.push(['Control Effectiveness:', 'Effective [ ]  Needs Improvement [ ]  Ineffective [ ]']);
        controlData.push(['Auditor Notes:', '']);

        const controlSheet = XLSX.utils.aoa_to_sheet(controlData);
        const tabName = `${control.id} - ${control.description.substring(0, 20)}`.replace(/[^a-zA-Z0-9 -]/g, '');
        XLSX.utils.book_append_sheet(workbook, controlSheet, tabName.substring(0, 31)); // Excel tab name limit
      });
    }

    // TAB N+1: FINDINGS SUMMARY (Template - always include)
    const findingsData = [];
    findingsData.push(['FINDINGS SUMMARY']);
    findingsData.push(['(To be populated during testing)']);
    findingsData.push([]);
    findingsData.push(['Finding #', 'Control ID', 'Finding Description', 'Risk Rating', 'Root Cause', 'Management Response', 'Due Date', 'Status']);
    findingsData.push(['F001', '', '', '', '', '', '', 'Open']);
    findingsData.push(['F002', '', '', '', '', '', '', 'Open']);

    const findingsSheet = XLSX.utils.aoa_to_sheet(findingsData);
    XLSX.utils.book_append_sheet(workbook, findingsSheet, 'Findings Summary');

    // Generate filename and download
    const filename = `AuditProgram_${industryName}_${processName}_${date}.xlsx`.replace(/[^a-zA-Z0-9_.-]/g, '_');
    XLSX.writeFile(workbook, filename);
  };

  const resetForm = () => {
    setSelectedIndustry('');
    setSelectedProcess('');
    setSelectedMethod('');
    setShowResults(false);
    setAuditProgram(null);
    setError(null);
    setPopulationSize('');
    setCustomSampleSize('');
    setCustomMethodology('');
    setCustomJustification('');
  };

  if (showResults && auditProgram) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-[#1e3a8a]">
                  Audit Program Generated
                </h1>
                <p className="text-[#64748b] mt-1">
                  {industries.find(i => i.id === selectedIndustry)?.name} - {processes.find(p => p.id === selectedProcess)?.name}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportToExcel}
                  className="bg-[#0d9488] text-white px-6 py-3 rounded-lg hover:bg-[#0f766e] transition-colors font-semibold"
                >
                  📊 Export to Excel
                </button>
                <button
                  onClick={resetForm}
                  className="bg-[#475569] text-white px-6 py-3 rounded-lg hover:bg-[#334155] transition-colors"
                >
                  Generate Another
                </button>
              </div>
            </div>
          </div>

          {/* Framework */}
          {auditProgram.framework && (
            <div className="bg-gradient-to-r from-[#0d9488] to-[#0f766e] rounded-lg shadow-sm p-6 mb-6 text-white">
              <h2 className="text-2xl font-semibold mb-3">📋 Frameworks</h2>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="text-white/70 text-sm">Audit Methodology:</span>
                  <p className="font-semibold">{auditProgram.framework.auditMethodology || auditProgram.framework.name}</p>
                </div>
                <div>
                  <span className="text-white/70 text-sm">Control Framework:</span>
                  <p className="font-semibold">{auditProgram.framework.controlFramework || 'COSO 2013'}</p>
                </div>
              </div>
              <p className="text-white/90 leading-relaxed text-sm">{auditProgram.framework.description}</p>
            </div>
          )}

          {/* Process Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-4">Process Overview</h2>
            <p className="text-[#475569] leading-relaxed">{auditProgram.processOverview}</p>
          </div>

          {/* Risk Management & Governance Assessment */}
          {auditProgram.riskManagementAssessment && (
            <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
              <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-4">
                🎯 Risk Management & Governance Assessment
              </h2>

              {/* Maturity Level */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-blue-900">Risk Management Maturity:</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium text-sm">
                    {auditProgram.riskManagementAssessment.maturityLevel}
                  </span>
                </div>
                <p className="text-blue-800 text-sm">{auditProgram.riskManagementAssessment.maturityDescription}</p>
              </div>

              {/* Governance Structure */}
              <div className="mb-4">
                <h3 className="font-semibold text-[#1e3a8a] mb-2">Governance Structure</h3>
                <p className="text-[#475569] text-sm leading-relaxed">{auditProgram.riskManagementAssessment.governanceStructure}</p>
              </div>

              {/* Assessment Procedures */}
              <div className="mb-4">
                <h3 className="font-semibold text-[#1e3a8a] mb-2">Assessment Procedures</h3>
                <ul className="space-y-2">
                  {auditProgram.riskManagementAssessment.assessmentProcedures.map((proc, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <span className="text-[#0d9488] mr-2">▸</span>
                      <span className="text-[#475569]">{proc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key Questions */}
              <div className="mb-4">
                <h3 className="font-semibold text-[#1e3a8a] mb-2">Key Questions for Management</h3>
                <ul className="space-y-2">
                  {auditProgram.riskManagementAssessment.keyQuestions.map((question, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <span className="text-purple-500 mr-2">?</span>
                      <span className="text-[#475569]">{question}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Red Flags */}
              <div className="mb-4">
                <h3 className="font-semibold text-red-700 mb-2">🚩 Red Flags to Watch For</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <ul className="space-y-2">
                    {auditProgram.riskManagementAssessment.redFlags.map((flag, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-red-500 mr-2">⚠</span>
                        <span className="text-red-800">{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              {auditProgram.riskManagementAssessment.recommendations && auditProgram.riskManagementAssessment.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#0d9488] mb-2">💡 Recommendations</h3>
                  <ul className="space-y-2">
                    {auditProgram.riskManagementAssessment.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="text-[#0d9488] mr-2">→</span>
                        <span className="text-[#475569]">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Audit Objectives */}
          {auditProgram.auditObjectives && (
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-4">Audit Objectives</h2>
            <ul className="space-y-2">
              {auditProgram.auditObjectives.map((obj, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-[#0d9488] mr-2">•</span>
                  <span className="text-[#475569]">{obj}</span>
                </li>
              ))}
            </ul>
          </div>
          )}

          {/* Risks */}
          {auditProgram.risks && (
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-4">Risk Assessment</h2>
            <div className="space-y-4">
              {auditProgram.risks.map((risk, index) => (
                <div key={index} className="border-l-4 border-[#0d9488] pl-4 py-2">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {risk.id && (
                      <span className="font-mono text-sm bg-[#f8fafc] px-2 py-1 rounded border border-[#e2e8f0]">
                        {risk.id}
                      </span>
                    )}
                    <span className="font-semibold text-[#1e3a8a]">{risk.category}</span>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      risk.rating === 'High' ? 'bg-red-100 text-red-700' :
                      risk.rating === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {risk.rating}
                    </span>
                    {risk.assertion && (
                      <span className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {risk.assertion}
                      </span>
                    )}
                  </div>
                  <p className="text-[#475569] mb-2">{risk.description}</p>
                  {risk.frameworkReference && (
                    <div className="text-xs text-purple-600 mb-2 italic">
                      📚 {risk.frameworkReference}
                    </div>
                  )}
                  {risk.relatedControls && risk.relatedControls.length > 0 && (
                    <div className="text-sm text-[#64748b] mt-2">
                      <span className="font-medium">Mitigated by controls: </span>
                      {risk.relatedControls.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Controls */}
          {auditProgram.controls && (
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-4">Control Activities</h2>
            <div className="grid gap-4">
              {auditProgram.controls.map((control, index) => (
                <div key={index} className="border border-[#e2e8f0] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-mono text-sm bg-[#f8fafc] px-2 py-1 rounded border border-[#e2e8f0]">{control.id}</span>
                    <span className="text-sm text-[#0d9488] font-medium">{control.type}</span>
                    {control.frequency && (
                      <span className="text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded">
                        {control.frequency}
                      </span>
                    )}
                    <span className="text-sm text-[#64748b]">Owner: {control.owner}</span>
                  </div>
                  <p className="text-[#475569] mb-2">{control.description}</p>
                  {control.frameworkReference && (
                    <div className="text-xs text-purple-600 mb-2 italic">
                      📚 {control.frameworkReference}
                    </div>
                  )}
                  {control.mitigatesRisks && control.mitigatesRisks.length > 0 && (
                    <div className="text-sm text-[#64748b] mt-2">
                      <span className="font-medium">Mitigates risks: </span>
                      {control.mitigatesRisks.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Audit Procedures */}
          {auditProgram.auditProcedures && (
          <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 mb-6">
            <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-4">Audit Procedures</h2>
            <div className="space-y-6">
              {auditProgram.auditProcedures.map((proc, index) => (
                <div key={index} className="border border-[#e2e8f0] rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-sm bg-[#1e3a8a] text-white px-3 py-1 rounded">
                      Procedure {index + 1}
                    </span>
                    <span className="text-sm text-[#64748b]">Control: {proc.controlId}</span>
                    {proc.testingMethod === 'Data Analytics' && (
                      <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
                        📊 Analytics
                      </span>
                    )}
                  </div>
                  <p className="text-[#475569] mb-2 font-medium">{proc.procedure}</p>
                  {proc.frameworkReference && (
                    <div className="text-xs text-purple-600 mb-4 italic">
                      📚 {proc.frameworkReference}
                    </div>
                  )}

                  {/* Analytics Test Details */}
                  {proc.analyticsTest && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-orange-900 mb-2">📊 Analytics Test Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-orange-700 font-medium">Type: </span>
                          <span className="text-[#475569]">{proc.analyticsTest.type}</span>
                        </div>
                        <div>
                          <span className="text-orange-700 font-medium">Description: </span>
                          <span className="text-[#475569]">{proc.analyticsTest.description}</span>
                        </div>
                        <div>
                          <span className="text-orange-700 font-medium">Population: </span>
                          <span className="text-[#475569]">{proc.analyticsTest.population}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-[#64748b]">Testing Method:</span>
                      <p className="text-[#1e3a8a] font-medium">{proc.testingMethod}</p>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Sample Size:</span>
                      <p className="text-[#1e3a8a] font-medium">{proc.sampleSize}</p>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Expected Evidence:</span>
                      <p className="text-[#475569]">{proc.expectedEvidence}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#1e3a8a] mb-3">
            Verif<span className="text-[#0d9488]">ai</span>
          </h1>
          <p className="text-xl text-[#475569]">
            AI-Powered Audit Program Generator
          </p>
          <p className="text-sm text-[#64748b] mt-2">
            Generate comprehensive audit programs in minutes, not hours
          </p>
        </div>

        {/* Framework & Methodology Info */}
        <div className="bg-gradient-to-r from-[#0d9488] to-[#0f766e] rounded-lg shadow-sm p-6 mb-8 text-white">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>🎯</span> Built on Professional Standards
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="font-semibold mb-1">Audit Methodology</p>
              <p className="text-white/90">IIA IPPF (International Professional Practices Framework)</p>
              <p className="text-white/70 text-xs mt-2">Defines how to plan, execute, and report on internal audits</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="font-semibold mb-1">Control Frameworks</p>
              <p className="text-white/90">COSO 2013 for financial/operational processes</p>
              <p className="text-white/90">COBIT 2019 for IT/cybersecurity processes</p>
              <p className="text-white/70 text-xs mt-2">Guides risk identification and control design</p>
            </div>
          </div>
          <p className="text-white/80 text-xs mt-4 text-center">
            All audit programs include risk-control linkage, financial statement assertions, and data analytics procedures
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Selection Card */}
        <div className="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-8">
          <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-6">
            Configure Your Audit Program
          </h2>

          {/* Industry Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#475569] mb-2">
              Select Industry
            </label>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white text-[#475569]"
            >
              <option value="">Choose an industry...</option>
              {industries.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </div>

          {/* Process Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#475569] mb-2">
              Select Process
            </label>
            <select
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white text-[#475569]"
            >
              <option value="">Choose a process...</option>
              {processes.map((process) => (
                <option key={process.id} value={process.id}>
                  {process.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assessment Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#475569] mb-2">
              Assessment Type
            </label>
            <select
              value={assessmentType}
              onChange={(e) => setAssessmentType(e.target.value)}
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white text-[#475569]"
            >
              <option value="program-only">Process Audit Program Only (Most Common)</option>
              <option value="governance-only">Risk Management & Governance Assessment Only</option>
              <option value="comprehensive">Comprehensive Assessment (Both)</option>
            </select>
            <p className="text-xs text-[#64748b] mt-2">
              {assessmentType === 'program-only' && '✓ Generates audit program for the selected process (assumes governance already assessed)'}
              {assessmentType === 'governance-only' && '✓ Entity-level assessment of risk management and governance structures'}
              {assessmentType === 'comprehensive' && '✓ Includes both governance assessment and process audit program (for initial engagements)'}
            </p>
          </div>

          {/* Sample Size Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#475569] mb-3">
              Sample Size Methodology
            </label>
            <div className="space-y-3">
              {sampleMethods.map((method) => (
                <label
                  key={method.id}
                  className="flex items-start p-4 border border-[#e2e8f0] rounded-lg cursor-pointer hover:bg-[#f8fafc] transition-colors"
                >
                  <input
                    type="radio"
                    name="sampleMethod"
                    value={method.id}
                    checked={selectedMethod === method.id}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-[#1e3a8a]">{method.name}</div>
                    <div className="text-sm text-[#64748b]">{method.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Statistical Sampling Inputs */}
          {selectedMethod === 'statistical' && (
            <div className="mb-6 p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
              <h3 className="font-medium text-[#1e3a8a] mb-4">Statistical Parameters</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-[#475569] mb-2">Population Size</label>
                  <input
                    type="number"
                    value={populationSize}
                    onChange={(e) => setPopulationSize(e.target.value)}
                    placeholder="e.g., 1000"
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#475569] mb-2">Confidence Level</label>
                  <select
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  >
                    <option value="90">90%</option>
                    <option value="95">95%</option>
                    <option value="99">99%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#475569] mb-2">Error Rate (%)</label>
                  <input
                    type="number"
                    value={errorRate}
                    onChange={(e) => setErrorRate(e.target.value)}
                    placeholder="e.g., 5"
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Custom Input Fields */}
          {selectedMethod === 'custom' && (
            <div className="mb-6 p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
              <h3 className="font-medium text-[#1e3a8a] mb-4">Custom Sampling Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#475569] mb-2">Sample Size</label>
                  <input
                    type="number"
                    value={customSampleSize}
                    onChange={(e) => setCustomSampleSize(e.target.value)}
                    placeholder="e.g., 30"
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#475569] mb-2">Sampling Methodology</label>
                  <input
                    type="text"
                    value={customMethodology}
                    onChange={(e) => setCustomMethodology(e.target.value)}
                    placeholder="e.g., Systematic sampling, Random sampling"
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#475569] mb-2">Justification</label>
                  <textarea
                    value={customJustification}
                    onChange={(e) => setCustomJustification(e.target.value)}
                    placeholder="Explain your rationale for this sample size and methodology..."
                    rows={3}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
              canGenerate && !isGenerating
                ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white cursor-pointer'
                : 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed'
            }`}
          >
            {isGenerating ? 'Generating Audit Program...' : 'Generate Audit Program'}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-[#64748b]">
          <p>Powered by AI • Built for Internal Auditors</p>
        </div>
      </div>
    </div>
  );
}
