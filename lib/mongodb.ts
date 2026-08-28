/**
 * lib/mongodb.ts — Singleton MongoDB connection
 * Reused across Vercel serverless function invocations (connection pooling).
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// Cache connection across warm invocations
let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } =
  (global as any).__mongoose_cache ?? { conn: null, promise: null };

(global as any).__mongoose_cache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

/** Booking session — mirrors BookingSessionData */
export const SessionSchema = new mongoose.Schema({
  sessionToken:      { type: String, required: true, unique: true, index: true },
  bookingAttemptId:  { type: String, required: true },
  userId:            { type: String, required: true },
  stage:             { type: String, required: true, default: 'SEARCHING' },
  holdId:            String,
  offerId:           String,
  paymentId:         String,
  pnr:               String,
  trainNumber:       String,
  fromCode:          String,
  toCode:            String,
  date:              String,
  classCode:         String,
  passengers:        Number,
  totalFare:         Number,
  seatNumbers:       [String],
  createdAt:         { type: Number, default: () => Date.now() },
  updatedAt:         { type: Number, default: () => Date.now() },
});

/** Confirmed booking (PNR record) */
export const BookingSchema = new mongoose.Schema({
  pnr:              { type: String, required: true, unique: true },
  userId:           { type: String, required: true, index: true },
  sessionToken:     String,
  bookingAttemptId: String,
  trainNumber:      String,
  trainName:        String,
  fromCode:         String,
  toCode:           String,
  date:             String,
  classCode:        String,
  seatNumbers:      [String],
  passengers:       Number,
  totalFare:        Number,
  status:           { type: String, default: 'CONFIRMED' },
  bookedAt:         { type: Number, default: () => Date.now() },
});

export const SessionModel =
  mongoose.models.Session ?? mongoose.model('Session', SessionSchema);

export const BookingModel =
  mongoose.models.Booking ?? mongoose.model('Booking', BookingSchema);
