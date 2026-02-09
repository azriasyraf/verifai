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

  let samplingGuidance = '';
  if (sampleMethod === 'rule-of-thumb') {
    samplingGuidance = 'Use rule-of-thumb sampling guidance (e.g., "Test 25 samples or 10% of population, whichever is less")';
  } else if (sampleMethod === 'statistical') {
    samplingGuidance = `Use statistical sampling with: Population size: ${sampleData.populationSize}, Confidence level: ${sampleData.confidenceLevel}%, Error rate: ${sampleData.errorRate}%. Calculate appropriate sample size using these parameters.`;
  } else if (sampleMethod === 'custom') {
    samplingGuidance = `Use custom sampling: Sample size: ${sampleData.customSampleSize}, Methodology: ${sampleData.customMethodology}, Justification: ${sampleData.customJustification}`;
  }

  return `You are an expert internal auditor. Generate a comprehensive audit program for the ${processNames[process]} process in the ${industryNames[industry]} industry.

${samplingGuidance}

Return your response as valid JSON with this exact structure:

{
  "processOverview": "A 2-3 paragraph description of this process in this industry, including typical workflow and key characteristics",
  "auditObjectives": [
    "Objective 1",
    "Objective 2",
    "Objective 3"
  ],
  "risks": [
    {
      "category": "Risk category (Financial, Operational, Compliance, etc.)",
      "description": "Detailed risk description",
      "rating": "High/Medium/Low"
    }
  ],
  "controls": [
    {
      "id": "C001",
      "description": "Control description",
      "type": "Preventive/Detective/Corrective",
      "owner": "Typical role responsible"
    }
  ],
  "auditProcedures": [
    {
      "controlId": "C001",
      "procedure": "Detailed step-by-step audit procedure",
      "testingMethod": "Inquiry/Observation/Inspection/Reperformance",
      "sampleSize": "Specific sample size based on the sampling method provided",
      "expectedEvidence": "What documentation/evidence to expect"
    }
  ]
}

Requirements:
- Include 5-8 risks specific to this industry-process combination
- Include 8-12 relevant controls
- Include 10-15 specific, actionable audit procedures
- Make content highly specific to the selected industry and process
- Ensure audit procedures are practical and executable
- Sample sizes should align with the sampling method specified
- Return ONLY valid JSON, no additional text or markdown formatting`;
}
