'use client';

import { useState } from 'react';
import { exportGovernanceToExcel } from '../lib/exportGovernanceToExcel';

export function useGovernance({ sectorContext, auditeeDetails, setGenerationMode, setShowResults, setError, onGenerateAuditProgram }) {
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
  };
}
