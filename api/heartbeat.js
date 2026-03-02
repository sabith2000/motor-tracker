import { connectDB } from '../lib/db.js';
import { getStatus, updateStatus, atomicStop, addLog, getLogCount, getLogs } from '../lib/mongoStore.js';
import { formatTimeIST, formatDateIST, calculateDurationMinutes } from '../lib/time.js';
import { exportAndArchiveLogs } from '../lib/exportHelper.js';

// Safety threshold: auto-stop motor after 45 minutes
const AUTO_STOP_SECONDS = 45 * 60;
const MAX_LOG_ENTRIES = 100;

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

        // ── Server-side auto-stop safety ──
        if (status.isRunning && elapsedSeconds >= AUTO_STOP_SECONDS) {
            console.log(`🛑 Auto-stop triggered: motor running for ${Math.round(elapsedSeconds / 60)} minutes`);

            const endTime = new Date();
            const startTime = status.tempStartTime;
            const lastStoppedTimeStr = formatTimeIST(endTime);

            // Atomic stop
            await atomicStop(lastStoppedTimeStr);

            // Create log entry (identical to stop.js flow)
            await addLog({
                date: formatDateIST(startTime),
                startTime: formatTimeIST(startTime),
                endTime: formatTimeIST(endTime),
                durationMinutes: calculateDurationMinutes(startTime, endTime),
                rawStartTime: startTime,
                rawEndTime: endTime
            });

            // Check if we need to auto-archive (same as stop.js)
            try {
                const logCount = await getLogCount();
                if (logCount >= MAX_LOG_ENTRIES) {
                    const logs = await getLogs('unexported');
                    if (logs.length > 0) {
                        await exportAndArchiveLogs(logs);
                        console.log(`📦 Auto-archived ${logs.length} logs after auto-stop`);
                    }
                }
            } catch (archiveError) {
                console.error('❌ Archive check after auto-stop failed:', archiveError.message);
            }

            return res.json({
                serverTime,
                isRunning: false,
                startTime: null,
                elapsedSeconds: 0,
                startTimeFormatted: null,
                lastStoppedTime: lastStoppedTimeStr,
                autoStopped: true,
                autoStopReason: `Motor auto-stopped after ${Math.round(elapsedSeconds / 60)} minutes (safety limit)`
            });
        }

        // ── Normal heartbeat response ──
        // Only write heartbeat when motor is running
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
