import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '../../lib/supabase.js';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/engagements error:', err);
    return NextResponse.json({ error: 'Failed to fetch engagements' }, { status: 500 });
  }
}

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('engagements')
      .insert({
        user_id: userId,
        client_name: body.clientName || null,
        department: body.department || null,
        period_from: body.periodFrom || null,
        period_to: body.periodTo || null,
        engagement_ref: body.engagementRef || null,
        auditor_name: body.auditorName || null,
        primary_contact_name: body.primaryContactName || null,
        primary_contact_title: body.primaryContactTitle || null,
        process: body.process || null,
        sector_context: body.sectorContext || null,
        jurisdiction: body.jurisdiction || 'International',
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('POST /api/engagements error:', err);
    return NextResponse.json({ error: 'Failed to create engagement' }, { status: 500 });
  }
}
