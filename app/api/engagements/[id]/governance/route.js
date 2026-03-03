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
      .from('governance_assessments')
      .select('*')
      .eq('engagement_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || null });
  } catch (err) {
    console.error('GET governance error:', err);
    return NextResponse.json({ error: 'Failed to fetch governance assessment' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const { assessment } = await request.json();
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('governance_assessments')
      .insert({
        engagement_id: id,
        user_id: userId,
        ai_original: assessment,
        current_version: assessment,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('POST governance error:', err);
    return NextResponse.json({ error: 'Failed to save governance assessment' }, { status: 500 });
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
    if (body.overall_conclusion !== undefined) updates.overall_conclusion = body.overall_conclusion;
    if (body.auditor_fills !== undefined) updates.auditor_fills = body.auditor_fills;
    const { error } = await supabase
      .from('governance_assessments')
      .update(updates)
      .eq('engagement_id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH governance error:', err);
    return NextResponse.json({ error: 'Failed to update governance assessment' }, { status: 500 });
  }
}
