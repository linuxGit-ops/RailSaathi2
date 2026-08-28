import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB, BookingModel } from '../lib/mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.MONGODB_URI) {
      return res.status(200).json({ fallback: true, message: 'MONGODB_URI not configured' });
    }

    await connectDB();

    if (req.method === 'POST') {
      const bookingData = req.body;
      if (!bookingData || !bookingData.pnr) {
        return res.status(400).json({ error: 'Missing PNR in booking data' });
      }

      const booking = await BookingModel.findOneAndUpdate(
        { pnr: bookingData.pnr },
        { ...bookingData, bookedAt: Date.now() },
        { upsert: true, new: true }
      );

      return res.status(201).json({ success: true, data: booking });
    } else if (req.method === 'GET') {
      const { pnr, userId } = req.query;

      if (pnr && typeof pnr === 'string') {
        const booking = await BookingModel.findOne({ pnr });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        return res.status(200).json({ success: true, data: booking });
      }

      if (userId && typeof userId === 'string') {
        const bookings = await BookingModel.find({ userId }).sort({ bookedAt: -1 }).limit(20);
        return res.status(200).json({ success: true, data: bookings });
      }

      const recent = await BookingModel.find().sort({ bookedAt: -1 }).limit(10);
      return res.status(200).json({ success: true, data: recent });
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error: any) {
    console.error('Booking DB error:', error);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
}
