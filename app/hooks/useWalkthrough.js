'use client';

import { useState, useEffect } from 'react';
import { exportWalkthroughToExcel } from '../lib/exportWalkthroughToExcel';

export function useWalkthrough({ sectorContext, selectedProcess, auditeeDetails, jurisdiction, setGenerationMode, setShowResults, setError, engagementId, setEngagementId }) {
  const [walkthroughResults, setWalkthroughResults] = useState(null);
  const [isGeneratingWalkthrough, setIsGeneratingWalkthrough] = useState(false);
  const [walkthroughClientContext, setWalkthroughClientContext] = useState('');

  const handleGenerateWalkthrough = async () => {
    setIsGeneratingWalkthrough(true);
    setError(null);
    try {
      const res = await fetch('/api/walkthrough', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectorContext: sectorContext || undefined, process: selectedProcess, auditeeDetails, jurisdiction }),
      });
      const result = await res.json();
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
                process: selectedProcess,
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
            await fetch(`/api/engagements/${currentEngagementId}/walkthrough`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ walkthrough: result.data }),
            });
          }
        } catch (persistErr) {
          console.error('Failed to persist walkthrough:', persistErr);
        }
        setWalkthroughResults(result.data);
        setGenerationMode('walkthrough');
        setShowResults(true);
      } else {
        setError(result.error || 'Failed to generate walkthrough working paper');
      }
    } catch (err) {
      setError('Failed to connect to generation service');
      console.error(err);
    } finally {
      setIsGeneratingWalkthrough(false);
    }
  };

  const handleExportWalkthrough = (enriched) => {
    exportWalkthroughToExcel(enriched || walkthroughResults, auditeeDetails);
  };

  const handleGenerateFromWalkthrough = (contextString) => {
    setGenerationMode('audit');
    setShowResults(false);
    setWalkthroughClientContext(contextString || '');
  };

  const resetWalkthrough = () => {
    setWalkthroughResults(null);
    setIsGeneratingWalkthrough(false);
    setWalkthroughClientContext('');
  };

  // Auto-save: debounced 2s PATCH on walkthrough change
  useEffect(() => {
    if (!engagementId || !walkthroughResults) return;
    const timer = setTimeout(() => {
      fetch(`/api/engagements/${engagementId}/walkthrough`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_version: walkthroughResults }),
      }).catch(err => console.error('Auto-save walkthrough failed:', err));
    }, 2000);
    return () => clearTimeout(timer);
  }, [walkthroughResults, engagementId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSavedWalkthrough = (savedData) => {
    setWalkthroughResults(savedData);
  };

  return {
    walkthroughResults,
    isGeneratingWalkthrough,
    walkthroughClientContext,
    handleGenerateWalkthrough,
    handleExportWalkthrough,
    handleGenerateFromWalkthrough,
    resetWalkthrough,
    loadSavedWalkthrough,
  };
}
