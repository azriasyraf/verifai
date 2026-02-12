import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request) {
  try {
    const { industry, companyType, processes, auditeeDetails } = await request.json();

    if (!industry || !companyType || !processes || processes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Industry, company type, and at least one process are required' },
        { status: 400 }
      );
    }

    const prompt = buildGovernancePrompt(industry, companyType, processes, auditeeDetails);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert internal auditor specialising in risk management and governance assessments. You generate structured governance assessment working papers based on IIA IPPF and COSO ERM frameworks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 8000,
    });

    const responseText = completion.choices[0].message.content;

    // Strip markdown code fences if present
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const assessment = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: assessment });
  } catch (error) {
    console.error('Error generating governance assessment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function buildGovernancePrompt(industry, companyType, processes, auditeeDetails) {
  const industryNames = {
    distribution: 'Distribution & Sales (Import/Export)',
    manufacturing: 'Manufacturing',
    services: 'Services',
    construction: 'Construction'
  };

  const processNames = {
    revenue: 'Revenue to Cash',
    hr: 'HR (Recruitment & Payroll)',
    procurement: 'Procurement to Payment',
    inventory: 'Inventory',
    it: 'IT/Cybersecurity'
  };

  const industryLabel = industryNames[industry] || industry;
  const processLabels = processes.map(p => processNames[p] || p).join(', ');

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

  // Build process-specific area IDs — GA001–GA004 are fixed, GA005+ are per-process
  const processAreas = processes.map((p, i) => {
    const areaId = `GA${String(5 + i).padStart(3, '0')}`;
    return `${areaId}: Process-Specific Governance for ${processNames[p] || p}`;
  });

  return `Generate a Risk Management & Governance Assessment working paper for:
- Industry: ${industryLabel}
- Company Type: ${companyType}
- Processes in scope: ${processLabels}
${engagementContext ? `- Engagement: ${engagementContext}` : ''}

Return a JSON object with this exact structure:
{
  "assessmentTitle": "string",
  "scope": "string — 2-3 sentences describing what was assessed",
  "objectives": ["string", ...],
  "approach": "string — describes walkthrough + inquiry methodology",
  "areas": [
    {
      "areaId": "GA001",
      "area": "string — governance area name",
      "description": "string — what this area covers",
      "walkthroughSteps": ["string", ...],
      "documentsToObtain": ["string", ...],
      "inquiryQuestions": [
        {
          "question": "string",
          "purpose": "string — why this question matters"
        }
      ],
      "redFlags": ["string", ...],
      "conclusion": ""
    }
  ]
}

Governance areas to cover — generate ALL of the following as separate entries in the areas array:
1. Risk Management Framework (areaId: GA001)
2. Control Environment & Risk Culture (areaId: GA002) — combined area covering BOTH the formal control environment (organisational structure, delegations of authority, segregation of duties, accountability mechanisms, policies) AND risk culture/tone at the top (leadership behaviour and messaging, how risk is discussed and escalated, employee awareness and psychological safety, cultural norms around risk). Do NOT treat these as separate sub-sections — generate integrated questions that assess how formal structures and cultural behaviours reinforce each other.
3. Training & Awareness (areaId: GA003)
4. Risk Reporting & Oversight (areaId: GA004)
${processAreas.map((a, i) => `${i + 5}. ${a}`).join('\n')}

Requirements for each area:
- At minimum 3 walkthroughSteps (numbered steps the auditor physically performs)
- At minimum 3 documentsToObtain (specific document names to request)
- At minimum 5 inquiryQuestions, each with a purpose explaining why the question matters
- Inquiry questions for GA002 must be genuinely distinct — no two questions should cover the same theme. Cover: formal accountability structures, leadership behaviour, escalation culture, policy enforcement, and cultural norms.
- At minimum 3 redFlags specific to this area and this organisation type
- Leave conclusion as an empty string ""

Make all content highly specific to a ${companyType} in the ${industryLabel} industry.
Reference IIA IPPF and COSO ERM where appropriate.
For the process-specific governance areas, focus on governance oversight of that particular process.
Return only valid JSON. No markdown, no commentary.`;
}
