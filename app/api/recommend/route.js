import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../lib/rateLimit.js';

export const maxDuration = 30;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  const limited = await checkRateLimit();
  if (limited) return limited;
  try {
    const { findings, engagementContext } = await request.json();

    if (!findings || findings.length === 0) {
      return NextResponse.json({ success: false, error: 'No findings provided' }, { status: 400 });
    }

    const findingsList = findings.map((f, i) => `
Finding ${i + 1}:
- Ref: ${f.ref || `F${String(i + 1).padStart(3, '0')}`}
${f.condition ? `- Condition: ${f.condition}` : `- Description: ${f.findingDescription || ''}`}
${f.cause ? `- Cause: ${f.cause}` : `- Root Cause: ${f.rootCause || ''}`}
${f.criteria ? `- Criteria: ${f.criteria}` : ''}
${f.effect ? `- Effect: ${f.effect}` : ''}
- Risk Rating: ${f.riskRating || 'Medium'}
- Auditor's existing recommendation: ${f.recommendation || '[none provided]'}`).join('\n');

    const contextLine = engagementContext?.client || engagementContext?.department
      ? `ENGAGEMENT: Client: ${engagementContext.client || 'not specified'} | Department: ${engagementContext.department || 'not specified'}\nUse the exact department name above when referring to the auditee. Do not invent or substitute department names.\n\n`
      : '';

    const prompt = `You are an expert internal auditor. For each finding below, produce a recommendation.

${contextLine}RULES:
- If "Auditor's existing recommendation" is provided: polish the language only — improve clarity, specificity, and IIA tone. Do NOT change the substance or intent. The auditor knows the client.
- If no recommendation is provided: generate one from scratch based on the condition, cause, and effect.
- Polished recommendations must: (1) address the immediate condition, (2) address the root cause to prevent recurrence.
- Be specific and actionable. Use the department name from the engagement context when naming the responsible function. No generic advice.
- 2–4 sentences maximum per recommendation.

FINDINGS:
${findingsList}

Return JSON exactly:
{
  "recommendations": [
    { "ref": "F001", "recommendation": "..." },
    { "ref": "F002", "recommendation": "..." }
  ]
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert internal auditor. Return only valid JSON. No markdown, no commentary.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return NextResponse.json({ success: true, data: result.recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json({ success: false, error: 'Generation failed. Please try again.' }, { status: 500 });
  }
}
