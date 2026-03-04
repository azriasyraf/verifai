import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '../../../../../lib/supabase.js';
import { checkRateLimit } from '../../../../../lib/rateLimit.js';
import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert internal auditor. Generate structured PBC (Prepared By Client) document request lists for audit engagements.

NON-NEGOTIABLE OUTPUT RULES:
1. Return only valid JSON matching the exact schema. No markdown, no commentary.
2. document_name must be specific and actionable — not generic (e.g. "Creditors listing aged as at [period end date]" not just "Report").
3. Never duplicate documents — merge similar requests into one.
4. Maximum 30 documents total.`;

export async function POST(request, { params }) {
  const limited = await checkRateLimit();
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const supabase = await getServerSupabase();

    // Fetch engagement, AP, and RMGA in parallel
    const [engResult, apResult, rmgaResult] = await Promise.all([
      supabase
        .from('engagements')
        .select('client_name, department, process, sector_context, auditor_name')
        .eq('id', id)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('audit_programs')
        .select('current_version')
        .eq('engagement_id', id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('governance_assessments')
        .select('current_version')
        .eq('engagement_id', id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!engResult.data) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
    if (!apResult.data) return NextResponse.json({ error: 'No audit program found. Generate an audit program first.' }, { status: 400 });

    const engagement = engResult.data;
    const ap = apResult.data.current_version;
    const rmga = rmgaResult.data?.current_version || null;

    const prompt = buildPrompt(engagement, ap, rmga);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return NextResponse.json({ success: true, data: result.documents || [] });
  } catch (err) {
    console.error('Generate documents error:', err);
    return NextResponse.json({ success: false, error: 'Failed to generate document list.' }, { status: 500 });
  }
}

function buildPrompt(engagement, ap, rmga) {
  // Extract controls + expected evidence from AP
  const controls = (ap?.controls || []).map(c => ({ id: c.id, description: c.description }));
  const evidenceByControl = {};
  for (const proc of ap?.auditProcedures || []) {
    if (proc.controlId && proc.expectedEvidence) {
      if (!evidenceByControl[proc.controlId]) evidenceByControl[proc.controlId] = [];
      evidenceByControl[proc.controlId].push(proc.expectedEvidence);
    }
  }

  // Extract RMGA documentsToObtain
  const rmgaDocs = [];
  if (rmga?.areas) {
    for (const area of rmga.areas) {
      for (const doc of area.documentsToObtain || []) {
        rmgaDocs.push({ area: area.area, document: doc });
      }
    }
  }

  const controlLines = controls.map(c => {
    const evidence = evidenceByControl[c.id];
    return `${c.id}: ${c.description}${evidence?.length ? ` → Expected evidence: ${evidence.join('; ')}` : ''}`;
  }).join('\n');

  return `Generate a PBC (Prepared By Client) document request list for an internal audit engagement.

ENGAGEMENT: ${engagement.client_name || 'Unnamed client'} | Process: ${engagement.process || 'general'}${engagement.sector_context ? ` | ${engagement.sector_context}` : ''}${engagement.department ? ` | ${engagement.department}` : ''}

AUDIT CONTROLS (from Audit Program — source these as "ap"):
${controlLines || 'No controls available'}
${rmgaDocs.length > 0 ? `
GOVERNANCE DOCUMENTS (from RMGA — source these exactly as "rmga"):
${rmgaDocs.map(d => `[${d.area}] ${d.document}`).join('\n')}` : ''}

SCHEMA — return exactly:
{
  "documents": [
    {
      "document_name": "Specific document name (concise, under 80 chars, use [period end date] placeholder where applicable)",
      "purpose": "Why this document is needed for the audit (1-2 sentences)",
      "related_control": "Control ID (e.g. C001) or governance area name this document supports",
      "source": "ap" or "rmga" or "standard"
    }
  ]
}

RULES:
1. For each AP control, create 1-2 document requests using the expectedEvidence as a guide. Name them specifically (e.g. "Purchase order register for [period]", "Payroll variance report — [month]").
2. Include all RMGA documents verbatim with source="rmga". Do not paraphrase.
3. Add 2-3 standard documents always needed for this process (e.g. organisation chart, process flowchart, staff listing) with source="standard".
4. Merge similar or overlapping documents — do not duplicate.
5. Maximum 30 documents total.
6. related_control must reference the AP control ID (e.g. "C001") for AP-sourced documents, and the RMGA area name for RMGA-sourced documents.`;
}
