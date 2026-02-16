/**
 * Single source of truth for process cycle definitions.
 * Used by API routes, components, and export utilities.
 *
 * Internal keys must stay stable — they are used by the regulations library
 * (getRegulations) and as state identifiers throughout the app.
 */

export const PROCESSES = [
  { id: 'procurement', name: 'Procure-to-Pay (P2P)' },
  { id: 'revenue',     name: 'Order-to-Cash (O2C)' },
  { id: 'r2r',         name: 'Record-to-Report (R2R)' },
  { id: 'hr',          name: 'Hire-to-Retire (H2R)' },
  { id: 'inventory',   name: 'Inventory-to-Manufacture (I2M)' },
  { id: 'c2r',         name: 'Capital-to-Retire (C2R)' },
  { id: 'treasury',    name: 'Treasury & Cash Management' },
  { id: 'it',          name: 'IT General Controls (ITGC)' },
];

/** Returns the display label for a process id, or the id itself if not found. */
export function getProcessLabel(id) {
  return PROCESSES.find(p => p.id === id)?.name ?? id;
}
