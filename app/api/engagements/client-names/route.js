import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '../../../lib/supabase.js';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('engagements')
      .select('client_name')
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .not('client_name', 'is', null)
      .neq('client_name', '');
    if (error) throw error;
    // Return distinct non-empty names, sorted
    const names = [...new Set(data.map(e => e.client_name).filter(Boolean))].sort();
    return NextResponse.json({ success: true, data: names });
  } catch (err) {
    console.error('GET /api/engagements/client-names error:', err);
    return NextResponse.json({ error: 'Failed to fetch client names' }, { status: 500 });
  }
}
