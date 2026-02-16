import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { auditProgram, auditeeDetails, processName, sectorContext } = await request.json();

    if (!auditProgram) {
      return NextResponse.json({ success: false, error: 'Audit program is required' }, { status: 400 });
    }

    const risks = auditProgram.risks || [];
    const highRisks = risks.filter(r => r.rating === 'High');
    const medRisks = risks.filter(r => r.rating === 'Medium');
    const controls = auditProgram.controls || [];
    const objectives = auditProgram.auditObjectives || [];

    const riskSummary = risks.slice(0, 10).map(r =>
      `[${r.rating}] ${r.description}${r.clientEvidence ? ` — observed: ${r.clientEvidence}` : ''}`
    ).join('\n');

    const controlSummary = controls.slice(0, 10).map(c =>
      `${c.id}: ${c.description} (${c.type}, ${c.frequency || 'frequency unspecified'})`
    ).join('\n');

    const prompt = `You are an expert internal auditor preparing an exit meeting agenda and talking points for a ${processName || 'process'} audit${sectorContext ? ` in the ${sectorContext} sector` : ''}.

AUDIT CONTEXT:
${auditeeDetails?.clientName ? `Client: ${auditeeDetails.clientName}` : ''}
${auditeeDetails?.department ? `Department: ${auditeeDetails.department}` : ''}
${auditeeDetails?.engagementRef ? `Engagement Ref: ${auditeeDetails.engagementRef}` : ''}

AUDIT OBJECTIVES:
${objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

KEY RISKS IDENTIFIED (${risks.length} total — ${highRisks.length} High, ${medRisks.length} Medium):
${riskSummary}

CONTROLS IN SCOPE (${controls.length} total):
${controlSummary}

Generate a kick-off meeting agenda for an internal audit engagement as JSON. This is the opening meeting where the audit team presents the audit scope, objectives, and risk focus areas to the auditee before fieldwork begins.

Return exactly this schema:

{
  "meetingTitle": "Kick-off Meeting — [Process] Audit",
  "agendaItems": [
    {
      "order": 1,
      "title": "Agenda item title",
      "guidanceNotes": [
        "Guidance note for the auditor — what to cover or raise at this point",
        "Another note"
      ],
      "managementQuestions": [
        "Likely question management will ask at this point",
        "Another likely question"
      ]
    }
  ],
  "keyMessages": [
    "Top-line message 1 — what the audit team wants management to understand going into fieldwork",
    "Top-line message 2",
    "Top-line message 3"
  ]
}

AGENDA STRUCTURE — include these items in order:
1. Welcome & Purpose — audit objectives, scope, period under review
2. Risk Focus Areas — high and medium risks the audit will examine, why they were prioritised
3. Controls in Scope — which controls will be tested and the testing approach
4. Information & Access Requirements — documents, systems, contacts the audit team will need
5. Fieldwork Timeline & Logistics — key dates, point of contact, how to raise queries
6. Questions & Discussion

REQUIREMENTS:
- guidanceNotes are preparation aids for the auditor — key points to cover, not a script to read
- guidanceNotes must be specific to this audit's risks and controls, not generic
- managementQuestions reflect realistic questions or concerns management would raise at that point
- keyMessages are what the audit team wants management to clearly understand before fieldwork begins
- Keep it concise and practical`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert internal auditor. Return only valid JSON matching the exact schema. No markdown, no commentary outside the JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const exitMeeting = JSON.parse(completion.choices[0].message.content);
    return NextResponse.json({ success: true, data: exitMeeting });

  } catch (error) {
    console.error('Error generating exit meeting:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
