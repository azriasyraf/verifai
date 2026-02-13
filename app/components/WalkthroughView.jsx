'use client';

import { useState } from 'react';

// Section header with left accent bar
function SectionHeader({ label, accentColor = 'bg-teal-500' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-1 h-5 ${accentColor} rounded-full`}></div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{label}</h2>
    </div>
  );
}

// Reusable editable list used in edit mode
function EditableList({ items, onChange, onAdd, onRemove, placeholder }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
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
      <button onClick={onAdd} className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1 mt-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add item
      </button>
    </div>
  );
}

// Design adequacy badge colours
function DesignAdequacyBadge({ value }) {
  const config = {
    'Adequate': 'bg-green-100 text-green-700 border-green-200',
    'Partially Adequate': 'bg-amber-100 text-amber-700 border-amber-200',
    'Inadequate': 'bg-red-100 text-red-700 border-red-200',
    'Not Assessed': 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const cls = config[value] || config['Not Assessed'];
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${cls}`}>
      {value || 'Not Assessed'}
    </span>
  );
}

export default function WalkthroughView({
  walkthrough,
  auditeeDetails,
  onExportExcel,
  onGenerateAuditProgram,
  onStartOver,
}) {
  // Editable copy of AI-generated structure (gated by edit mode)
  const [editedWalkthrough, setEditedWalkthrough] = useState(() =>
    JSON.parse(JSON.stringify(walkthrough))
  );
  const [isEditMode, setIsEditMode] = useState(false);

  // Auditor-fillable fields — always editable, keyed by checkpoint index
  const [checkpointResponses, setCheckpointResponses] = useState({});
  const [freeformNotes, setFreeformNotes] = useState('');
  const [overallConclusion, setOverallConclusion] = useState('');

  // Collapsible state for suggested questions per checkpoint
  const [questionsOpen, setQuestionsOpen] = useState({});

  // -------------------------------------------------------------------------
  // Checkpoint response handlers (always editable)
  // -------------------------------------------------------------------------
  const updateCheckpointResponse = (idx, field, value) => {
    setCheckpointResponses(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), [field]: value },
    }));
  };

  // -------------------------------------------------------------------------
  // Edit mode — structure helpers
  // -------------------------------------------------------------------------
  const updateField = (field, value) => {
    setEditedWalkthrough(prev => ({ ...prev, [field]: value }));
  };

  const updateListField = (field, index, value) => {
    setEditedWalkthrough(prev => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addToListField = (field) => {
    setEditedWalkthrough(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeFromListField = (field, index) => {
    setEditedWalkthrough(prev => {
      const arr = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: arr.length ? arr : [''] };
    });
  };

  const updateCheckpoint = (cpIdx, updater) => {
    setEditedWalkthrough(prev => {
      const checkpoints = [...prev.checkpoints];
      checkpoints[cpIdx] = updater(checkpoints[cpIdx]);
      return { ...prev, checkpoints };
    });
  };

  const updateCheckpointField = (cpIdx, field, value) =>
    updateCheckpoint(cpIdx, cp => ({ ...cp, [field]: value }));

  const updateCheckpointQuestion = (cpIdx, qIdx, value) =>
    updateCheckpoint(cpIdx, cp => {
      const qs = [...(cp.suggestedQuestions || [])];
      qs[qIdx] = value;
      return { ...cp, suggestedQuestions: qs };
    });

  const addCheckpointQuestion = (cpIdx) =>
    updateCheckpoint(cpIdx, cp => ({
      ...cp,
      suggestedQuestions: [...(cp.suggestedQuestions || []), ''],
    }));

  const removeCheckpointQuestion = (cpIdx, qIdx) =>
    updateCheckpoint(cpIdx, cp => {
      const qs = (cp.suggestedQuestions || []).filter((_, i) => i !== qIdx);
      return { ...cp, suggestedQuestions: qs.length ? qs : [''] };
    });

  const addCheckpoint = () => {
    const nextId = `WP-${String((editedWalkthrough.checkpoints || []).length + 1).padStart(3, '0')}`;
    setEditedWalkthrough(prev => ({
      ...prev,
      checkpoints: [...prev.checkpoints, {
        id: nextId,
        area: '',
        expected: '',
        designConsiderations: '',
        suggestedQuestions: [''],
      }],
    }));
  };

  const removeCheckpoint = (cpIdx) => {
    setEditedWalkthrough(prev => ({
      ...prev,
      checkpoints: prev.checkpoints.filter((_, i) => i !== cpIdx),
    }));
  };

  // -------------------------------------------------------------------------
  // Export — merges structure + auditor responses
  // -------------------------------------------------------------------------
  const handleExport = () => {
    const enriched = {
      ...editedWalkthrough,
      overallConclusion,
      freeformNotes,
      checkpoints: (editedWalkthrough.checkpoints || []).map((cp, idx) => ({
        ...cp,
        described: checkpointResponses[idx]?.described ?? '',
        designAdequacy: checkpointResponses[idx]?.designAdequacy ?? 'Not Assessed',
        notes: checkpointResponses[idx]?.notes ?? '',
      })),
    };
    onExportExcel(enriched);
  };

  // -------------------------------------------------------------------------
  // Generate Audit Program from walkthrough observations
  // -------------------------------------------------------------------------
  const handleGenerateAuditProgram = () => {
    if (!onGenerateAuditProgram) return;

    const processLabel = editedWalkthrough.walkthroughTitle || 'Process';
    const lines = [`Process Walkthrough Observations — ${processLabel}`, '', 'CONTROL CHECKPOINT FINDINGS:'];

    (editedWalkthrough.checkpoints || []).forEach((cp, idx) => {
      const resp = checkpointResponses[idx] || {};
      if (resp.designAdequacy && resp.designAdequacy !== 'Not Assessed') {
        const parts = [`[${cp.id}] ${cp.area}: ${resp.described || '(no description recorded)'}`];
        parts.push(`Design adequacy: ${resp.designAdequacy}.`);
        if (resp.notes) parts.push(`Notes: ${resp.notes}`);
        lines.push(parts.join(' '));
      }
    });

    if (freeformNotes.trim()) {
      lines.push('', 'ADDITIONAL NOTES:', freeformNotes.trim());
    }

    const enriched = {
      ...editedWalkthrough,
      overallConclusion,
      freeformNotes,
      checkpoints: (editedWalkthrough.checkpoints || []).map((cp, idx) => ({
        ...cp,
        described: checkpointResponses[idx]?.described ?? '',
        designAdequacy: checkpointResponses[idx]?.designAdequacy ?? 'Not Assessed',
        notes: checkpointResponses[idx]?.notes ?? '',
      })),
    };

    onGenerateAuditProgram(lines.join('\n'), enriched);
  };

  // -------------------------------------------------------------------------
  // Shared input styles
  // -------------------------------------------------------------------------
  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  const textareaCls = `${inputCls} resize-none`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* ------------------------------------------------------------------ */}
        {/* Header bar */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow p-5 mb-5">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-semibold tracking-widest text-teal-600 uppercase block">
                  Process Walkthrough Working Paper
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
                  value={editedWalkthrough.walkthroughTitle || ''}
                  onChange={(e) => updateField('walkthroughTitle', e.target.value)}
                  className="text-2xl font-semibold text-gray-900 bg-transparent border-b border-teal-300 focus:outline-none focus:border-teal-500 w-full"
                />
              ) : (
                <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
                  {editedWalkthrough.walkthroughTitle || 'Process Walkthrough Working Paper'}
                </h1>
              )}
              {auditeeDetails?.clientName && (
                <p className="text-sm text-gray-400 mt-1">{auditeeDetails.clientName}{auditeeDetails.department ? ` — ${auditeeDetails.department}` : ''}</p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {/* Edit / Done toggle */}
              {!isEditMode ? (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  Edit Working Paper
                </button>
              ) : (
                <button
                  onClick={() => setIsEditMode(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  Save &amp; Close Edit
                </button>
              )}

              <button
                onClick={handleExport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
              >
                Export Working Paper
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
        {/* Process Overview card */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow p-5 mb-5">
          <SectionHeader label="Process Overview" />

          <div className="mb-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Overview</h3>
            {isEditMode ? (
              <textarea
                value={editedWalkthrough.processOverview || ''}
                onChange={(e) => updateField('processOverview', e.target.value)}
                rows={4}
                className={textareaCls}
              />
            ) : (
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{editedWalkthrough.processOverview}</p>
            )}
          </div>

          <div className="mb-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Scope</h3>
            {isEditMode ? (
              <textarea
                value={editedWalkthrough.scope || ''}
                onChange={(e) => updateField('scope', e.target.value)}
                rows={2}
                className={textareaCls}
              />
            ) : (
              <p className="text-gray-700 text-sm leading-relaxed">{editedWalkthrough.scope}</p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Objectives</h3>
            {isEditMode ? (
              <EditableList
                items={editedWalkthrough.objectives || []}
                onChange={(i, v) => updateListField('objectives', i, v)}
                onAdd={() => addToListField('objectives')}
                onRemove={(i) => removeFromListField('objectives', i)}
                placeholder="Add objective..."
              />
            ) : (
              <ul className="space-y-1.5">
                {(editedWalkthrough.objectives || []).map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-teal-500 font-semibold text-xs mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-gray-700">{obj}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Checkpoint cards */}
        {/* ------------------------------------------------------------------ */}
        {(editedWalkthrough.checkpoints || []).map((cp, cpIdx) => {
          const resp = checkpointResponses[cpIdx] || {};
          const isQuestionsOpen = questionsOpen[cpIdx] ?? false;

          return (
            <div key={cp.id || cpIdx} className="bg-white rounded-xl border border-gray-200 shadow p-5 mb-5">

              {/* Checkpoint header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 bg-teal-500 rounded-full shrink-0"></div>
                {isEditMode ? (
                  <input
                    type="text"
                    value={cp.area || ''}
                    onChange={(e) => updateCheckpointField(cpIdx, 'area', e.target.value)}
                    className="text-base font-semibold text-gray-900 bg-transparent border-b border-teal-300 focus:outline-none focus:border-teal-500 flex-1"
                  />
                ) : (
                  <h2 className="text-base font-semibold text-gray-900 flex-1">{cp.area}</h2>
                )}
                <span className="font-mono text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 shrink-0">
                  {cp.id}
                </span>
                {/* Design adequacy badge — always visible */}
                <DesignAdequacyBadge value={resp.designAdequacy || 'Not Assessed'} />
                {isEditMode && (
                  <button
                    onClick={() => removeCheckpoint(cpIdx)}
                    className="ml-1 text-gray-300 hover:text-red-400 transition-colors"
                    title="Remove checkpoint"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Expected state */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Expected State</h3>
                {isEditMode ? (
                  <textarea
                    value={cp.expected || ''}
                    onChange={(e) => updateCheckpointField(cpIdx, 'expected', e.target.value)}
                    rows={3}
                    className={textareaCls}
                  />
                ) : (
                  <p className="text-gray-700 text-sm leading-relaxed bg-teal-50 border border-teal-100 rounded-lg p-3">{cp.expected}</p>
                )}
              </div>

              {/* Design considerations */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Design Considerations</h3>
                {isEditMode ? (
                  <textarea
                    value={cp.designConsiderations || ''}
                    onChange={(e) => updateCheckpointField(cpIdx, 'designConsiderations', e.target.value)}
                    rows={2}
                    className={textareaCls}
                  />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed italic">{cp.designConsiderations}</p>
                )}
              </div>

              {/* Suggested questions — collapsible */}
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => setQuestionsOpen(prev => ({ ...prev, [cpIdx]: !isQuestionsOpen }))}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-teal-600 transition-colors mb-1"
                >
                  <svg className={`w-3 h-3 transition-transform ${isQuestionsOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Interview Guidance ({(cp.suggestedQuestions || []).length} suggested questions)
                </button>
                {isQuestionsOpen && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 mt-1">
                    <p className="text-xs text-gray-400 italic mb-2">Guidance only — adapt to your context.</p>
                    {isEditMode ? (
                      <div className="space-y-2">
                        {(cp.suggestedQuestions || []).map((q, qIdx) => (
                          <div key={qIdx} className="flex items-start gap-2">
                            <input
                              type="text"
                              value={q}
                              onChange={(e) => updateCheckpointQuestion(cpIdx, qIdx, e.target.value)}
                              placeholder="Add question..."
                              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            {(cp.suggestedQuestions || []).length > 1 && (
                              <button onClick={() => removeCheckpointQuestion(cpIdx, qIdx)} className="mt-1 text-gray-300 hover:text-red-400 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => addCheckpointQuestion(cpIdx)} className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1 mt-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add question
                        </button>
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {(cp.suggestedQuestions || []).map((q, qIdx) => (
                          <li key={qIdx} className="flex items-start gap-2 text-sm">
                            <span className="text-teal-500 font-bold shrink-0 text-xs mt-0.5">Q{qIdx + 1}</span>
                            <span className="text-gray-600">{q}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Auditor-fillable section */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Auditor — Complete During Walkthrough</p>

                {/* What was described */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">What was described</label>
                  <textarea
                    value={resp.described || ''}
                    onChange={(e) => updateCheckpointResponse(cpIdx, 'described', e.target.value)}
                    placeholder="Describe what management/staff said about this control area during the walkthrough..."
                    rows={3}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Design adequacy */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Design Adequacy</label>
                    <select
                      value={resp.designAdequacy || 'Not Assessed'}
                      onChange={(e) => updateCheckpointResponse(cpIdx, 'designAdequacy', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="Not Assessed">Not Assessed</option>
                      <option value="Adequate">Adequate</option>
                      <option value="Partially Adequate">Partially Adequate</option>
                      <option value="Inadequate">Inadequate</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={resp.notes || ''}
                      onChange={(e) => updateCheckpointResponse(cpIdx, 'notes', e.target.value)}
                      placeholder="Follow-up items, observations, document references..."
                      rows={2}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add checkpoint button (edit mode only) */}
        {isEditMode && (
          <button
            onClick={addCheckpoint}
            className="w-full mb-5 border-2 border-dashed border-teal-200 hover:border-teal-400 text-teal-400 hover:text-teal-600 rounded-xl py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Checkpoint
          </button>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Freeform Notes */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow p-5 mb-5">
          <SectionHeader label="Additional Notes from Interviews" />
          <textarea
            value={freeformNotes}
            onChange={(e) => setFreeformNotes(e.target.value)}
            placeholder="Record any additional observations, context, or notes from the walkthrough interviews that don't fit neatly into the checkpoints above..."
            rows={5}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Best practice note */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm text-amber-700">
            <span className="font-semibold">Best practice:</span> Share these notes with the auditee to confirm your understanding of the process is correct and complete before proceeding to testing.
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Overall Conclusion */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow p-5 mb-5">
          <SectionHeader label="Overall Conclusion" />
          <textarea
            value={overallConclusion}
            onChange={(e) => setOverallConclusion(e.target.value)}
            placeholder="Summarise the overall control design adequacy across the process. Note any material weaknesses, key gaps identified, and whether the process is ready to proceed to testing..."
            rows={4}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Bottom action bar */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow p-4 mb-5 flex justify-between items-center flex-wrap gap-3">
          <p className="text-sm text-gray-500">
            Working paper complete? Export to Excel, or generate an audit program enriched with your walkthrough findings.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExport}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
            >
              Export Working Paper
            </button>
            {onGenerateAuditProgram && (
              <button
                onClick={handleGenerateAuditProgram}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Audit Program from This Walkthrough
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
