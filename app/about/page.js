import Link from 'next/link';

export const metadata = {
  title: 'About Verifai — AI-Powered Audit Working Papers',
  description: 'Verifai generates professional audit programs and governance working papers in seconds using AI. Built for internal auditors.',
};

const auditFeatures = [
  { label: 'AI-generated audit program', desc: 'Full program in seconds — objectives, risks, controls, and procedures tailored to your industry.' },
  { label: 'IIA IPPF & COSO ERM references', desc: 'Every risk and control is tagged with the relevant framework reference.' },
  { label: 'Risk-control linkage', desc: 'Controls are explicitly mapped to the risks they mitigate with full traceability.' },
  { label: 'Analytics tests library', desc: '35 curated data analytics tests across all processes, auto-mapped to relevant risks.' },
  { label: 'Engagement details', desc: 'Capture client name, department, period, reference, and auditor — stamped on every export.' },
  { label: 'Full inline edit mode', desc: 'Edit any AI-generated content — add, remove, or rewrite risks, controls, and procedures.' },
  { label: 'Excel export', desc: 'Multi-tab workbook: Audit Program, Analytics Tests, and Control Matrix.' },
];

const rmgaFeatures = [
  { label: 'Entity-level governance working paper', desc: 'Covers Risk Management Framework, Control Environment & Risk Culture, Training & Awareness, and Risk Reporting & Oversight.' },
  { label: 'Walkthrough steps & documents to obtain', desc: 'Specific steps the auditor performs and a list of documents to request — per area.' },
  { label: 'Inquiry questions with purpose notes', desc: 'Structured questions for management, each with a note explaining why it matters.' },
  { label: 'Red flags per area', desc: 'Governance-specific red flags to watch for during fieldwork.' },
  { label: 'Fieldwork documentation', desc: 'Management Response and Auditor Assessment fields for every inquiry question.' },
  { label: 'Per-area conclusions', desc: 'Write and save your conclusion for each governance area.' },
  { label: 'On-demand Overall Assessment', desc: 'AI-synthesised maturity rating (Level 1–5) based on your completed working paper, or enter your own manually.' },
  { label: 'Full inline edit mode', desc: 'Edit all AI-generated content — areas, questions, steps, and documents.' },
  { label: 'Excel export', desc: '3-tab workbook: Summary, Working Paper, and Inquiry Responses.' },
];

const comingSoon = [
  { label: 'AI-Assisted RMGA Completion', desc: 'Feed Verifai your fieldwork notes or voice recordings — the audit engine drafts management responses, assessments, and conclusions for your review.', status: 'Planned' },
  { label: 'Data Analytics Execution', desc: 'Upload client data (Excel/CSV) and run analytics tests directly in the app — Verifai surfaces anomalies and flags findings.', status: 'In design' },
  { label: 'Process Walkthrough Documentation', desc: 'Structured working paper to document process flows end-to-end — who initiates, documents needed, segregation of duties, controls, GL posting.', status: 'Planned' },
  { label: 'Policy & Procedure Upload', desc: 'Upload your SOPs — the audit engine reads them and recommends risks, controls, and tests automatically.', status: 'Planned' },
  { label: 'Saved Engagements', desc: 'Save and reload your audit programs and governance assessments across sessions.', status: 'Planned' },
  { label: 'Team Collaboration', desc: 'Share workpapers with your team, assign controls, and track review status.', status: 'Future' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-gray-900 text-lg">Verifai</span>
          <Link
            href="/"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Try it now →
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">

        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Professional audit working papers.<br />
            <span className="text-indigo-600">In seconds.</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Verifai uses AI to generate audit programs and governance assessments that would otherwise
            take hours to build from scratch — fully editable and ready to export to Excel.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              Generate your first program
            </Link>
            <span className="text-sm text-gray-400">Free to use · No sign-up required</span>
          </div>
        </div>

        {/* Feature 1: Audit Program */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">1</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Audit Program Generator</h2>
              <p className="text-sm text-gray-500">Select your industry and process — get a complete audit program with risks, controls, and procedures.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {auditFeatures.map((f, i) => (
              <div key={i} className="flex gap-3 px-5 py-3">
                <span className="text-indigo-500 shrink-0 mt-0.5 text-sm">✓</span>
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{f.label}</span>
                  <span className="text-gray-500"> — {f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature 2: RMGA */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">2</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Risk Management & Governance Assessment</h2>
              <p className="text-sm text-gray-500">Entity-level governance working paper following IIA IPPF and COSO ERM frameworks.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {rmgaFeatures.map((f, i) => (
              <div key={i} className="flex gap-3 px-5 py-3">
                <span className="text-purple-500 shrink-0 mt-0.5 text-sm">✓</span>
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{f.label}</span>
                  <span className="text-gray-500"> — {f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coming Soon */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-sm text-gray-500 mb-6">Features in design or development. This is a beta — things move fast.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {comingSoon.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                    item.status === 'In design' ? 'bg-blue-50 text-blue-700' :
                    item.status === 'Future' ? 'bg-gray-100 text-gray-400' :
                    'bg-gray-100 text-gray-600'
                  }`}>{item.status}</span>
                </div>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Engine */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">What powers Verifai?</h2>
          <p className="text-sm text-gray-500 mb-4">
            Verifai runs on <span className="font-medium text-gray-700">Groq</span> with <span className="font-medium text-gray-700">Llama 3.3 70B</span> — a large language model optimised for fast, structured output.
            More powerful models (GPT-4o, Claude Sonnet) exist but cost significantly more per generation. Llama 3.3 70B is fit for purpose and currently free.
          </p>
          <p className="text-xs text-gray-400">
            The engine will be upgraded as usage grows. All AI-generated content should be reviewed by a qualified auditor before use.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-8 space-y-1">
          <p>Built by <span className="font-medium text-gray-600">Azri Asyraf</span> — Audit Sorcerer · Prompt Whisperer · Absolutely Not a Developer</p>
          <p>Verifai is a personal project. Not affiliated with the IIA or any professional body.</p>
        </div>

      </div>
    </div>
  );
}
