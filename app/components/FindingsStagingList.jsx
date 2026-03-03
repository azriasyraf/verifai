'use client';

export const CONTROL_CATEGORIES = [
  'Authorization & Approval',
  'Segregation of Duties',
  'Access & User Management',
  'Reconciliation & Review',
  'Documentation & Evidence',
  'Physical & Asset Safeguarding',
  'IT Change Management',
  'IT Operations & Availability',
  'Financial Reporting',
  'Compliance & Regulatory',
  'Monitoring & Oversight',
  'Commitment & Contracting',
];

const BADGE_STYLES = {
  'REPEAT': 'bg-red-100 text-red-700 border border-red-200',
  'CROSS-PROCESS': 'bg-orange-100 text-orange-700 border border-orange-200',
  'GROUP PATTERN': 'bg-purple-100 text-purple-700 border border-purple-200',
};

const BADGE_TOOLTIPS = {
  'REPEAT': 'Same control category flagged in 2+ prior engagements for this client and process',
  'CROSS-PROCESS': 'Same control category found in a different process for this client — possible systemic weakness',
  'GROUP PATTERN': 'Same control category found across other subsidiaries in the same group',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-gray-50 rounded-lg px-4 py-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-5 w-12 bg-gray-200 rounded" />
            <div className="h-4 w-14 bg-gray-200 rounded" />
            <div className="h-4 flex-1 bg-gray-200 rounded" />
          </div>
          <div className="mt-2 h-7 w-48 bg-gray-200 rounded" />
        </div>
      ))}
      <p className="text-xs text-center text-gray-400 py-1">Classifying findings and checking history…</p>
    </div>
  );
}

export default function FindingsStagingList({ findings, isClassifying, onCategoryChange, onRemove }) {
  if (isClassifying) return <LoadingSkeleton />;
  if (!findings?.length) return null;

  const badgeCount = findings.reduce((n, f) => n + (f.badges?.length || 0), 0);
  const unclassifiedCount = findings.filter(f => !f.control_category).length;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          {findings.length} finding{findings.length !== 1 ? 's' : ''} staged
        </p>
        <div className="flex items-center gap-2">
          {badgeCount > 0 && (
            <span className="text-xs text-red-600 font-medium">
              {badgeCount} repeat pattern{badgeCount !== 1 ? 's' : ''} detected
            </span>
          )}
          {unclassifiedCount > 0 && (
            <span className="text-xs text-amber-600 font-medium">
              {unclassifiedCount} unclassified
            </span>
          )}
        </div>
      </div>

      {/* Per-row staging */}
      {findings.map((f, i) => (
        <div key={f.ref || i} className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 space-y-1.5">
          {/* Top row: rating + ref + description + remove */}
          <div className="flex items-start gap-2">
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
              f.riskRating === 'High' ? 'bg-red-100 text-red-700' :
              f.riskRating === 'Low' ? 'bg-green-100 text-green-700' :
              'bg-orange-100 text-orange-700'
            }`}>
              {f.riskRating || 'Medium'}
            </span>
            <span className="shrink-0 text-xs font-mono text-gray-400 mt-0.5">{f.ref}</span>
            <span className="text-xs text-gray-700 leading-snug flex-1 min-w-0 line-clamp-2">
              {f.findingDescription || '[no description]'}
            </span>
            <button
              onClick={() => onRemove(f.ref)}
              className="shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5"
              title="Remove from staging"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Bottom row: category dropdown + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={f.control_category || ''}
              onChange={e => onCategoryChange(f.ref, e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400"
            >
              <option value="">— Unclassified —</option>
              {CONTROL_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {(f.badges || []).map(badge => (
              <span
                key={badge}
                className={`relative group inline-flex items-center text-xs font-medium rounded px-1.5 py-0.5 cursor-default ${BADGE_STYLES[badge] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}
              >
                {badge}
                <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-max max-w-xs bg-white border border-gray-200 rounded-lg shadow-sm px-2.5 py-1.5 text-xs text-gray-700 leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                  {BADGE_TOOLTIPS[badge] || badge}
                  {f.badgeSummary?.[badge] && (
                    <span className="block mt-1 text-gray-500">{f.badgeSummary[badge]}</span>
                  )}
                </span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
