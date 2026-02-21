'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
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
  const [engagementId, setEngagementId] = useState(null);
  const [generationMode, setGenerationMode] = useState('audit');
  const [sectorContext, setSectorContext] = useState('');
  const [jurisdiction, setJurisdiction] = useState('International');
  const [showResults, setShowResults] = useState(false);
  const [isRestoring, setIsRestoring] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!sessionStorage.getItem('verifai_prefill');
  });
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
    engagementId, setEngagementId,
  });

  const governance = useGovernance({
    sectorContext, auditeeDetails, setGenerationMode, setShowResults, setError,
    onGenerateAuditProgram: audit.handleGenerate,
    engagementId, setEngagementId,
  });

  const walkthrough = useWalkthrough({
    sectorContext, selectedProcess, auditeeDetails, jurisdiction,
    setGenerationMode, setShowResults, setError,
    engagementId, setEngagementId,
  });

  // -------------------------------------------------------------------------
  // Restore saved engagement from sessionStorage (set by /engagements/[id] Open flow)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem('verifai_prefill');
    if (!raw) return;
    setIsRestoring(true);
    sessionStorage.removeItem('verifai_prefill');
    let prefill;
    try { prefill = JSON.parse(raw); } catch { setIsRestoring(false); return; }

    const { engagementId: prefillId, mode, process: prefillProcess,
            sectorContext: prefillSector, jurisdiction: prefillJurisdiction,
            clientName, department, periodFrom, periodTo,
            engagementRef, auditorName, primaryContactName, primaryContactTitle } = prefill;

    // Restore form fields
    setAuditeeDetails({
      clientName: clientName || '',
      department: department || '',
      periodFrom: periodFrom || '',
      periodTo: periodTo || '',
      engagementRef: engagementRef || '',
      auditorName: auditorName || '',
      primaryContactName: primaryContactName || '',
      primaryContactTitle: primaryContactTitle || '',
    });
    if (prefillProcess) setSelectedProcess(prefillProcess);
    if (prefillSector) setSectorContext(prefillSector);
    if (prefillJurisdiction) setJurisdiction(prefillJurisdiction);
    if (prefillId) setEngagementId(prefillId);

    if (!prefillId || !mode) { setIsRestoring(false); return; }

    const pathMap = { audit: 'audit-program', walkthrough: 'walkthrough', governance: 'governance', report: 'report' };
    const path = pathMap[mode];
    if (!path) { setIsRestoring(false); return; }

    fetch(`/api/engagements/${prefillId}/${path}`)
      .then(r => r.json())
      .then(result => {
        if (!result.success || !result.data) { setGenerationMode(mode); return; }
        const data = result.data.current_version;
        if (mode === 'audit') {
          audit.loadSavedProgram(data, result.data.analytics_tests);
          setGenerationMode('audit');
          setShowResults(true);
        } else if (mode === 'walkthrough') {
          walkthrough.loadSavedWalkthrough(data);
          setGenerationMode('walkthrough');
          setShowResults(true);
        } else if (mode === 'governance') {
          governance.loadSavedAssessment(data);
          setGenerationMode('governance');
          setShowResults(true);
        } else if (mode === 'report') {
          setAuditReport(data);
          setGenerationMode('report');
          setShowResults(true);
        }
      })
      .catch(err => console.error('Failed to restore saved engagement:', err))
      .finally(() => setIsRestoring(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        // Persist to DB
        let currentEngagementId = engagementId;
        try {
          if (!currentEngagementId) {
            const engRes = await fetch('/api/engagements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientName: auditeeDetails.clientName,
                department: auditeeDetails.department,
                periodFrom: auditeeDetails.periodFrom,
                periodTo: auditeeDetails.periodTo,
                engagementRef: auditeeDetails.engagementRef,
                auditorName: auditeeDetails.auditorName,
                primaryContactName: auditeeDetails.primaryContactName,
                primaryContactTitle: auditeeDetails.primaryContactTitle,
                sectorContext: sectorContext || null,
                jurisdiction,
              }),
            });
            const engData = await engRes.json();
            if (engData.success) {
              currentEngagementId = engData.data.id;
              setEngagementId(currentEngagementId);
            }
          }
          if (currentEngagementId) {
            fetch(`/api/engagements/${currentEngagementId}/report`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ report: result.data, sourceFindings: findings }),
            }).catch(err => console.error('Failed to persist report:', err));
          }
        } catch (persistErr) {
          console.error('Failed to persist report:', persistErr);
        }
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
    setEngagementId(null);
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

  if (isRestoring) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

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
    <div>
      <div className="flex justify-between items-center px-6 pt-4">
        <span className="font-semibold text-gray-900 text-sm">Verifai</span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            My Engagements
          </Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
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
    </div>
  );
}
