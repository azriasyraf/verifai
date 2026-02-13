'use client';

import { useState, useEffect } from 'react';

const BANNER_KEY = 'verifai_guide_dismissed';

export default function UserGuide() {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('engine');

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_KEY);
    if (!dismissed) setBannerVisible(true);
  }, []);

  const dismissBanner = () => {
    localStorage.setItem(BANNER_KEY, '1');
    setBannerVisible(false);
  };

  const openGuide = () => {
    setActiveTab('engine');
    setModalOpen(true);
  };

  return (
    <>
      {/* Dismissible onboarding banner */}
      {bannerVisible && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex items-center justify-between text-sm">
          <span className="text-indigo-700">
            👋 First time using Verifai?{' '}
            <button
              onClick={openGuide}
              className="font-semibold underline underline-offset-2 hover:text-indigo-900"
            >
              Read the User Guide →
            </button>
          </span>
          <button
            onClick={dismissBanner}
            className="text-indigo-400 hover:text-indigo-700 ml-4 text-base leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Persistent guide button (bottom-right) */}
      <button
        onClick={openGuide}
        className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg transition-colors"
        title="User Guide"
      >
        ? Guide
      </button>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Verifai User Guide</h2>
                <p className="text-xs text-gray-500 mt-0.5">AI-powered audit working paper generator</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6 gap-4 text-sm">
              {[
                { id: 'engine', label: '⚙️ The Engine' },
                { id: 'features', label: '📖 How to Use' },
                { id: 'featureslist', label: '✅ Features' },
                { id: 'coming', label: '🔜 Coming Soon' },
                { id: 'credits', label: '👤 Credits' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 border-b-2 transition-colors font-medium ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-gray-700 space-y-4">

              {activeTab === 'engine' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">What powers Verifai?</h3>
                    <p>
                      Verifai runs on <span className="font-medium text-indigo-700">Groq</span> with{' '}
                      <span className="font-medium">Llama 3.3 70B</span>, a large language model
                      optimised for fast, structured output. Generation typically takes 5–15 seconds.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <p className="font-medium text-gray-900">How does it compare to other AI?</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="pb-2 font-medium">Model</th>
                          <th className="pb-2 font-medium">Capability</th>
                          <th className="pb-2 font-medium">Cost</th>
                          <th className="pb-2 font-medium">Fit for Verifai?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="py-1.5 font-medium">GPT-4o (OpenAI)</td>
                          <td className="py-1.5">Excellent</td>
                          <td className="py-1.5 text-orange-600">$$$</td>
                          <td className="py-1.5 text-gray-500">Overkill for now</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 font-medium">Claude Sonnet (Anthropic)</td>
                          <td className="py-1.5">Excellent</td>
                          <td className="py-1.5 text-orange-600">$$$</td>
                          <td className="py-1.5 text-gray-500">Overkill for now</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 font-medium text-indigo-700">Llama 3.3 70B (Groq)</td>
                          <td className="py-1.5">Very Good</td>
                          <td className="py-1.5 text-green-600 font-medium">Free</td>
                          <td className="py-1.5 text-green-700 font-medium">✓ Fit for purpose</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-gray-500 text-xs">
                    Groq&apos;s free tier is currently sufficient for generating structured audit content.
                    We&apos;ll upgrade the engine as demand grows.
                  </p>
                </div>
              )}

              {activeTab === 'features' && (
                <div className="space-y-6">

                  {/* Audit Program */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Audit Program Generator</h3>
                    <ol className="space-y-3">
                      {[
                        {
                          step: 'Fill in engagement details',
                          desc: 'Enter client name, department, audit period, engagement reference, and auditor name. These appear on your exported workpaper. Skip if not needed.',
                        },
                        {
                          step: 'Select your industry and process',
                          desc: 'Choose the industry context and the specific process you are auditing (e.g. Revenue to Cash, Procurement to Payment). These are the starting options. More will be added.',
                        },
                        {
                          step: 'Enrich with client context (optional)',
                          desc: 'Paste walkthrough notes or interview observations to personalise the output. Verifai will elevate risks with evidence, flag control gaps, and add client-specific observations. If you have a completed RMGA, import its findings directly.',
                        },
                        {
                          step: 'Click Generate',
                          desc: 'Verifai generates a full three-phase audit program: Phase 1 Risk Assessment (objectives, risks), Phase 2 Test of Controls (controls and procedures), Phase 3 Substantive Analytics (population-level tests). Takes about 10–15 seconds.',
                        },
                        {
                          step: 'Review and customise',
                          desc: 'Click Edit Program to modify anything. Add or remove risks, controls, and procedures, or change descriptions. Everything the AI generates is a starting point, not a final answer.',
                        },
                        {
                          step: 'Check Phase 3 — Substantive Analytics',
                          desc: 'Verifai auto-suggests 35 data analytics tests mapped to your risks. Toggle tests on/off and re-map them to risks as needed.',
                        },
                        {
                          step: 'Run analytics tests directly in-app',
                          desc: 'Upload a CSV or XLSX file at the top of Phase 3. Run Test buttons appear on 5 executable tests (RC-001, PP-002, HR-002, INV-001, IT-003). A column mapper pre-fills your file\'s headers — confirm and results appear inline.',
                        },
                        {
                          step: 'Document your work and raise findings',
                          desc: 'For each test result, fill in Audit Work Done (interviews, observations, anything) and a Conclusion. If exceptions warrant escalation, click Raise as Finding — it pre-populates a finding in the Report tab automatically.',
                        },
                        {
                          step: 'Export analytics working paper',
                          desc: 'Click Export Working Paper per test. Downloads a 3-tab Excel: Raw Data, Exceptions, and a working paper tab named after the test ID with methodology steps for manual reperformance.',
                        },
                        {
                          step: 'Export audit program to Excel',
                          desc: 'Download a multi-tab workbook with your full audit program, analytics test details, and control matrix. Ready to use or share.',
                        },
                      ].map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                          <div>
                            <p className="font-medium text-gray-900">{item.step}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* RMGA */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Risk Management & Governance Assessment (RMGA)</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      An entity-level working paper covering the organisation&apos;s governance framework, risk culture, and oversight mechanisms. Not tied to a specific process.
                    </p>
                    <ol className="space-y-3">
                      {[
                        {
                          step: 'Switch to Governance mode',
                          desc: 'On the main form, select Risk & Governance Assessment. Fill in engagement details and select the industry and company type.',
                        },
                        {
                          step: 'Click Generate',
                          desc: 'Verifai generates four assessment areas: Risk Management Framework, Control Environment & Risk Culture, Training & Awareness, and Risk Reporting & Oversight.',
                        },
                        {
                          step: 'Work through each area',
                          desc: 'For each area you\'ll see walkthrough steps, documents to obtain, and inquiry questions. Use the Management Response and Auditor Assessment fields to document your fieldwork as you go.',
                        },
                        {
                          step: 'Write area conclusions',
                          desc: 'Once you\'ve completed fieldwork for an area, type your conclusion in the Conclusion box at the bottom of that area.',
                        },
                        {
                          step: 'Generate the Overall Assessment',
                          desc: 'When your working paper is complete, scroll to the bottom and click Generate Overall Assessment. Choose AI-suggested (Verifai synthesises a maturity rating from your conclusions) or enter your own manually.',
                        },
                        {
                          step: 'Export to Excel',
                          desc: 'Download a 3-tab workbook: Summary (scope, objectives, overall assessment), Working Paper (all areas and conclusions), and Inquiry Responses.',
                        },
                      ].map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                          <div>
                            <p className="font-medium text-gray-900">{item.step}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Audit Report */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Audit Report Generator</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Draft a complete internal audit report from your fieldwork findings. Upload your Excel findings file and Verifai writes the full CCCE narrative.
                    </p>
                    <ol className="space-y-3">
                      {[
                        {
                          step: 'Switch to Audit Report mode',
                          desc: 'Select Generate Audit Report on the main form. Fill in engagement details: client name, department, audit period, and prepared by.',
                        },
                        {
                          step: 'Upload your findings file',
                          desc: 'Export your fieldwork findings from Excel and upload here. Verifai reads the finding descriptions, risk ratings, root causes, management responses, and due dates. Weak findings are flagged before you generate.',
                        },
                        {
                          step: 'Click Generate Report',
                          desc: 'Verifai drafts a complete report: cover page, executive summary, scope and objectives, full CCCE findings (condition, criteria, cause, effect), and conclusion.',
                        },
                        {
                          step: 'Review in the tabbed view',
                          desc: 'Each finding gets its own tab. Edit any field inline — condition, criteria, cause, effect, recommendation, management response. Vague management responses are flagged in amber.',
                        },
                        {
                          step: 'Export to Word',
                          desc: 'Download a formatted .docx report ready to share. Includes AI disclosure footer.',
                        },
                      ].map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                          <div>
                            <p className="font-medium text-gray-900">{item.step}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                </div>
              )}

              {activeTab === 'featureslist' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Audit Program Generator</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: 'AI-generated audit program', desc: 'Generates objectives, risks, controls, and procedures tailored to your industry. Usually done in under 15 seconds.' },
                        { label: 'IIA IPPF & COSO ERM references', desc: 'Every risk and control is tagged with the relevant framework reference.' },
                        { label: 'Risk-control linkage', desc: 'Controls are explicitly mapped to the risks they mitigate with full traceability.' },
                        { label: 'Three-phase audit program structure', desc: 'Phase 1: Risk Assessment. Phase 2: Test of Controls (with control-linked analytics). Phase 3: Substantive Analytics (population-level tests).' },
                        { label: 'Client context enrichment', desc: 'Paste walkthrough notes or interview observations. AI elevates risks with evidence, flags control gaps, and adds client-specific annotations. Import RMGA findings directly.' },
                        { label: 'Analytics tests library', desc: '35 curated substantive analytics tests across all processes, auto-mapped to relevant risks.' },
                        { label: 'Engagement details', desc: 'Capture client name, department, period, reference, and auditor. All stamped on every export.' },
                        { label: 'Full inline edit mode', desc: 'Edit any AI-generated content: add, remove, or rewrite risks, controls, and procedures.' },
                        { label: 'Excel export', desc: 'Multi-tab workbook: Audit Program, Analytics Tests, and Control Matrix.' },
                      ].map((f, i) => (
                        <div key={i} className="flex gap-3 py-2 border-b border-gray-50">
                          <span className="text-indigo-500 shrink-0 mt-0.5">✓</span>
                          <div>
                            <p className="font-medium text-gray-900">{f.label}</p>
                            <p className="text-gray-500 text-xs">{f.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Data Analytics Execution</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: 'In-app analytics execution', desc: 'Upload a CSV or XLSX (max 4.5 MB) in Phase 3 and run 5 pre-built tests — no Excel formulas required.' },
                        { label: 'Smart column mapping', desc: 'Fuzzy pre-fill matches your file\'s column headers to what each test needs. Confirm or adjust before running.' },
                        { label: 'Duplicate invoice detection (RC-001, PP-002)', desc: 'Finds invoice numbers appearing more than once on the revenue and AP sides.' },
                        { label: 'Duplicate bank account detection (HR-002)', desc: 'Flags two employees sharing the same bank account — a ghost employee indicator.' },
                        { label: 'Negative inventory (INV-001)', desc: 'Surfaces items with quantity below zero — timing or recording errors.' },
                        { label: 'Privileged access review (IT-003)', desc: 'Lists all users with Admin or Super User access level.' },
                        { label: 'Audit Work Done + Conclusion fields', desc: 'Document observations and interviews directly against each test result. Exports to working paper.' },
                        { label: 'Raise as Finding', desc: 'One click pre-populates an audit finding in the Report tab — ref, description, risk rating, and root cause from your work done notes.' },
                        { label: '3-tab working paper export', desc: 'Raw Data · Exceptions · Working paper tab named after the test ID with methodology for manual reperformance.' },
                      ].map((f, i) => (
                        <div key={i} className="flex gap-3 py-2 border-b border-gray-50">
                          <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                          <div>
                            <p className="font-medium text-gray-900">{f.label}</p>
                            <p className="text-gray-500 text-xs">{f.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Audit Report Generator</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: 'Excel findings upload', desc: 'Upload your fieldwork findings file. Verifai parses finding descriptions, risk ratings, root causes, management responses, and due dates.' },
                        { label: 'Finding quality hints', desc: 'Weak or incomplete findings are flagged before generation so you can fix them first.' },
                        { label: 'Full CCCE report draft', desc: 'AI writes condition, criteria, cause, and effect for every finding in formal audit report language.' },
                        { label: 'Tabbed findings review', desc: 'Each finding gets its own tab. Edit any field inline before exporting.' },
                        { label: 'Management response QC flags', desc: 'Vague responses ("will monitor", no action owner, no due date) are flagged in amber.' },
                        { label: 'Word export (.docx)', desc: 'Formatted report ready to share, with AI disclosure footer.' },
                      ].map((f, i) => (
                        <div key={i} className="flex gap-3 py-2 border-b border-gray-50">
                          <span className="text-rose-500 shrink-0 mt-0.5">✓</span>
                          <div>
                            <p className="font-medium text-gray-900">{f.label}</p>
                            <p className="text-gray-500 text-xs">{f.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Risk Management & Governance Assessment (RMGA)</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: 'Entity-level governance working paper', desc: 'Covers Risk Management Framework, Control Environment & Risk Culture, Training & Awareness, and Risk Reporting & Oversight.' },
                        { label: 'Walkthrough steps & documents to obtain', desc: 'Specific steps the auditor performs and a list of documents to request, broken out per area.' },
                        { label: 'Inquiry questions with purpose notes', desc: 'Structured questions for management, each with a note explaining why it matters.' },
                        { label: 'Red flags per area', desc: 'Governance-specific red flags to watch for during fieldwork.' },
                        { label: 'Fieldwork documentation', desc: 'Management Response and Auditor Assessment fields for every inquiry question.' },
                        { label: 'Per-area conclusions', desc: 'Write and save your conclusion for each governance area.' },
                        { label: 'On-demand Overall Assessment', desc: 'AI-synthesised maturity rating (Level 1 to 5) based on your completed working paper, or enter your own manually.' },
                        { label: 'Full inline edit mode', desc: 'Edit all AI-generated content: areas, questions, steps, and documents.' },
                        { label: 'Excel export', desc: '3-tab workbook: Summary, Working Paper, and Inquiry Responses.' },
                      ].map((f, i) => (
                        <div key={i} className="flex gap-3 py-2 border-b border-gray-50">
                          <span className="text-purple-500 shrink-0 mt-0.5">✓</span>
                          <div>
                            <p className="font-medium text-gray-900">{f.label}</p>
                            <p className="text-gray-500 text-xs">{f.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'coming' && (
                <div className="space-y-4">
                  <p className="text-gray-500">These features are in design or development. Your feedback shapes the priority.</p>
                  <div className="space-y-3">
                    {[
                      {
                        label: 'In-Session Audit Trail',
                        desc: 'Tracks every change made to the AI output within a session. Export includes a diff summary — showing what was modified, added, or removed — so reviewers can see the auditor engaged with the output.',
                        status: 'Next up',
                        color: 'bg-indigo-50 text-indigo-700',
                      },
                      {
                        label: 'Exit Meeting Talking Points',
                        desc: 'Generate a structured exit meeting agenda and key talking points from your report findings. Helps auditors lead the auditee discussion before the report is issued.',
                        status: 'Next up',
                        color: 'bg-indigo-50 text-indigo-700',
                      },
                      {
                        label: 'Document Enrichment',
                        desc: 'Upload RMGA working papers, policies, or SOPs to enrich audit program generation. AI compares documents against walkthrough notes and flags gaps between what is documented and what is actually happening.',
                        status: 'In design',
                        color: 'bg-blue-50 text-blue-700',
                      },
                      {
                        label: 'More Analytics Tests',
                        desc: 'Phase 2 tests: date thresholds, round-number analysis, split purchases below approval threshold, and multi-file joins (e.g. terminated employees vs payroll).',
                        status: 'Planned',
                        color: 'bg-gray-100 text-gray-600',
                      },
                      {
                        label: 'Process Walkthrough Documentation',
                        desc: 'Structured working paper to document process flows end-to-end: who initiates, what documents are needed, segregation of duties, controls, and GL posting.',
                        status: 'Planned',
                        color: 'bg-gray-100 text-gray-600',
                      },
                      {
                        label: 'Saved Engagements',
                        desc: 'Save and reload your audit programs and governance assessments across sessions. Prerequisite for finding trackers, cross-engagement patterns, and management accountability reports.',
                        status: 'Planned',
                        color: 'bg-gray-100 text-gray-600',
                      },
                      {
                        label: 'Team Collaboration',
                        desc: 'Share workpapers with your team, assign controls, and track review status.',
                        status: 'Future',
                        color: 'bg-gray-100 text-gray-500',
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{item.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.color}`}>{item.status}</span>
                          </div>
                          <p className="text-gray-500 text-xs">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Using Verifai during this beta phase? Your feedback directly influences what gets built next.
                  </p>
                </div>
              )}

              {activeTab === 'credits' && (
                <div className="space-y-5">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 text-center">
                    <p className="text-2xl mb-2">🧙</p>
                    <p className="font-bold text-gray-900 text-base">Azri Asyraf</p>
                    <p className="text-indigo-600 font-medium text-sm mt-0.5">
                      Audit Sorcerer · Prompt Whisperer · Absolutely Not a Developer
                    </p>
                    <p className="text-gray-500 text-xs mt-3">
                      Internal auditor who got tired of building the same working paper for the 400th time
                      and decided to make the computer do it instead.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-center">
                    <p className="text-2xl mb-2">🎯</p>
                    <p className="font-bold text-gray-900 text-base">Azira</p>
                    <p className="text-amber-600 font-medium text-sm mt-0.5">
                      Auditor-at-large · The One Who Actually Knows What She&apos;s Talking About
                    </p>
                    <p className="text-gray-500 text-xs mt-3">
                      Domain expert, quality control, and the reason this tool makes audit sense.
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-gray-500">
                    <p><span className="font-medium text-gray-700">Built with:</span> Next.js · React · Tailwind CSS · Groq API · SheetJS</p>
                    <p><span className="font-medium text-gray-700">Frameworks referenced:</span> IIA IPPF · COSO ERM · COSO Internal Control</p>
                    <p><span className="font-medium text-gray-700">Version:</span> Beta. Things change fast. If something breaks, that&apos;s a feature.</p>
                  </div>
                  <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                    Verifai is a personal project. It is not affiliated with the IIA or any professional body.
                    All AI-generated content should be reviewed and validated by a qualified auditor before use.
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </>
  );
}
