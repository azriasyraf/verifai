import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert internal auditor specialising in risk management and governance assessments. You generate structured governance assessment working papers following IIA IPPF and COSO ERM frameworks.

NON-NEGOTIABLE OUTPUT RULES:
1. Return only valid JSON matching the exact schema. No markdown, no commentary, no explanation outside the JSON.
2. Generate EXACTLY 4 areas with areaIds GA001–GA004 in order.
3. Every area must meet the minimum counts specified: walkthroughSteps (3+), documentsToObtain (3+), inquiryQuestions (5+), redFlags (3+).
4. Leave all conclusion fields as empty strings "".`;

export async function POST(request) {
  try {
    const { industry, companyType, auditeeDetails } = await request.json();

    if (!industry || !companyType) {
      return NextResponse.json(
        { success: false, error: 'Industry and company type are required' },
        { status: 400 }
      );
    }

    const prompt = buildGovernancePrompt(industry, companyType, auditeeDetails);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    });

    const assessment = JSON.parse(completion.choices[0].message.content);

    return NextResponse.json({ success: true, data: assessment });
  } catch (error) {
    console.error('Error generating governance assessment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function buildGovernancePrompt(industry, companyType, auditeeDetails) {
  const industryNames = {
    distribution: 'Distribution & Sales (Import/Export)',
    manufacturing: 'Manufacturing',
    services: 'Services',
    construction: 'Construction',
  };

  const industryLabel = industryNames[industry] || industry;

  const engagementContext = auditeeDetails
    ? [
        auditeeDetails.clientName ? `Client: ${auditeeDetails.clientName}` : '',
        auditeeDetails.department ? `Department: ${auditeeDetails.department}` : '',
        auditeeDetails.engagementRef ? `Reference: ${auditeeDetails.engagementRef}` : '',
        auditeeDetails.auditorName ? `Auditor: ${auditeeDetails.auditorName}` : '',
        auditeeDetails.periodFrom && auditeeDetails.periodTo
          ? `Period: ${auditeeDetails.periodFrom} to ${auditeeDetails.periodTo}`
          : '',
      ].filter(Boolean).join(' | ')
    : '';

  return `Generate a Risk Management & Governance Assessment working paper as JSON.

ENGAGEMENT: ${industryLabel} | ${companyType}${engagementContext ? `\n${engagementContext}` : ''}
FRAMEWORK: IIA IPPF + COSO ERM
SCOPE: Entity-level governance backbone — NOT individual process controls

SCHEMA — return exactly this structure:

{
  "assessmentTitle": "Risk Management & Governance Assessment — [client/entity description]",
  "scope": "2-3 sentences describing what was assessed at the entity level",
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "approach": "Describes the walkthrough and inquiry methodology used",
  "areas": [
    {
      "areaId": "GA001",
      "area": "Governance area name",
      "description": "What this area covers and why it matters",
      "walkthroughSteps": ["Step 1", "Step 2", "Step 3"],
      "documentsToObtain": ["Document 1", "Document 2", "Document 3"],
      "inquiryQuestions": [
        { "question": "Question text", "purpose": "Why this question matters to the audit" }
      ],
      "redFlags": ["Red flag 1", "Red flag 2", "Red flag 3"],
      "conclusion": ""
    }
  ]
}

AREAS — generate EXACTLY these 4 in order:

GA001 — Risk Management Framework
Assess whether a formal risk management framework exists, is documented, approved, and operating effectively. Reference ISO 31000 and COSO ERM.

GA002 — Control Environment & Risk Culture
Combined area covering BOTH formal control structures (organisational accountability, delegations of authority, segregation of duties, policy enforcement) AND cultural/behavioural dimensions (tone at the top, escalation norms, psychological safety, how risk is discussed day-to-day). Inquiry questions must be genuinely distinct — cover: formal accountability, leadership behaviour, escalation culture, policy enforcement, and cultural norms. Do not repeat the same theme across questions.

GA003 — Training & Awareness
Assess whether risk and control awareness is embedded through training, communications, and onboarding. Include assessment of training frequency, content quality, and evidence of completion.

GA004 — Risk Reporting & Oversight
Assess the quality, frequency, and use of risk reporting to the board, audit committee, and senior management. Include assessment of escalation mechanisms and management's responsiveness to risk information.

REQUIREMENTS per area:
- walkthroughSteps: minimum 3 — specific physical steps the auditor performs (inspect, request, observe, trace)
- documentsToObtain: minimum 3 — specific named documents to request from the client
- inquiryQuestions: minimum 5 — each with a purpose explaining its audit relevance
- redFlags: minimum 3 — specific warning signs for this area and this organisation type
- conclusion: always an empty string ""

Make all content highly specific to a ${companyType} in the ${industryLabel} industry.
Reference IIA IPPF and COSO ERM throughout.`;
}
