'use client';
import { useState } from 'react';

const SOURCE_LABEL = { ap: 'AP', rmga: 'RMGA', standard: 'Standard', manual: 'Manual' };
const SOURCE_STYLE = {
  ap: 'bg-violet-50 text-violet-700',
  rmga: 'bg-teal-50 text-teal-700',
  standard: 'bg-gray-100 text-gray-600',
  manual: 'bg-gray-100 text-gray-600',
};

export default function DocumentRequestStaging({ suggestions, engagementId, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(() => new Set(suggestions.map((_, i) => i)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (i) => setSelected(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const toggleAll = () => {
    if (selected.size === suggestions.length) setSelected(new Set());
    else setSelected(new Set(suggestions.map((_, i) => i)));
  };

  const handleConfirm = async () => {
    const docs = suggestions.filter((_, i) => selected.has(i));
    if (!docs.length) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docs),
      });
      const json = await res.json();
      if (json.success) {
        onConfirm(json.data);
      } else {
        setError(json.error || 'Failed to save documents.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSaving(false);
  };

  const bySource = { rmga: [], ap: [], standard: [] };
  suggestions.forEach((doc, i) => {
    const key = doc.source in bySource ? doc.source : 'standard';
    bySource[key].push({ doc, i });
  });
  const groups = [
    { key: 'rmga', label: 'Governance (RMGA)' },
    { key: 'ap', label: 'Audit Program Controls' },
    { key: 'standard', label: 'Standard Documents' },
  ].filter(g => bySource[g.key].length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-8 pb-8 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Document Request List</h2>
            <p className="text-xs text-gray-500 mt-0.5">Review and deselect any documents before saving.</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Select all */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selected.size === suggestions.length}
              onChange={toggleAll}
              className="rounded"
            />
            <span className="text-xs font-medium text-gray-600">Select all ({suggestions.length} documents)</span>
          </label>
          <span className="text-xs text-gray-400">{selected.size} selected</span>
        </div>

        {/* Grouped document list */}
        <div className="px-6 py-4 space-y-5 max-h-[55vh] overflow-y-auto">
          {groups.map(({ key, label }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
              <div className="space-y-1.5">
                {bySource[key].map(({ doc, i }) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${selected.has(i) ? 'bg-indigo-50' : 'bg-gray-50 opacity-60'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                      className="mt-0.5 rounded shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{doc.document_name}</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${SOURCE_STYLE[doc.source] || SOURCE_STYLE.standard}`}>
                          {SOURCE_LABEL[doc.source] || doc.source}
                        </span>
                      </div>
                      {doc.purpose && <p className="text-xs text-gray-500 mt-0.5">{doc.purpose}</p>}
                      {doc.related_control && (
                        <p className="text-xs text-gray-400 mt-0.5">Control: {doc.related_control}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {error && <p className="px-6 pb-2 text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || selected.size === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save ${selected.size} document${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
