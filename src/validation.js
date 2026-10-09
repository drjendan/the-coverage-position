export const STATUSES = ['New', 'Needs Information', 'Archived'];
export const limits = { claim_number: 80, title: 180, insured: 180, claimant: 180, jurisdiction: 80, analyst: 120, reviewer: 120, recipient: 180, incident_date: 10, notes: 5000 };
export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function validateMatter(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError(400, 'A matter object is required.');
  const result = {};
  for (const [key, max] of Object.entries(limits)) {
    if (input[key] !== undefined && typeof input[key] !== 'string') throw new AppError(400, `${key} must be text.`);
    result[key] = (input[key] ?? '').trim();
    if (result[key].length > max) throw new AppError(400, `${key} exceeds ${max} characters.`);
  }
  for (const key of ['claim_number', 'title', 'insured', 'jurisdiction']) if (!result[key]) throw new AppError(400, `${key.replaceAll('_', ' ')} is required.`);
  if (result.incident_date) {
    const value = result.incident_date;
    const date = new Date(`${value}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== value) throw new AppError(400, 'Use a valid incident date.');
  }
  result.status = input.status ?? 'New';
  if (!STATUSES.includes(result.status)) throw new AppError(400, 'That status is not available in this milestone.');
  return result;
}

