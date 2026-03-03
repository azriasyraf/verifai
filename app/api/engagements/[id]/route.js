import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '../../../lib/supabase.js';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/engagements/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch engagement' }, { status: 500 });
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
    if (body.clientName !== undefined) updates.client_name = body.clientName;
    if (body.department !== undefined) updates.department = body.department;
    if (body.periodFrom !== undefined) updates.period_from = body.periodFrom;
    if (body.periodTo !== undefined) updates.period_to = body.periodTo;
    if (body.engagementRef !== undefined) updates.engagement_ref = body.engagementRef;
    if (body.auditorName !== undefined) updates.auditor_name = body.auditorName;
    if (body.primaryContactName !== undefined) updates.primary_contact_name = body.primaryContactName;
    if (body.primaryContactTitle !== undefined) updates.primary_contact_title = body.primaryContactTitle;
    if (body.process !== undefined) updates.process = body.process;
    if (body.sectorContext !== undefined) updates.sector_context = body.sectorContext;
    if (body.jurisdiction !== undefined) updates.jurisdiction = body.jurisdiction;
    if (body.status !== undefined) updates.status = body.status;
    const { data, error } = await supabase
      .from('engagements')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('PATCH /api/engagements/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update engagement' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    const { error } = await supabase
      .from('engagements')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/engagements/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete engagement' }, { status: 500 });
  }
}
