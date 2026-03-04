import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '../../../../../../lib/supabase.js';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, findingId } = await params;
    const supabase = await getServerSupabase();
    // Verify finding belongs to this engagement + user
    const { data: finding } = await supabase
      .from('findings').select('id')
      .eq('id', findingId).eq('engagement_id', id).eq('user_id', userId).single();
    if (!finding) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('management_actions').select('*')
      .eq('finding_id', findingId).eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('GET actions error:', err);
    return NextResponse.json({ success: false, error: 'Failed to load actions.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, findingId } = await params;
    const { action_description, owner, due_date } = await request.json();
    const supabase = await getServerSupabase();
    const { data: finding } = await supabase
      .from('findings').select('id')
      .eq('id', findingId).eq('engagement_id', id).eq('user_id', userId).single();
    if (!finding) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('management_actions')
      .insert({ finding_id: findingId, user_id: userId, action_description, owner: owner || null, due_date: due_date || null, status: 'Open' })
      .select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('POST action error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create action.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { findingId } = await params;
    const { actionId, ...updates } = await request.json();
    if (!actionId) return NextResponse.json({ error: 'actionId required' }, { status: 400 });
    // Auto-set completion_date on close
    if (updates.status === 'Closed') updates.completion_date = new Date().toISOString().split('T')[0];
    else if (updates.status) updates.completion_date = null;
    updates.updated_at = new Date().toISOString();

    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('management_actions').update(updates)
      .eq('id', actionId).eq('user_id', userId).eq('finding_id', findingId)
      .select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('PATCH action error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update action.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { findingId } = await params;
    const actionId = new URL(request.url).searchParams.get('actionId');
    if (!actionId) return NextResponse.json({ error: 'actionId required' }, { status: 400 });

    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('management_actions').delete()
      .eq('id', actionId).eq('user_id', userId).eq('finding_id', findingId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE action error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete action.' }, { status: 500 });
  }
}
