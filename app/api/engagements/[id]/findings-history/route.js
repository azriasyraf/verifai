import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '../../../../../lib/supabase.js';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();

    // Get this engagement's client info (RLS ensures org isolation)
    const { data: engagement, error: engError } = await supabase
      .from('engagements')
      .select('client_name, client_group')
      .eq('id', id)
      .single();
    if (engError || !engagement) {
      return NextResponse.json({ success: false, error: 'Engagement not found.' }, { status: 404 });
    }

    const { client_name, client_group } = engagement;
    if (!client_name) return NextResponse.json({ success: true, data: [] });

    // 3-year expiry window
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    // Fetch findings from other engagements, joined with their engagement's client info
    const { data: findings, error: findingsError } = await supabase
      .from('findings')
      .select('engagement_id, control_category, process, source, engagements!inner(client_name, client_group)')
      .neq('engagement_id', id)
      .not('control_category', 'is', null)
      .gte('created_at', threeYearsAgo.toISOString());

    if (findingsError) throw findingsError;

    // Filter in JS: same client name OR same client_group (if set)
    const relevant = (findings || []).filter(f => {
      if (f.engagements?.client_name === client_name) return true;
      if (client_group && f.engagements?.client_group === client_group) return true;
      return false;
    });

    // Group by control_category
    const categoryMap = {};
    for (const f of relevant) {
      const cat = f.control_category;
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          control_category: cat,
          finding_count: 0,
          engagement_ids: new Set(),
          processes: new Set(),
        };
      }
      categoryMap[cat].finding_count++;
      categoryMap[cat].engagement_ids.add(f.engagement_id);
      if (f.process) categoryMap[cat].processes.add(f.process);
    }

    const summary = Object.values(categoryMap)
      .map(c => ({
        control_category: c.control_category,
        finding_count: c.finding_count,
        engagement_count: c.engagement_ids.size,
        processes: [...c.processes],
      }))
      .sort((a, b) => b.engagement_count - a.engagement_count || b.finding_count - a.finding_count);

    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    console.error('GET /api/engagements/[id]/findings-history error:', err);
    return NextResponse.json({ success: false, error: 'Failed to load findings history.' }, { status: 500 });
  }
}
