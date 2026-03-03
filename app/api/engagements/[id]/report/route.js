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
      .from('audit_reports')
      .select('*')
      .eq('engagement_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || null });
  } catch (err) {
    console.error('GET report error:', err);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const { report, sourceFindings } = await request.json();
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('audit_reports')
      .insert({
        engagement_id: id,
        user_id: userId,
        ai_original: report,
        current_version: report,
        source_findings: sourceFindings || null,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('POST report error:', err);
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await getServerSupabase();
    const updates = { updated_at: new Date().toISOString() };
    if (body.current_version !== undefined) updates.current_version = body.current_version;
    if (body.source_findings !== undefined) updates.source_findings = body.source_findings;
    const { error } = await supabase
      .from('audit_reports')
      .update(updates)
      .eq('engagement_id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH report error:', err);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
