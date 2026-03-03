import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '../../../../lib/supabase.js';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('findings')
      .select('*')
      .eq('engagement_id', id)
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/engagements/[id]/findings error:', err);
    return NextResponse.json({ success: false, error: 'Failed to load findings.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const { findings, mode } = await request.json();
    const isHistoricalImport = mode === 'historical_import';
    const isAnalyticsRaised = mode === 'analytics_raised';
    const supabase = await getServerSupabase();

    if (isHistoricalImport) {
      // Historical import: only clear existing historical_import findings, no re-generate guard
      await supabase
        .from('findings')
        .delete()
        .eq('engagement_id', id)
        .eq('user_id', userId)
        .eq('source', 'historical_import');
    } else if (isAnalyticsRaised) {
      // Analytics raised: only clear existing analytics_raised findings, no re-generate guard
      await supabase
        .from('findings')
        .delete()
        .eq('engagement_id', id)
        .eq('user_id', userId)
        .eq('source', 'analytics_raised');
    } else {
      // Re-generate guard: check if management_actions exist for non-historical findings
      const { data: existingFindings } = await supabase
        .from('findings')
        .select('id')
        .eq('engagement_id', id)
        .eq('user_id', userId)
        .neq('source', 'historical_import');

      if (existingFindings?.length > 0) {
        const findingIds = existingFindings.map(f => f.id);
        const { data: actions } = await supabase
          .from('management_actions')
          .select('id')
          .in('finding_id', findingIds)
          .limit(1);
        if (actions?.length > 0) {
          return NextResponse.json({
            success: false,
            error: 'Cannot re-generate: management actions exist for prior findings. Complete or remove them first.',
          }, { status: 409 });
        }

        // Clear existing non-historical findings
        const { error: deleteError } = await supabase
          .from('findings')
          .delete()
          .eq('engagement_id', id)
          .eq('user_id', userId)
          .neq('source', 'historical_import');
        if (deleteError) throw deleteError;
      }
    }

    if (!findings?.length) {
      return NextResponse.json({ success: true, data: [] });
    }

    const rows = findings.map(f => ({
      engagement_id: id,
      user_id: userId,
      ref: f.ref || null,
      control_id: f.controlId || null,
      risk_id: f.riskId || null,
      finding_description: f.findingDescription || null,
      cause: f.rootCause || null,
      risk_rating: f.riskRating || 'Medium',
      recommendation: f.recommendation || null,
      management_response: f.managementResponse || null,
      due_date: f.dueDate || null,
      status: f.status || 'Open',
      process: f.process || null,
      control_category: f.control_category || null,
      regulatory_refs: f.regulatory_refs || [],
      source: f.source || 'generated',
    }));

    const { data, error } = await supabase.from('findings').insert(rows).select();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('POST /api/engagements/[id]/findings error:', err);
    return NextResponse.json({ success: false, error: 'Failed to save findings.' }, { status: 500 });
  }
}
