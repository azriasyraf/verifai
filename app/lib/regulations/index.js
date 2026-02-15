import { international } from './international.js';
import { malaysia } from './malaysia.js';

/**
 * Returns the regulations library relevant to a given process and jurisdiction.
 * International standards are always included.
 * Process matching is case-insensitive and partial (e.g. "HR" matches "Human Resources").
 *
 * @param {string} process - e.g. "Human Resources", "Procurement"
 * @param {string} jurisdiction - e.g. "Malaysia", "International"
 * @returns {Array} Array of regulation objects with { regulation, area, clauses }
 */
export function getRegulations(process, jurisdiction = 'International') {
  const normalised = (process || '').toLowerCase();

  function matches(applicableProcesses) {
    if (!applicableProcesses || applicableProcesses.includes('all')) return true;
    return applicableProcesses.some(p => normalised.includes(p.toLowerCase()) || p.toLowerCase().includes(normalised));
  }

  const intl = international.filter(r => matches(r.applicableProcesses));

  let local = [];
  if (jurisdiction === 'Malaysia') {
    local = malaysia.filter(r => matches(r.applicableProcesses));
  }

  return [...intl, ...local];
}

/**
 * Formats the regulations library into a compact prompt-injectable string.
 * Designed to be injected into the system prompt as reference context.
 *
 * @param {Array} regs - Output of getRegulations()
 * @returns {string}
 */
export function formatRegulationsForPrompt(regs) {
  if (!regs || regs.length === 0) return '';

  const lines = ['APPLICABLE REGULATIONS & STANDARDS (reference only — cite specific clauses in output):\n'];
  regs.forEach(r => {
    lines.push(`${r.regulation} — ${r.area}`);
    r.clauses.forEach(c => {
      lines.push(`  ${c.clause}: ${c.description}`);
    });
    lines.push('');
  });
  return lines.join('\n');
}
