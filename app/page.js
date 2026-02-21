'use client';

import { useState } from 'react';
import GenerationForm from './components/GenerationForm';
import AuditProgramView from './components/AuditProgramView';
import GovernanceView from './components/GovernanceView';
import ReportView from './components/ReportView';
import WalkthroughView from './components/WalkthroughView';
import { useAuditProgram } from './hooks/useAuditProgram';
import { useGovernance } from './hooks/useGovernance';
import { useWalkthrough } from './hooks/useWalkthrough';

export default function Verifai() {
  // -------------------------------------------------------------------------
  // Shared state
  // -------------------------------------------------------------------------
  const [generationMode, setGenerationMode] = useState('audit');
  const [sectorContext, setSectorContext] = useState('');
  const [jurisdiction, setJurisdiction] = useState('International');
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProcess, setSelectedProcess] = useState('');
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

  const updateAuditeeDetail = (field, value) =>
    setAuditeeDetails(prev => ({ ...prev, [field]: value }));

  // -------------------------------------------------------------------------
  // Report state (simple — stays in page.js)
  // -------------------------------------------------------------------------
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [reportSourceFindings, setReportSourceFindings] = useState(null);

  // -------------------------------------------------------------------------
  // Domain hooks
  // -------------------------------------------------------------------------
  const audit = useAuditProgram({
    sectorContext, selectedProcess, auditeeDetails, jurisdiction,
    setGenerationMode, setShowResults, setError,
  });

  const governance = useGovernance({
    sectorContext, auditeeDetails, setGenerationMode, setShowResults, setError,
    onGenerateAuditProgram: audit.handleGenerate,
  });

  const walkthrough = useWalkthrough({
    sectorContext, selectedProcess, auditeeDetails, jurisdiction,
    setGenerationMode, setShowResults, setError,
  });

  // -------------------------------------------------------------------------
  // Report handler
  // -------------------------------------------------------------------------
  const handleGenerateReport = async ({ engagementDetails, findings }) => {
    setReportSourceFindings(findings);
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

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------
  const resetForm = () => {
    setSectorContext('');
    setSelectedProcess('');
    setJurisdiction('International');
    setShowResults(false);
    setError(null);
    audit.resetAuditProgram();
    governance.resetGovernance();
    walkthrough.resetWalkthrough();
    // auditeeDetails intentionally NOT reset — persists across multiple generates in same session
  };

  const handleStartOver = () => {
    if (!window.confirm('This will clear your current working paper. Are you sure?')) return;
    resetForm();
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (showResults && generationMode === 'report' && auditReport) {
    return (
      <ReportView
        report={auditReport}
        sourceFindings={reportSourceFindings}
        onReset={() => { setAuditReport(null); setReportSourceFindings(null); setShowResults(false); setGenerationMode('report'); }}
      />
    );
  }

  if (showResults && generationMode === 'walkthrough' && walkthrough.walkthroughResults) {
    return (
      <WalkthroughView
        walkthrough={walkthrough.walkthroughResults}
        auditeeDetails={auditeeDetails}
        onExportExcel={walkthrough.handleExportWalkthrough}
        onGenerateAuditProgram={walkthrough.handleGenerateFromWalkthrough}
        onStartOver={handleStartOver}
      />
    );
  }

  if (showResults && generationMode === 'governance' && governance.governanceAssessment) {
    return (
      <GovernanceView
        assessment={governance.governanceAssessment}
        auditeeDetails={auditeeDetails}
        onExportExcel={governance.handleExportGovernance}
        onGenerateAuditProgram={governance.handleGenerateFromAssessment}
        onStartOver={handleStartOver}
        isGeneratingAudit={audit.isGenerating}
      />
    );
  }

  if (showResults && audit.auditProgram) {
    return (
      <AuditProgramView
        auditProgram={audit.auditProgram}
        editedProgram={audit.editedProgram}
        isEditMode={audit.isEditMode}
        analyticsTests={audit.analyticsTests}
        confirmReset={audit.confirmReset}
        selectedProcess={selectedProcess}
        sectorContext={sectorContext}
        enterEditMode={audit.enterEditMode}
        saveEdits={audit.saveEdits}
        cancelEdit={audit.cancelEdit}
        resetToAI={audit.resetToAI}
        setConfirmReset={audit.setConfirmReset}
        exportToExcel={audit.exportToExcel}
        resetForm={handleStartOver}
        addObjective={audit.addObjective}
        deleteObjective={audit.deleteObjective}
        updateObjective={audit.updateObjective}
        addRisk={audit.addRisk}
        deleteRisk={audit.deleteRisk}
        updateRisk={audit.updateRisk}
        setEditedProgram={audit.setEditedProgram}
        addControl={audit.addControl}
        deleteControl={audit.deleteControl}
        updateControl={audit.updateControl}
        addProcedure={audit.addProcedure}
        deleteProcedure={audit.deleteProcedure}
        updateProcedure={audit.updateProcedure}
        updateAnalyticsRisk={audit.updateAnalyticsRisk}
        toggleAnalyticsTest={audit.toggleAnalyticsTest}
        analyticsFile={audit.analyticsFile}
        analyticsResults={audit.analyticsResults}
        analyticsErrors={audit.analyticsErrors}
        onAnalyticsFileLoad={audit.handleAnalyticsFileLoad}
        onRunAnalyticsTest={audit.handleRunAnalyticsTest}
        onUpdateAnalyticsField={audit.updateAnalyticsField}
        onRaiseFinding={audit.handleRaiseFinding}
        raisedFindings={audit.raisedFindings}
        auditeeDetails={auditeeDetails}
        exitMeeting={audit.exitMeeting}
        isGeneratingExitMeeting={audit.isGeneratingExitMeeting}
        onGenerateExitMeeting={audit.handleGenerateExitMeeting}
      />
    );
  }

  return (
    <GenerationForm
      // shared
      generationMode={generationMode}
      setGenerationMode={setGenerationMode}
      sectorContext={sectorContext}
      setSectorContext={setSectorContext}
      auditeeDetails={auditeeDetails}
      isGenerating={audit.isGenerating}
      isGeneratingGovernance={governance.isGeneratingGovernance}
      error={error}
      updateAuditeeDetail={updateAuditeeDetail}
      // audit program
      selectedProcess={selectedProcess}
      canGenerate={audit.canGenerate}
      setSelectedProcess={setSelectedProcess}
      handleGenerate={audit.handleGenerate}
      // governance
      companyType={governance.companyType}
      setCompanyType={governance.setCompanyType}
      canGenerateGovernance={governance.canGenerateGovernance}
      handleGenerateGovernance={governance.handleGenerateGovernance}
      // report
      handleGenerateReport={handleGenerateReport}
      isGeneratingReport={isGeneratingReport}
      // rmga enrichment
      governanceAssessment={governance.governanceAssessment}
      // analytics raised findings
      raisedFindings={audit.raisedFindings}
      // walkthrough
      isGeneratingWalkthrough={walkthrough.isGeneratingWalkthrough}
      handleGenerateWalkthrough={walkthrough.handleGenerateWalkthrough}
      walkthroughClientContext={walkthrough.walkthroughClientContext}
      // jurisdiction
      jurisdiction={jurisdiction}
      setJurisdiction={setJurisdiction}
    />
  );
}
