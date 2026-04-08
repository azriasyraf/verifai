'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { getProcessLabel, PROCESSES } from '../lib/processNames';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const colours = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colours[status] || colours.active}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Active'}
    </span>
  );
}

function EngagementCard({ engagement, onClick }) {
  const processLabel = engagement.process ? getProcessLabel(engagement.process) : null;
  const period = [engagement.period_from, engagement.period_to].filter(Boolean).join(' – ');
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-5 hover:border-indigo-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">
              {engagement.client_name || 'Unnamed client'}
            </h3>
            <StatusBadge status={engagement.status} />
          </div>
          {processLabel && (
            <p className="text-sm text-indigo-600 font-medium mt-0.5">{processLabel}</p>
          )}
          {engagement.department && (
            <p className="text-sm text-gray-500 mt-0.5">{engagement.department}</p>
          )}
          {period && (
            <p className="text-xs text-gray-400 mt-1">Period: {period}</p>
          )}
          {engagement.engagement_ref && (
            <p className="text-xs text-gray-400">Ref: {engagement.engagement_ref}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <p className="text-xs text-gray-400">Updated {formatDate(engagement.updated_at)}</p>
          <span className="text-gray-300 text-base leading-none">›</span>
        </div>
      </div>
    </button>
  );
}

const EMPTY_FORM = { clientName: '', department: '', process: '', periodFrom: '', periodTo: '', engagementRef: '', auditorName: '', sectorContext: '', jurisdiction: 'International' };

export default function Dashboard() {
  const router = useRouter();
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleCreate = async () => {
    if (!form.clientName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/engagements/${json.data.id}`);
      } else {
        setCreateError('Failed to create engagement. Please try again.');
        setCreating(false);
      }
    } catch {
      setCreateError('Network error. Please try again.');
      setCreating(false);
    }
  };

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch('/api/engagements')
      .then(r => r.json())
      .then(result => {
        if (result.success) setEngagements(result.data || []);
        else setError('Failed to load engagements');
      })
      .catch(() => setError('Failed to load engagements'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Engagements</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowNewForm(v => !v); setCreateError(null); setForm(EMPTY_FORM); }}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + New Engagement
            </button>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>

        {/* New engagement form */}
        {showNewForm && (
          <div className="bg-white border border-indigo-100 rounded-xl p-5 mb-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">New Engagement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Client name <span className="text-red-400">*</span></label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="e.g. Acme Sdn Bhd" value={form.clientName} onChange={e => setField('clientName', e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Process</label>
                <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" value={form.process} onChange={e => setField('process', e.target.value)}>
                  <option value="">Select process…</option>
                  {PROCESSES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="e.g. Finance" value={form.department} onChange={e => setField('department', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Engagement ref</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="e.g. AUD-2026-001" value={form.engagementRef} onChange={e => setField('engagementRef', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Period from</label>
                <input type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400" value={form.periodFrom} onChange={e => setField('periodFrom', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Period to</label>
                <input type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400" value={form.periodTo} onChange={e => setField('periodTo', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Auditor name</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="e.g. Ahmad Razif" value={form.auditorName} onChange={e => setField('auditorName', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sector context</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400" placeholder="e.g. Manufacturing, Financial Services" value={form.sectorContext} onChange={e => setField('sectorContext', e.target.value)} />
              </div>
            </div>
            {createError && <p className="text-xs text-red-600">{createError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={creating || !form.clientName.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {creating ? 'Creating…' : 'Create engagement'}
              </button>
              <button onClick={() => { setShowNewForm(false); setForm(EMPTY_FORM); }} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="text-center py-16 text-gray-400">Loading engagements…</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && engagements.length === 0 && !showNewForm && (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">No engagements yet.</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + New Engagement
            </button>
          </div>
        )}

        {!loading && !error && engagements.length > 0 && (
          <div className="space-y-3">
            {engagements.map(eng => (
              <EngagementCard
                key={eng.id}
                engagement={eng}
                onClick={() => router.push(`/engagements/${eng.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
