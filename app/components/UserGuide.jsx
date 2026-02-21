'use client';

import { useState, useEffect } from 'react';

const BANNER_KEY = 'verifai_guide_dismissed';

export default function UserGuide() {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('features');

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_KEY);
    if (!dismissed) setBannerVisible(true);
  }, []);

  const dismissBanner = () => {
    localStorage.setItem(BANNER_KEY, '1');
    setBannerVisible(false);
  };

  const openGuide = () => {
    setActiveTab('features');
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
        suppressHydrationWarning
      >
        ⓘ Guide
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
                { id: 'features', label: '📖 How to Use' },
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

              {activeTab === 'features' && (
                <div className="space-y-6">

                  {/* Section jump nav */}
                  <div className="flex flex-wrap gap-2 pb-1">
                    {[
                      { id: 'guide-engagements', label: 'My Engagements', color: 'text-gray-600 bg-gray-100 hover:bg-gray-200' },
                      { id: 'guide-audit', label: 'Audit Program', color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
                      { id: 'guide-walkthrough', label: 'Walkthrough', color: 'text-teal-600 bg-teal-50 hover:bg-teal-100' },
                      { id: 'guide-rmga', label: 'RMGA', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
                      { id: 'guide-report', label: 'Audit Report', color: 'text-rose-600 bg-rose-50 hover:bg-rose-100' },
                    ].map(({ id, label, color }) => (
                      <button
                        key={id}
                        onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${color}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* My Engagements */}
                  <div id="guide-engagements">
                    <h3 className="font-semibold text-gray-900 mb-1">My Engagements</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Working papers are saved automatically to your account. You never need to export to preserve your work.
                    </p>
                    <ol className="space-y-3">
                      {[
                        {
                          step: 'Saving is automatic',
                          desc: 'Verifai saves every time you generate. Edits are debounced — two seconds after you stop typing, your changes are saved. No save button.',
                        },
                        {
                          step: 'Access past engagements',
                          desc: 'Click My Engagements in the top nav at any time to go to your dashboard. All your engagements are listed there, sorted by last updated.',
                        },
                        {
                          step: 'Open a saved working paper',
                          desc: 'Click an engagement card to see its documents. Click Open on any working paper to load it exactly where you left it.',
                        },
                        {
                          step: 'Generate a missing document from the engagement view',
                          desc: 'If a working paper has not been generated yet, its card shows a Generate button. Click it and the form opens with your engagement details pre-filled — just select your mode and generate.',
                        },
                        {
                          step: 'Delete an engagement',
                          desc: 'Open the engagement page and scroll to the bottom. Click Delete this engagement. This permanently removes all working papers for that engagement.',
                        },
                      ].map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                          <div>
                            <p className="font-medium text-gray-900">{item.step}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Audit Program */}
                  <div id="guide-audit">
                    <h3 className="font-semibold text-gray-900 mb-3">Audit Program Generator</h3>
                    <ol className="space-y-3">
                      {[
                        {
                          step: 'Fill in engagement details (optional)',
                          desc: 'Enter client name, department, audit period, engagement reference, and auditor name. These get stamped on every export. You can skip this and fill it in later.',
                        },
                        {
                          step: 'Select your industry and process',
                          desc: 'Choose the industry and the process you are auditing: Procure-to-Pay, Order-to-Cash, Record-to-Report, Hire-to-Retire, Inventory-to-Manufacture, Capital-to-Retire, Treasury & Cash Management, or IT General Controls.',
                        },
                        {
                          step: 'Select your jurisdiction (optional)',
                          desc: 'Choose International for COSO 2013 and IIA IPPF references, or Malaysia to layer in process-specific statutory requirements (Employment Act, EPF, SOCSO, MACC, ITA, PDPA). Citation chips appear on each risk and control in the output.',
                        },
                        {
                          step: 'Enrich with client documents (optional)',
                          desc: 'Upload client documents using the Enrich with client context panel. Supported types: Policies & Procedures, Prior Audit Report, RMGA Assessment, or Walkthrough Working Paper. Verifai reads each file in context for its document type. Upload both a P&P and Walkthrough Working Paper and Verifai automatically cross-references them for gaps. Supports PDF, Word (.docx), Excel, and plain text. 8,000 character cap per document.',
                        },
                        {
                          step: 'Generate',
                          desc: 'Verifai builds an audit program covering three sections: Risk Assessment, Test of Controls, and Data Analytics. Takes about 10 to 15 seconds.',
                        },
                        {
                          step: 'Review and edit',
                          desc: 'Click Edit Program to adjust anything. Add or remove risks, controls, and procedures, or rewrite descriptions. The output is a starting point, not a final answer.',
                        },
                        {
                          step: 'Generate a kick-off agenda (optional)',
                          desc: 'Click Generate Kick-off Agenda after reviewing the program. Verifai produces a structured meeting agenda from the program content, with guidance notes for each item. Copy to clipboard in one click.',
                        },
                        {
                          step: 'Review the analytics test plan (optional)',
                          desc: 'Scroll to the Data Analytics section to see the analytics tests Verifai has mapped to your risks. Toggle any test off if it is not applicable, or reassign it to a different risk.',
                        },
                        {
                          step: 'Run tests against your client data (optional)',
                          desc: 'Upload a CSV or XLSX data file at the top of Phase 3. For tests that can run directly, a Run Test button will appear. A quick column-matching step confirms which column is which, then results appear inline.',
                        },
                        {
                          step: 'Document what you found (optional)',
                          desc: 'For each result, write up what you did — who you spoke to, what they said, what you concluded. If something needs to become a finding, one click sends it to the Report tab with the details pre-filled.',
                        },
                        {
                          step: 'Export your working paper (optional)',
                          desc: 'Export a working paper per test. It includes the raw data, the exceptions, and a methodology section so any reviewer can reperform the work manually.',
                        },
                        {
                          step: 'Export the full audit program',
                          desc: 'Download a multi-tab workbook: a Summary tab with the full program, and one tab per control — each pre-populated with a fieldwork sample table.',
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
                  <div id="guide-rmga">
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

                  {/* Process Walkthrough */}
                  <div id="guide-walkthrough">
                    <h3 className="font-semibold text-gray-900 mb-1">Process Walkthrough Working Paper</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Document walkthrough interviews checkpoint by checkpoint. Assess control design adequacy before testing begins. Export to Excel or flow directly into an audit program.
                    </p>
                    <ol className="space-y-3">
                      {[
                        {
                          step: 'Switch to Process Walkthrough mode',
                          desc: 'Select Process Walkthrough on the main form. Choose your industry and process.',
                        },
                        {
                          step: 'Generate the working paper template',
                          desc: 'Verifai generates checkpoints for your process — each with an expected control state, design considerations, and suggested interview questions.',
                        },
                        {
                          step: 'Work through each checkpoint during the interview',
                          desc: 'For each checkpoint, record what was described by management or staff. Expand the Interview Guidance section for suggested questions to ask.',
                        },
                        {
                          step: 'Rate design adequacy',
                          desc: 'Set the design adequacy for each checkpoint: Adequate, Partially Adequate, Inadequate, or Not Assessed. The badge on each card updates instantly.',
                        },
                        {
                          step: 'Add freeform notes and an overall conclusion',
                          desc: 'Use the Additional Notes section for anything that doesn\'t fit a specific checkpoint. Write your overall conclusion at the bottom.',
                        },
                        {
                          step: 'Share with the auditee before testing',
                          desc: 'Best practice: share the notes with the auditee to confirm your understanding is correct before proceeding to testing.',
                        },
                        {
                          step: 'Export to Excel or generate an audit program',
                          desc: 'Export a 3-tab workbook (Summary, Walkthrough, Freeform Notes). Or click Generate Audit Program from This Walkthrough — Verifai formats your observations as client context and pre-populates the audit program form.',
                        },
                      ].map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
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
                  <div id="guide-report">
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
                          step: 'Review and improve recommendations (optional)',
                          desc: 'Before generating, click Generate Recommendations. For each finding, Verifai generates a recommendation from scratch or polishes the one you uploaded. Two panels appear side by side — your version and the AI suggestion — each with a Use this version button. Select the one you want to start from, then edit freely. You can skip this step entirely.',
                        },
                        {
                          step: 'Click Generate Report',
                          desc: 'Verifai drafts a complete report: cover page, executive summary, scope and objectives, full CCCE findings (condition, criteria, cause, effect), and conclusion.',
                        },
                        {
                          step: 'Review in the tabbed view',
                          desc: 'Each finding gets its own tab. Edit any field inline — condition, criteria, cause, effect, recommendation, management response. Vague management responses are flagged in amber. Use Discard Changes at any point to revert all edits back to the AI original.',
                        },
                        {
                          step: 'Export to Word',
                          desc: 'Download a formatted .docx report ready to share. If QC issues remain, a pre-flight check lists affected findings before the Word file is generated. Includes AI disclosure footer.',
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
