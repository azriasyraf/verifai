import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert internal auditor generating structured audit working papers following IIA IPPF and COSO/COBIT frameworks.

NON-NEGOTIABLE OUTPUT RULES:
1. Return only valid JSON matching the exact schema. No markdown, no commentary, no explanation outside the JSON.
2. Every risk MUST have at least one entry in relatedControls.
   INVALID: { "id": "R001", "relatedControls": [] }
   VALID:   { "id": "R001", "relatedControls": ["C001"] }
3. Every control MUST have at least one entry in mitigatesRisks AND at least one procedure with a matching controlId.
4. Cross-references must be bidirectional: if R001 lists C001, then C001 must list R001.
5. Verify all cross-references before returning. Remove broken references rather than leaving them empty.`;

export async function POST(request) {
  try {
    const { industry, process, assessmentType, clientContext } = await request.json();
    const prompt = buildPrompt(industry, process, assessmentType, clientContext);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const auditProgram = JSON.parse(completion.choices[0].message.content);

    // Validate and clean cross-references as a safety net
    if (auditProgram.risks && auditProgram.controls) {
      const controlIds = new Set(auditProgram.controls.map(c => c.id));
      const riskIds = new Set(auditProgram.risks.map(r => r.id));

      for (const risk of auditProgram.risks) {
        risk.relatedControls = (risk.relatedControls || []).filter(id => controlIds.has(id));
      }
      for (const control of auditProgram.controls) {
        control.mitigatesRisks = (control.mitigatesRisks || []).filter(id => riskIds.has(id));
      }
      if (auditProgram.auditProcedures) {
        auditProgram.auditProcedures = auditProgram.auditProcedures.filter(p => controlIds.has(p.controlId));
      }
    }

    return NextResponse.json({ success: true, data: auditProgram });
  } catch (error) {
    console.error('Error generating audit program:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function buildPrompt(industry, process, assessmentType = 'program-only', clientContext = null) {
  const industryNames = {
    distribution: 'Distribution & Sales (Import/Export)',
    manufacturing: 'Manufacturing',
    services: 'Services',
    construction: 'Construction',
  };

  const processNames = {
    revenue: 'Revenue to Cash',
    hr: 'HR (Recruitment & Payroll)',
    procurement: 'Procurement to Payment',
    inventory: 'Inventory',
    it: 'IT/Cybersecurity',
  };

  const industryLabel = industryNames[industry] || industry;
  const processLabel = processNames[process] || process;
  const controlFramework = process === 'it' ? 'COBIT 2019' : 'COSO 2013';
  const frameworkGuidance = process === 'it'
    ? 'COBIT 2019 — use EDM, APO, BAI, DSS, MEA domains to identify risks and design controls'
    : 'COSO 2013 — use Control Environment, Risk Assessment, Control Activities, Information & Communication, Monitoring to identify risks and design controls';

  return `Generate a comprehensive internal audit program as JSON.

ENGAGEMENT: ${processLabel} process | ${industryLabel} industry
FRAMEWORK: ${controlFramework} — ${frameworkGuidance}
METHODOLOGY: IIA IPPF (Standards 2010–2340)

SCHEMA — return exactly this structure:

{
  "framework": {
    "auditMethodology": "IIA IPPF",
    "controlFramework": "${controlFramework}",
    "description": "How IIA IPPF and ${controlFramework} shape this audit approach"
  },
  "processOverview": "2-3 paragraphs describing the ${processLabel} process in the ${industryLabel} industry — typical workflow, key characteristics, and audit relevance",
  "auditObjectives": [
    "Objective 1 — link to a financial statement assertion or IT objective",
    "Objective 2",
    "Objective 3"
  ],
  "risks": [
    {
      "id": "R001",
      "category": "Financial | Operational | Compliance | IT | Strategic",
      "description": "Specific, detailed risk description",
      "rating": "High | Medium | Low",
      "assertion": "Completeness | Existence | Accuracy | Valuation | Rights | Presentation | IT objective",
      "relatedControls": ["C001"],
      "frameworkReference": "Specific ${controlFramework} component — e.g. 'COSO - Risk Assessment Component' or 'COBIT APO12.01'"
    }
  ],
  "controls": [
    {
      "id": "C001",
      "description": "What the control does and how",
      "type": "Preventive | Detective | Corrective",
      "frequency": "Continuous | Daily | Weekly | Monthly | Quarterly | Annual",
      "owner": "Typical role responsible for operating this control",
      "mitigatesRisks": ["R001"],
      "frameworkReference": "Specific ${controlFramework} principle — e.g. 'COSO - Control Activities: Segregation of Duties'"
    }
  ],
  "auditProcedures": [
    {
      "controlId": "C001",
      "procedure": "Detailed step-by-step audit procedure describing how to test whether this control operated effectively",
      "testingMethod": "Inquiry | Observation | Inspection | Reperformance",
      "sampleSize": "Practical sample size based on risk rating — e.g. '25 items' for high risk, '15 items' for medium",
      "expectedEvidence": "Specific documentation or evidence to obtain from the sample",
      "frameworkReference": "IIA Standard — e.g. 'IIA Standard 2310: Identifying Information'"
    }
  ]
}

PHASE SEPARATION — this is non-negotiable:
- auditProcedures are Phase 2 Test of Controls only. They test whether a specific control operated effectively on a sample of transactions.
- testingMethod must be one of: Inquiry, Observation, Inspection, Reperformance. Never "Data Analytics".
- Population-level analytics (duplicate detection, outlier analysis, trend analysis) are Phase 3 Substantive Analytics. They are handled separately and must NOT appear in auditProcedures.
- Every procedure must be executable on a sample — it describes what the auditor does for each item in the sample, not what they run against the full dataset.

REQUIREMENTS — in priority order:

1. CROSS-REFERENCES (highest priority — verify before returning):
   - Every risk: relatedControls must contain at least one real control ID from the controls array
   - Every control: mitigatesRisks must contain at least one real risk ID from the risks array
   - Every control: must have at least one procedure in auditProcedures with a matching controlId
   - Bidirectionality: if R001 lists C001, then C001 must list R001

2. COVERAGE:
   - Cover all financial statement assertions: Completeness, Existence, Accuracy, Valuation, Rights, Presentation${process === 'it' ? '\n   - Cover key IT objectives: Availability, Confidentiality, Integrity' : ''}
   - Include all major risk categories: Financial, Operational, Compliance${process === 'it' ? ', IT' : ''}
   - Mix of Preventive, Detective, and Corrective controls

3. FRAMEWORK REFERENCES:
   - Every risk: cite the specific ${controlFramework} component or principle
   - Every control: cite the specific ${controlFramework} control activity
   - Every procedure: cite the specific IIA IPPF Standard number and name

4. PROCEDURES — each must describe sampling-based control testing:
   - What does the auditor physically do for each sample item?
   - What would a pass look like? What would a fail look like?
   - Never describe running a query or filter across the full population

5. SPECIFICITY:
   - Make all content highly specific to ${industryLabel} and ${processLabel}
   - Reference industry-specific regulations and standards where relevant
   - Ensure procedures are practical and executable in the field${clientContext ? `

CLIENT CONTEXT PROVIDED — WALKTHROUGH / INTERVIEW NOTES:
---
${clientContext}
---

ADJUSTMENT RULES — apply these when client context is provided:

1. ELEVATE risks directly observed or mentioned in the notes:
   - Increase rating if evidence supports it
   - Add optional field "clientEvidence": "brief quote or summary of the observation" to the risk object

2. ADD risks not in the standard template if the notes reveal them:
   - Add optional field "source": "client-walkthrough" to these risks

3. FLAG control gaps where the notes suggest a standard control is not operating:
   - Add optional field "gapFlag": true to the control object
   - Add optional field "gapNote": "what was expected vs what the notes suggest" to the control object

4. DO NOT remove standard risks just because the notes don't mention them.
   Absence of evidence is not absence of risk — keep them at baseline rating.

5. clientEvidence, source, gapFlag, and gapNote are OPTIONAL — only add them when the notes provide specific evidence.
   Do not fabricate evidence. If the notes are vague, do not add these fields.` : ''}`;
}
