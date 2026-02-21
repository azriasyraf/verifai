'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { getProcessLabel } from '../../lib/processNames';

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ArtifactCard({ title, record, onOpen, onGenerate }) {
  const hasData = !!record;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {hasData ? (
            <p className="text-sm text-gray-500 mt-0.5">Last updated {formatDate(record.updated_at)}</p>
          ) : (
            <p className="text-sm text-gray-400 mt-0.5">Not yet generated</p>
          )}
        </div>
        {hasData ? (
          <button
            onClick={onOpen}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Open
          </button>
        ) : (
          <button
            onClick={onGenerate}
            className="text-sm font-medium text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Generate
          </button>
        )}
      </div>
    </div>
  );
}

export default function EngagementDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [engagement, setEngagement] = useState(null);
  const [artifacts, setArtifacts] = useState({ ap: null, walkthrough: null, governance: null, report: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/engagements/${id}`).then(r => r.json()),
      fetch(`/api/engagements/${id}/audit-program`).then(r => r.json()),
      fetch(`/api/engagements/${id}/walkthrough`).then(r => r.json()),
      fetch(`/api/engagements/${id}/governance`).then(r => r.json()),
      fetch(`/api/engagements/${id}/report`).then(r => r.json()),
    ])
      .then(([eng, ap, wt, gov, rep]) => {
        if (!eng.success) { setError('Engagement not found or access denied'); return; }
        setEngagement(eng.data);
        setArtifacts({
          ap: ap.success ? ap.data : null,
          walkthrough: wt.success ? wt.data : null,
          governance: gov.success ? gov.data : null,
          report: rep.success ? rep.data : null,
        });
      })
      .catch(() => setError('Failed to load engagement'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 text-sm">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const processLabel = engagement?.process ? getProcessLabel(engagement.process) : null;
  const period = [engagement?.period_from, engagement?.period_to].filter(Boolean).join(' – ');

  const handleDelete = async () => {
    if (!window.confirm('Delete this engagement and all its working papers? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/engagements/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) router.push('/dashboard');
      else alert('Failed to delete engagement. Please try again.');
    } catch {
      alert('Failed to delete engagement. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Navigate to home with this engagement pre-selected via sessionStorage
  const handleGenerate = (mode) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('verifai_prefill', JSON.stringify({
        engagementId: id,
        clientName: engagement.client_name,
        department: engagement.department,
        periodFrom: engagement.period_from,
        periodTo: engagement.period_to,
        engagementRef: engagement.engagement_ref,
        auditorName: engagement.auditor_name,
        primaryContactName: engagement.primary_contact_name,
        primaryContactTitle: engagement.primary_contact_title,
        process: engagement.process,
        sectorContext: engagement.sector_context,
        jurisdiction: engagement.jurisdiction,
        mode,
      }));
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <div className="flex justify-between items-center px-6 pt-4 max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← Back to dashboard
        </Link>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {engagement?.client_name || 'Unnamed client'}
              </h1>
              {processLabel && <p className="text-indigo-600 font-medium mt-0.5">{processLabel}</p>}
              {engagement?.department && <p className="text-sm text-gray-500 mt-0.5">{engagement.department}</p>}
              {period && <p className="text-sm text-gray-400 mt-1">Period: {period}</p>}
              {engagement?.engagement_ref && <p className="text-sm text-gray-400">Ref: {engagement.engagement_ref}</p>}
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>Created {formatDate(engagement?.created_at)}</p>
              {engagement?.auditor_name && <p className="mt-1">{engagement.auditor_name}</p>}
            </div>
          </div>
        </div>

        {/* Artifact cards */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Documents</h2>
        <div className="space-y-3">
          <ArtifactCard
            title="Audit Program"
            record={artifacts.ap}
            onOpen={() => handleGenerate('audit')}
            onGenerate={() => handleGenerate('audit')}
          />
          <ArtifactCard
            title="Walkthrough Working Paper"
            record={artifacts.walkthrough}
            onOpen={() => handleGenerate('walkthrough')}
            onGenerate={() => handleGenerate('walkthrough')}
          />
          <ArtifactCard
            title="RMGA Governance Assessment"
            record={artifacts.governance}
            onOpen={() => handleGenerate('governance')}
            onGenerate={() => handleGenerate('governance')}
          />
          <ArtifactCard
            title="Audit Report"
            record={artifacts.report}
            onOpen={() => handleGenerate('report')}
            onGenerate={() => handleGenerate('report')}
          />
        </div>

        {/* Danger zone */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete this engagement'}
          </button>
        </div>
      </div>
    </div>
  );
}
