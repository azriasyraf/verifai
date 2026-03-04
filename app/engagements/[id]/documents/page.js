'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

const STATUS_OPTS = ['Pending', 'Received', 'Partial', 'Cancelled'];
const STATUS_STYLE = {
  Pending: 'bg-gray-100 text-gray-600',
  Received: 'bg-green-50 text-green-700',
  Partial: 'bg-amber-50 text-amber-700',
  Cancelled: 'bg-red-50 text-red-500',
};
const SOURCE_LABEL = { ap: 'AP', rmga: 'RMGA', standard: 'Standard', manual: 'Manual' };
const SOURCE_STYLE = {
  ap: 'bg-violet-50 text-violet-700',
  rmga: 'bg-teal-50 text-teal-700',
  standard: 'bg-gray-100 text-gray-500',
  manual: 'bg-gray-100 text-gray-500',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DocumentsTrackerPage() {
  const { id } = useParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [editState, setEditState] = useState({}); // docId → patch in progress
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ document_name: '', purpose: '', related_control: '' });
  const [addSaving, setAddSaving] = useState(false);

  const baseUrl = `/api/engagements/${id}/documents`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(baseUrl);
      const json = await res.json();
      if (json.success) setDocuments(json.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [baseUrl]);

  useEffect(() => { load(); }, [load]);

  const handlePatch = async (docId, updates) => {
    setEditState(prev => ({ ...prev, [docId]: true }));
    try {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, ...updates }),
      });
      const json = await res.json();
      if (json.success) setDocuments(prev => prev.map(d => d.id === docId ? json.data : d));
    } catch { /* silent */ }
    setEditState(prev => { const n = { ...prev }; delete n[docId]; return n; });
  };

  const handleDelete = async (docId) => {
    try {
      const res = await fetch(`${baseUrl}?docId=${docId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch { /* silent */ }
  };

  const handleAdd = async () => {
    if (!addForm.document_name.trim()) return;
    setAddSaving(true);
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, source: 'manual' }),
      });
      const json = await res.json();
      if (json.success) {
        setDocuments(prev => [...prev, ...json.data]);
        setAddForm({ document_name: '', purpose: '', related_control: '' });
        setIsAdding(false);
      }
    } catch { /* silent */ }
    setAddSaving(false);
  };

  const pendingCount = documents.filter(d => d.status === 'Pending').length;
  const receivedCount = documents.filter(d => d.status === 'Received').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <div className="flex justify-between items-center px-6 pt-4 max-w-5xl mx-auto">
        <Link href={`/engagements/${id}`} className="text-sm text-indigo-600 hover:text-indigo-800">
          ← Back to engagement
        </Link>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Document Request List</h1>
            {!loading && (
              <p className="text-sm text-gray-500 mt-0.5">
                {documents.length} document{documents.length !== 1 ? 's' : ''} · {receivedCount} received · {pendingCount} pending
              </p>
            )}
          </div>
          <button
            onClick={() => { setIsAdding(true); setExpandedId(null); }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add document
          </button>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        {!loading && documents.length === 0 && !isAdding && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-500 mb-3">No documents requested yet.</p>
            <p className="text-sm text-gray-400">Generate a Document Request List from the Audit Program sidebar to populate this tracker.</p>
          </div>
        )}

        {/* Add form */}
        {isAdding && (
          <div className="bg-white border border-indigo-100 rounded-xl p-4 mb-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Add document manually</p>
            <input
              className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="Document name (required)"
              value={addForm.document_name}
              onChange={e => setAddForm(p => ({ ...p, document_name: e.target.value }))}
              autoFocus
            />
            <input
              className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="Purpose (optional)"
              value={addForm.purpose}
              onChange={e => setAddForm(p => ({ ...p, purpose: e.target.value }))}
            />
            <input
              className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="Related control (optional)"
              value={addForm.related_control}
              onChange={e => setAddForm(p => ({ ...p, related_control: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={addSaving || !addForm.document_name.trim()}
                className="text-sm font-semibold bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {addSaving ? 'Saving…' : 'Add'}
              </button>
              <button
                onClick={() => { setIsAdding(false); setAddForm({ document_name: '', purpose: '', related_control: '' }); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {documents.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 w-8"></th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Document</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3 hidden md:table-cell">Control</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">Auditee Owner</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">Date Received</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">Status</th>
                  <th className="px-3 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map(doc => {
                  const isExpanded = expandedId === doc.id;
                  const saving = !!editState[doc.id];
                  return (
                    <>
                      <tr
                        key={doc.id}
                        className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}
                      >
                        {/* Expand toggle */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                            className="text-gray-300 hover:text-indigo-400 text-xs transition-colors"
                            title="Expand details"
                          >
                            <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                          </button>
                        </td>
                        {/* Document name + source */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-800">{doc.document_name}</span>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${SOURCE_STYLE[doc.source] || SOURCE_STYLE.manual}`}>
                              {SOURCE_LABEL[doc.source] || doc.source}
                            </span>
                          </div>
                        </td>
                        {/* Related control */}
                        <td className="px-3 py-3 text-gray-500 hidden md:table-cell">
                          {doc.related_control || '—'}
                        </td>
                        {/* Auditee owner — inline editable */}
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <input
                            className="text-sm text-gray-600 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-400 focus:outline-none w-full"
                            placeholder="—"
                            defaultValue={doc.auditee_owner || ''}
                            onBlur={e => {
                              if (e.target.value !== (doc.auditee_owner || ''))
                                handlePatch(doc.id, { auditee_owner: e.target.value || null });
                            }}
                          />
                        </td>
                        {/* Date received — inline editable */}
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <input
                            type="date"
                            className="text-sm text-gray-600 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-400 focus:outline-none"
                            defaultValue={doc.received_date || ''}
                            onBlur={e => {
                              if (e.target.value !== (doc.received_date || ''))
                                handlePatch(doc.id, { received_date: e.target.value || null });
                            }}
                          />
                        </td>
                        {/* Status dropdown */}
                        <td className="px-3 py-3">
                          <select
                            value={doc.status}
                            onChange={e => handlePatch(doc.id, { status: e.target.value })}
                            disabled={saving}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 ${STATUS_STYLE[doc.status] || STATUS_STYLE.Pending}`}
                          >
                            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        {/* Delete */}
                        <td className="px-3 py-3">
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="text-gray-300 hover:text-red-400 text-base leading-none transition-colors"
                            title="Remove"
                          >×</button>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${doc.id}-expanded`} className="bg-indigo-50/20">
                          <td></td>
                          <td colSpan={5} className="px-4 pb-4 pt-1">
                            <div className="space-y-3">
                              {doc.purpose && (
                                <p className="text-xs text-gray-600"><span className="font-medium text-gray-500">Purpose:</span> {doc.purpose}</p>
                              )}
                              {/* Notes field */}
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                                <textarea
                                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                                  rows={2}
                                  placeholder="Add notes…"
                                  defaultValue={doc.notes || ''}
                                  onBlur={e => {
                                    if (e.target.value !== (doc.notes || ''))
                                      handlePatch(doc.id, { notes: e.target.value || null });
                                  }}
                                />
                              </div>
                              {/* Mobile-only fields */}
                              <div className="flex gap-3 flex-wrap lg:hidden">
                                <div className="flex-1 min-w-[140px]">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Auditee Owner</p>
                                  <input
                                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    placeholder="—"
                                    defaultValue={doc.auditee_owner || ''}
                                    onBlur={e => {
                                      if (e.target.value !== (doc.auditee_owner || ''))
                                        handlePatch(doc.id, { auditee_owner: e.target.value || null });
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Date Received</p>
                                  <input
                                    type="date"
                                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                    defaultValue={doc.received_date || ''}
                                    onBlur={e => {
                                      if (e.target.value !== (doc.received_date || ''))
                                        handlePatch(doc.id, { received_date: e.target.value || null });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td></td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4 text-center">
          Changes save automatically. Word export coming soon.
        </p>
      </div>
    </div>
  );
}
