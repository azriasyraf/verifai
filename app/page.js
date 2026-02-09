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
          sampleData
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

    const data = auditProgram.auditProcedures.map((proc, index) => {
      const control = auditProgram.controls.find(c => c.id === proc.controlId);
      const risk = auditProgram.risks[index % auditProgram.risks.length];

      return {
        'Control ID': proc.controlId,
        'Risk Category': risk.category,
        'Risk Description': risk.description,
        'Control Description': control?.description || '',
        'Control Type': control?.type || '',
        'Audit Procedure': proc.procedure,
        'Testing Method': proc.testingMethod,
        'Sample Size': proc.sampleSize,
        'Expected Evidence': proc.expectedEvidence
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Program');

    const industryName = industries.find(i => i.id === selectedIndustry)?.name;
    const processName = processes.find(p => p.id === selectedProcess)?.name;
    const date = new Date().toISOString().split('T')[0];
    const filename = `Audit_Program_${industryName}_${processName}_${date}.xlsx`.replace(/[^a-zA-Z0-9_.-]/g, '_');

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

          {/* Risks */}
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

          {/* Controls */}
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

          {/* Audit Procedures */}
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
                  <p className="text-[#475569] mb-4 font-medium">{proc.procedure}</p>

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
