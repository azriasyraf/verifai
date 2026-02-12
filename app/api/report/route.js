import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

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
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 6000,
    });

    const responseText = completion.choices[0].message.content;
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const report = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function buildReportPrompt(eng, findings) {
  const findingsList = findings.map((f, i) => `
Finding ${i + 1}:
- Reference: ${f.ref || `F${String(i + 1).padStart(3, '0')}`}
- Control ID: ${f.controlId || ''}
- Risk ID: ${f.riskId || ''}
- Finding Description: ${f.findingDescription || ''}
- Risk Rating: ${f.riskRating || 'Medium'}
- Root Cause: ${f.rootCause || ''}
- Management Response: ${f.managementResponse || ''}
- Due Date: ${f.dueDate || ''}
- Status: ${f.status || 'Open'}
`).join('\n');

  const overallRating = findings.some(f => f.riskRating === 'High')
    ? 'Needs Improvement'
    : findings.some(f => f.riskRating === 'Medium')
    ? 'Satisfactory with Exceptions'
    : 'Satisfactory';

  return `You are an expert internal auditor drafting a formal internal audit report.

ENGAGEMENT DETAILS:
- Client: ${eng.clientName || 'Not specified'}
- Department: ${eng.department || 'Not specified'}
- Audit Period: ${eng.auditPeriod || 'Not specified'}
- Engagement Reference: ${eng.engagementRef || 'Not specified'}
- Prepared By: ${eng.preparedBy || 'Not specified'}
- Process / Area: ${eng.process || 'Not specified'}

FINDINGS FROM FIELDWORK:
${findingsList}

OVERALL OPINION (based on findings): ${overallRating}

Generate a complete, professional internal audit report in JSON format. For each finding, expand the auditor's notes into a full CCCE structure. Write in formal audit report language. Be specific and actionable.

Return ONLY valid JSON with this exact structure:

{
  "coverPage": {
    "title": "Internal Audit Report — [process/area]",
    "client": "[client name]",
    "department": "[department]",
    "auditPeriod": "[period]",
    "engagementRef": "[ref]",
    "preparedBy": "[name]",
    "reportDate": "[today's date]",
    "overallOpinion": "${overallRating}"
  },
  "executiveSummary": "2-3 paragraph executive summary covering: what was audited, overall opinion, number and severity of findings, and management's commitment to remediation.",
  "scopeAndObjectives": {
    "objectives": ["Objective 1", "Objective 2", "Objective 3"],
    "scope": "Description of what was included and excluded, population size if relevant.",
    "methodology": "Brief description of audit methodology referencing IIA IPPF."
  },
  "findings": [
    {
      "ref": "F001",
      "title": "Short, descriptive finding title (e.g. 'Approval Authority Limits Not Enforced')",
      "riskRating": "High/Medium/Low",
      "condition": "What the auditor observed — specific, factual, quantified where possible.",
      "criteria": "The standard, policy, or expectation that was not met.",
      "cause": "Root cause of the exception — why the control failed or was absent.",
      "effect": "Consequence or potential impact if not addressed.",
      "recommendation": "Specific, actionable recommendation to address the root cause.",
      "managementResponse": "Management's response and commitment (from fieldwork notes, or draft a placeholder if blank).",
      "actionOwner": "Role or name responsible for remediation.",
      "dueDate": "Target remediation date.",
      "status": "Open"
    }
  ],
  "conclusion": "Overall conclusion paragraph summarising the audit outcome, highlighting the most significant findings, and stating the follow-up plan."
}

Requirements:
- Expand brief finding descriptions into full professional CCCE narrative
- Condition should be specific and quantified where the data supports it
- Criteria must cite the relevant policy, standard, or best practice
- Cause should identify the root cause, not just restate the condition
- Effect must explain the business impact clearly
- Recommendations must be specific and actionable, not generic
- If management response is blank, draft a placeholder: "Management acknowledges the finding and will provide a response by [due date]."
- Write the executive summary last, summarising all findings
- Return ONLY valid JSON, no markdown`;
}
