import { connectDB } from '../lib/db.js';
import { getStatus, updateStatus } from '../lib/mongoStore.js';
import { formatTimeIST } from '../lib/time.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const status = await getStatus();
        const serverTime = new Date().toISOString();
        let elapsedSeconds = 0;

        if (status.isRunning && status.tempStartTime) {
            elapsedSeconds = Math.floor((Date.now() - new Date(status.tempStartTime).getTime()) / 1000);
        }

        // Only write heartbeat when motor is running (preserves timing accuracy
        // during active sessions without unnecessary DB writes when idle)
        if (status.isRunning) {
            await updateStatus({ lastHeartbeat: new Date() });
        }

        res.json({
            serverTime,
            isRunning: status.isRunning,
            startTime: status.tempStartTime,
            elapsedSeconds,
            startTimeFormatted: status.tempStartTime ? formatTimeIST(status.tempStartTime) : null,
            lastStoppedTime: status.lastStoppedTime || null
        });
    } catch (error) {
        console.error('Heartbeat error:', error.message);
        res.status(500).json({ error: 'Failed to get heartbeat' });
    }
}
