'use client';

import { useState } from 'react';
import { analyticsLibrary } from '../lib/analyticsLibrary';
import { getProcessLabel } from '../lib/processNames';
import { exportToExcel as exportToExcelLib } from '../lib/exportToExcel';

function sanitizeProgram(program) {
  if (!program) return program;
  const controlIds = new Set((program.controls || []).map(c => c.id));
  const riskIds = new Set((program.risks || []).map(r => r.id));
  const risks = (program.risks || []).map(risk => ({
    ...risk,
    relatedControls: (risk.relatedControls || []).filter(id => controlIds.has(id)),
  }));
  const controls = (program.controls || []).map(control => ({
    ...control,
    mitigatesRisks: (control.mitigatesRisks || []).filter(id => riskIds.has(id)),
  }));
  return { ...program, risks, controls };
}

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

export function useAuditProgram({ sectorContext, selectedProcess, auditeeDetails, jurisdiction, setGenerationMode, setShowResults, setError }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [auditProgram, setAuditProgram] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProgram, setEditedProgram] = useState(null);
  const [originalProgram, setOriginalProgram] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [analyticsTests, setAnalyticsTests] = useState([]);
  const [analyticsFile, setAnalyticsFile] = useState(null);
  const [analyticsResults, setAnalyticsResults] = useState({});
  const [columnMappings, setColumnMappings] = useState({});
  const [analyticsErrors, setAnalyticsErrors] = useState({});
  const [raisedFindings, setRaisedFindings] = useState([]);
  const [exitMeeting, setExitMeeting] = useState(null);
  const [isGeneratingExitMeeting, setIsGeneratingExitMeeting] = useState(false);

  const canGenerate = !!selectedProcess;

  const handleGenerate = async (extraContext, uploadedDocs) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectorContext: sectorContext || undefined,
          process: selectedProcess,
          clientContext: extraContext || undefined,
          jurisdiction,
          uploadedDocs: uploadedDocs?.length ? uploadedDocs : undefined,
        }),
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

  const enterEditMode = () => setIsEditMode(true);

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

  const updateObjective = (index, value) => {
    const updated = [...editedProgram.auditObjectives];
    updated[index] = value;
    setEditedProgram({ ...editedProgram, auditObjectives: updated });
  };

  const deleteObjective = (index) => {
    const updated = editedProgram.auditObjectives.filter((_, i) => i !== index);
    setEditedProgram({ ...editedProgram, auditObjectives: updated });
  };

  const addObjective = () => {
    const updated = [...(editedProgram.auditObjectives || []), 'New objective'];
    setEditedProgram({ ...editedProgram, auditObjectives: updated });
  };

  const updateRisk = (index, field, value) => {
    const updated = [...editedProgram.risks];
    updated[index] = { ...updated[index], [field]: value };
    setEditedProgram({ ...editedProgram, risks: updated });
  };

  const deleteRisk = (index) => {
    const riskToDelete = editedProgram.risks[index];
    const updated = editedProgram.risks.filter((_, i) => i !== index);
    const renumbered = updated.map((risk, i) => ({ ...risk, id: `R${String(i + 1).padStart(3, '0')}` }));
    const updatedControls = editedProgram.controls.map(control => ({
      ...control,
      mitigatesRisks: control.mitigatesRisks
        ?.filter(rId => rId !== riskToDelete.id)
        .map(rId => {
          const oldIndex = parseInt(rId.substring(1));
          const newIndex = oldIndex > (index + 1) ? oldIndex - 1 : oldIndex;
          return `R${String(newIndex).padStart(3, '0')}`;
        }),
    }));
    setEditedProgram({ ...editedProgram, risks: renumbered, controls: updatedControls });
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
      frameworkReference: '',
    };
    setEditedProgram({ ...editedProgram, risks: [...(editedProgram.risks || []), newRisk] });
  };

  const updateControl = (index, field, value) => {
    const updated = [...editedProgram.controls];
    updated[index] = { ...updated[index], [field]: value };
    setEditedProgram({ ...editedProgram, controls: updated });
  };

  const deleteControl = (index) => {
    const controlToDelete = editedProgram.controls[index];
    const updated = editedProgram.controls.filter((_, i) => i !== index);
    const renumbered = updated.map((control, i) => ({ ...control, id: `C${String(i + 1).padStart(3, '0')}` }));
    const updatedRisks = editedProgram.risks.map(risk => ({
      ...risk,
      relatedControls: risk.relatedControls
        ?.filter(cId => cId !== controlToDelete.id)
        .map(cId => {
          const oldIndex = parseInt(cId.substring(1));
          const newIndex = oldIndex > (index + 1) ? oldIndex - 1 : oldIndex;
          return `C${String(newIndex).padStart(3, '0')}`;
        }),
    }));
    const updatedProcedures = editedProgram.auditProcedures
      .filter(proc => proc.controlId !== controlToDelete.id)
      .map(proc => {
        const oldIndex = parseInt(proc.controlId.substring(1));
        const newIndex = oldIndex > (index + 1) ? oldIndex - 1 : oldIndex;
        return { ...proc, controlId: `C${String(newIndex).padStart(3, '0')}` };
      });
    setEditedProgram({ ...editedProgram, controls: renumbered, risks: updatedRisks, auditProcedures: updatedProcedures });
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
      frameworkReference: '',
    };
    setEditedProgram({ ...editedProgram, controls: [...(editedProgram.controls || []), newControl] });
  };

  const updateProcedure = (index, field, value) => {
    const updated = [...editedProgram.auditProcedures];
    updated[index] = { ...updated[index], [field]: value };
    setEditedProgram({ ...editedProgram, auditProcedures: updated });
  };

  const deleteProcedure = (index) => {
    const updated = editedProgram.auditProcedures.filter((_, i) => i !== index);
    setEditedProgram({ ...editedProgram, auditProcedures: updated });
  };

  const addProcedure = () => {
    const defaultControlId = editedProgram.controls?.length > 0 ? editedProgram.controls[0].id : 'C001';
    const newProcedure = {
      controlId: defaultControlId,
      procedure: 'New audit procedure description',
      testingMethod: 'Inquiry',
      sampleSize: '25 samples',
      expectedEvidence: 'Documentation or evidence to be reviewed',
      frameworkReference: 'IIA Standard 2310: Identifying Information',
    };
    setEditedProgram({ ...editedProgram, auditProcedures: [...(editedProgram.auditProcedures || []), newProcedure] });
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
      sectorContext,
      selectedProcess,
    });
  };

  const handleAnalyticsFileLoad = (fileData) => {
    setAnalyticsFile(fileData);
    setAnalyticsResults({});
    setColumnMappings({});
  };

  const handleRunAnalyticsTest = async (testId, columns) => {
    if (!analyticsFile) return;
    setColumnMappings(prev => ({ ...prev, [testId]: columns }));
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, columns, rows: analyticsFile.rows, headers: analyticsFile.headers }),
      });
      const result = await response.json();
      if (result.success) {
        setAnalyticsErrors(prev => ({ ...prev, [testId]: null }));
        setAnalyticsResults(prev => ({
          ...prev,
          [testId]: {
            exceptionCount: result.exceptionCount,
            totalRows: result.totalRows,
            headers: result.headers,
            sampleRows: result.sampleRows,
            conclusion: prev[testId]?.conclusion || '',
            workDone: prev[testId]?.workDone || '',
          },
        }));
      } else {
        setAnalyticsErrors(prev => ({ ...prev, [testId]: result.error || 'Test failed. Please check your column mapping and try again.' }));
      }
    } catch (err) {
      setAnalyticsErrors(prev => ({ ...prev, [testId]: 'Could not connect to the analytics service. Please try again.' }));
    }
  };

  const updateAnalyticsField = (testId, field, value) => {
    setAnalyticsResults(prev => ({ ...prev, [testId]: { ...prev[testId], [field]: value } }));
  };

  const handleRaiseFinding = (test, result) => {
    const ref = `ANA-${test.id}`;
    const riskRef = test.riskId ? ` (${test.riskId})` : '';
    setRaisedFindings(prev => {
      const filtered = prev.filter(f => f.ref !== ref);
      return [...filtered, {
        ref,
        controlId: '',
        riskId: test.riskId || '',
        findingDescription: `Control Deficiency — ${test.name}: ${result.exceptionCount} exception${result.exceptionCount !== 1 ? 's' : ''} identified out of ${result.totalRows} records tested${riskRef}. ${test.purpose} Exceptions on a population test indicate that the control designed to mitigate this risk is not operating effectively.`,
        riskRating: result.exceptionCount > 0 ? 'High' : 'Low',
        rootCause: result.workDone || '',
        managementResponse: '',
        dueDate: '',
        status: 'Open',
      }];
    });
  };

  const handleGenerateExitMeeting = async (programToUse) => {
    setIsGeneratingExitMeeting(true);
    try {
      const res = await fetch('/api/exitmeeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditProgram: programToUse,
          auditeeDetails,
          processName: getProcessLabel(selectedProcess),
          sectorContext: sectorContext || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) setExitMeeting(result.data);
    } catch (err) {
      console.error('Exit meeting generation failed:', err);
    } finally {
      setIsGeneratingExitMeeting(false);
    }
  };

  const resetAuditProgram = () => {
    setAuditProgram(null);
    setAnalyticsTests([]);
    setAnalyticsFile(null);
    setAnalyticsResults({});
    setColumnMappings({});
    setAnalyticsErrors({});
    setExitMeeting(null);
    // raisedFindings intentionally NOT reset — persists across generates in same session
  };

  return {
    canGenerate,
    isGenerating,
    auditProgram,
    isEditMode,
    editedProgram,
    originalProgram,
    confirmReset,
    analyticsTests,
    analyticsFile,
    analyticsResults,
    columnMappings,
    analyticsErrors,
    raisedFindings,
    exitMeeting,
    isGeneratingExitMeeting,
    handleGenerate,
    enterEditMode,
    cancelEdit,
    resetToAI,
    saveEdits,
    setConfirmReset,
    setEditedProgram,
    updateObjective,
    deleteObjective,
    addObjective,
    updateRisk,
    deleteRisk,
    addRisk,
    updateControl,
    deleteControl,
    addControl,
    updateProcedure,
    deleteProcedure,
    addProcedure,
    updateAnalyticsRisk,
    toggleAnalyticsTest,
    exportToExcel,
    handleAnalyticsFileLoad,
    handleRunAnalyticsTest,
    updateAnalyticsField,
    handleRaiseFinding,
    handleGenerateExitMeeting,
    resetAuditProgram,
  };
}
