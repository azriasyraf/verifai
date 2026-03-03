import Groq from 'groq-sdk';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rateLimit.js';

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CATEGORIES = [
  'Authorization & Approval',
  'Segregation of Duties',
  'Access & User Management',
  'Reconciliation & Review',
  'Documentation & Evidence',
  'Physical & Asset Safeguarding',
  'IT Change Management',
  'IT Operations & Availability',
  'Financial Reporting',
  'Compliance & Regulatory',
  'Monitoring & Oversight',
  'Commitment & Contracting',
];

const VALID_CATEGORIES = new Set(CATEGORIES);

export async function POST(request) {
  const limited = await checkRateLimit();
  if (limited) return limited;
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { findings, process } = await request.json();
    if (!findings?.length) {
      return NextResponse.json({ success: false, error: 'No findings provided' }, { status: 400 });
    }

    const prompt = `You are classifying internal audit findings into control categories.

CONTROL CATEGORY TAXONOMY (use EXACTLY these names):
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Process context: ${process || 'Not specified'}

FINDINGS TO CLASSIFY:
${findings.map(f => `REF: ${f.ref || '?'}
DESCRIPTION: ${f.findingDescription || ''}
ROOT CAUSE: ${f.rootCause || ''}
RECOMMENDATION: ${f.recommendation || ''}`).join('\n---\n')}

Return ONLY a valid JSON object with key "classifications" containing an array.
For each finding return:
- ref: the finding ref exactly as provided
- control_category: one category name EXACTLY as listed in the taxonomy above
- regulatory_refs: array of specific regulation/standard references if clearly inferable from the description (e.g. "Employment Act s.18", "PDPA s.7"), otherwise empty array

Pick the PRIMARY control weakness. If a finding could fit multiple categories, choose the most specific applicable one.

Format: {"classifications": [{"ref": "F001", "control_category": "Authorization & Approval", "regulatory_refs": []}]}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const raw = parsed.classifications || [];

    // Validate category names — null if not in taxonomy
    const cleaned = raw.map(c => ({
      ref: c.ref,
      control_category: VALID_CATEGORIES.has(c.control_category) ? c.control_category : null,
      regulatory_refs: Array.isArray(c.regulatory_refs) ? c.regulatory_refs : [],
    }));

    return NextResponse.json({ success: true, data: cleaned });
  } catch (error) {
    console.error('POST /api/findings/classify error:', error);
    return NextResponse.json({ success: false, error: 'Classification failed. Please try again.' }, { status: 500 });
  }
}
