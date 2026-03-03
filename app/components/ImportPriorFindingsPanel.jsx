'use client';

import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import FindingsStagingList from './FindingsStagingList';

const normaliseRating = (raw) => {
  const r = String(raw || '').trim().toLowerCase();
  if (['high', 'critical', 'very high', 'severe'].includes(r)) return 'High';
  if (['medium', 'moderate', 'significant', 'med'].includes(r)) return 'Medium';
  if (['low', 'minor', 'info', 'informational', 'low risk'].includes(r)) return 'Low';
  return 'Medium';
};

export default function ImportPriorFindingsPanel({
  engagementId,
  clientName,
  clientGroup,
  process,
  onComplete,
  onCancel,
}) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedFindings, setParsedFindings] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [stagedFindings, setStagedFindings] = useState([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const fileInputRef = useRef(null);

  // Auto-classify + repeat-check when parsed findings change
  useEffect(() => {
    if (!parsedFindings?.length) { setStagedFindings([]); return; }

    const run = async () => {
      setIsClassifying(true);
      setClassifyError(null);
      try {
        const classifyRes = await fetch('/api/findings/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ findings: parsedFindings, process }),
        });
        const classifyData = await classifyRes.json();
        if (!classifyData.success) throw new Error(classifyData.error);

        const classMap = {};
        for (const c of classifyData.data) { classMap[c.ref] = c; }

        const classified = parsedFindings.map(f => ({
          ...f,
          control_category: classMap[f.ref]?.control_category || null,
          regulatory_refs: classMap[f.ref]?.regulatory_refs || [],
        }));

        const repeatRes = await fetch('/api/findings/repeat-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: clientName || '',
            client_group: clientGroup || null,
            process: process || '',
            engagement_id: engagementId || null,
            findings: classified.map(f => ({ ref: f.ref, control_category: f.control_category })),
          }),
        });
        const repeatData = await repeatRes.json();
        const badgeMap = repeatData.success ? repeatData.data : {};

        setStagedFindings(classified.map(f => ({
          ...f,
          badges: badgeMap[f.ref]?.badges || [],
          badgeSummary: badgeMap[f.ref]?.badgeSummary || {},
        })));
      } catch {
        setClassifyError('Classification failed — categories set to Unclassified. You can still import.');
        setStagedFindings(parsedFindings.map(f => ({
          ...f, control_category: null, regulatory_refs: [], badges: [], badgeSummary: {},
        })));
      } finally {
        setIsClassifying(false);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedFindings]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParseError(null);
    setParsedFindings(null);
    setStagedFindings([]);
    setClassifyError(null);
    setSaveError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'array' });

        // Try "Findings Summary" tab first (Verifai workbook), then first sheet
        const sheetName = workbook.SheetNames.includes('Findings Summary')
          ? 'Findings Summary'
          : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) { setParseError('Could not read the Excel file. No sheets found.'); return; }

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Find header row dynamically
        const headerRowIndex = rows.findIndex(row =>
          row.some(cell => String(cell || '').trim().toLowerCase() === 'finding description')
        );
        if (headerRowIndex === -1) {
          setParseError('Could not find a "Finding Description" header column. Ensure your file has a column named "Finding Description".');
          return;
        }

        const headerRow = rows[headerRowIndex];
        const colMap = {};
        headerRow.forEach((cell, idx) => { colMap[String(cell || '').trim().toLowerCase()] = idx; });

        const dataRows = rows.slice(headerRowIndex + 1).filter(row =>
          row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
        );

        if (dataRows.length === 0) {
          setParseError('No findings found in the file. Ensure rows are filled in below the header row.');
          return;
        }

        const findings = dataRows
          .map((row, i) => ({
            ref: String(row[colMap['finding #'] ?? colMap['ref'] ?? colMap['finding ref'] ?? 0] || `F${String(i + 1).padStart(3, '0')}`),
            controlId: String(row[colMap['control id'] ?? 1] || ''),
            riskId: String(row[colMap['risk id'] ?? 2] || ''),
            findingDescription: String(row[colMap['finding description'] ?? 3] || ''),
            riskRating: normaliseRating(row[colMap['risk rating'] ?? 4]),
            rootCause: String(row[colMap['root cause'] ?? 5] || ''),
            recommendation: String(row[colMap['recommendation'] ?? 6] || ''),
          }))
          .filter(f => f.findingDescription.trim());

        if (!findings.length) {
          setParseError('No findings with a Finding Description were found. Fill in the description column and try again.');
          return;
        }

        setUploadedFile(file.name);
        setParsedFindings(findings);
      } catch {
        setParseError('Failed to read the file. Please ensure it is a valid Excel workbook (.xlsx or .xls).');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCategoryChange = (ref, category) => {
    setStagedFindings(prev => prev.map(f => f.ref === ref ? { ...f, control_category: category || null } : f));
  };

  const handleRemove = (ref) => {
    setStagedFindings(prev => prev.filter(f => f.ref !== ref));
  };

  const handleConfirmImport = async () => {
    if (!stagedFindings.length || !engagementId) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/findings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'historical_import',
          findings: stagedFindings.map(f => ({
            ...f,
            process: process || null,
            source: 'historical_import',
          })),
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Import failed');
      onComplete(result.data.length);
    } catch (err) {
      setSaveError(err.message || 'Import failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const canImport = stagedFindings.length > 0 && !isClassifying && !isSaving;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Import Prior Findings</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload findings from a prior audit Excel workbook. These will be used for repeat pattern detection in future engagements.
          </p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 shrink-0 ml-4">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* File upload */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          uploadedFile ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileUpload}
        />
        {uploadedFile ? (
          <>
            <p className="text-sm font-semibold text-green-700">{uploadedFile}</p>
            <p className="text-xs text-green-600 mt-1">
              {parsedFindings?.length || 0} finding{parsedFindings?.length !== 1 ? 's' : ''} parsed. Click to replace.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-600">Click to upload a prior audit workbook</p>
            <p className="text-xs text-gray-500 mt-1">
              .xlsx/.xls · Must have a "Finding Description" column. Verifai workbooks and standard formats supported.
            </p>
          </>
        )}
      </div>

      {parseError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{parseError}</p>
      )}

      {/* Staging list */}
      {(isClassifying || stagedFindings.length > 0) && (
        <div>
          {classifyError && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">{classifyError}</p>
          )}
          <FindingsStagingList
            findings={stagedFindings}
            isClassifying={isClassifying}
            onCategoryChange={handleCategoryChange}
            onRemove={handleRemove}
          />
        </div>
      )}

      {/* Source note */}
      {stagedFindings.length > 0 && !isClassifying && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">Historical reference data</span> — these findings will be stored as prior engagement history for <span className="font-semibold">{clientName || 'this client'}</span>. They will not appear in this engagement's report but will inform repeat detection for future audits.
          </p>
        </div>
      )}

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{saveError}</p>
      )}

      {/* Actions */}
      {(uploadedFile || stagedFindings.length > 0) && (
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!canImport}
            className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
              canImport
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Importing…' : `Confirm Import (${stagedFindings.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
