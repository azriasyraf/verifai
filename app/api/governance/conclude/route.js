import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rateLimit.js';

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert internal auditor specialising in risk management and governance assessments. You synthesise completed working paper evidence into overall assessment conclusions following IIA IPPF and COSO ERM frameworks.

NON-NEGOTIABLE OUTPUT RULES:
1. Return only valid JSON matching the exact schema. No markdown, no commentary, no explanation outside the JSON.
2. maturityRating must be exactly one of the 5 defined levels — no variations.
3. All observations and recommendations must be drawn directly from the working paper evidence provided.`;

export async function POST(request) {
  const limited = await checkRateLimit();
  if (limited) return limited;
  try {
    const { assessmentTitle, scope, areas, auditeeDetails } = await request.json();

    if (!areas || areas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assessment areas are required' },
        { status: 400 }
      );
    }

    const prompt = buildConcludePrompt(assessmentTitle, scope, areas, auditeeDetails);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating overall assessment conclusion:', error);
    return NextResponse.json({ success: false, error: 'Generation failed. Please try again.' }, { status: 500 });
  }
}

function buildConcludePrompt(assessmentTitle, scope, areas, auditeeDetails) {
  const engagementContext = auditeeDetails
    ? [
        auditeeDetails.clientName ? `Client: ${auditeeDetails.clientName}` : '',
        auditeeDetails.department ? `Department: ${auditeeDetails.department}` : '',
        auditeeDetails.auditorName ? `Auditor: ${auditeeDetails.auditorName}` : '',
      ].filter(Boolean).join(' | ')
    : '';

  const areasSummary = areas.map(area => {
    const responses = (area.inquiryQuestions || [])
      .filter(iq => iq.managementResponse || iq.auditorAssessment)
      .map(iq => {
        const parts = [];
        if (iq.managementResponse) parts.push(`  Management: ${iq.managementResponse}`);
        if (iq.auditorAssessment) parts.push(`  Auditor: ${iq.auditorAssessment}`);
        return `  Q: ${iq.question}\n${parts.join('\n')}`;
      }).join('\n');

    return `### ${area.area} (${area.areaId})
Conclusion: ${area.conclusion || '(not completed)'}
${responses ? `Key Responses:\n${responses}` : '(no responses recorded)'}`;
  }).join('\n\n');

  return `Synthesise the completed governance assessment working paper below into an overall conclusion as JSON.

ASSESSMENT: ${assessmentTitle || 'Risk Management & Governance Assessment'}
SCOPE: ${scope || ''}
${engagementContext ? `ENGAGEMENT: ${engagementContext}` : ''}

COMPLETED WORKING PAPER:
${areasSummary}

SCHEMA — return exactly this structure:

{
  "maturityRating": "Level 1 - Initial | Level 2 - Developing | Level 3 - Defined | Level 4 - Managed | Level 5 - Optimising",
  "rationale": "2-3 sentences explaining the maturity rating — must reference specific areas or findings from the working paper above",
  "keyObservations": ["Observation drawn directly from completed conclusions and responses", "..."],
  "recommendations": ["Actionable recommendation addressing a specific gap identified", "..."]
}

REQUIREMENTS:
- maturityRating: choose exactly one of the 5 levels above based on the evidence
- rationale: must cite specific area names or findings — not generic governance language
- keyObservations: 3–5 observations grounded in the working paper evidence
- recommendations: 3–5 specific, actionable recommendations targeting identified gaps
- If the working paper is largely incomplete, note this and provide a preliminary assessment based on available evidence`;
}
