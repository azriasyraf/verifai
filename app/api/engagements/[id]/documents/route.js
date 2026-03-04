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
      .from('document_requests')
      .select('*')
      .eq('engagement_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('GET documents error:', err);
    return NextResponse.json({ success: false, error: 'Failed to load documents.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await getServerSupabase();
    // Supports bulk insert (array) or single insert (object)
    const rows = Array.isArray(body) ? body : [body];
    const inserts = rows.map(r => ({
      engagement_id: id,
      user_id: userId,
      document_name: r.document_name,
      purpose: r.purpose || null,
      related_control: r.related_control || null,
      requested_by: r.requested_by || null,
      requested_date: r.requested_date || null,
      auditee_owner: r.auditee_owner || null,
      status: 'Pending',
      source: r.source || 'manual',
    }));
    const { data, error } = await supabase
      .from('document_requests')
      .insert(inserts)
      .select();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('POST documents error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create documents.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const { docId, ...updates } = await request.json();
    if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });
    updates.updated_at = new Date().toISOString();
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('document_requests')
      .update(updates)
      .eq('id', docId)
      .eq('user_id', userId)
      .eq('engagement_id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('PATCH document error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update document.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const docId = new URL(request.url).searchParams.get('docId');
    if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('document_requests')
      .delete()
      .eq('id', docId)
      .eq('user_id', userId)
      .eq('engagement_id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE document error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete document.' }, { status: 500 });
  }
}
