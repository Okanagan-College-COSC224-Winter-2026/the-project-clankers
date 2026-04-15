/**
 * Parse an ISO date string, treating bare strings (no timezone suffix) as UTC.
 * SQLite can strip timezone info so the backend may return "2026-04-15T03:55:00"
 * instead of "2026-04-15T03:55:00+00:00". Without this, `new Date()` interprets
 * bare ISO strings as local time, shifting the displayed time by the user's offset.
 */
export function parseUTC(iso: string): Date {
  if (!iso.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(iso)) {
    return new Date(iso + 'Z');
  }
  return new Date(iso);
}
