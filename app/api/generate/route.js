import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { getRegulations, formatRegulationsForPrompt } from '../../lib/regulations/index.js';
import { getProcessLabel } from '../../lib/processNames.js';

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
    const { sectorContext, process, assessmentType, clientContext, walkthroughNarrative, jurisdiction, documentContext, docType } = await request.json();
    const regs = getRegulations(process, jurisdiction);
    const regulationsContext = formatRegulationsForPrompt(regs);
    const prompt = buildPrompt(sectorContext, process, assessmentType, clientContext, walkthroughNarrative, regulationsContext, documentContext, docType);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 6000,
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

    // Strip regulatoryRefs the AI invented that aren't in the injected regulations list
    const allowedRegulations = new Set(regs.map(r => r.regulation));
    const allItems = [...(auditProgram.risks || []), ...(auditProgram.controls || []), ...(auditProgram.auditProcedures || [])];
    for (const item of allItems) {
      if (item.regulatoryRefs) {
        item.regulatoryRefs = item.regulatoryRefs.filter(r => allowedRegulations.has(r.regulation));
        if (item.regulatoryRefs.length === 0) delete item.regulatoryRefs;
      }
    }

    // Collect unique regulation names actually cited in the output
    const citedRegulations = new Set();
    allItems.forEach(item => (item.regulatoryRefs || []).forEach(r => citedRegulations.add(r.regulation)));
    if (citedRegulations.size > 0 && auditProgram.framework) {
      auditProgram.framework.appliedRegulations = [...citedRegulations];
    }

    return NextResponse.json({ success: true, data: auditProgram });
  } catch (error) {
    console.error('Error generating audit program:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function buildPrompt(sectorContext, process, assessmentType = 'program-only', clientContext = null, walkthroughNarrative = null, regulationsContext = '', documentContext = null, docType = null) {
  const processLabel = getProcessLabel(process);
  const controlFramework = process === 'it' || process === 'itgc' ? 'COBIT 2019' : 'COSO 2013';
  const frameworkGuidance = process === 'it'
    ? 'COBIT 2019 — use EDM, APO, BAI, DSS, MEA domains to identify risks and design controls'
    : 'COSO 2013 — use Control Environment, Risk Assessment, Control Activities, Information & Communication, Monitoring to identify risks and design controls';

  return `Generate a comprehensive internal audit program as JSON.

ENGAGEMENT: ${processLabel}${sectorContext ? ` | ${sectorContext}` : ''}
FRAMEWORK: ${controlFramework} — ${frameworkGuidance}
METHODOLOGY: IIA IPPF (Standards 2010–2340)

SCHEMA — return exactly this structure:

{
  "framework": {
    "auditMethodology": "IIA IPPF",
    "controlFramework": "${controlFramework}",
    "description": "How IIA IPPF and ${controlFramework} shape this audit approach"
  },
  "processOverview": "2-3 paragraphs describing the ${processLabel} process — typical workflow, key characteristics, and audit relevance${sectorContext ? `. Tailor to: ${sectorContext}` : ''}",
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
      "frameworkReference": "Specific ${controlFramework} component — e.g. 'COSO - Risk Assessment Component' or 'COBIT APO12.01'",
      "regulatoryRefs": [{ "regulation": "Employment Act 1955 (Act 265)", "clause": "Section 14" }]
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
      "frameworkReference": "Specific ${controlFramework} principle — e.g. 'COSO - Control Activities: Segregation of Duties'",
      "regulatoryRefs": [{ "regulation": "EPF Act 1991 (Act 452)", "clause": "Section 44" }]
    }
  ],
  "auditProcedures": [
    {
      "controlId": "C001",
      "procedure": "Detailed step-by-step audit procedure describing how to test whether this control operated effectively",
      "testingMethod": "Inquiry | Observation | Inspection | Reperformance",
      "sampleSize": "Practical sample size based on risk rating — e.g. '25 items' for high risk, '15 items' for medium",
      "expectedEvidence": "Specific documentation or evidence to obtain from the sample",
      "frameworkReference": "IIA Standard — e.g. 'IIA Standard 2310: Identifying Information'",
      "regulatoryRefs": [{ "regulation": "COSO 2013 ICIF", "clause": "Principle 10" }]
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
   - Generate a MINIMUM of 8 risks, ideally 10–12. A real audit program must be comprehensive — 3 risks is not acceptable for any process.
   - Generate a MINIMUM of 8 controls, ideally 10–12. Every major risk must be covered by at least one control.
   - Generate a MINIMUM of 10 audit procedures, ideally 12–15. Every control must have at least one test procedure.
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
   - Make all content highly specific to the ${processLabel} process
   ${sectorContext ? `- Sector context: ${sectorContext} — apply sector-specific risks, terminology, and regulatory considerations` : '- Apply best-practice controls applicable across sectors'}
   - Ensure procedures are practical and executable in the field

6. REGULATORY REFERENCES:
   - Use ONLY the regulations and clauses listed in the APPLICABLE REGULATIONS section below
   - Add regulatoryRefs to risks, controls, and procedures where the regulation directly applies
   - regulatoryRefs is optional — only add it when there is a direct, relevant link to a specific clause
   - Do not invent regulations or clause numbers not in the provided list
   - Each ref must be: { "regulation": "exact name from list", "clause": "exact clause from list" }${walkthroughNarrative ? `

WALKTHROUGH OBSERVATIONS (what was actually observed in the field):
---
${walkthroughNarrative}
---

Use the above walkthrough observations to:
- Identify controls that are actually operating in the process
- Adjust risk ratings based on observed control design adequacy
- Tailor test procedures to reflect the actual process flow` : ''}${clientContext ? `

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
   Do not fabricate evidence. If the notes are vague, do not add these fields.` : ''}${documentContext ? (() => {
  const docLabels = {
    'pp': 'POLICIES & PROCEDURES DOCUMENT',
    'prior-report': 'PRIOR AUDIT REPORT',
    'rmga': 'RMGA ASSESSMENT',
    'walkthrough': 'WALKTHROUGH WORKING PAPER',
    'laws': 'APPLICABLE LAWS & REGULATIONS',
    'guidelines': 'INDUSTRY GUIDELINES / REGULATORY CIRCULARS',
  };
  const label = docLabels[docType] || 'REFERENCE DOCUMENT';
  const instructions = {
    'pp': 'Use this to identify what controls are formally documented. Flag any gaps between documented procedures and standard best-practice controls. Where a control is well-documented, note it as a design strength.',
    'prior-report': 'Elevate risk ratings for issues that appear to be repeat findings. Where prior findings are referenced, add clientEvidence quoting the prior finding. Flag any unresolved recommendations as high-priority risks.',
    'rmga': 'Use entity-level observations to inform process-level risk ratings and control design assessments. Where governance weaknesses are noted (e.g. weak tone at the top, poor segregation), elevate related process risks.',
    'walkthrough': 'Use observations to adjust risk ratings, flag control gaps (gapFlag: true), and add client-specific evidence (clientEvidence). Identify controls that are actually operating vs those that are documented only.',
    'laws': 'Use these laws and regulations to identify compliance risks specific to this jurisdiction and process. Add regulatory references to relevant controls and procedures. Flag areas where the process or controls may not meet statutory requirements. Treat these as authoritative — elevate any compliance risk to High rating.',
    'guidelines': 'Use these industry guidelines or regulatory circulars to identify sector-specific risks and control expectations. Add references to controls where the guideline sets a specific standard. Flag deviations from guideline requirements as compliance risks.',
  };
  return `

${label}:
---
${documentContext}
---

${instructions[docType] || 'Use this document as additional context to improve risk identification and control design.'}`;
})() : ''}${regulationsContext ? `

${regulationsContext}
DISCLAIMER: These references are provided as guidance. Verify applicability before use in a formal engagement.` : ''}`;
}
