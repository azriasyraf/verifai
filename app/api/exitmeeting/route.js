import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { auditProgram, auditeeDetails, processName, industryName } = await request.json();

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

    const prompt = `You are an expert internal auditor preparing an exit meeting agenda and talking points for a ${processName || 'process'} audit in the ${industryName || ''} industry.

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

Generate a professional exit meeting agenda and talking points as JSON. The exit meeting is where internal audit presents preliminary findings to management before the formal report is issued. The tone should be constructive, collaborative, and professional — not adversarial.

Return exactly this schema:

{
  "meetingTitle": "Exit Meeting — [Process] Audit",
  "suggestedDuration": "45–60 minutes",
  "openingStatement": "2-3 sentence professional opening the lead auditor reads to set the tone",
  "agendaItems": [
    {
      "order": 1,
      "title": "Agenda item title",
      "duration": "5 minutes",
      "talkingPoints": [
        "Specific point the auditor makes",
        "Another point"
      ],
      "managementQuestions": [
        "Likely question management will ask at this point",
        "Another likely question"
      ],
      "suggestedResponse": "How the auditor should respond to the above questions"
    }
  ],
  "keyMessages": [
    "Top-line message 1 — what management should leave the meeting knowing",
    "Top-line message 2",
    "Top-line message 3"
  ],
  "closingStatement": "2-3 sentence professional close — next steps, report timeline, management response process",
  "toneGuidance": "2-3 sentences on how to conduct this specific meeting given the risk profile observed"
}

AGENDA STRUCTURE — include these items in order:
1. Welcome & Purpose (2–3 min) — scope, objectives, methodology reminder
2. Key Risks Identified — one agenda item per HIGH risk area, grouped if more than 4
3. Control Observations — summary of controls tested, any design gaps noted
4. Preliminary Findings & Recommendations — structured, constructive
5. Management Response Process — explain how management responds, timeline
6. Next Steps & Report Timeline — draft report, comment period, final report

REQUIREMENTS:
- talkingPoints must be specific to this audit's risks and controls — not generic
- managementQuestions must reflect realistic pushback or clarification management would raise
- keyMessages must be the 3 most important things management takes away
- toneGuidance must be calibrated to the risk profile — more risks = firmer tone guidance
- Keep it practical and usable in a real meeting`;

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
