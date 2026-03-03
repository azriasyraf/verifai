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
      .from('audit_programs')
      .select('*')
      .eq('engagement_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || null });
  } catch (err) {
    console.error('GET audit-program error:', err);
    return NextResponse.json({ error: 'Failed to fetch audit program' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const { auditProgram, analyticsTests } = await request.json();
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('audit_programs')
      .insert({
        engagement_id: id,
        user_id: userId,
        ai_original: auditProgram,
        current_version: auditProgram,
        analytics_tests: analyticsTests || null,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('POST audit-program error:', err);
    return NextResponse.json({ error: 'Failed to save audit program' }, { status: 500 });
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
    if (body.analytics_tests !== undefined) updates.analytics_tests = body.analytics_tests;
    if (body.raised_findings !== undefined) updates.raised_findings = body.raised_findings;
    if (body.exit_meeting !== undefined) updates.exit_meeting = body.exit_meeting;
    const { error } = await supabase
      .from('audit_programs')
      .update(updates)
      .eq('engagement_id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH audit-program error:', err);
    return NextResponse.json({ error: 'Failed to update audit program' }, { status: 500 });
  }
}
