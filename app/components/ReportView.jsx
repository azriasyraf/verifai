'use client';
import { useState } from 'react';
import { exportToWord } from '../lib/exportToWord';

const RATING_STYLES = {
  High: 'bg-red-100 text-red-700 border border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  Low: 'bg-green-100 text-green-700 border border-green-200',
};

const RATING_SELECT_STYLES = {
  High: 'bg-red-50 border-red-200 text-red-700',
  Medium: 'bg-amber-50 border-amber-200 text-amber-700',
  Low: 'bg-green-50 border-green-200 text-green-700',
};

const WEAK_RESPONSE_PATTERNS = [
  'will monitor', 'noted', 'team has been reminded', 'will improve',
  'steps will be taken', 'in progress', 'will be addressed', 'management acknowledges',
  'will take note', 'will ensure', 'will review'
];

function getMgmtResponseIssues(text, dueDate, actionOwner) {
  if (!text || text.trim().length === 0) return ['No management response provided'];
  const issues = [];
  const lower = text.toLowerCase();
  if (WEAK_RESPONSE_PATTERNS.some(p => lower.includes(p))) issues.push('Contains vague language — specify a concrete action, owner, and due date');
  if (!actionOwner || actionOwner.trim().length === 0) issues.push('No action owner specified');
  const hasDueDateField = dueDate && dueDate.trim().length > 0;
  const hasDueDateInText = /\d{1,2}[\s/-]\w+[\s/-]\d{2,4}|\w+ \d{4}|q[1-4] \d{4}/i.test(text);
  if (!hasDueDateField && !hasDueDateInText) issues.push('No due date specified');
  return issues;
}

function EditableText({ value, onChange, multiline = false, className = '' }) {
  if (multiline) {
    return (
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
        rows={3}
      />
    );
  }
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
    />
  );
}

function AiDraftBanner({ sectionKey, dismissed, onDismiss }) {
  if (dismissed) return null;
  return (
    <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-2 mb-3">
      <p className="text-xs text-amber-700">AI-generated — review and edit before finalising</p>
      <button onClick={() => onDismiss(sectionKey)} className="text-xs text-amber-500 hover:text-amber-700 ml-4 shrink-0">Dismiss</button>
    </div>
  );
}

function FindingCard({ finding, index, isEditMode, onChange }) {
  const ratingStyle = RATING_STYLES[finding.riskRating] || RATING_STYLES.Medium;
  const ratingSelectStyle = RATING_SELECT_STYLES[finding.riskRating] || RATING_SELECT_STYLES.Medium;

  // label: display label, key: field key, multiline, highlight: bolder value for key fields
  const field = (label, key, multiline = false, highlight = false) => (
    <div className="grid grid-cols-[160px_1fr] gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-600 pt-1">{label}</span>
      {isEditMode ? (
        <EditableText
          value={finding[key]}
          onChange={val => onChange(index, key, val)}
          multiline={multiline}
        />
      ) : (
        <p className={`text-sm whitespace-pre-wrap ${highlight ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
          {finding[key] || ''}
        </p>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
            {finding.ref || `F${String(index + 1).padStart(3, '0')}`}
          </span>
          {isEditMode ? (
            <EditableText
              value={finding.title}
              onChange={val => onChange(index, 'title', val)}
              className="font-semibold text-gray-900"
            />
          ) : (
            <h3 className="font-semibold text-gray-900 text-sm">{finding.title}</h3>
          )}
        </div>
        {isEditMode ? (
          <select
            value={finding.riskRating || 'Medium'}
            onChange={e => onChange(index, 'riskRating', e.target.value)}
            className={`text-xs border rounded px-2 py-1 shrink-0 font-semibold ${ratingSelectStyle}`}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        ) : (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${ratingStyle}`}>
            {finding.riskRating}
          </span>
        )}
      </div>

      {/* Fields — reordered: CCRE + Recommendation / Action Owner / Due Date / Status / Mgmt Response */}
      <div className="px-5 py-3">
        {field('Condition', 'condition', true, true)}
        {field('Criteria', 'criteria', true)}
        {field('Cause', 'cause', true)}
        {field('Effect', 'effect', true)}
        {field('Recommendation', 'recommendation', true, true)}
        {field('Action Owner', 'actionOwner')}
        {field('Due Date', 'dueDate')}
        {field('Status', 'status')}

        {/* Management Response with QC flags — shown in read mode only; edit mode keeps it clean */}
        <div className="grid grid-cols-[160px_1fr] gap-3 py-2">
          <span className="text-sm font-medium text-gray-600 pt-1">Management Response</span>
          <div className="space-y-1.5">
            {isEditMode ? (
              <EditableText
                value={finding.managementResponse}
                onChange={val => onChange(index, 'managementResponse', val)}
                multiline
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{finding.managementResponse || ''}</p>
            )}
            {!isEditMode && getMgmtResponseIssues(finding.managementResponse, finding.dueDate, finding.actionOwner).map((issue, i) => (
              <p key={i} className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                ⚠ {issue}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportView({ report, onReset }) {
  const originalReport = JSON.parse(JSON.stringify(report));
  const [editedReport, setEditedReport] = useState(() => JSON.parse(JSON.stringify(report)));
  const [isEditMode, setIsEditMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeSection, setActiveSection] = useState('cover');
  const [aiDraftDismissed, setAiDraftDismissed] = useState({});

  const cover = editedReport.coverPage || {};
  const scope = editedReport.scopeAndObjectives || {};
  const findings = editedReport.findings || [];

  const dismissAiDraft = (key) => setAiDraftDismissed(prev => ({ ...prev, [key]: true }));

  const updateCover = (key, val) =>
    setEditedReport(prev => ({ ...prev, coverPage: { ...prev.coverPage, [key]: val } }));

  const updateScope = (key, val) =>
    setEditedReport(prev => ({ ...prev, scopeAndObjectives: { ...prev.scopeAndObjectives, [key]: val } }));

  const updateObjective = (i, val) => {
    const updated = [...(scope.objectives || [])];
    updated[i] = val;
    updateScope('objectives', updated);
  };

  const updateFinding = (i, key, val) => {
    const updated = [...findings];
    updated[i] = { ...updated[i], [key]: val };
    setEditedReport(prev => ({ ...prev, findings: updated }));
  };

  const handleDiscard = () => {
    if (window.confirm('Discard all edits and revert to the AI-generated report?')) {
      setEditedReport(JSON.parse(JSON.stringify(originalReport)));
      setIsEditMode(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Start a new report? All unsaved changes will be lost.')) {
      onReset();
    }
  };

  const handleExport = async () => {
    // Pre-flight QC check
    const qcIssues = findings.reduce((acc, f) => {
      const issues = getMgmtResponseIssues(f.managementResponse, f.dueDate, f.actionOwner);
      if (issues.length > 0) acc.push(`${f.ref || '?'}: ${issues.join('; ')}`);
      return acc;
    }, []);

    if (qcIssues.length > 0) {
      const proceed = window.confirm(
        `${qcIssues.length} finding${qcIssues.length > 1 ? 's have' : ' has'} unresolved QC flags:\n\n${qcIssues.join('\n')}\n\nExport anyway?`
      );
      if (!proceed) return;
    }

    setIsExporting(true);
    try {
      await exportToWord(editedReport);
    } finally {
      setIsExporting(false);
    }
  };

  // Compute whether any finding has QC issues (for Findings tab badge)
  const findingsWithQcIssues = findings.filter(f =>
    getMgmtResponseIssues(f.managementResponse, f.dueDate, f.actionOwner).length > 0
  ).length;

  const tabs = [
    { id: 'cover', label: 'Cover' },
    { id: 'executive', label: 'Executive Summary' },
    { id: 'scope', label: 'Scope' },
    { id: 'findings', label: `Findings (${findings.length})`, qcCount: findingsWithQcIssues },
    { id: 'conclusion', label: 'Conclusion' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Audit Report Draft</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {cover.client || 'Client'} · {cover.auditPeriod || 'Period not specified'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isEditMode ? (
            <>
              <button
                onClick={handleDiscard}
                className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                Discard changes
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                className="text-sm px-4 py-2 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
              >
                Close editor
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditMode(true)}
              className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export to Word'}
          </button>
          <button
            onClick={handleReset}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50"
          >
            New report
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="border-t border-gray-100 pt-1">
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeSection === tab.id
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.qcCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title={`${tab.qcCount} finding${tab.qcCount > 1 ? 's' : ''} with QC flags`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* COVER */}
      {activeSection === 'cover' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {[
            ['title', 'Report Title'],
            ['client', 'Client'],
            ['department', 'Department'],
            ['auditPeriod', 'Audit Period'],
            ['engagementRef', 'Engagement Reference'],
            ['preparedBy', 'Prepared By'],
            ['reportDate', 'Report Date'],
          ].map(([key, label]) => (
            <div key={key} className="grid grid-cols-[160px_1fr] gap-4 px-5 py-3 items-center">
              <span className="text-sm font-medium text-gray-600">{label}</span>
              {isEditMode ? (
                <EditableText value={cover[key]} onChange={val => updateCover(key, val)} />
              ) : (
                <p className="text-sm text-gray-800">{cover[key] || ''}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* EXECUTIVE SUMMARY */}
      {activeSection === 'executive' && (
        <div>
          <AiDraftBanner sectionKey="executive" dismissed={aiDraftDismissed.executive} onDismiss={dismissAiDraft} />
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Executive Summary</h3>
            {isEditMode ? (
              <EditableText
                value={editedReport.executiveSummary}
                onChange={val => setEditedReport(prev => ({ ...prev, executiveSummary: val }))}
                multiline
                className="min-h-[200px]"
              />
            ) : (
              <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">
                {editedReport.executiveSummary}
              </p>
            )}
          </div>
        </div>
      )}

      {/* SCOPE — single card with h3 separators */}
      {activeSection === 'scope' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Audit Objectives</h3>
            {(scope.objectives || []).map((obj, i) => (
              <div key={i} className="flex gap-3 items-start mb-2">
                <span className="text-xs font-bold text-indigo-500 mt-1 shrink-0">{i + 1}.</span>
                {isEditMode ? (
                  <EditableText value={obj} onChange={val => updateObjective(i, val)} />
                ) : (
                  <p className="text-sm text-gray-700">{obj}</p>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Scope</h3>
            {isEditMode ? (
              <EditableText value={scope.scope} onChange={val => updateScope('scope', val)} multiline />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{scope.scope}</p>
            )}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Methodology</h3>
            {isEditMode ? (
              <EditableText value={scope.methodology} onChange={val => updateScope('methodology', val)} multiline />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{scope.methodology}</p>
            )}
          </div>
        </div>
      )}

      {/* FINDINGS */}
      {activeSection === 'findings' && (
        <div className="space-y-4">
          {findings.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No findings in this report.</p>
          ) : (
            findings.map((finding) => (
              <FindingCard
                key={finding.ref || finding.title}
                finding={finding}
                index={findings.indexOf(finding)}
                isEditMode={isEditMode}
                onChange={updateFinding}
              />
            ))
          )}
        </div>
      )}

      {/* CONCLUSION */}
      {activeSection === 'conclusion' && (
        <div>
          <AiDraftBanner sectionKey="conclusion" dismissed={aiDraftDismissed.conclusion} onDismiss={dismissAiDraft} />
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Conclusion</h3>
            {isEditMode ? (
              <EditableText
                value={editedReport.conclusion}
                onChange={val => setEditedReport(prev => ({ ...prev, conclusion: val }))}
                multiline
                className="min-h-[150px]"
              />
            ) : (
              <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">
                {editedReport.conclusion}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
