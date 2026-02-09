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

  // Determine framework based on process
  const framework = process === 'it' ? 'COBIT 2019' : 'COSO 2013';
  const frameworkGuidance = process === 'it'
    ? 'Use COBIT 2019 framework focusing on IT governance and management objectives (EDM, APO, BAI, DSS, MEA domains)'
    : 'Use COSO 2013 Internal Control Framework focusing on the five components: Control Environment, Risk Assessment, Control Activities, Information & Communication, and Monitoring Activities';

  let samplingGuidance = '';
  if (sampleMethod === 'rule-of-thumb') {
    samplingGuidance = 'Use rule-of-thumb sampling guidance (e.g., "Test 25 samples or 10% of population, whichever is less")';
  } else if (sampleMethod === 'statistical') {
    samplingGuidance = `Use statistical sampling with: Population size: ${sampleData.populationSize}, Confidence level: ${sampleData.confidenceLevel}%, Error rate: ${sampleData.errorRate}%. Calculate appropriate sample size using these parameters.`;
  } else if (sampleMethod === 'custom') {
    samplingGuidance = `Use custom sampling: Sample size: ${sampleData.customSampleSize}, Methodology: ${sampleData.customMethodology}, Justification: ${sampleData.customJustification}`;
  }

  return `You are an expert internal auditor. Generate a comprehensive audit program for the ${processNames[process]} process in the ${industryNames[industry]} industry.

FRAMEWORK: ${frameworkGuidance}

${samplingGuidance}

Return your response as valid JSON with this exact structure:

{
  "framework": {
    "name": "${framework}",
    "description": "Brief explanation of why this framework applies to this process"
  },
  "processOverview": "A 2-3 paragraph description of this process in this industry, including typical workflow and key characteristics",
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
