'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

// Document icon used for "Documents to Obtain" lists
function DocIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

// Warning icon for red flags
function WarnIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

// Section header with left accent bar
function SectionHeader({ label, accentColor = 'bg-indigo-500' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-1 h-5 ${accentColor} rounded-full`}></div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{label}</h2>
    </div>
  );
}

// Reusable editable list used throughout edit mode
function EditableList({ items, onChange, onAdd, onRemove, placeholder, prefix }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          {prefix && <span className="text-indigo-400 mt-2 shrink-0 text-xs font-bold">{prefix}</span>}
          <input
            type="text"
            value={item}
            onChange={(e) => onChange(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {items.length > 1 && (
            <button onClick={() => onRemove(i)} className="mt-1 text-gray-300 hover:text-red-400 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
      <button onClick={onAdd} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add item
      </button>
    </div>
  );
}

export default function GovernanceView({
  assessment,
  auditeeDetails,
  onExportExcel,
  onGenerateAuditProgram,
  onStartOver,
  isGeneratingAudit,
}) {
  // Editable copy of AI-generated structure
  const [editedAssessment, setEditedAssessment] = useState(() =>
    JSON.parse(JSON.stringify(assessment))
  );
  const [isEditMode, setIsEditMode] = useState(false);

  const [collapsedAreas, setCollapsedAreas] = useState(new Set());
  const toggleAreaCollapse = (aIdx) => {
    setCollapsedAreas(prev => {
      const next = new Set(prev);
      if (next.has(aIdx)) { next.delete(aIdx); } else { next.add(aIdx); }
      return next;
    });
  };

  // Per-question management response and auditor assessment — keyed by "areaIndex-questionIndex"
  const [responses, setResponses] = useState({});
  // Per-area conclusion
  const [conclusions, setConclusions] = useState({});

  // Overall assessment — completed after working paper, not pre-generated
  const [overallMode, setOverallMode] = useState(null); // null | 'ai' | 'manual'
  const [isGeneratingOverall, setIsGeneratingOverall] = useState(false);
  const [overallGenerateError, setOverallGenerateError] = useState(null);
  const [overallData, setOverallData] = useState({
    maturityRating: '',
    rationale: '',
    keyObservations: [''],
    recommendations: [''],
  });

  // -------------------------------------------------------------------------
  // Response / conclusion handlers (always editable regardless of edit mode)
  // -------------------------------------------------------------------------
  const updateResponse = (areaIdx, qIdx, field, value) => {
    const key = `${areaIdx}-${qIdx}`;
    setResponses(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };

  const updateConclusion = (areaIdx, value) => {
    setConclusions(prev => ({ ...prev, [areaIdx]: value }));
  };

  // -------------------------------------------------------------------------
  // Edit mode — assessment structure helpers
  // -------------------------------------------------------------------------
  const updateAssessmentField = (field, value) => {
    setEditedAssessment(prev => ({ ...prev, [field]: value }));
  };

  const updateListField = (field, index, value) => {
    setEditedAssessment(prev => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addToListField = (field) => {
    setEditedAssessment(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeFromListField = (field, index) => {
    setEditedAssessment(prev => {
      const arr = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: arr.length ? arr : [''] };
    });
  };

  // Generic area updater — takes an updater function applied to areas[areaIdx]
  const updateArea = (areaIdx, updater) => {
    setEditedAssessment(prev => {
      const areas = [...prev.areas];
      areas[areaIdx] = updater(areas[areaIdx]);
      return { ...prev, areas };
    });
  };

  const updateAreaField = (areaIdx, field, value) =>
    updateArea(areaIdx, area => ({ ...area, [field]: value }));

  const updateAreaListItem = (areaIdx, field, index, value) =>
    updateArea(areaIdx, area => {
      const arr = [...(area[field] || [])];
      arr[index] = value;
      return { ...area, [field]: arr };
    });

  const addAreaListItem = (areaIdx, field) =>
    updateArea(areaIdx, area => ({ ...area, [field]: [...(area[field] || []), ''] }));

  const removeAreaListItem = (areaIdx, field, index) =>
    updateArea(areaIdx, area => {
      const arr = (area[field] || []).filter((_, i) => i !== index);
      return { ...area, [field]: arr.length ? arr : [''] };
    });

  const updateInquiryQuestion = (areaIdx, qIdx, field, value) =>
    updateArea(areaIdx, area => {
      const qs = [...(area.inquiryQuestions || [])];
      qs[qIdx] = { ...qs[qIdx], [field]: value };
      return { ...area, inquiryQuestions: qs };
    });

  const addInquiryQuestion = (areaIdx) =>
    updateArea(areaIdx, area => ({
      ...area,
      inquiryQuestions: [...(area.inquiryQuestions || []), { question: '', purpose: '' }],
    }));

  const removeInquiryQuestion = (areaIdx, qIdx) =>
    updateArea(areaIdx, area => {
      const qs = (area.inquiryQuestions || []).filter((_, i) => i !== qIdx);
      return { ...area, inquiryQuestions: qs.length ? qs : [{ question: '', purpose: '' }] };
    });

  const addArea = () => {
    const nextId = `GA${String((editedAssessment.areas || []).length + 1).padStart(3, '0')}`;
    setEditedAssessment(prev => ({
      ...prev,
      areas: [...prev.areas, {
        areaId: nextId,
        area: '',
        description: '',
        walkthroughSteps: [''],
        documentsToObtain: [''],
        inquiryQuestions: [{ question: '', purpose: '' }],
        redFlags: [''],
        conclusion: '',
      }],
    }));
  };

  const removeArea = (areaIdx) => {
    setEditedAssessment(prev => ({
      ...prev,
      areas: prev.areas.filter((_, i) => i !== areaIdx),
    }));
  };

  // -------------------------------------------------------------------------
  // Overall assessment helpers
  // -------------------------------------------------------------------------
  const updateOverallField = (field, value) => {
    setOverallData(prev => ({ ...prev, [field]: value }));
  };

  const addOverallListItem = (field) => {
    setOverallData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const updateOverallListItem = (field, index, value) => {
    setOverallData(prev => {
      const updated = [...prev[field]];
      updated[index] = value;
      return { ...prev, [field]: updated };
    });
  };

  const removeOverallListItem = (field, index) => {
    setOverallData(prev => {
      const updated = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: updated.length ? updated : [''] };
    });
  };

  const generateOverallAssessment = async () => {
    setIsGeneratingOverall(true);
    setOverallGenerateError(null);

    const enrichedAreas = (editedAssessment.areas || []).map((area, aIdx) => ({
      ...area,
      conclusion: conclusions[aIdx] ?? '',
      inquiryQuestions: (area.inquiryQuestions || []).map((iq, qIdx) => ({
        ...iq,
        managementResponse: responses[`${aIdx}-${qIdx}`]?.managementResponse ?? '',
        auditorAssessment: responses[`${aIdx}-${qIdx}`]?.auditorAssessment ?? '',
      })),
    }));

    try {
      const res = await fetch('/api/governance/conclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentTitle: editedAssessment.assessmentTitle,
          scope: editedAssessment.scope,
          areas: enrichedAreas,
          auditeeDetails,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setOverallData({
          maturityRating: json.data.maturityRating || '',
          rationale: json.data.rationale || '',
          keyObservations: json.data.keyObservations?.length ? json.data.keyObservations : [''],
          recommendations: json.data.recommendations?.length ? json.data.recommendations : [''],
        });
        setOverallMode('ai');
      } else {
        setOverallGenerateError(json.error || 'Generation failed. Please try again.');
      }
    } catch (err) {
      setOverallGenerateError('Network error. Please try again.');
    } finally {
      setIsGeneratingOverall(false);
    }
  };

  // -------------------------------------------------------------------------
  // Export — merges editedAssessment + local responses/conclusions + overall
  // -------------------------------------------------------------------------
  const handleExport = () => {
    const enriched = {
      ...editedAssessment,
      overallMaturityRating: overallData.maturityRating || '',
      maturityRationale: overallData.rationale || '',
      keyObservations: overallData.keyObservations.filter(Boolean),
      recommendations: overallData.recommendations.filter(Boolean),
      areas: (editedAssessment.areas || []).map((area, aIdx) => ({
        ...area,
        conclusion: conclusions[aIdx] ?? area.conclusion ?? '',
        inquiryQuestions: (area.inquiryQuestions || []).map((iq, qIdx) => ({
          ...iq,
          managementResponse: responses[`${aIdx}-${qIdx}`]?.managementResponse ?? '',
          auditorAssessment: responses[`${aIdx}-${qIdx}`]?.auditorAssessment ?? '',
        })),
      })),
    };
    onExportExcel(enriched);
  };

  // -------------------------------------------------------------------------
  // Shared input styles
  // -------------------------------------------------------------------------
  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const textareaCls = `${inputCls} resize-none`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Nav */}
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-gray-900 text-sm">Verifai</span>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">My Engagements</Link>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_192px] gap-6 items-start">
        <div> {/* left column */}

        {/* ------------------------------------------------------------------ */}
        {/* Header bar */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-semibold tracking-widest text-indigo-600 uppercase block">
                  Governance Assessment
                </span>
                {isEditMode && (
                  <span className="bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-medium">
                    Editing
                  </span>
                )}
              </div>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedAssessment.assessmentTitle || ''}
                  onChange={(e) => updateAssessmentField('assessmentTitle', e.target.value)}
                  className="text-2xl font-semibold text-gray-900 bg-transparent border-b border-indigo-300 focus:outline-none focus:border-indigo-500 w-full"
                />
              ) : (
                <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
                  {editedAssessment.assessmentTitle || 'Risk Management & Governance Assessment'}
                </h1>
              )}
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {/* Edit / Done toggle */}
              {!isEditMode ? (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  Edit Working Paper
                </button>
              ) : (
                <button
                  onClick={() => setIsEditMode(false)}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  Done Editing
                </button>
              )}


              <button
                onClick={handleExport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
              >
                Export to Excel
              </button>

              <button
                onClick={onStartOver}
                className="bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Assessment Overview card */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <SectionHeader label="Assessment Overview" />

          {/* Scope */}
          <div className="mb-5">
            <h3 className="text-sm font-medium text-gray-600 mb-1.5">Scope</h3>
            {isEditMode ? (
              <textarea
                value={editedAssessment.scope || ''}
                onChange={(e) => updateAssessmentField('scope', e.target.value)}
                rows={3}
                className={textareaCls}
              />
            ) : (
              <p className="text-gray-700 text-sm leading-relaxed">{editedAssessment.scope}</p>
            )}
          </div>

          {/* Objectives */}
          <div className="mb-5">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Objectives</h3>
            {isEditMode ? (
              <EditableList
                items={editedAssessment.objectives || []}
                onChange={(i, v) => updateListField('objectives', i, v)}
                onAdd={() => addToListField('objectives')}
                onRemove={(i) => removeFromListField('objectives', i)}
                placeholder="Add objective..."
                prefix={null}
              />
            ) : (
              <ul className="space-y-1.5">
                {(editedAssessment.objectives || []).map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-indigo-500 font-semibold text-xs mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-gray-700">{obj}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Approach */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-1.5">Approach</h3>
            {isEditMode ? (
              <textarea
                value={editedAssessment.approach || ''}
                onChange={(e) => updateAssessmentField('approach', e.target.value)}
                rows={3}
                className={textareaCls}
              />
            ) : (
              <p className="text-gray-700 text-sm leading-relaxed">{editedAssessment.approach}</p>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Governance area cards */}
        {/* ------------------------------------------------------------------ */}
        {(editedAssessment.areas || []).map((area, aIdx) => (
          <div key={area.areaId || aIdx} id={area.areaId || `area-${aIdx}`} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">

            {/* Area header */}
            <div className={`flex items-center gap-3 ${collapsedAreas.has(aIdx) ? '' : 'mb-4'}`}>
              <div className="w-1 h-5 bg-indigo-500 rounded-full shrink-0"></div>
              {isEditMode ? (
                <input
                  type="text"
                  value={area.area || ''}
                  onChange={(e) => updateAreaField(aIdx, 'area', e.target.value)}
                  className="text-base font-semibold text-gray-900 bg-transparent border-b border-indigo-300 focus:outline-none focus:border-indigo-500 flex-1"
                />
              ) : (
                <h2 className="text-base font-semibold text-gray-900">{area.area}</h2>
              )}
              <span className="font-mono text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 shrink-0">
                {area.areaId}
              </span>
              <button
                onClick={() => toggleAreaCollapse(aIdx)}
                className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                title={collapsedAreas.has(aIdx) ? 'Expand' : 'Collapse'}
              >
                <svg className={`w-4 h-4 transition-transform ${collapsedAreas.has(aIdx) ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isEditMode && (
                <button
                  onClick={() => removeArea(aIdx)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                  title="Remove this area"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {!collapsedAreas.has(aIdx) && (
              <>
                {/* Description */}
                {isEditMode ? (
                  <textarea
                    value={area.description || ''}
                    onChange={(e) => updateAreaField(aIdx, 'description', e.target.value)}
                    rows={2}
                    className={`${textareaCls} mb-5`}
                  />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed mb-5">{area.description}</p>
                )}

                {/* Walkthrough Steps */}
                <div className="mb-5">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Walkthrough Steps</h3>
                  {isEditMode ? (
                    <EditableList
                      items={area.walkthroughSteps || []}
                      onChange={(i, v) => updateAreaListItem(aIdx, 'walkthroughSteps', i, v)}
                      onAdd={() => addAreaListItem(aIdx, 'walkthroughSteps')}
                      onRemove={(i) => removeAreaListItem(aIdx, 'walkthroughSteps', i)}
                      placeholder="Add walkthrough step..."
                    />
                  ) : (
                    <ul className="space-y-1.5 list-none">
                      {(area.walkthroughSteps || []).map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <span className="text-indigo-500 font-semibold shrink-0 w-5 text-right text-xs mt-0.5">{i + 1}.</span>
                          <span className="text-gray-700">{step.replace(/^\d+\.\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Documents to Obtain */}
                <div className="mb-5">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Documents to Obtain</h3>
                  {isEditMode ? (
                    <EditableList
                      items={area.documentsToObtain || []}
                      onChange={(i, v) => updateAreaListItem(aIdx, 'documentsToObtain', i, v)}
                      onAdd={() => addAreaListItem(aIdx, 'documentsToObtain')}
                      onRemove={(i) => removeAreaListItem(aIdx, 'documentsToObtain', i)}
                      placeholder="Add document..."
                    />
                  ) : (
                    <ul className="space-y-1.5">
                      {(area.documentsToObtain || []).map((doc, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <DocIcon />
                          <span className="text-gray-700">{doc}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Inquiry Questions */}
                <div className="mb-5">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Inquiry Questions</h3>
                  <div className="space-y-4">
                    {(area.inquiryQuestions || []).map((iq, qIdx) => {
                      const key = `${aIdx}-${qIdx}`;
                      const resp = responses[key] || {};
                      return (
                        <div key={qIdx} className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                          <div className="flex items-start gap-2.5 mb-1.5">
                            <span className="text-indigo-500 font-bold text-xs shrink-0 mt-0.5">Q{qIdx + 1}</span>
                            {isEditMode ? (
                              <div className="flex-1 space-y-1.5">
                                <input
                                  type="text"
                                  value={iq.question || ''}
                                  onChange={(e) => updateInquiryQuestion(aIdx, qIdx, 'question', e.target.value)}
                                  placeholder="Question..."
                                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                                />
                                <input
                                  type="text"
                                  value={iq.purpose || ''}
                                  onChange={(e) => updateInquiryQuestion(aIdx, qIdx, 'purpose', e.target.value)}
                                  placeholder="Purpose (why this question matters)..."
                                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent italic"
                                />
                              </div>
                            ) : (
                              <p className="text-gray-900 text-sm font-medium leading-snug">{iq.question}</p>
                            )}
                            {isEditMode && (
                              <button
                                onClick={() => removeInquiryQuestion(aIdx, qIdx)}
                                className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          {!isEditMode && iq.purpose && (
                            <p className="text-gray-500 text-xs italic ml-6 mb-3 leading-relaxed">{iq.purpose}</p>
                          )}
                          {/* Response fields — always editable */}
                          <div className={`grid grid-cols-2 gap-3 ${isEditMode ? 'mt-2' : 'ml-6'}`}>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Management Response</label>
                              <textarea
                                value={resp.managementResponse || ''}
                                onChange={(e) => updateResponse(aIdx, qIdx, 'managementResponse', e.target.value)}
                                placeholder="Record management's response..."
                                rows={3}
                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Auditor Assessment</label>
                              <textarea
                                value={resp.auditorAssessment || ''}
                                onChange={(e) => updateResponse(aIdx, qIdx, 'auditorAssessment', e.target.value)}
                                placeholder="Record auditor's assessment..."
                                rows={3}
                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {isEditMode && (
                      <button
                        onClick={() => addInquiryQuestion(aIdx)}
                        className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add inquiry question
                      </button>
                    )}
                  </div>
                </div>

                {/* Red Flags */}
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Red Flags</h3>
                  {isEditMode ? (
                    <EditableList
                      items={area.redFlags || []}
                      onChange={(i, v) => updateAreaListItem(aIdx, 'redFlags', i, v)}
                      onAdd={() => addAreaListItem(aIdx, 'redFlags')}
                      onRemove={(i) => removeAreaListItem(aIdx, 'redFlags', i)}
                      placeholder="Add red flag..."
                    />
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <ul className="space-y-1.5">
                        {(area.redFlags || []).map((flag, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <WarnIcon />
                            <span className="text-red-700">{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Conclusion — always editable */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Conclusion</h3>
                  <textarea
                    value={conclusions[aIdx] ?? ''}
                    onChange={(e) => updateConclusion(aIdx, e.target.value)}
                    placeholder="Enter auditor conclusion for this governance area..."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add area button (edit mode only) */}
        {isEditMode && (
          <button
            onClick={addArea}
            className="w-full mb-5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-400 hover:text-indigo-600 rounded-xl py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Governance Area
          </button>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Overall Assessment — completed after working paper                */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <SectionHeader label="Overall Assessment" />

          {!overallMode && !isGeneratingOverall && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Complete the working paper above, then generate your overall assessment conclusion.
              </p>
              {overallGenerateError && (
                <p className="text-sm text-red-600 mb-3">{overallGenerateError}</p>
              )}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={generateOverallAssessment}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate with AI (Suggested)
                </button>
                <button
                  onClick={() => {
                    setOverallData({ maturityRating: '', rationale: '', keyObservations: [''], recommendations: [''] });
                    setOverallMode('manual');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  Enter Manually
                </button>
              </div>
            </div>
          )}

          {isGeneratingOverall && (
            <div className="flex items-center gap-3 py-4">
              <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-gray-500">Generating overall assessment from working paper...</span>
            </div>
          )}

          {overallMode && !isGeneratingOverall && (
            <div>
              {overallMode === 'ai' && (
                <div className="flex items-center gap-2 mb-4 p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-indigo-600">AI-generated — review and edit before exporting.</span>
                  <button
                    onClick={() => { setOverallMode(null); setOverallGenerateError(null); }}
                    className="ml-auto text-xs text-indigo-400 hover:text-indigo-600 underline"
                  >
                    Regenerate
                  </button>
                </div>
              )}

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-600 mb-2">Overall Maturity Rating</label>
                <select
                  value={overallData.maturityRating}
                  onChange={(e) => updateOverallField('maturityRating', e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select maturity level...</option>
                  <option value="Level 1 - Initial">Level 1 - Initial</option>
                  <option value="Level 2 - Developing">Level 2 - Developing</option>
                  <option value="Level 3 - Defined">Level 3 - Defined</option>
                  <option value="Level 4 - Managed">Level 4 - Managed</option>
                  <option value="Level 5 - Optimising">Level 5 - Optimising</option>
                </select>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-600 mb-2">Maturity Rationale</label>
                <textarea
                  value={overallData.rationale}
                  onChange={(e) => updateOverallField('rationale', e.target.value)}
                  placeholder="Explain the rationale for the maturity rating..."
                  rows={3}
                  className={textareaCls}
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-600 mb-2">Key Observations</label>
                <div className="space-y-2">
                  {overallData.keyObservations.map((obs, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-2 shrink-0 text-xs font-bold">▸</span>
                      <input
                        type="text"
                        value={obs}
                        onChange={(e) => updateOverallListItem('keyObservations', i, e.target.value)}
                        placeholder="Add observation..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      {overallData.keyObservations.length > 1 && (
                        <button onClick={() => removeOverallListItem('keyObservations', i)} className="mt-1 text-gray-300 hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addOverallListItem('keyObservations')} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add observation
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Recommendations</label>
                <div className="space-y-2">
                  {overallData.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-2 shrink-0 text-xs font-bold">→</span>
                      <input
                        type="text"
                        value={rec}
                        onChange={(e) => updateOverallListItem('recommendations', i, e.target.value)}
                        placeholder="Add recommendation..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      {overallData.recommendations.length > 1 && (
                        <button onClick={() => removeOverallListItem('recommendations', i)} className="mt-1 text-gray-300 hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addOverallListItem('recommendations')} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add recommendation
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 flex justify-between items-center flex-wrap gap-3">
          <p className="text-sm text-gray-500">
            Review complete? Export this working paper, then use the findings to enrich your audit program generation.
          </p>
          <button
            onClick={handleExport}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Export to Excel
          </button>
        </div>

        </div> {/* end left column */}

        {/* Sticky right sidebar */}
        <div className="sticky top-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2">
            {isEditMode && (
              <div className="pb-2 border-b border-gray-100">
                <span className="bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-medium">Editing</span>
              </div>
            )}

            {/* Primary action */}
            <button
              onClick={handleExport}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-3 py-2 text-sm transition-colors"
            >
              Export to Excel
            </button>

            {/* Edit toggle */}
            {!isEditMode ? (
              <button
                onClick={() => setIsEditMode(true)}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg px-3 py-2 text-sm transition-colors"
              >
                Edit Working Paper
              </button>
            ) : (
              <button
                onClick={() => setIsEditMode(false)}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg px-3 py-2 text-sm transition-colors"
              >
                Done Editing
              </button>
            )}

            {/* Area jump links */}
            <div className="pt-2 border-t border-gray-100 space-y-0.5">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Jump to</p>
              {(editedAssessment.areas || []).map((area, i) => (
                <a
                  key={area.areaId || i}
                  href={`#${area.areaId || `area-${i}`}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-indigo-50 text-indigo-700 text-xs transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                  {area.areaId || `Area ${i + 1}`}
                </a>
              ))}
            </div>



            {/* Start Over */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={onStartOver}
                className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        </div> {/* end sidebar */}

        </div> {/* end grid */}
      </div>
    </div>
  );
}
