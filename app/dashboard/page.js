'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { getProcessLabel } from '../lib/processNames';

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

export default function Dashboard() {
  const router = useRouter();
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Engagements</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + New Working Paper
            </button>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="text-center py-16 text-gray-400">Loading engagements…</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && engagements.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">No engagements yet. Start by generating an audit working paper.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + New Working Paper
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
