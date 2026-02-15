import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert internal auditor drafting formal internal audit reports following IIA IPPF Standards.

NON-NEGOTIABLE OUTPUT RULES:
1. Return only valid JSON matching the exact schema. No markdown, no commentary, no explanation outside the JSON.
2. Condition: if auditor description is provided, expand into a specific factual observation. If NOT provided, return "".
3. Criteria: always generate — cite the applicable policy, regulation, standard, or framework based on the process and engagement context.
4. Cause: if auditor root cause is provided, polish it — identify both immediate cause and systemic root cause. If NOT provided, return "".
5. Effect: always infer from the condition and engagement context — state actual or potential business impact. Never return "".
6. Recommendation: if auditor draft is provided, polish it — improve clarity, specificity, and IIA tone, but preserve the substance and intent. If NOT provided, generate one from the condition, cause, and effect.
7. Write in formal, professional audit report language throughout.`;

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
- Description: ${f.findingDescription ? f.findingDescription : '[not provided — return condition as ""]'}
- Risk Rating: ${f.riskRating || 'Medium'}
- Root Cause: ${f.rootCause ? f.rootCause : '[not provided — return cause as ""]'}
- Auditor Recommendation: ${f.recommendation ? `Polish this — improve language only, preserve substance: "${f.recommendation}"` : '[not provided — generate from condition and root cause]'}
- Management Response: ${f.managementResponse || ''}
- Due Date: ${f.dueDate || ''}
- Status: ${f.status || 'Open'}`).join('\n');

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

SCHEMA — return exactly this structure:

{
  "coverPage": {
    "title": "Internal Audit Report — [process/area audited]",
    "client": "[client name]",
    "department": "[department]",
    "auditPeriod": "[period]",
    "engagementRef": "[reference]",
    "preparedBy": "[auditor name]",
    "reportDate": "[today's date]"
  },
  "executiveSummary": "One concise page covering: (1) what was audited and why, (2) a findings summary by criticality — e.g. '6 observations were raised: 2 High, 3 Medium, 1 Low', (3) the most significant issues in plain language, (4) management's commitment to remediation. No jargon. Short sentences.",
  "scopeAndObjectives": {
    "objectives": ["Objective 1 — linked to the organisation's operational or strategic goals", "Objective 2", "Objective 3"],
    "scope": "What activities and periods were included, what was excluded, population size if relevant",
    "methodology": "Audit methodology referencing IIA IPPF Standards"
  },
  "findings": [
    {
      "ref": "F001",
      "title": "Short declarative noun phrase (3–6 words) that names the problem — reader understands the issue from the title alone. E.g. 'Payroll Master Data Changes Not Authorised', 'Terminated Employees Received Salary Payments', 'Monthly Payroll Reconciliation Not Performed'. Do NOT describe the procedure tested.",
      "riskRating": "High | Medium | Low",
      "condition": "What exists — the specific, factual, measurable observation. Quantify where data supports it (e.g. '7 of 25 transactions', 'RM14,760 overpaid'). Do not interpret or conclude here — state facts only.",
      "criteria": "What should exist — the specific policy, procedure, regulation, law, or leading practice that was not met. Cite the source explicitly (e.g. 'Section 3.2 of the Payroll SOP', 'Employment Act 1955 Section 25'). This is what makes the finding defensible.",
      "cause": "Why the gap exists — the immediate reason the condition deviates from criteria. Distinguish cause (why it happened) from root cause (the systemic reason that, if fixed, prevents recurrence). State both where identifiable. Do not restate the condition.",
      "effect": "The actual or potential consequence — financial, operational, compliance, or reputational. Quantify financial impact where data supports it. If no real harm has yet occurred, state the exposure and likelihood.",
      "recommendation": "Specific, actionable corrective actions — include both: (1) condition-based action to fix the immediate issue, and (2) root cause-based action to prevent recurrence. Practical and feasible. Do not issue generic recommendations.",
      "managementResponse": "Management's agreed corrective actions addressing both condition and root cause. Draft placeholder if blank: 'Management acknowledges the finding. A formal response and action plan will be provided by [due date].'",
      "actionOwner": "Named person or role accountable for executing the action — not a generic function",
      "dueDate": "Specific target completion date appropriate to the risk level",
      "status": "Open"
    }
  ],
  "conclusion": "Summary assessment of the engagement: overall control environment posture, the most significant findings and their combined impact, whether management's agreed actions are sufficient to address root causes, and the follow-up plan."
}

REQUIREMENTS — apply in priority order:

FINDINGS:
- List findings in order of significance — High risk first, then Medium, then Low
- Condition: if provided, factual and quantified — never interpretive. If not provided, return empty string — do not invent.
- Criteria: always generate — cite the specific policy, standard, regulation, or leading practice applicable to the process
- Cause: if provided, identify both the immediate cause and the root cause. If not provided, return empty string — do not invent.
- Effect: always infer — quantify financial impact where data supports it; state exposure clearly where no real harm has yet occurred
- Recommendation: if auditor draft provided, polish language only — preserve substance and intent. If not provided, generate from condition and cause — specific, actionable, addresses root cause.
- Titles: 3–6 words, noun phrase, names the problem (not the procedure tested)

MANAGEMENT RESPONSE:
- Must address root cause, not just condition
- If response addresses only the condition (e.g. "access has been removed") without preventing recurrence, draft a more complete placeholder
- If blank: use the placeholder above

EXECUTIVE SUMMARY:
- Include a findings count by criticality (e.g. "2 High, 3 Medium, 1 Low")
- Plain language — no audit methodology jargon
- Short sentences
- Constructive tone — not adversarial

TONE throughout:
- Accurate, objective, clear, concise, constructive, complete
- Short sentences; precise word choice
- No technical jargon unless unavoidable
- Consistent terminology — do not use different words for the same concept`;
}
