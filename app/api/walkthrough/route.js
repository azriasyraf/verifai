import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { getRegulations, formatRegulationsForPrompt } from '../../lib/regulations/index.js';
import { getProcessLabel } from '../../lib/processNames.js';

export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert internal auditor specialising in process walkthroughs and control design assessments. You generate structured process walkthrough working papers following IIA IPPF and COSO 2013 frameworks.

NON-NEGOTIABLE OUTPUT RULES:
1. Return only valid JSON matching the exact schema. No markdown, no commentary, no explanation outside the JSON.
2. Generate process-appropriate checkpoints — use the guidance list for the process, adapting to the industry.
3. Every checkpoint must have at minimum: area, expected, designConsiderations, and 2+ suggestedQuestions.
4. Leave all auditor-fillable fields absent from the JSON — the working paper UI manages those.`;

export async function POST(request) {
  try {
    const { sectorContext, process, auditeeDetails, jurisdiction } = await request.json();

    if (!process) {
      return NextResponse.json(
        { success: false, error: 'Process is required' },
        { status: 400 }
      );
    }

    const regs = getRegulations(process, jurisdiction);
    const regulationsContext = formatRegulationsForPrompt(regs);
    const prompt = buildWalkthroughPrompt(sectorContext, process, auditeeDetails, regulationsContext);

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

    const walkthrough = JSON.parse(completion.choices[0].message.content);

    // Strip regulatoryRefs the AI invented that aren't in the injected regulations list
    const allowedRegulations = new Set(regs.map(r => r.regulation));
    for (const cp of (walkthrough.checkpoints || [])) {
      if (cp.regulatoryRefs) {
        cp.regulatoryRefs = cp.regulatoryRefs.filter(r => allowedRegulations.has(r.regulation));
        if (cp.regulatoryRefs.length === 0) delete cp.regulatoryRefs;
      }
    }

    return NextResponse.json({ success: true, data: walkthrough });
  } catch (error) {
    console.error('Error generating walkthrough working paper:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function buildWalkthroughPrompt(sectorContext, process, auditeeDetails, regulationsContext = '') {

  const checkpointGuidance = {
    revenue: [
      'Sales Order Authorization',
      'Credit Limit Enforcement',
      'Pricing & Discount Approval',
      'Delivery/Dispatch Authorization',
      'Invoice Issuance',
      'Cash Receipts & Banking',
      'Accounts Receivable Management',
      'Segregation of Duties',
      'Month-end Reconciliation',
    ],
    procurement: [
      'Purchase Requisition',
      'Vendor Master Maintenance',
      'Purchase Order Authorization',
      'Goods Receipt',
      'Invoice Processing & 3-Way Match',
      'Payment Authorization',
      'Segregation of Duties',
      'Month-end Accruals',
    ],
    hr: [
      'Recruitment & Onboarding',
      'Payroll Master Data Maintenance',
      'Payroll Processing',
      'Payroll Authorization & Distribution',
      'Termination & Offboarding',
      'Segregation of Duties',
    ],
    inventory: [
      'Receiving',
      'Storage & Security',
      'Issuance',
      'Stocktake/Count',
      'Valuation',
      'Segregation of Duties',
    ],
    it: [
      'Access Management',
      'Change Management',
      'Incident Management',
      'Backup & Recovery',
      'Privileged Access',
      'Segregation of Duties',
    ],
    r2r: [
      'Journal Entry Authorisation',
      'General Ledger Maintenance',
      'Account Reconciliations',
      'Period-end Close Process',
      'Financial Reporting & Disclosure',
      'Intercompany Transactions',
      'Segregation of Duties',
    ],
    c2r: [
      'Capital Expenditure Authorisation',
      'Asset Acquisition & Capitalisation',
      'Asset Register Maintenance',
      'Depreciation Processing',
      'Asset Transfers & Disposals',
      'Physical Asset Verification',
      'Segregation of Duties',
    ],
    treasury: [
      'Cash Flow Forecasting',
      'Bank Account Management',
      'Payment Processing & Authorisation',
      'Investment Management',
      'Foreign Exchange Management',
      'Bank Reconciliations',
      'Segregation of Duties',
    ],
  };

  const processLabel = getProcessLabel(process);
  const checkpoints = (checkpointGuidance[process] || []).join(', ');

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

  return `Generate a Process Walkthrough Working Paper as JSON.

ENGAGEMENT: ${processLabel}${sectorContext ? ` | ${sectorContext}` : ''}${engagementContext ? `\n${engagementContext}` : ''}
FRAMEWORK: IIA IPPF + COSO 2013
PURPOSE: Document what a well-controlled process looks like at each checkpoint, to guide auditor walkthrough interviews and assess control design adequacy.

SCHEMA — return exactly this structure:

{
  "walkthroughTitle": "${processLabel} — Process Walkthrough Working Paper",
  "processOverview": "2-3 paragraphs describing the end-to-end process flow, key stakeholders, and why control design at each checkpoint matters",
  "scope": "1-2 sentences describing what this walkthrough covers and what is out of scope",
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "checkpoints": [
    {
      "id": "WP-001",
      "area": "Checkpoint area name",
      "expected": "What a well-controlled process looks like at this step — describe the ideal control state in 2-4 sentences",
      "designConsiderations": "Key SoD requirements, risks if control is absent, and design criteria the auditor should probe — 2-3 sentences",
      "suggestedQuestions": [
        "Specific interview question 1?",
        "Specific interview question 2?"
      ],
      "regulatoryRefs": [{ "regulation": "Employment Act 1955 (Act 265)", "clause": "Section 14" }]
    }
  ]
}

CHECKPOINTS — generate checkpoints for these areas in order: ${checkpoints}

REQUIREMENTS per checkpoint:
- expected: describe the ideal control state clearly so the auditor knows what "good" looks like
- designConsiderations: include SoD considerations and consequences of control absence
- suggestedQuestions: minimum 2, maximum 4 — specific and actionable interview questions

Make all content highly specific to the ${processLabel} process.${sectorContext ? ` Sector context: ${sectorContext} — apply sector-specific risks, terminology, and considerations.` : ''}
Reference IIA IPPF and COSO 2013 control components where relevant.

REGULATORY REFERENCES:
- Add regulatoryRefs to checkpoints where a specific regulation directly applies (e.g. employment terms, payroll compliance, data protection)
- Use ONLY the clauses listed in the APPLICABLE REGULATIONS section below — do not invent regulations or clause numbers
- regulatoryRefs is optional — only add when there is a direct, relevant link to a specific clause
- Each ref: { "regulation": "exact name from list", "clause": "exact clause from list" }${regulationsContext ? `

${regulationsContext}
DISCLAIMER: These references are provided as guidance. Verify applicability before use in a formal engagement.` : ''}`;
}
