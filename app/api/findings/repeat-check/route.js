import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '../../../lib/supabase.js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { client_name, client_group, process, engagement_id, findings } = await request.json();

    if (!findings?.length || !client_name) {
      return NextResponse.json({ success: true, data: {} });
    }

    const supabase = await getServerSupabase();

    // 3-year expiry — historical findings older than 3 years don't count for repeat detection
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    let query = supabase
      .from('findings')
      .select('engagement_id, control_category, process, source, engagements!inner(client_name, client_group)')
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .gte('created_at', threeYearsAgo.toISOString());

    if (engagement_id) {
      query = query.neq('engagement_id', engagement_id);
    }

    const { data: history, error } = await query;
    if (error) throw error;

    if (!history?.length) {
      return NextResponse.json({ success: true, data: {} });
    }

    const badgeMap = {};

    for (const finding of findings) {
      const { ref, control_category } = finding;
      if (!control_category) continue;

      const withSameCategory = history.filter(h => h.control_category === control_category);
      const findingBadges = [];
      const badgeSummary = {};

      // REPEAT: same client + same process + same control_category, 2+ distinct prior engagements
      const repeatFindings = withSameCategory.filter(
        h => h.engagements?.client_name === client_name && h.process === process
      );
      const repeatEngIds = new Set(repeatFindings.map(h => h.engagement_id));
      if (repeatEngIds.size >= 2) {
        findingBadges.push('REPEAT');
        // Source weighting: count distinct engagements by source type
        const confirmedEngIds = new Set(
          repeatFindings.filter(h => h.source !== 'historical_import').map(h => h.engagement_id)
        );
        const historicalEngIds = new Set(
          repeatFindings.filter(h => h.source === 'historical_import').map(h => h.engagement_id)
        );
        const parts = [];
        if (confirmedEngIds.size > 0) parts.push(`${confirmedEngIds.size} confirmed`);
        if (historicalEngIds.size > 0) parts.push(`${historicalEngIds.size} historical import`);
        badgeSummary['REPEAT'] = parts.join(', ') + ' across prior engagements';
      }

      // CROSS-PROCESS: same client + same control_category + different process, 1+ engagements
      const crossProcessEngIds = new Set(
        withSameCategory
          .filter(h => h.engagements?.client_name === client_name && h.process !== process)
          .map(h => h.engagement_id)
      );
      if (crossProcessEngIds.size >= 1) findingBadges.push('CROSS-PROCESS');

      // GROUP PATTERN: same client_group + same control_category + different subsidiary, 1+ engagements
      if (client_group) {
        const groupEngIds = new Set(
          withSameCategory
            .filter(h =>
              h.engagements?.client_group === client_group &&
              h.engagements?.client_name !== client_name
            )
            .map(h => h.engagement_id)
        );
        if (groupEngIds.size >= 1) findingBadges.push('GROUP PATTERN');
      }

      if (findingBadges.length > 0) {
        badgeMap[ref] = { badges: findingBadges, badgeSummary };
      }
    }

    return NextResponse.json({ success: true, data: badgeMap });
  } catch (err) {
    console.error('POST /api/findings/repeat-check error:', err);
    return NextResponse.json({ success: false, error: 'Repeat check failed. Please try again.' }, { status: 500 });
  }
}
