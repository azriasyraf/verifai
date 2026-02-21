'use client';

import { useState, useEffect } from 'react';
import { exportGovernanceToExcel } from '../lib/exportGovernanceToExcel';

export function useGovernance({ sectorContext, auditeeDetails, setGenerationMode, setShowResults, setError, onGenerateAuditProgram, engagementId, setEngagementId }) {
  const [companyType, setCompanyType] = useState('');
  const [isGeneratingGovernance, setIsGeneratingGovernance] = useState(false);
  const [governanceAssessment, setGovernanceAssessment] = useState(null);
  const [governanceContext, setGovernanceContext] = useState('');

  const canGenerateGovernance = !!companyType;

  const handleGenerateGovernance = async () => {
    setIsGeneratingGovernance(true);
    setError(null);
    try {
      const response = await fetch('/api/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectorContext: sectorContext || undefined, companyType, auditeeDetails }),
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
              }),
            });
            const engData = await engRes.json();
            if (engData.success) {
              currentEngagementId = engData.data.id;
              setEngagementId(currentEngagementId);
            }
          }
          if (currentEngagementId) {
            await fetch(`/api/engagements/${currentEngagementId}/governance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ assessment: result.data }),
            });
          }
        } catch (persistErr) {
          console.error('Failed to persist governance assessment:', persistErr);
        }
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

  const handleGenerateFromAssessment = async () => {
    if (!governanceAssessment) return;
    const contextLines = [
      `Governance Assessment: ${governanceAssessment.assessmentTitle}`,
      `Overall Maturity: ${governanceAssessment.overallMaturityRating}`,
      `Maturity Rationale: ${governanceAssessment.maturityRationale}`,
    ];
    if (governanceAssessment.keyObservations?.length) {
      contextLines.push('Key Observations:\n' + governanceAssessment.keyObservations.map(o => `- ${o}`).join('\n'));
    }
    if (governanceAssessment.recommendations?.length) {
      contextLines.push('Governance Recommendations:\n' + governanceAssessment.recommendations.map(r => `- ${r}`).join('\n'));
    }
    const ctx = contextLines.join('\n\n');
    setGovernanceContext(ctx);
    await onGenerateAuditProgram(ctx);
  };

  const handleExportGovernance = (enrichedAssessment) => {
    exportGovernanceToExcel(enrichedAssessment || governanceAssessment, auditeeDetails);
  };

  const resetGovernance = () => {
    setGovernanceAssessment(null);
    setGovernanceContext('');
  };

  // Auto-save: debounced 2s PATCH on assessment change
  useEffect(() => {
    if (!engagementId || !governanceAssessment) return;
    const timer = setTimeout(() => {
      fetch(`/api/engagements/${engagementId}/governance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_version: governanceAssessment }),
      }).catch(err => console.error('Auto-save governance failed:', err));
    }, 2000);
    return () => clearTimeout(timer);
  }, [governanceAssessment, engagementId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSavedAssessment = (savedData) => {
    setGovernanceAssessment(savedData);
  };

  return {
    companyType,
    setCompanyType,
    isGeneratingGovernance,
    governanceAssessment,
    governanceContext,
    canGenerateGovernance,
    handleGenerateGovernance,
    handleGenerateFromAssessment,
    handleExportGovernance,
    resetGovernance,
    loadSavedAssessment,
  };
}
