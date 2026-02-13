'use client';

import { useState } from 'react';
import { analyticsLibrary } from './lib/analyticsLibrary';
import { exportToExcel as exportToExcelLib } from './lib/exportToExcel';
import { exportGovernanceToExcel } from './lib/exportGovernanceToExcel';
import GenerationForm from './components/GenerationForm';
import AuditProgramView from './components/AuditProgramView';
import GovernanceView from './components/GovernanceView';
import ReportView from './components/ReportView';

// Strips invalid cross-references from AI-generated data
function sanitizeProgram(program) {
  if (!program) return program;
  const controlIds = new Set((program.controls || []).map(c => c.id));
  const riskIds = new Set((program.risks || []).map(r => r.id));

  const risks = (program.risks || []).map(risk => ({
    ...risk,
    relatedControls: (risk.relatedControls || []).filter(id => controlIds.has(id))
  }));

  const controls = (program.controls || []).map(control => ({
    ...control,
    mitigatesRisks: (control.mitigatesRisks || []).filter(id => riskIds.has(id))
  }));

  const auditProcedures = (program.auditProcedures || []).filter(
    proc => controlIds.has(proc.controlId)
  );

  return { ...program, risks, controls, auditProcedures };
}

// Maps analytics tests to risks by keyword matching
function mapAnalyticsToRisks(program, process) {
  const tests = analyticsLibrary[process] || [];
  const risks = program.risks || [];
  return tests.map(test => {
    const matched = risks.find(risk =>
      test.keywords.some(kw => risk.description.toLowerCase().includes(kw.toLowerCase()))
    );
    return { ...test, riskId: matched?.id || null, included: true };
  });
}

export default function Verifai() {
  // -------------------------------------------------------------------------
  // Generation mode: 'audit' | 'governance'
  // -------------------------------------------------------------------------
  const [generationMode, setGenerationMode] = useState('audit');

  // -------------------------------------------------------------------------
  // Shared state
  // -------------------------------------------------------------------------
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);

  // Auditee / engagement details — shared across both modes
  const [auditeeDetails, setAuditeeDetails] = useState({
    clientName: '',
    department: '',
    periodFrom: '',
    periodTo: '',
    engagementRef: '',
    auditorName: '',
    primaryContactName: '',
    primaryContactTitle: '',
  });

  const updateAuditeeDetail = (field, value) => {
    setAuditeeDetails(prev => ({ ...prev, [field]: value }));
  };

  // -------------------------------------------------------------------------
  // Audit Program state (existing — unchanged)
  // -------------------------------------------------------------------------
  const [selectedProcess, setSelectedProcess] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [auditProgram, setAuditProgram] = useState(null);

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProgram, setEditedProgram] = useState(null);
  const [originalProgram, setOriginalProgram] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Analytics tests state (list of tests from library, with riskId/included)
  const [analyticsTests, setAnalyticsTests] = useState([]);

  // Analytics execution state (Phase 1 MVP)
  const [analyticsFile, setAnalyticsFile] = useState(null); // { headers, rows }
  const [analyticsResults, setAnalyticsResults] = useState({}); // testId → { exceptionCount, totalRows, headers, sampleRows, conclusion, notes }
  const [columnMappings, setColumnMappings] = useState({}); // testId → { fieldName: colIndex }

  const canGenerate = selectedIndustry && selectedProcess;

  // -------------------------------------------------------------------------
  // Governance Assessment state (new)
  // -------------------------------------------------------------------------
  const [companyType, setCompanyType] = useState('');
  const [isGeneratingGovernance, setIsGeneratingGovernance] = useState(false);
  const [governanceAssessment, setGovernanceAssessment] = useState(null);
  // Context string derived from a completed governance assessment, passed into
  // the audit program prompt when "Generate Audit Program from Assessment" is used
  const [governanceContext, setGovernanceContext] = useState('');

  const canGenerateGovernance = selectedIndustry && companyType;

  // -------------------------------------------------------------------------
  // Report state
  // -------------------------------------------------------------------------
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [auditReport, setAuditReport] = useState(null);

  // -------------------------------------------------------------------------
  // Audit Program handlers (existing — unchanged)
  // -------------------------------------------------------------------------
  const handleGenerate = async (extraContext) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: selectedIndustry,
          process: selectedProcess,
          clientContext: extraContext || undefined,
        })
      });

      const result = await response.json();

      if (result.success) {
        const cleanData = sanitizeProgram(result.data);
        setAuditProgram(cleanData);
        setOriginalProgram(JSON.parse(JSON.stringify(cleanData)));
        setEditedProgram(JSON.parse(JSON.stringify(cleanData)));
        setAnalyticsTests(mapAnalyticsToRisks(cleanData, selectedProcess));
        setGenerationMode('audit');
        setShowResults(true);
        setIsEditMode(false);
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

  const enterEditMode = () => {
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setEditedProgram(JSON.parse(JSON.stringify(originalProgram)));
    setIsEditMode(false);
    setConfirmReset(false);
  };

  const resetToAI = () => {
    if (confirmReset) {
      setEditedProgram(JSON.parse(JSON.stringify(originalProgram)));
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
    }
  };

  const saveEdits = () => {
    setAuditProgram(editedProgram);
    setIsEditMode(false);
  };

  // Helper functions for editing
  const updateObjective = (index, value) => {
    const updated = [...editedProgram.auditObjectives];
    updated[index] = value;
    setEditedProgram({...editedProgram, auditObjectives: updated});
  };

  const deleteObjective = (index) => {
    const updated = editedProgram.auditObjectives.filter((_, i) => i !== index);
    setEditedProgram({...editedProgram, auditObjectives: updated});
  };

  const addObjective = () => {
    const updated = [...(editedProgram.auditObjectives || []), 'New objective'];
    setEditedProgram({...editedProgram, auditObjectives: updated});
  };

  const updateRisk = (index, field, value) => {
    const updated = [...editedProgram.risks];
    updated[index] = {...updated[index], [field]: value};
    setEditedProgram({...editedProgram, risks: updated});
  };

  const deleteRisk = (index) => {
    const riskToDelete = editedProgram.risks[index];
    const updated = editedProgram.risks.filter((_, i) => i !== index);

    // Renumber risk IDs
    const renumbered = updated.map((risk, i) => ({
      ...risk,
      id: `R${String(i + 1).padStart(3, '0')}`
    }));

    // Update control references to risks
    const updatedControls = editedProgram.controls.map(control => ({
      ...control,
      mitigatesRisks: control.mitigatesRisks
        ?.filter(rId => rId !== riskToDelete.id)
        .map(rId => {
          const oldIndex = parseInt(rId.substring(1));
          const newIndex = oldIndex > (index + 1) ? oldIndex - 1 : oldIndex;
          return `R${String(newIndex).padStart(3, '0')}`;
        })
    }));

    setEditedProgram({...editedProgram, risks: renumbered, controls: updatedControls});
  };

  const addRisk = () => {
    const newId = `R${String((editedProgram.risks?.length || 0) + 1).padStart(3, '0')}`;
    const newRisk = {
      id: newId,
      category: 'Financial',
      description: 'New risk description',
      rating: 'Medium',
      assertion: 'Completeness',
      relatedControls: [],
      frameworkReference: ''
    };
    const updated = [...(editedProgram.risks || []), newRisk];
    setEditedProgram({...editedProgram, risks: updated});
  };

  const updateControl = (index, field, value) => {
    const updated = [...editedProgram.controls];
    updated[index] = {...updated[index], [field]: value};
    setEditedProgram({...editedProgram, controls: updated});
  };

  const deleteControl = (index) => {
    const controlToDelete = editedProgram.controls[index];
    const updated = editedProgram.controls.filter((_, i) => i !== index);

    // Renumber control IDs
    const renumbered = updated.map((control, i) => ({
      ...control,
      id: `C${String(i + 1).padStart(3, '0')}`
    }));

    // Update risk references to controls
    const updatedRisks = editedProgram.risks.map(risk => ({
      ...risk,
      relatedControls: risk.relatedControls
        ?.filter(cId => cId !== controlToDelete.id)
        .map(cId => {
          const oldIndex = parseInt(cId.substring(1));
          const newIndex = oldIndex > (index + 1) ? oldIndex - 1 : oldIndex;
          return `C${String(newIndex).padStart(3, '0')}`;
        })
    }));

    // Update procedure references to controls
    const updatedProcedures = editedProgram.auditProcedures
      .filter(proc => proc.controlId !== controlToDelete.id)
      .map(proc => {
        const oldIndex = parseInt(proc.controlId.substring(1));
        const newIndex = oldIndex > (index + 1) ? oldIndex - 1 : oldIndex;
        return {...proc, controlId: `C${String(newIndex).padStart(3, '0')}`};
      });

    setEditedProgram({...editedProgram, controls: renumbered, risks: updatedRisks, auditProcedures: updatedProcedures});
  };

  const addControl = () => {
    const newId = `C${String((editedProgram.controls?.length || 0) + 1).padStart(3, '0')}`;
    const newControl = {
      id: newId,
      description: 'New control description',
      type: 'Preventive',
      frequency: 'Monthly',
      owner: '',
      ownerRole: '',
      ownerDepartment: '',
      mitigatesRisks: [],
      frameworkReference: ''
    };
    const updated = [...(editedProgram.controls || []), newControl];
    setEditedProgram({...editedProgram, controls: updated});
  };

  const updateProcedure = (index, field, value) => {
    const updated = [...editedProgram.auditProcedures];
    updated[index] = {...updated[index], [field]: value};
    setEditedProgram({...editedProgram, auditProcedures: updated});
  };

  const deleteProcedure = (index) => {
    const updated = editedProgram.auditProcedures.filter((_, i) => i !== index);
    setEditedProgram({...editedProgram, auditProcedures: updated});
  };

  const addProcedure = () => {
    // Default to first control if exists
    const defaultControlId = editedProgram.controls?.length > 0 ? editedProgram.controls[0].id : 'C001';
    const newProcedure = {
      controlId: defaultControlId,
      procedure: 'New audit procedure description',
      testingMethod: 'Inquiry',
      sampleSize: '25 samples',
      expectedEvidence: 'Documentation or evidence to be reviewed',
      frameworkReference: 'IIA Standard 2310: Identifying Information'
    };
    const updated = [...(editedProgram.auditProcedures || []), newProcedure];
    setEditedProgram({...editedProgram, auditProcedures: updated});
  };

  const updateAnalyticsRisk = (index, riskId) => {
    const updated = [...analyticsTests];
    updated[index] = { ...updated[index], riskId };
    setAnalyticsTests(updated);
  };

  const toggleAnalyticsTest = (index) => {
    const updated = [...analyticsTests];
    updated[index] = { ...updated[index], included: !updated[index].included };
    setAnalyticsTests(updated);
  };

  const exportToExcel = () => {
    exportToExcelLib(auditProgram, analyticsTests, auditeeDetails, {
      isEditMode,
      editedProgram,
      selectedIndustry,
      selectedProcess,
    });
  };

  // -------------------------------------------------------------------------
  // Analytics execution handlers (Phase 1 MVP)
  // -------------------------------------------------------------------------

  const handleAnalyticsFileLoad = (fileData) => {
    // fileData: { headers: string[], rows: any[][] }
    setAnalyticsFile(fileData);
    // Clear previous results when a new file is loaded
    setAnalyticsResults({});
    setColumnMappings({});
  };

  const handleRunAnalyticsTest = async (testId, columns) => {
    if (!analyticsFile) return;
    // Store column mapping for re-use / display
    setColumnMappings(prev => ({ ...prev, [testId]: columns }));

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          columns,
          rows: analyticsFile.rows,
          headers: analyticsFile.headers,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setAnalyticsResults(prev => ({
          ...prev,
          [testId]: {
            exceptionCount: result.exceptionCount,
            totalRows: result.totalRows,
            headers: result.headers,
            sampleRows: result.sampleRows,
            conclusion: prev[testId]?.conclusion || '',
            notes: prev[testId]?.notes || '',
          },
        }));
      } else {
        console.error('Analytics test failed:', result.error);
      }
    } catch (err) {
      console.error('Analytics test error:', err);
    }
  };

  const updateAnalyticsConclusion = (testId, field, value) => {
    setAnalyticsResults(prev => ({
      ...prev,
      [testId]: { ...prev[testId], [field]: value },
    }));
  };

  const resetForm = () => {
    setSelectedIndustry('');
    setSelectedProcess('');
    setShowResults(false);
    setAuditProgram(null);
    setGovernanceAssessment(null);
    setGovernanceContext('');
    setError(null);
    setAnalyticsTests([]);
    setAnalyticsFile(null);
    setAnalyticsResults({});
    setColumnMappings({});
    // Note: auditeeDetails intentionally NOT reset — persists across multiple generates in same session
  };

  // -------------------------------------------------------------------------
  // Governance Assessment handlers (new)
  // -------------------------------------------------------------------------
  const handleGenerateGovernance = async () => {
    setIsGeneratingGovernance(true);
    setError(null);

    try {
      const response = await fetch('/api/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: selectedIndustry,
          companyType,
          auditeeDetails,
        })
      });

      const result = await response.json();

      if (result.success) {
        setGovernanceAssessment(result.data);
        setGenerationMode('governance');
        setShowResults(true);
      } else {
        setError(result.error || 'Failed to generate governance assessment');
      }
    } catch (err) {
      setError('Failed to connect to generation service');
      console.error(err);
    } finally {
      setIsGeneratingGovernance(false);
    }
  };

  // -------------------------------------------------------------------------
  // Report handler
  // -------------------------------------------------------------------------
  const handleGenerateReport = async ({ engagementDetails, findings }) => {
    setIsGeneratingReport(true);
    setError(null);

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engagementDetails, findings }),
      });

      const result = await response.json();

      if (result.success) {
        setAuditReport(result.data);
        setGenerationMode('report');
        setShowResults(true);
      } else {
        setError(result.error || 'Failed to generate audit report');
      }
    } catch (err) {
      setError('Failed to connect to generation service');
      console.error(err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Triggered by "Generate Audit Program from Assessment" button in GovernanceView.
  // Builds a governance context summary and calls handleGenerate with it.
  const handleGenerateFromAssessment = async () => {
    if (!governanceAssessment) return;

    // Build a concise context string from the governance assessment results
    const contextLines = [
      `Governance Assessment: ${governanceAssessment.assessmentTitle}`,
      `Overall Maturity: ${governanceAssessment.overallMaturityRating}`,
      `Maturity Rationale: ${governanceAssessment.maturityRationale}`,
    ];

    if (governanceAssessment.keyObservations?.length) {
      contextLines.push(
        'Key Observations:\n' +
        governanceAssessment.keyObservations.map(o => `- ${o}`).join('\n')
      );
    }

    if (governanceAssessment.recommendations?.length) {
      contextLines.push(
        'Governance Recommendations:\n' +
        governanceAssessment.recommendations.map(r => `- ${r}`).join('\n')
      );
    }

    const ctx = contextLines.join('\n\n');
    setGovernanceContext(ctx);

    // Switch to audit results view after generation completes
    await handleGenerate(ctx);
  };

  // Export governance assessment to Excel — enriched with any in-progress responses
  const handleExportGovernance = (enrichedAssessment) => {
    exportGovernanceToExcel(enrichedAssessment || governanceAssessment, auditeeDetails);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Report results view
  if (showResults && generationMode === 'report' && auditReport) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <ReportView
            report={auditReport}
            onReset={() => { setAuditReport(null); setShowResults(false); setGenerationMode('report'); }}
          />
        </div>
      </div>
    );
  }

  // Governance assessment results view
  if (showResults && generationMode === 'governance' && governanceAssessment) {
    return (
      <GovernanceView
          assessment={governanceAssessment}
          auditeeDetails={auditeeDetails}
          onExportExcel={handleExportGovernance}
          onGenerateAuditProgram={handleGenerateFromAssessment}
          onStartOver={resetForm}
          isGeneratingAudit={isGenerating}
        />
    );
  }

  // Audit program results view (existing — unchanged)
  if (showResults && auditProgram) {
    return (
      <AuditProgramView
        auditProgram={auditProgram}
        editedProgram={editedProgram}
        isEditMode={isEditMode}
        analyticsTests={analyticsTests}
        confirmReset={confirmReset}
        selectedProcess={selectedProcess}
        selectedIndustry={selectedIndustry}
        enterEditMode={enterEditMode}
        saveEdits={saveEdits}
        cancelEdit={cancelEdit}
        resetToAI={resetToAI}
        setConfirmReset={setConfirmReset}
        exportToExcel={exportToExcel}
        resetForm={resetForm}
        addObjective={addObjective}
        deleteObjective={deleteObjective}
        updateObjective={updateObjective}
        addRisk={addRisk}
        deleteRisk={deleteRisk}
        updateRisk={updateRisk}
        setEditedProgram={setEditedProgram}
        addControl={addControl}
        deleteControl={deleteControl}
        updateControl={updateControl}
        addProcedure={addProcedure}
        deleteProcedure={deleteProcedure}
        updateProcedure={updateProcedure}
        updateAnalyticsRisk={updateAnalyticsRisk}
        toggleAnalyticsTest={toggleAnalyticsTest}
        analyticsFile={analyticsFile}
        analyticsResults={analyticsResults}
        onAnalyticsFileLoad={handleAnalyticsFileLoad}
        onRunAnalyticsTest={handleRunAnalyticsTest}
        onUpdateAnalyticsConclusion={updateAnalyticsConclusion}
        auditeeDetails={auditeeDetails}
      />
    );
  }

  // Form view
  return (
    <GenerationForm
      // shared
      generationMode={generationMode}
      setGenerationMode={setGenerationMode}
      selectedIndustry={selectedIndustry}
      auditeeDetails={auditeeDetails}
      isGenerating={isGenerating}
      isGeneratingGovernance={isGeneratingGovernance}
      error={error}
      setSelectedIndustry={setSelectedIndustry}
      updateAuditeeDetail={updateAuditeeDetail}
      // audit program
      selectedProcess={selectedProcess}
      canGenerate={canGenerate}
      setSelectedProcess={setSelectedProcess}
      handleGenerate={handleGenerate}
      // governance
      companyType={companyType}
      setCompanyType={setCompanyType}
      canGenerateGovernance={canGenerateGovernance}
      handleGenerateGovernance={handleGenerateGovernance}
      // report
      handleGenerateReport={handleGenerateReport}
      isGeneratingReport={isGeneratingReport}
      // rmga enrichment
      governanceAssessment={governanceAssessment}
    />
  );
}
