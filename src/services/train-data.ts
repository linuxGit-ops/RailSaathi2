/**
 * train-data.ts — Seeded sample dataset for the RailSaathi prototype
 * §31 step 2: "Search against a seeded sample dataset of trains/routes/segments"
 * All data is clearly fictional — labeled "Sample data" in the UI.
 */

export interface Station {
  code: string;
  name: string;
  nameHi: string;
  city: string;
}

export interface RouteStop {
  station: Station;
  arrivalTime: string;   // "HH:MM"
  departureTime: string; // "HH:MM"
  dayOffset: number;     // 0 = departure day, 1 = next day, etc.
  distanceKm: number;
}

export interface Train {
  trainNumber: string;
  name: string;
  nameHi: string;
  type: 'RAJDHANI' | 'SHATABDI' | 'EXPRESS' | 'SUPERFAST';
  route: RouteStop[];
  availableClasses: CoachClass[];
  runsDays: string[]; // ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
}

export interface CoachClass {
  code: string;       // '1A','2A','3A','SL','CC'
  label: string;
  seats: number;
}

export interface SeatInventory {
  seatId: string;
  trainNumber: string;
  coachClass: string;
  seatNumber: string;
  seatType: 'LOWER' | 'MIDDLE' | 'UPPER' | 'SIDE_LOWER' | 'SIDE_UPPER' | 'WINDOW' | 'AISLE';
  segments: SegmentStatus[];
}

export interface SegmentStatus {
  segmentId: string;
  fromCode: string;
  toCode: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';
  quota: 'GENERAL' | 'TATKAL' | 'LADIES' | 'SENIOR' | 'DEFENCE';
  holdId?: string;
  bookingId?: string;
  version: number;
}

export interface SearchResult {
  train: Train;
  date: string;          // 'YYYY-MM-DD'
  fromStation: Station;
  toStation: Station;
  durationMins: number;
  fareByClass: Record<string, number>;
  availabilityByClass: Record<string, AvailabilityInfo>;
}

export interface AvailabilityInfo {
  available: number;
  waitlisted: number;
  status: 'AVAILABLE' | 'WAITLIST' | 'RAC' | 'FULL';
  isTatkal: boolean;
}

// --- Station master ---
export const STATIONS: Record<string, Station> = {
  HWH: { code: 'HWH', name: 'Howrah Junction', nameHi: 'हावड़ा जंक्शन', city: 'Kolkata' },
  NDLS: { code: 'NDLS', name: 'New Delhi', nameHi: 'नई दिल्ली', city: 'Delhi' },
  CNB: { code: 'CNB', name: 'Kanpur Central', nameHi: 'कानपुर सेंट्रल', city: 'Kanpur' },
  PRYJ: { code: 'PRYJ', name: 'Prayagraj Junction', nameHi: 'प्रयागराज जंक्शन', city: 'Prayagraj' },
  MGS: { code: 'MGS', name: 'Mughal Sarai Junction', nameHi: 'मुगलसराय जंक्शन', city: 'Varanasi' },
  DDN: { code: 'DDN', name: 'Dehradun', nameHi: 'देहरादून', city: 'Dehradun' },
  CDG: { code: 'CDG', name: 'Chandigarh', nameHi: 'चंडीगढ़', city: 'Chandigarh' },
  BPL: { code: 'BPL', name: 'Bhopal Junction', nameHi: 'भोपाल जंक्शन', city: 'Bhopal' },
  MAS: { code: 'MAS', name: 'Chennai Central', nameHi: 'चेन्नई सेंट्रल', city: 'Chennai' },
  BCT: { code: 'BCT', name: 'Mumbai Central', nameHi: 'मुंबई सेंट्रल', city: 'Mumbai' },
};

// --- Sample train dataset ---
export const TRAINS: Train[] = [
  {
    trainNumber: '12301',
    name: 'Howrah Rajdhani Express',
    nameHi: 'हावड़ा राजधानी एक्सप्रेस',
    type: 'RAJDHANI',
    runsDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    availableClasses: [
      { code: '1A', label: 'First AC', seats: 24 },
      { code: '2A', label: 'Second AC', seats: 52 },
      { code: '3A', label: 'Third AC', seats: 64 },
    ],
    route: [
      { station: STATIONS.HWH,  arrivalTime: '--:--', departureTime: '17:05', dayOffset: 0, distanceKm: 0 },
      { station: STATIONS.PRYJ, arrivalTime: '01:15', departureTime: '01:25', dayOffset: 1, distanceKm: 786 },
      { station: STATIONS.CNB,  arrivalTime: '04:25', departureTime: '04:35', dayOffset: 1, distanceKm: 1051 },
      { station: STATIONS.NDLS, arrivalTime: '09:55', departureTime: '--:--', dayOffset: 1, distanceKm: 1451 },
    ],
  },
  {
    trainNumber: '12381',
    name: 'Poorva Express',
    nameHi: 'पूर्वा एक्सप्रेस',
    type: 'SUPERFAST',
    runsDays: ['Mon','Wed','Fri','Sun'],
    availableClasses: [
      { code: '2A', label: 'Second AC', seats: 52 },
      { code: '3A', label: 'Third AC', seats: 128 },
      { code: 'SL', label: 'Sleeper',  seats: 300 },
    ],
    route: [
      { station: STATIONS.HWH,  arrivalTime: '--:--', departureTime: '08:55', dayOffset: 0, distanceKm: 0 },
      { station: STATIONS.MGS,  arrivalTime: '20:40', departureTime: '20:45', dayOffset: 0, distanceKm: 1027 },
      { station: STATIONS.CNB,  arrivalTime: '23:50', departureTime: '00:00', dayOffset: 0, distanceKm: 1234 },
      { station: STATIONS.NDLS, arrivalTime: '06:30', departureTime: '--:--', dayOffset: 1, distanceKm: 1530 },
    ],
  },
  {
    trainNumber: '12002',
    name: 'Bhopal Shatabdi Express',
    nameHi: 'भोपाल शताब्दी एक्सप्रेस',
    type: 'SHATABDI',
    runsDays: ['Mon','Tue','Wed','Thu','Fri','Sat'],
    availableClasses: [
      { code: 'CC', label: 'Chair Car', seats: 78 },
      { code: 'EC', label: 'Executive CC', seats: 56 },
    ],
    route: [
      { station: STATIONS.NDLS, arrivalTime: '--:--', departureTime: '06:15', dayOffset: 0, distanceKm: 0 },
      { station: STATIONS.BPL,  arrivalTime: '13:55', departureTime: '--:--', dayOffset: 0, distanceKm: 704 },
    ],
  },
];

// --- Fare table (per class, per km, simplified) ---
const FARE_MATRIX: Record<string, Record<string, number>> = {
  '12301': { '1A': 4180, '2A': 2490, '3A': 1725 },
  '12381': { '2A': 1890, '3A': 1250, 'SL': 480 },
  '12002': { 'CC': 1120, 'EC': 2240 },
};

const TATKAL_SURCHARGE: Record<string, number> = {
  '1A': 400, '2A': 300, '3A': 200, 'SL': 100, 'CC': 125, 'EC': 150,
};

// --- Generate availability (simulated) ---
function genAvailability(trainNum: string, classCode: string, isTatkal: boolean): AvailabilityInfo {
  const seed = parseInt(trainNum) + classCode.charCodeAt(0) + (isTatkal ? 31 : 0);
  const available = ((seed * 7) % 25) + (isTatkal ? 0 : 5);
  const wl = available < 5 ? Math.floor(Math.random() * 8) : 0;
  return {
    available,
    waitlisted: wl,
    status: available > 0 ? 'AVAILABLE' : wl > 0 ? 'WAITLIST' : 'FULL',
    isTatkal,
  };
}

// --- Search function ---
export function searchTrains(
  fromCode: string,
  toCode: string,
  date: string,
  classCode?: string
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const train of TRAINS) {
    const fromIdx = train.route.findIndex(r => r.station.code === fromCode);
    const toIdx   = train.route.findIndex(r => r.station.code === toCode);
    if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) continue;

    const fromStop = train.route[fromIdx];
    const toStop   = train.route[toIdx];
    const deptMins = toTime(fromStop.departureTime);
    const arrMins  = toTime(toStop.arrivalTime) + toStop.dayOffset * 1440;
    const depMins2 = deptMins + fromStop.dayOffset * 1440;
    const duration = arrMins - depMins2;

    const fareByClass: Record<string, number> = {};
    const availabilityByClass: Record<string, AvailabilityInfo> = {};

    for (const cls of train.availableClasses) {
      if (classCode && cls.code !== classCode) continue;
      const base = FARE_MATRIX[train.trainNumber]?.[cls.code] ?? 999;
      fareByClass[cls.code] = base;
      availabilityByClass[cls.code] = genAvailability(train.trainNumber, cls.code, false);
      // Add Tatkal entry
      const tatkalKey = cls.code + '_TATKAL';
      fareByClass[tatkalKey] = base + (TATKAL_SURCHARGE[cls.code] ?? 0);
      availabilityByClass[tatkalKey] = genAvailability(train.trainNumber, cls.code, true);
    }

    results.push({
      train,
      date,
      fromStation: STATIONS[fromCode] ?? { code: fromCode, name: fromCode, nameHi: fromCode, city: fromCode },
      toStation:   STATIONS[toCode] ?? { code: toCode, name: toCode, nameHi: toCode, city: toCode },
      durationMins: duration,
      fareByClass,
      availabilityByClass,
    });
  }

  return results;
}

function toTime(t: string): number {
  if (t === '--:--') return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

// Re-export TATKAL_SURCHARGE for use in refund calculations
export { TATKAL_SURCHARGE };
