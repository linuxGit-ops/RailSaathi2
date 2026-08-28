/**
 * ai-agent.ts — Goal Parser + Decision Log (§14)
 * Parses natural language travel goals into structured fields.
 * "The AI manages the journey; never writes to DB directly; never
 *  authorizes payment without human-present step."
 *
 * For the demo, uses keyword/regex parsing — clearly labeled "AI parsing".
 */

import { appendAuditEntry } from './audit-log';
import { STATIONS } from './train-data';

export interface TravelGoal {
  fromCode: string;
  fromName: string;
  toCode: string;
  toName: string;
  dateRange: string[];   // ['YYYY-MM-DD', ...]
  classCode: string;
  passengers: number;
  fulfillmentMode: 'ALL_OR_NOTHING' | 'PARTIAL_WITH_CONSENT';
  rawInput: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: string[];
}

// --- City/station aliases for NL parsing ---
const CITY_ALIASES: Record<string, string> = {
  'howrah': 'HWH', 'kolkata': 'HWH', 'calcutta': 'HWH',
  'new delhi': 'NDLS', 'delhi': 'NDLS', 'nzm': 'NDLS',
  'kanpur': 'CNB',
  'prayagraj': 'PRYJ', 'allahabad': 'PRYJ',
  'varanasi': 'MGS', 'mughal sarai': 'MGS',
  'dehradun': 'DDN',
  'chandigarh': 'CDG',
  'bhopal': 'BPL',
  'chennai': 'MAS', 'madras': 'MAS',
  'mumbai': 'BCT', 'bombay': 'BCT',
};

const CLASS_ALIASES: Record<string, string> = {
  'first ac': '1A', '1a': '1A', 'ac first': '1A',
  'second ac': '2A', '2a': '2A', 'ac 2 tier': '2A', '2 tier': '2A',
  'third ac': '3A', '3a': '3A', 'ac 3 tier': '3A', '3 tier': '3A',
  'sleeper': 'SL', 'sl': 'SL',
  'chair car': 'CC', 'cc': 'CC',
  'executive': 'EC', 'ec': 'EC',
};

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse a natural language travel goal (§14) */
export async function parseGoal(input: string, bookingAttemptId: string): Promise<TravelGoal> {
  // Try remote AI serverless API if available
  try {
    const res = await fetch('/api/parse-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, bookingAttemptId }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const goal: TravelGoal = {
          fromCode: d.fromCode || 'HWH',
          fromName: d.fromName || STATIONS[d.fromCode]?.name || d.fromCode,
          toCode: d.toCode || 'NDLS',
          toName: d.toName || STATIONS[d.toCode]?.name || d.toCode,
          dateRange: Array.isArray(d.dateRange) && d.dateRange.length > 0 ? d.dateRange : parseDateRange(input),
          classCode: d.classCode || '2A',
          passengers: Number(d.passengers) || 1,
          fulfillmentMode: d.fulfillmentMode || 'ALL_OR_NOTHING',
          rawInput: input,
          confidence: d.confidence || 'HIGH',
          warnings: d.warnings || [],
        };

        appendAuditEntry(bookingAttemptId, 'ai_agent', 'goal_parsed',
          `Goal parsed via ${json.modelUsed || 'AI LLM'} with ${goal.confidence} confidence: ${goal.fromCode} → ${goal.toCode}, ${goal.classCode}, ${goal.passengers} pax`,
          { goal, model: json.modelUsed }
        );

        return goal;
      }
    }
  } catch (err) {
    console.warn('AI endpoint unavailable, using local parsing fallback:', err);
  }

  // Fallback to local deterministic parser
  return parseGoalLocal(input, bookingAttemptId);
}

export function parseGoalLocal(input: string, bookingAttemptId: string): TravelGoal {
  const lower = input.toLowerCase().trim();
  const warnings: string[] = [];

  // --- Parse stations ---
  let fromCode = '';
  let toCode = '';
  const arrowMatch = lower.match(/(.+?)\s*(?:to|→|->)\s*(.+?)(?:\s|,|$)/);
  if (arrowMatch) {
    fromCode = resolveStation(arrowMatch[1].trim());
    toCode   = resolveStation(arrowMatch[2].trim());
  }

  if (!fromCode) { fromCode = 'HWH'; warnings.push('Could not detect origin — defaulting to Howrah.'); }
  if (!toCode)   { toCode = 'NDLS'; warnings.push('Could not detect destination — defaulting to New Delhi.'); }

  // --- Parse class ---
  let classCode = '2A'; // default
  for (const [alias, code] of Object.entries(CLASS_ALIASES)) {
    if (lower.includes(alias)) { classCode = code; break; }
  }

  // --- Parse passengers ---
  const paxMatch = lower.match(/(\d+)\s*(?:passenger|pax|person|ticket|adult)/);
  const passengers = paxMatch ? Math.min(6, parseInt(paxMatch[1])) : 1;

  // --- Parse date range ---
  const dateRange = parseDateRange(lower);
  if (dateRange.length === 0) {
    // Default: next 3 days from today
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i + 1);
      dateRange.push(formatDate(d));
    }
    warnings.push('No date found — defaulting to next 3 days.');
  }

  const confidence: 'HIGH' | 'MEDIUM' | 'LOW' =
    warnings.length === 0 ? 'HIGH' : warnings.length === 1 ? 'MEDIUM' : 'LOW';

  const goal: TravelGoal = {
    fromCode,
    fromName: STATIONS[fromCode]?.name ?? fromCode,
    toCode,
    toName: STATIONS[toCode]?.name ?? toCode,
    dateRange,
    classCode,
    passengers,
    fulfillmentMode: passengers > 1 ? 'ALL_OR_NOTHING' : 'ALL_OR_NOTHING',
    rawInput: input,
    confidence,
    warnings,
  };

  appendAuditEntry(bookingAttemptId, 'ai_agent', 'goal_parsed',
    `Goal parsed with ${confidence} confidence: ${fromCode} → ${toCode}, ${classCode}, ${passengers} pax, dates: ${dateRange.join(', ')}`,
    { goal, warnings }
  );

  return goal;
}

function resolveStation(text: string): string {
  const lower = text.toLowerCase().trim();
  // Direct alias check
  for (const [alias, code] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias)) return code;
  }
  // Station code check (e.g. "HWH")
  const upper = text.toUpperCase().trim();
  if (STATIONS[upper]) return upper;
  return '';
}

function parseDateRange(input: string): string[] {
  const dates: string[] = [];
  const year = new Date().getFullYear();

  // "27-30 sept" or "27–30 september"
  const rangeMatch = input.match(/(\d{1,2})[–\-](\d{1,2})\s+([a-z]{3,})/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end   = parseInt(rangeMatch[2]);
    const month = MONTH_MAP[rangeMatch[3].slice(0, 3)];
    if (month !== undefined) {
      for (let d = start; d <= end; d++) {
        dates.push(formatDate(new Date(year, month, d)));
      }
      return dates;
    }
  }

  // "27 sept" or "27 september"
  const singleMatch = input.match(/(\d{1,2})\s+([a-z]{3,})/);
  if (singleMatch) {
    const day   = parseInt(singleMatch[1]);
    const month = MONTH_MAP[singleMatch[2].slice(0, 3)];
    if (month !== undefined) {
      dates.push(formatDate(new Date(year, month, day)));
    }
  }

  return dates;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format date for display */
export function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
