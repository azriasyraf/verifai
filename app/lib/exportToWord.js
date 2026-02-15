import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, PageBreak, ShadingType
} from 'docx';

const COLORS = {
  high: 'C0392B',
  medium: 'E67E22',
  low: '27AE60',
  headerBg: '1E3A5F',
  headerText: 'FFFFFF',
  lightGray: 'F5F5F5',
  border: 'CCCCCC',
};

function ratingColor(rating) {
  if (!rating) return COLORS.medium;
  const r = rating.toLowerCase();
  if (r === 'high') return COLORS.high;
  if (r === 'low') return COLORS.low;
  return COLORS.medium;
}

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function heading2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function body(text) {
  return new Paragraph({
    children: [new TextRun({ text: text || '', size: 22 })],
    spacing: { before: 80, after: 80 },
  });
}

function labelValue(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value || '', size: 22 }),
    ],
    spacing: { before: 60, after: 60 },
  });
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.border } },
    spacing: { before: 200, after: 200 },
  });
}

function findingBlock(finding, index) {
  const color = ratingColor(finding.riskRating);
  const paras = [];

  // Finding header — page break before every finding except the first
  paras.push(new Paragraph({
    children: [
      new TextRun({ text: `${finding.ref || `F${String(index + 1).padStart(3, '0')}`}  `, bold: true, size: 26, color: '1E3A5F' }),
      new TextRun({ text: finding.title || 'Untitled Finding', bold: true, size: 26 }),
    ],
    spacing: { before: index === 0 ? 300 : 0, after: 100 },
    pageBreakBefore: index > 0,
  }));

  // Risk rating badge
  paras.push(new Paragraph({
    children: [
      new TextRun({ text: 'Risk Rating: ', bold: true, size: 22 }),
      new TextRun({ text: finding.riskRating || 'Medium', bold: true, size: 22, color: color }),
    ],
    spacing: { before: 60, after: 120 },
  }));

  // CCCE table
  const rows = [
    ['Condition', finding.condition],
    ['Criteria', finding.criteria],
    ['Cause', finding.cause],
    ['Effect', finding.effect],
    ['Recommendation', finding.recommendation],
    ['Management Response', finding.managementResponse],
    ['Action Owner', finding.actionOwner],
    ['Due Date', finding.dueDate],
    ['Status', finding.status || 'Open'],
  ];

  const tableRows = rows.map(([label, value]) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 20 })],
          })],
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLORS.lightGray },
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: value || '', size: 20 })],
          })],
          width: { size: 80, type: WidthType.PERCENTAGE },
        }),
      ],
    })
  );

  paras.push(new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  }));

  paras.push(divider());
  return paras;
}

export async function exportToWord(report) {
  if (!report) return;

  const cover = report.coverPage || {};
  const scope = report.scopeAndObjectives || {};
  const findings = report.findings || [];

  const sections = [];

  // COVER PAGE
  sections.push(new Paragraph({
    children: [new TextRun({ text: cover.title || 'Internal Audit Report', bold: true, size: 52, color: '1E3A5F' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 400 },
  }));

  const coverFields = [
    ['Client', cover.client],
    ['Department', cover.department],
    ['Audit Period', cover.auditPeriod],
    ['Engagement Reference', cover.engagementRef],
    ['Prepared By', cover.preparedBy],
    ['Report Date', cover.reportDate],
  ];
  coverFields.forEach(([l, v]) => sections.push(labelValue(l, v)));

  sections.push(new Paragraph({ children: [new PageBreak()] }));

  // EXECUTIVE SUMMARY
  sections.push(heading1('Executive Summary'));
  sections.push(divider());
  (report.executiveSummary || '').split('\n').filter(Boolean).forEach(p => sections.push(body(p)));

  sections.push(new Paragraph({ children: [new PageBreak()] }));

  // SCOPE AND OBJECTIVES
  sections.push(heading1('Scope and Objectives'));
  sections.push(divider());

  if (scope.objectives?.length) {
    sections.push(heading2('Audit Objectives'));
    scope.objectives.forEach((obj, i) => {
      sections.push(new Paragraph({
        children: [new TextRun({ text: `${i + 1}.  ${obj}`, size: 22 })],
        spacing: { before: 60, after: 60 },
      }));
    });
  }

  if (scope.scope) {
    sections.push(heading2('Scope'));
    sections.push(body(scope.scope));
  }

  if (scope.methodology) {
    sections.push(heading2('Methodology'));
    sections.push(body(scope.methodology));
  }

  sections.push(new Paragraph({ children: [new PageBreak()] }));

  // FINDINGS
  sections.push(heading1(`Findings (${findings.length})`));
  sections.push(divider());

  findings.forEach((finding, i) => {
    findingBlock(finding, i).forEach(p => sections.push(p));
  });

  // CONCLUSION
  sections.push(new Paragraph({ children: [new PageBreak()] }));
  sections.push(heading1('Overall Conclusion'));
  sections.push(divider());
  sections.push(body(report.conclusion || ''));

  // AI DISCLOSURE
  sections.push(new Paragraph({ spacing: { before: 600 } }));
  sections.push(new Paragraph({
    children: [new TextRun({
      text: 'Prepared with AI assistance using Verifai. All AI-generated content has been reviewed and approved by the engagement team prior to issue.',
      size: 18,
      color: '999999',
      italics: true,
    })],
    alignment: AlignmentType.CENTER,
  }));

  // Build document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1200 },
        },
      },
      children: sections,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const client = report.coverPage?.client ? `${report.coverPage.client}_` : '';
  const date = new Date().toISOString().split('T')[0];
  a.download = `AuditReport_${client}${date}.docx`.replace(/[^a-zA-Z0-9_.-]/g, '_');
  a.click();
  URL.revokeObjectURL(url);
}
