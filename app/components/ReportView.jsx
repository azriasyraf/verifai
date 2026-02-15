'use client';
import { useState } from 'react';
import { exportToWord } from '../lib/exportToWord';

const RATING_STYLES = {
  High: 'bg-red-100 text-red-700 border border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  Low: 'bg-green-100 text-green-700 border border-green-200',
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
        rows={4}
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

function FindingCard({ finding, index, isEditMode, onChange }) {
  const ratingStyle = RATING_STYLES[finding.riskRating] || RATING_STYLES.Medium;

  const field = (label, key, multiline = false) => (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-600 pt-1">{label}</span>
      {isEditMode ? (
        <EditableText
          value={finding[key]}
          onChange={val => onChange(index, key, val)}
          multiline={multiline}
        />
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{finding[key] || ''}</p>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
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
            className="text-xs border border-gray-200 rounded px-2 py-1"
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        ) : (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${ratingStyle}`}>
            {finding.riskRating}
          </span>
        )}
      </div>
      <div className="px-5 py-3">
        {field('Condition', 'condition', true)}
        {field('Criteria', 'criteria', true)}
        {field('Cause', 'cause', true)}
        {field('Effect', 'effect', true)}
        {field('Recommendation', 'recommendation', true)}
        {/* Management Response with QC flags */}
        <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600 pt-1">Mgmt Response</span>
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
            {getMgmtResponseIssues(finding.managementResponse, finding.dueDate, finding.actionOwner).map((issue, i) => (
              <p key={i} className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                {issue}
              </p>
            ))}
          </div>
        </div>
        {field('Action Owner', 'actionOwner')}
        {field('Due Date', 'dueDate')}
        {field('Status', 'status')}
      </div>
    </div>
  );
}

export default function ReportView({ report, onReset }) {
  const [editedReport, setEditedReport] = useState(() => JSON.parse(JSON.stringify(report)));
  const [isEditMode, setIsEditMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeSection, setActiveSection] = useState('cover');

  const cover = editedReport.coverPage || {};
  const scope = editedReport.scopeAndObjectives || {};
  const findings = editedReport.findings || [];

  const updateCover = (key, val) => {
    setEditedReport(prev => ({ ...prev, coverPage: { ...prev.coverPage, [key]: val } }));
  };

  const updateScope = (key, val) => {
    setEditedReport(prev => ({ ...prev, scopeAndObjectives: { ...prev.scopeAndObjectives, [key]: val } }));
  };

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToWord(editedReport);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: 'cover', label: 'Cover' },
    { id: 'executive', label: 'Executive Summary' },
    { id: 'scope', label: 'Scope' },
    { id: 'findings', label: `Findings (${findings.length})` },
    { id: 'conclusion', label: 'Conclusion' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Audit Report Draft</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {cover.client || 'Client'} · {cover.auditPeriod || 'Period not specified'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={() => setIsEditMode(false)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Done editing
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
            onClick={onReset}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            New report
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === tab.id
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          {isEditMode ? (
            <EditableText
              value={editedReport.executiveSummary}
              onChange={val => setEditedReport(prev => ({ ...prev, executiveSummary: val }))}
              multiline
              className="min-h-[200px]"
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {editedReport.executiveSummary}
            </p>
          )}
        </div>
      )}

      {/* SCOPE */}
      {activeSection === 'scope' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Audit Objectives</h3>
            {(scope.objectives || []).map((obj, i) => (
              <div key={i} className="flex gap-3 items-start mb-2">
                <span className="text-xs font-bold text-indigo-500 mt-1">{i + 1}.</span>
                {isEditMode ? (
                  <EditableText value={obj} onChange={val => updateObjective(i, val)} />
                ) : (
                  <p className="text-sm text-gray-700">{obj}</p>
                )}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Scope</h3>
            {isEditMode ? (
              <EditableText value={scope.scope} onChange={val => updateScope('scope', val)} multiline />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{scope.scope}</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Methodology</h3>
            {isEditMode ? (
              <EditableText value={scope.methodology} onChange={val => updateScope('methodology', val)} multiline />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{scope.methodology}</p>
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
            findings.map((finding, i) => (
              <FindingCard
                key={i}
                finding={finding}
                index={i}
                isEditMode={isEditMode}
                onChange={updateFinding}
              />
            ))
          )}
        </div>
      )}

      {/* CONCLUSION */}
      {activeSection === 'conclusion' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          {isEditMode ? (
            <EditableText
              value={editedReport.conclusion}
              onChange={val => setEditedReport(prev => ({ ...prev, conclusion: val }))}
              multiline
              className="min-h-[150px]"
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {editedReport.conclusion}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
