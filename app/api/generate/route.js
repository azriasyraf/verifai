import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request) {
  try {
    const { industry, process, sampleMethod, sampleData } = await request.json();

    // Build the prompt based on inputs
    const prompt = buildPrompt(industry, process, sampleMethod, sampleData);

    // Call Groq API with Llama model
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0].message.content;

    // Parse the JSON response
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const auditProgram = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: auditProgram });
  } catch (error) {
    console.error('Error generating audit program:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function buildPrompt(industry, process, sampleMethod, sampleData) {
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

  // Determine control framework based on process
  const controlFramework = process === 'it' ? 'COBIT 2019' : 'COSO 2013';
  const controlFrameworkGuidance = process === 'it'
    ? 'Use COBIT 2019 framework for IT governance and management objectives (EDM, APO, BAI, DSS, MEA domains) to identify risks and design controls'
    : 'Use COSO 2013 Internal Control Framework (Control Environment, Risk Assessment, Control Activities, Information & Communication, Monitoring Activities) to identify risks and design controls';

  let samplingGuidance = '';
  if (sampleMethod === 'rule-of-thumb') {
    samplingGuidance = 'Use rule-of-thumb sampling guidance (e.g., "Test 25 samples or 10% of population, whichever is less")';
  } else if (sampleMethod === 'statistical') {
    samplingGuidance = `Use statistical sampling with: Population size: ${sampleData.populationSize}, Confidence level: ${sampleData.confidenceLevel}%, Error rate: ${sampleData.errorRate}%. Calculate appropriate sample size using these parameters.`;
  } else if (sampleMethod === 'custom') {
    samplingGuidance = `Use custom sampling: Sample size: ${sampleData.customSampleSize}, Methodology: ${sampleData.customMethodology}, Justification: ${sampleData.customJustification}`;
  }

  return `You are an expert internal auditor. Generate a comprehensive audit program for the ${processNames[process]} process in the ${industryNames[industry]} industry.

AUDIT METHODOLOGY: Follow IIA International Professional Practices Framework (IPPF) Standards for conducting internal audits, including proper planning, risk assessment, testing, documentation, and reporting.

CONTROL FRAMEWORK: ${controlFrameworkGuidance}

RISK MANAGEMENT & GOVERNANCE: Assess the maturity and effectiveness of the organization's risk management process and governance structure before evaluating specific controls. Reference COSO ERM (Enterprise Risk Management), IIA Three Lines Model, and ISO 31000 risk management principles.

${samplingGuidance}

Return your response as valid JSON with this exact structure:

{
  "framework": {
    "auditMethodology": "IIA IPPF (International Professional Practices Framework)",
    "controlFramework": "${controlFramework}",
    "description": "Brief explanation of how IIA IPPF guides the audit approach and how ${controlFramework} is used for risk identification and control design"
  },
  "processOverview": "A 2-3 paragraph description of this process in this industry, including typical workflow and key characteristics",
  "riskManagementAssessment": {
    "maturityLevel": "Assessment of risk management maturity (Initial/Developing/Defined/Managed/Optimized based on industry norms)",
    "maturityDescription": "Brief explanation of what this maturity level means for this organization",
    "governanceStructure": "Assessment of governance framework, board oversight, three lines model, and management accountability for this process",
    "assessmentProcedures": [
      "Procedure 1 to evaluate risk management process",
      "Procedure 2 to assess governance structure",
      "Procedure 3 to test risk identification completeness"
    ],
    "keyQuestions": [
      "Question 1 to ask management/board about risk management",
      "Question 2 about governance oversight",
      "Question 3 about risk appetite and tolerance"
    ],
    "redFlags": [
      "Warning sign 1 indicating weak risk management",
      "Warning sign 2 indicating governance gaps",
      "Warning sign 3 indicating incomplete risk identification"
    ],
    "recommendations": [
      "Recommendation 1 if risk management is weak",
      "Recommendation 2 if governance needs improvement"
    ]
  },
  "auditObjectives": [
    "Objective 1 (linked to financial statement assertion or IT objective)",
    "Objective 2",
    "Objective 3"
  ],
  "risks": [
    {
      "id": "R001",
      "category": "Risk category (Financial, Operational, Compliance, IT, Strategic)",
      "description": "Detailed risk description",
      "rating": "High/Medium/Low",
      "assertion": "Financial assertion affected (Completeness/Existence/Accuracy/Valuation/Rights/Presentation) or IT objective",
      "relatedControls": ["C001", "C002"]
    }
  ],
  "controls": [
    {
      "id": "C001",
      "description": "Control description",
      "type": "Preventive/Detective/Corrective",
      "frequency": "Continuous/Daily/Weekly/Monthly/Quarterly/Annual",
      "owner": "Typical role responsible",
      "mitigatesRisks": ["R001"]
    }
  ],
  "auditProcedures": [
    {
      "controlId": "C001",
      "procedure": "Detailed step-by-step audit procedure",
      "testingMethod": "Inquiry/Observation/Inspection/Reperformance/Data Analytics",
      "sampleSize": "Specific sample size based on the sampling method provided",
      "expectedEvidence": "What documentation/evidence to expect",
      "analyticsTest": {
        "type": "Type of analytics (Duplicate Detection/Cut-off Testing/Outlier Analysis/Trend Analysis/etc.)",
        "description": "Specific analytics to perform (e.g., 'Identify duplicate invoices by vendor, amount, date')",
        "population": "What data to analyze (e.g., 'All purchase transactions for the period')"
      }
    }
  ]
}

Requirements:

RISK MANAGEMENT & GOVERNANCE ASSESSMENT:
- Evaluate the maturity of risk management process (use industry benchmarks for this sector)
- Assess whether the organization likely has formal risk management in place
- Consider typical governance structures for ${industryNames[industry]} companies
- Include 4-6 assessment procedures to evaluate risk management and governance
- Include 5-8 key questions to ask management, board, or risk owners
- Identify 3-5 red flags that would indicate weak or absent risk management/governance
- Provide 2-4 recommendations if risk management needs improvement
- Consider: Does this org have a CRO? Risk committee? Risk register? Three lines model?

COMPLETENESS & COVERAGE:
- Cover ALL relevant financial statement assertions (Completeness, Existence, Accuracy, Valuation, Rights, Presentation) or IT objectives
- Include comprehensive risks covering all major risk categories for this process
- Ensure EVERY risk has at least one mitigating control (check relatedControls)
- Ensure EVERY control is tested by at least one audit procedure (check controlId)
- Include mix of Preventive, Detective, and Corrective controls

ANALYTICS PROCEDURES:
- Include at least 3-5 data analytics procedures covering:
  1. Duplicate detection (same vendor, amount, date, invoice number)
  2. Cut-off testing (transactions within 5-7 days of period end)
  3. Outlier/exception analysis (unusually large amounts, statistical outliers)
  4. Trend analysis (month-over-month patterns, seasonal variations)
  5. Authorization testing (transactions exceeding approval thresholds)
- For analytics procedures, set testingMethod to "Data Analytics" and populate analyticsTest object
- Analytics procedures should test full population where practical

INDUSTRY & PROCESS SPECIFICITY:
- Make content highly specific to the ${industryNames[industry]} industry and ${processNames[process]} process
- Reference industry-specific regulations, standards, and best practices
- Include process-specific risks and controls unique to this combination
- Ensure audit procedures are practical, executable, and reflect real-world scenarios

TECHNICAL REQUIREMENTS:
- Sample sizes must align with the sampling method specified
- Each control should have clear frequency (how often it operates)
- Each risk should be rated based on likelihood and impact
- Use the ${framework} framework to structure control categories
- Return ONLY valid JSON, no additional text or markdown formatting`;
}
