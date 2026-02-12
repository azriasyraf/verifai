import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request) {
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
        {
          role: 'system',
          content: 'You are an expert internal auditor specialising in risk management and governance assessments. You synthesise completed working paper evidence into overall assessment conclusions following IIA IPPF and COSO ERM frameworks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0].message.content;
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating overall assessment conclusion:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
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

  return `Based on the completed governance assessment working paper below, generate an overall assessment conclusion.

Assessment: ${assessmentTitle || 'Risk Management & Governance Assessment'}
Scope: ${scope || ''}
${engagementContext ? `Engagement: ${engagementContext}` : ''}

COMPLETED WORKING PAPER:
${areasSummary}

Based on this evidence, return a JSON object:
{
  "maturityRating": "string — one of: Level 1 - Initial, Level 2 - Developing, Level 3 - Defined, Level 4 - Managed, Level 5 - Optimising",
  "rationale": "string — 2-3 sentences explaining the maturity rating based on evidence above",
  "keyObservations": ["string", ...],
  "recommendations": ["string", ...]
}

Requirements:
- maturityRating must be one of the 5 levels above, derived from the evidence
- rationale must reference specific areas or findings from the working paper
- keyObservations: 3-5 observations drawn directly from completed conclusions and responses
- recommendations: 3-5 actionable recommendations addressing gaps identified in the working paper
- If working paper is largely incomplete, note this and provide a preliminary assessment
- Return only valid JSON. No markdown, no commentary.`;
}
