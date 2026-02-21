import { connectDB } from '../lib/db.js';
import { getStatus } from '../lib/mongoStore.js';

export default async function handler(req, res) {
    try {
        await connectDB();

        const status = await getStatus();
        res.json({
            isRunning: status.isRunning,
            tempStartTime: status.tempStartTime,
            lastStoppedTime: status.lastStoppedTime,
            lastHeartbeat: status.lastHeartbeat
        });
    } catch (error) {
        console.error('Status error:', error.message);
        res.status(500).json({ error: 'Failed to read status' });
    }
}
