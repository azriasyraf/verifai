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
                { id: 'features', label: '✅ Features' },
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
                      <span className="font-medium">Llama 3.3 70B</span> — a large language model
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
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Audit Program Generator</h3>
                    <ul className="space-y-1.5 list-none">
                      {[
                        'Generate full audit programs in under 15 seconds — 4 industries × 5 processes',
                        'Risk & control mapping with IIA IPPF and COSO ERM framework references',
                        'Analytics tests library — 35 tests across all processes, auto-mapped to risks',
                        'Engagement details capture (client, period, auditor, reference)',
                        'Full edit mode — customise all AI-generated content inline',
                        'Excel export — multi-tab workbook (Program, Analytics, Controls)',
                      ].map((f, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Risk & Governance Assessment (RMGA)</h3>
                    <ul className="space-y-1.5 list-none">
                      {[
                        'Entity-level governance working paper (GA001–GA004)',
                        'Four assessment areas: Risk Management Framework, Control Environment & Risk Culture, Training & Awareness, Risk Reporting & Oversight',
                        'Walkthrough steps, documents to obtain, inquiry questions with purpose notes, red flags — all per area',
                        'Management response + auditor assessment fields for each inquiry question',
                        'Per-area conclusions and full edit mode',
                        'On-demand Overall Assessment — AI-generated maturity rating (L1–L5) or manual input',
                        'Excel export — 3 tabs (Summary, Working Paper, Inquiry Responses)',
                      ].map((f, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'coming' && (
                <div className="space-y-4">
                  <p className="text-gray-500">These features are in design or development. Your feedback shapes the priority.</p>
                  <div className="space-y-3">
                    {[
                      {
                        label: 'Data Analytics Execution',
                        desc: 'Upload client data (Excel/CSV) and run analytics tests directly in the app — Verifai surfaces anomalies and flags findings.',
                        status: 'In design',
                        color: 'bg-blue-50 text-blue-700',
                      },
                      {
                        label: 'Process Walkthrough Documentation',
                        desc: 'Structured working paper to document process flows end-to-end — who initiates, documents needed, segregation of duties, controls, GL posting.',
                        status: 'Planned',
                        color: 'bg-gray-100 text-gray-600',
                      },
                      {
                        label: 'Policy & Procedure Upload',
                        desc: 'Upload your SOPs and policies — the audit engine reads them and recommends risks, controls, and tests automatically.',
                        status: 'Planned',
                        color: 'bg-gray-100 text-gray-600',
                      },
                      {
                        label: 'Saved Engagements',
                        desc: 'Save and reload your audit programs and governance assessments across sessions.',
                        status: 'Planned',
                        color: 'bg-gray-100 text-gray-600',
                      },
                      {
                        label: 'Team Collaboration',
                        desc: 'Share workpapers with your team, assign controls, track review status.',
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
                    Drop a note to <span className="font-medium text-gray-600">azriasyraf@gmail.com</span>
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
                      CIA · Internal auditor who got tired of building the same working paper for the 400th time
                      and decided to make the computer do it instead.
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-gray-500">
                    <p><span className="font-medium text-gray-700">Built with:</span> Next.js · React · Tailwind CSS · Groq API · SheetJS</p>
                    <p><span className="font-medium text-gray-700">Frameworks referenced:</span> IIA IPPF · COSO ERM · COSO Internal Control</p>
                    <p><span className="font-medium text-gray-700">Version:</span> Beta — things change fast. If something breaks, that&apos;s a feature.</p>
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
