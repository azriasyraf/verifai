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
      .from('walkthrough_papers')
      .select('*')
      .eq('engagement_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || null });
  } catch (err) {
    console.error('GET walkthrough error:', err);
    return NextResponse.json({ error: 'Failed to fetch walkthrough' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const { walkthrough } = await request.json();
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('walkthrough_papers')
      .insert({
        engagement_id: id,
        user_id: userId,
        ai_original: walkthrough,
        current_version: walkthrough,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('POST walkthrough error:', err);
    return NextResponse.json({ error: 'Failed to save walkthrough' }, { status: 500 });
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
    if (body.checkpoint_responses !== undefined) updates.checkpoint_responses = body.checkpoint_responses;
    if (body.freeform_notes !== undefined) updates.freeform_notes = body.freeform_notes;
    if (body.overall_conclusion !== undefined) updates.overall_conclusion = body.overall_conclusion;
    const { error } = await supabase
      .from('walkthrough_papers')
      .update(updates)
      .eq('engagement_id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH walkthrough error:', err);
    return NextResponse.json({ error: 'Failed to update walkthrough' }, { status: 500 });
  }
}
