'use client';

import { useState } from 'react';
import { exportWalkthroughToExcel } from '../lib/exportWalkthroughToExcel';

export function useWalkthrough({ sectorContext, selectedProcess, auditeeDetails, jurisdiction, setGenerationMode, setShowResults, setError }) {
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

  return {
    walkthroughResults,
    isGeneratingWalkthrough,
    walkthroughClientContext,
    handleGenerateWalkthrough,
    handleExportWalkthrough,
    handleGenerateFromWalkthrough,
    resetWalkthrough,
  };
}
