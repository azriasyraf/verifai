import Link from 'next/link';

export const metadata = {
  title: 'About Verifai',
  description: 'Verifai generates professional audit working papers in seconds using AI. Built for internal auditors.',
};

const auditFeatures = [
  { label: 'AI-generated audit program', desc: 'Generates objectives, risks, controls, and procedures tailored to your industry. Usually done in under 15 seconds.' },
  { label: 'IIA IPPF & COSO ERM references', desc: 'Every risk and control is tagged with the relevant framework reference.' },
  { label: 'Risk-control linkage', desc: 'Controls are explicitly mapped to the risks they mitigate with full traceability.' },
  { label: 'Analytics tests library', desc: '35 curated data analytics tests across all processes, auto-mapped to relevant risks.' },
  { label: 'Engagement details', desc: 'Capture client name, department, period, reference, and auditor. All stamped on every export.' },
  { label: 'Full inline edit mode', desc: 'Edit any AI-generated content: add, remove, or rewrite risks, controls, and procedures.' },
  { label: 'Jurisdiction-specific regulation library', desc: 'Select International (COSO 2013 + IIA IPPF) or Malaysia (adds Employment Act, EPF, SOCSO, MACC, ITA, PDPA per process). Every risk and control is tagged with citation chips.' },
  { label: 'Kick-off meeting agenda', desc: 'Generate a structured agenda from your audit program in one click, with guidance notes. Copy to clipboard.' },
  { label: 'Excel export', desc: 'Multi-tab workbook: Summary tab plus one tab per control, each pre-populated with a fieldwork sample table.' },
];

const analyticsFeatures = [
  { label: 'Run analytics tests directly in the app', desc: 'Upload your client data file and run tests in Phase 3 of the audit program. Results appear inline. No Excel formulas, no switching between tools.' },
  { label: 'Smart column matching', desc: 'Verifai reads your file headers and pre-fills the column mapping. Confirm or adjust before running.' },
  { label: 'Document your work against the results', desc: 'Write up what you did, who you spoke to, and what you concluded — directly alongside the exception rows.' },
  { label: 'Raise exceptions as findings in one click', desc: 'If the results warrant a finding, one click sends it to the Report tab with the details already filled in.' },
  { label: 'Working paper export per test', desc: 'Each test produces a 3-tab Excel file: the raw data, the exceptions, and a working paper with the methodology documented for manual reperformance.' },
  { label: 'More tests coming', desc: 'The current set covers the most common single-file tests. Multi-file joins, date thresholds, and statistical tests are on the roadmap.' },
];

const rmgaFeatures = [
  { label: 'Entity-level governance working paper', desc: 'Covers Risk Management Framework, Control Environment & Risk Culture, Training & Awareness, and Risk Reporting & Oversight.' },
  { label: 'Walkthrough steps & documents to obtain', desc: 'Specific steps the auditor performs and a list of documents to request, broken out per area.' },
  { label: 'Inquiry questions with purpose notes', desc: 'Structured questions for management, each with a note explaining why it matters.' },
  { label: 'Red flags per area', desc: 'Governance-specific red flags to watch for during fieldwork.' },
  { label: 'Fieldwork documentation', desc: 'Management Response and Auditor Assessment fields for every inquiry question.' },
  { label: 'Per-area conclusions', desc: 'Write and save your conclusion for each governance area.' },
  { label: 'On-demand Overall Assessment', desc: 'AI-synthesised maturity rating (Level 1 to 5) based on your completed working paper, or enter your own manually.' },
  { label: 'Full inline edit mode', desc: 'Edit all AI-generated content: areas, questions, steps, and documents.' },
  { label: 'Excel export', desc: '3-tab workbook: Summary, Working Paper, and Inquiry Responses.' },
];

const walkthroughFeatures = [
  { label: 'AI-generated checkpoint template', desc: 'Generates process-specific checkpoints — each with expected control state, design considerations, and suggested interview questions.' },
  { label: 'Design adequacy rating per checkpoint', desc: 'Rate each checkpoint as Adequate, Partially Adequate, Inadequate, or Not Assessed. Colour-coded badge updates instantly.' },
  { label: 'Interview guidance (collapsible)', desc: 'Suggested questions per checkpoint expand on demand — guidance only, not a rigid script.' },
  { label: 'What was described — auditor fill-in', desc: 'Free-text field per checkpoint to capture exactly what management or staff described during the interview.' },
  { label: 'Freeform notes section', desc: 'One open notes area for anything that doesn\'t fit a specific checkpoint.' },
  { label: 'Best practice reminder', desc: 'Prompt to share the notes with the auditee for confirmation before testing.' },
  { label: 'Overall conclusion', desc: 'Summarise design adequacy across the whole process before proceeding to testing.' },
  { label: 'Excel export — 3 tabs', desc: 'Summary, Walkthrough (per-checkpoint grid), and Freeform Notes.' },
  { label: 'Generate audit program from walkthrough', desc: 'One click formats your observations as structured client context and pre-populates the audit program form — Verifai elevates risks where controls were rated Inadequate or Partially Adequate.' },
];

const reportFeatures = [
  { label: 'Excel findings upload', desc: 'Upload your fieldwork findings file. Verifai parses finding descriptions, risk ratings, root causes, management responses, and due dates.' },
  { label: 'Finding quality hints', desc: 'Weak or incomplete findings are flagged before generation so you can fix them first.' },
  { label: 'Full CCCE report draft', desc: 'AI writes condition, criteria, cause, and effect for every finding in formal audit report language.' },
  { label: 'Tabbed findings review', desc: 'Each finding gets its own tab. Edit any field inline before exporting.' },
  { label: 'Management response QC flags', desc: 'Vague responses ("will monitor", no action owner, no due date) are flagged in amber.' },
  { label: 'Recommendation review panel', desc: 'Before generating, click Generate Recommendations. AI generates from scratch or polishes your existing text. Two side-by-side panels — your version vs AI suggestion — each with Use this version. You choose, then edit freely. Optional.' },
  { label: 'Discard changes', desc: 'Revert all edits back to the AI original at any point — useful if you want to restart your review.' },
  { label: 'Pre-flight QC on export', desc: 'If QC-flagged findings remain unaddressed, a confirmation dialog lists affected findings before the Word file is generated.' },
  { label: 'Word export (.docx)', desc: 'Formatted report ready to share, with AI disclosure footer and page break per finding.' },
];

const comingSoon = [
  { label: 'See what changed from the AI draft', desc: 'Verifai will track every edit you make and include a change summary on export. Your supervisor can see that you engaged with the output, not just downloaded it.', status: 'Next up' },
  { label: 'More analytics tests', desc: 'Date thresholds, round-number clusters, split purchases, and cross-file joins like terminated employees cross-referenced against payroll.', status: 'Planned' },
  { label: 'Document enrichment layer', desc: 'Label-tagged file uploads (walkthrough notes, P&P, prior report, RMGA) to enrich generation. Verifai reads each document in context for its document type.', status: 'Planned' },
  { label: 'Policy & procedure gap detection', desc: 'Upload a P&P alongside your walkthrough notes. Verifai compares what is written against what was described and pre-populates a finding where they diverge.', status: 'Planned' },
  { label: 'Saved engagements', desc: 'Save and reload your working papers across sessions. Right now everything lives in the browser tab.', status: 'Planned' },
  { label: 'Team collaboration', desc: 'Share workpapers with your team, assign sections, and track review status without bouncing Excel files around.', status: 'Future' },
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
            Verifai uses AI to generate audit programs, walkthrough working papers, governance assessments, and full audit reports — work that used to take hours, done in seconds. Fully editable. Ready to export.
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

        {/* Stats */}
        <div className="bg-indigo-900 rounded-2xl px-8 py-10 text-center space-y-6">
          <p className="text-indigo-300 text-sm font-semibold uppercase tracking-widest">Why it matters</p>
          <p className="text-white text-xl font-medium max-w-xl mx-auto leading-relaxed">
            Internal auditors spend{' '}
            <span className="text-4xl font-extrabold text-white">2–8 hours</span>
            {' '}manually drafting working papers.
          </p>
          <p className="text-indigo-200 text-lg">
            Verifai generates structured drafts in{' '}
            <span className="text-3xl font-extrabold text-emerald-400">under 15 seconds.</span>
          </p>
          <p className="text-indigo-400 text-xs max-w-md mx-auto">
            That&apos;s not replacing the auditor — it&apos;s giving them back the hours they were spending on structure, so they can spend them on judgement.
          </p>
        </div>

        {/* Feature 1: Audit Program */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">1</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Audit Program Generator</h2>
              <p className="text-sm text-gray-500">Select your industry and process to get a complete audit program with risks, controls, and procedures.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {auditFeatures.map((f, i) => (
              <div key={i} className="flex gap-3 px-5 py-3">
                <span className="text-indigo-500 shrink-0 mt-0.5 text-sm">✓</span>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{f.label}</p>
                  <p className="text-gray-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature 2: Process Walkthrough */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm">2</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Process Walkthrough Working Paper</h2>
              <p className="text-sm text-gray-500">Document walkthrough interviews checkpoint by checkpoint. Assess control design adequacy — then generate an audit program from your findings.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {walkthroughFeatures.map((f, i) => (
              <div key={i} className="flex gap-3 px-5 py-3">
                <span className="text-teal-500 shrink-0 mt-0.5 text-sm">✓</span>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{f.label}</p>
                  <p className="text-gray-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature 3: RMGA */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">3</div>
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
                  <p className="font-medium text-gray-900">{f.label}</p>
                  <p className="text-gray-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature 4: Analytics Execution */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm">4</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Data Analytics Execution</h2>
              <p className="text-sm text-gray-500">Upload client data and run tests directly in the app. No Excel formulas. Results inline, working paper ready to export.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {analyticsFeatures.map((f, i) => (
              <div key={i} className="flex gap-3 px-5 py-3">
                <span className="text-emerald-500 shrink-0 mt-0.5 text-sm">✓</span>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{f.label}</p>
                  <p className="text-gray-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature 5: Audit Report */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">5</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Audit Report Generator</h2>
              <p className="text-sm text-gray-500">Upload your completed findings workbook. Verifai drafts a full audit report in CCCE format, ready to export to Word.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {reportFeatures.map((f, i) => (
              <div key={i} className="flex gap-3 px-5 py-3">
                <span className="text-rose-500 shrink-0 mt-0.5 text-sm">✓</span>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{f.label}</p>
                  <p className="text-gray-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coming Soon */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-sm text-gray-500 mb-6">Features in design or development. This is a beta. Things move fast.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {comingSoon.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                    item.status === 'Next up' ? 'bg-amber-50 text-amber-700' :
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
            Verifai runs on <span className="font-medium text-gray-700">Groq</span> with <span className="font-medium text-gray-700">Llama 3.3 70B</span>, optimised for fast, structured output.
            More powerful models (GPT-4o, Claude Sonnet) exist but cost significantly more per generation. Llama 3.3 70B is fit for purpose and currently free.
          </p>
          <p className="text-xs text-gray-400">
            The engine will be upgraded as usage grows. All AI-generated content should be reviewed by a qualified auditor before use.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-8 space-y-1">
          <p>Built by <span className="font-medium text-gray-600">Azri Asyraf</span>, Audit Sorcerer · Prompt Whisperer · Absolutely Not a Developer</p>
          <p><span className="font-medium text-gray-600">Azira</span>, Auditor-at-large · The One Who Actually Knows What She&apos;s Talking About</p>
          <p>Verifai is a personal project. Not affiliated with the IIA or any professional body.</p>
        </div>

      </div>
    </div>
  );
}
