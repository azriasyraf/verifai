import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert internal auditor drafting formal internal audit reports following IIA IPPF Standards.

NON-NEGOTIABLE OUTPUT RULES:
1. Return only valid JSON matching the exact schema. No markdown, no commentary, no explanation outside the JSON.
2. Every finding must have all CCCE fields populated: condition, criteria, cause, effect.
3. Condition must be specific and factual. Cause must identify root cause — not restate the condition. Effect must state business impact.
4. Recommendations must be specific and actionable — not generic advice.
5. Write in formal, professional audit report language throughout.`;

export async function POST(request) {
  try {
    const { engagementDetails, findings } = await request.json();

    if (!findings || findings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No findings provided. Please ensure the Findings Summary tab is populated.' },
        { status: 400 }
      );
    }

    const prompt = buildReportPrompt(engagementDetails, findings);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 6000,
      response_format: { type: 'json_object' },
    });

    const report = JSON.parse(completion.choices[0].message.content);

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function buildReportPrompt(eng, findings) {
  const findingsList = findings.map((f, i) => `
Finding ${i + 1}:
- Reference: ${f.ref || `F${String(i + 1).padStart(3, '0')}`}
- Control ID: ${f.controlId || ''}
- Risk ID: ${f.riskId || ''}
- Description: ${f.findingDescription || ''}
- Risk Rating: ${f.riskRating || 'Medium'}
- Root Cause: ${f.rootCause || ''}
- Management Response: ${f.managementResponse || ''}
- Due Date: ${f.dueDate || ''}
- Status: ${f.status || 'Open'}`).join('\n');

  const overallRating = findings.some(f => f.riskRating === 'High')
    ? 'Needs Improvement'
    : findings.some(f => f.riskRating === 'Medium')
    ? 'Satisfactory with Exceptions'
    : 'Satisfactory';

  return `Draft a complete internal audit report as JSON from the fieldwork findings below.

ENGAGEMENT:
- Client: ${eng.clientName || 'Not specified'}
- Department: ${eng.department || 'Not specified'}
- Audit Period: ${eng.auditPeriod || 'Not specified'}
- Engagement Reference: ${eng.engagementRef || 'Not specified'}
- Prepared By: ${eng.preparedBy || 'Not specified'}
- Process / Area: ${eng.process || 'Not specified'}

FINDINGS FROM FIELDWORK:
${findingsList}

OVERALL OPINION (derived from findings): ${overallRating}

SCHEMA — return exactly this structure:

{
  "coverPage": {
    "title": "Internal Audit Report — [process/area audited]",
    "client": "[client name]",
    "department": "[department]",
    "auditPeriod": "[period]",
    "engagementRef": "[reference]",
    "preparedBy": "[auditor name]",
    "reportDate": "[today's date]",
    "overallOpinion": "${overallRating}"
  },
  "executiveSummary": "2-3 paragraphs: what was audited, overall opinion, number and severity of findings, management's commitment to remediation",
  "scopeAndObjectives": {
    "objectives": ["Objective 1", "Objective 2", "Objective 3"],
    "scope": "What was included and excluded, population size if relevant",
    "methodology": "Audit methodology referencing IIA IPPF"
  },
  "findings": [
    {
      "ref": "F001",
      "title": "Short, descriptive finding title — e.g. 'Approval Authority Limits Not Enforced'",
      "riskRating": "High | Medium | Low",
      "condition": "What the auditor observed — specific, factual, quantified where the data supports it",
      "criteria": "The policy, standard, or expectation that was not met — cite the source",
      "cause": "Root cause of the exception — why the control failed or was absent (not a restatement of condition)",
      "effect": "Business impact or consequence if not addressed",
      "recommendation": "Specific, actionable recommendation targeting the root cause",
      "managementResponse": "Management's response and commitment — use fieldwork notes or draft placeholder if blank",
      "actionOwner": "Role or name responsible for remediation",
      "dueDate": "Target remediation date",
      "status": "Open"
    }
  ],
  "conclusion": "Overall conclusion: audit outcome, most significant findings, follow-up plan"
}

REQUIREMENTS:
- Expand brief finding descriptions into full professional CCCE narrative
- Condition: specific and quantified where data supports it
- Criteria: must cite the relevant policy, standard, or best practice
- Cause: identify root cause — not a restatement of the condition
- Effect: clear business impact
- Recommendations: specific and actionable, not generic
- If management response is blank: draft placeholder "Management acknowledges the finding and will provide a formal response by [due date]."
- Executive summary must reflect all findings — write it to summarise the full picture`;
}
