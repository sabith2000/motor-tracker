import { connectDB } from '../lib/db.js';
import { getStatus, updateStatus } from '../lib/mongoStore.js';
import { formatTimeIST } from '../lib/time.js';

export default async function handler(req, res) {
    try {
        await connectDB();

        const status = await getStatus();
        const serverTime = new Date().toISOString();
        let elapsedSeconds = 0;

        if (status.isRunning && status.tempStartTime) {
            elapsedSeconds = Math.floor((Date.now() - new Date(status.tempStartTime).getTime()) / 1000);
        }

        // Update heartbeat timestamp
        await updateStatus({ lastHeartbeat: new Date() });

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
