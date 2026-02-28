import { connectDB } from '../lib/db.js';
import { atomicStop, addLog, getLogCount, getLogs } from '../lib/mongoStore.js';
import { formatDateIST, formatTimeIST, calculateDurationMinutes } from '../lib/time.js';
import { exportAndArchiveLogs } from '../lib/exportHelper.js';

// Max logs before auto-export
const MAX_LOG_ENTRIES = 100;

/**
 * Check if log count exceeds limit and auto-archive.
 */
async function checkAndArchiveLogs() {
    try {
        const logCount = await getLogCount();
        if (logCount >= MAX_LOG_ENTRIES) {
            console.log('📦 Log limit reached, archiving to Google Sheets...');
            const logs = await getLogs('unexported');
            if (logs.length === 0) return;
            const exportedCount = await exportAndArchiveLogs(logs);
            console.log(`✅ Archived ${exportedCount} logs to Google Sheets`);
        }
    } catch (error) {
        console.error(`❌ Failed to archive ${await getLogCount()} logs:`, error.message);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const endTime = new Date();
        const lastStoppedTimeStr = formatTimeIST(endTime);

        // Atomic stop — returns OLD document with tempStartTime
        const oldStatus = await atomicStop(lastStoppedTimeStr);

        if (!oldStatus) {
            return res.status(400).json({ success: false, error: 'Motor is not running' });
        }

        const startTime = oldStatus.tempStartTime;

        // Create log entry
        const logEntry = await addLog({
            date: formatDateIST(startTime),
            startTime: formatTimeIST(startTime),
            endTime: formatTimeIST(endTime),
            durationMinutes: calculateDurationMinutes(startTime, endTime),
            rawStartTime: startTime,
            rawEndTime: endTime
        });

        // Check if we need to auto-archive
        await checkAndArchiveLogs();

        res.json({
            success: true,
            message: 'Motor stopped',
            log: {
                date: logEntry.date,
                startTime: logEntry.startTime,
                endTime: logEntry.endTime,
                durationMinutes: logEntry.durationMinutes
            }
        });
    } catch (error) {
        console.error('Stop motor error:', error.message);
        res.status(500).json({ error: 'Failed to stop motor' });
    }
}
