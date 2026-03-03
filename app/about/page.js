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
  { label: 'Document enrichment', desc: 'Upload client documents — Policies & Procedures, Prior Audit Report, RMGA Assessment, or Walkthrough Working Paper — to personalise generation. Upload both P&P and walkthrough notes and Verifai cross-references them for gaps automatically.' },
  { label: 'Kick-off meeting agenda', desc: 'Generate a structured agenda from your audit program in one click, with guidance notes. Copy to clipboard.' },
  { label: 'Excel export', desc: 'Multi-tab workbook: Summary tab plus one tab per control, each pre-populated with a fieldwork sample table.' },
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

const findingsFeatures = [
  { label: 'Cross-engagement repeat detection', desc: 'Findings are checked against your full audit history before you generate. REPEAT badges flag issues that appeared in 2+ prior engagements — so you know before you write what is a pattern, not a one-off.' },
  { label: 'CROSS-PROCESS and GROUP PATTERN detection', desc: 'Findings that cut across multiple processes or multiple subsidiaries are automatically identified — a signal for governance-level attention, not just process-level remediation.' },
  { label: 'Control category and regulatory traceability', desc: 'Every finding is tagged with the control category it belongs to and the regulatory references it implicates. Visible in the report and traceable back to the audit program.' },
  { label: 'Prior findings import', desc: 'Upload a prior audit findings Excel to seed your history. Verifai classifies, matches, and tags each row — giving repeat detection context from day one, not just after a year of use.' },
  { label: 'Findings count per control', desc: 'The audit program shows how many findings have been raised against each control across prior engagements — so you know which controls deserve more attention before fieldwork starts.' },
];

const engagementFeatures = [
  { label: 'Auto-save on every change', desc: 'Verifai saves automatically when you generate and debounces edits with a 2-second delay. You never think about saving.' },
  { label: 'My Engagements dashboard', desc: 'All your engagements in one place, sorted by last updated. Client name, process, department, period, and status at a glance.' },
  { label: 'Open where you left off', desc: 'Click Open on any working paper card to load it exactly as you left it — edits, field values, and all.' },
  { label: 'Generate missing documents from the engagement view', desc: 'If a working paper has not been generated yet, click Generate on its card. The form opens with all engagement details pre-filled.' },
  { label: 'Organisation-scoped storage', desc: 'All data is scoped to your organisation. Other organisations cannot see your engagements.' },
];

const comingSoon = [
  { label: 'In-app data analytics execution', desc: 'Upload client data and run tests directly in the app — gap tests, duplicate detection, round-number clustering, statistical outliers. Results inline, working paper ready to export.', status: 'In design' },
  { label: 'Audit trail — see what the auditor changed', desc: 'Managers will see exactly what changed between the AI draft and the final output: which findings were modified, which recommendations were rewritten, which risks were re-rated. Answers "did you think, or did you just click Export?"', status: 'Planned' },
  { label: 'Team collaboration', desc: 'Share engagements with your team, assign sections, and track review status without bouncing Excel files around.', status: 'Planned' },
  { label: 'Management action tracking', desc: 'Track agreed actions from audit findings — owner, due date, closure status. Follow-up audits pre-populated with open prior actions.', status: 'Planned' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-gray-900 text-lg">Verifai</span>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Sign in →
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
              href="/dashboard"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              Open Verifai
            </Link>
            <span className="text-sm text-gray-400">Invite-only beta</span>
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

        {/* Feature 4: Audit Report */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">4</div>
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

        {/* Feature 5: Finding Intelligence */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">5</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Finding Intelligence</h2>
              <p className="text-sm text-gray-500">Findings are stored as structured records — not just text. Verifai cross-references them across engagements, flags patterns, and feeds them back into planning.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {findingsFeatures.map((f, i) => (
              <div key={i} className="flex gap-3 px-5 py-3">
                <span className="text-amber-500 shrink-0 mt-0.5 text-sm">✓</span>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{f.label}</p>
                  <p className="text-gray-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature 6: Saved Engagements */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">6</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Saved Engagements</h2>
              <p className="text-sm text-gray-500">Working papers save automatically to your account. Pick up where you left off, across sessions and devices.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {engagementFeatures.map((f, i) => (
              <div key={i} className="flex gap-3 px-5 py-3">
                <span className="text-gray-400 shrink-0 mt-0.5 text-sm">✓</span>
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
                    item.status === 'In design' ? 'bg-amber-50 text-amber-700' :
                    item.status === 'Planned' ? 'bg-blue-50 text-blue-700' :
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
            More powerful models (GPT-4o, Claude Sonnet) exist but cost significantly more per generation. Llama 3.3 70B is fit for purpose and fast.
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
