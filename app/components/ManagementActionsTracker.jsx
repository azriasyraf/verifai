'use client';
import { useState, useCallback } from 'react';

const STATUS_NEXT = { 'Open': 'In Progress', 'In Progress': 'Closed', 'Closed': 'Open' };
const STATUS_STYLE = {
  'Open': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-50 text-blue-700',
  'Closed': 'bg-green-50 text-green-700',
  'Overdue': 'bg-red-50 text-red-700',
};

function isOverdue(action) {
  if (action.status === 'Closed' || !action.due_date) return false;
  return new Date(action.due_date) < new Date(new Date().toDateString());
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ManagementActionsTracker({ findingId, engagementId }) {
  const [expanded, setExpanded] = useState(false);
  const [actions, setActions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ action_description: '', owner: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  const baseUrl = `/api/engagements/${engagementId}/findings/${findingId}/actions`;

  const load = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch(baseUrl);
      const json = await res.json();
      if (json.success) { setActions(json.data || []); setLoaded(true); }
    } catch { /* silent */ }
    setLoading(false);
  }, [baseUrl, loaded]);

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) load();
  };

  const handleAdd = async () => {
    if (!form.action_description.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setActions(prev => [...prev, json.data]);
        setForm({ action_description: '', owner: '', due_date: '' });
        setIsAdding(false);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleCycleStatus = async (action) => {
    const nextStatus = STATUS_NEXT[action.status] || 'Open';
    try {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: action.id, status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) setActions(prev => prev.map(a => a.id === action.id ? json.data : a));
    } catch { /* silent */ }
  };

  const handleDelete = async (actionId) => {
    try {
      const res = await fetch(`${baseUrl}?actionId=${actionId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) setActions(prev => prev.filter(a => a.id !== actionId));
    } catch { /* silent */ }
  };

  const openCount = actions.filter(a => a.status !== 'Closed').length;

  // Don't render if no findingId (finding not yet in DB)
  if (!findingId) return null;

  return (
    <div className="border-t border-gray-100 mt-3 pt-2">
      <button
        onClick={handleExpand}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 py-1 w-full text-left"
      >
        <span className={`transition-transform text-xs inline-block ${expanded ? 'rotate-90' : ''}`}>▶</span>
        Management Actions
        {openCount > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
            {openCount} open
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-4">
          {loading && <p className="text-xs text-gray-400">Loading...</p>}

          {actions.map(action => {
            const overdue = isOverdue(action);
            const displayStatus = overdue ? 'Overdue' : action.status;
            return (
              <div key={action.id} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{action.action_description}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {action.owner && <span className="text-xs text-gray-500">Owner: <span className="font-medium">{action.owner}</span></span>}
                    {action.due_date && (
                      <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        Due: {fmtDate(action.due_date)}
                      </span>
                    )}
                    {action.completion_date && (
                      <span className="text-xs text-green-600">Closed: {fmtDate(action.completion_date)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCycleStatus(action)}
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity ${STATUS_STYLE[displayStatus]}`}
                    title="Click to advance status"
                  >
                    {displayStatus}
                  </button>
                  <button
                    onClick={() => handleDelete(action.id)}
                    className="text-gray-300 hover:text-red-400 text-base leading-none ml-1"
                    title="Remove action"
                  >×</button>
                </div>
              </div>
            );
          })}

          {loaded && actions.length === 0 && !isAdding && (
            <p className="text-xs text-gray-400">No actions recorded yet.</p>
          )}

          {isAdding ? (
            <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
              <textarea
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                placeholder="Action description"
                rows={2}
                value={form.action_description}
                onChange={e => setForm(p => ({ ...p, action_description: e.target.value }))}
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="Action owner"
                  value={form.owner}
                  onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
                />
                <input
                  type="date"
                  className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={saving || !form.action_description.trim()}
                  className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Add action'}
                </button>
                <button
                  onClick={() => { setIsAdding(false); setForm({ action_description: '', owner: '', due_date: '' }); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + Add action
            </button>
          )}
        </div>
      )}
    </div>
  );
}
