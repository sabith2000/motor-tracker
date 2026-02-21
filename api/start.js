import { connectDB } from '../lib/db.js';
import { atomicStart } from '../lib/mongoStore.js';
import { formatTimeIST } from '../lib/time.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const startTime = new Date();
        const result = await atomicStart(startTime);

        if (!result) {
            return res.status(400).json({ success: false, error: 'Motor is already running' });
        }

        res.json({
            success: true,
            message: 'Motor started',
            startTime: startTime.toISOString(),
            startTimeFormatted: formatTimeIST(startTime)
        });
    } catch (error) {
        console.error('Start motor error:', error.message);
        res.status(500).json({ error: 'Failed to start motor' });
    }
}
