import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB, SessionModel } from '../lib/mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.MONGODB_URI) {
      return res.status(200).json({ fallback: true, message: 'MONGODB_URI not configured' });
    }

    await connectDB();

    if (req.method === 'POST') {
      const sessionData = req.body;
      if (!sessionData || !sessionData.sessionToken) {
        return res.status(400).json({ error: 'Missing sessionToken' });
      }

      const updated = await SessionModel.findOneAndUpdate(
        { sessionToken: sessionData.sessionToken },
        { ...sessionData, updatedAt: Date.now() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({ success: true, data: updated });
    } else if (req.method === 'GET') {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Missing session token query param' });
      }

      const session = await SessionModel.findOne({ sessionToken: token });
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      return res.status(200).json({ success: true, data: session });
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error: any) {
    console.error('Session DB error:', error);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
}
