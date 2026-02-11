import { formatDateIST, formatTimeIST, calculateDurationMinutes } from '../utils/time.js';
import { exportToSheets } from '../utils/sheets.js';
import {
    getStatus,
    updateStatus,
    addLog,
    getLogs,
    getLogCount,
    getArchive,
    updateArchive,
    markLogsAsExported,
    getExportStats
} from '../utils/mongoStore.js';

// Max logs before auto-export
const MAX_LOG_ENTRIES = 100;

// ============================================
// Shared Helpers
// ============================================

/**
 * Export unexported logs to Google Sheets and update archive metadata.
 * Shared by both manual export and auto-archive flows.
 */
async function exportAndArchiveLogs(logs) {
    const logsToExport = logs.map(log => ({
        date: log.date,
        startTime: log.startTime,
        endTime: log.endTime,
        durationMinutes: log.durationMinutes
    }));

    await exportToSheets(logsToExport);

    // Mark as exported in DB
    await markLogsAsExported(logs.map(log => log._id));

    // Update archive metadata
    const archive = await getArchive();
    await updateArchive({
        lastExportDate: formatDateIST(new Date()),
        totalArchivedEntries: archive.totalArchivedEntries + logs.length
    });

    return logs.length;
}

/**
 * Check if log count exceeds limit and auto-archive to Google Sheets.
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
        console.error('❌ Failed to archive logs:', error.message);
    }
}

// ============================================
// Route Handlers
// ============================================

export const getHealth = (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is awake',
        timestamp: new Date().toISOString(),
        storage: 'mongodb'
    });
};

export const getHeartbeat = async (req, res) => {
    try {
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
};

export const getStatusEndpoint = async (req, res) => {
    try {
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
};

export const startMotor = async (req, res) => {
    try {
        const status = await getStatus();

        if (status.isRunning) {
            return res.status(400).json({ success: false, error: 'Motor is already running' });
        }

        const startTime = new Date();
        await updateStatus({
            isRunning: true,
            tempStartTime: startTime
        });

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
};

export const stopMotor = async (req, res) => {
    try {
        const status = await getStatus();

        if (!status.isRunning) {
            return res.status(400).json({ success: false, error: 'Motor is not running' });
        }

        const endTime = new Date();
        const startTime = status.tempStartTime;

        // Create log entry
        const logEntry = await addLog({
            date: formatDateIST(startTime),
            startTime: formatTimeIST(startTime),
            endTime: formatTimeIST(endTime),
            durationMinutes: calculateDurationMinutes(startTime, endTime),
            rawStartTime: startTime,
            rawEndTime: endTime
        });

        // Update status
        await updateStatus({
            isRunning: false,
            tempStartTime: null,
            lastStoppedTime: formatTimeIST(endTime)
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
};

export const getLogsEndpoint = async (req, res) => {
    try {
        const logs = await getLogs();
        const archive = await getArchive();
        const logCount = await getLogCount();

        res.json({
            logs: logs.map(log => ({
                id: log._id,
                date: log.date,
                startTime: log.startTime,
                endTime: log.endTime,
                durationMinutes: log.durationMinutes,
                exportedToSheets: log.exportedToSheets
            })),
            count: logCount,
            maxEntries: MAX_LOG_ENTRIES,
            archive: {
                lastExportDate: archive.lastExportDate,
                totalArchivedEntries: archive.totalArchivedEntries
            }
        });
    } catch (error) {
        console.error('Get logs error:', error.message);
        res.status(500).json({ error: 'Failed to read logs' });
    }
};

export const exportLogsEndpoint = async (req, res) => {
    try {
        const forceReExport = req.query.force === 'true';
        const logs = await getLogs(forceReExport ? 'exported' : 'unexported');

        if (logs.length === 0) {
            const message = forceReExport
                ? 'No logs found in the database'
                : 'No new logs to export (all logs already exported)';
            return res.status(400).json({ success: false, error: message });
        }

        const exportedCount = await exportAndArchiveLogs(logs);
        const mode = forceReExport ? 're-export (all logs)' : 'new logs only';

        res.json({
            success: true,
            message: `Exported ${exportedCount} logs to Google Sheets`,
            mode,
            exportedCount,
            exportedAt: `${formatDateIST(new Date())} ${formatTimeIST(new Date())}`
        });
    } catch (error) {
        console.error('Export failed:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ success: false, error: error.message || 'Export failed' });
    }
};

export const exportStatsEndpoint = async (req, res) => {
    try {
        const stats = await getExportStats();
        const archive = await getArchive();

        res.json({
            totalLogs: stats.totalLogs,
            unexportedCount: stats.unexportedCount,
            exportedCount: stats.exportedCount,
            lastExportDate: archive.lastExportDate,
            totalArchivedEntries: archive.totalArchivedEntries
        });
    } catch (error) {
        console.error('Export stats error:', error.message);
        res.status(500).json({ error: 'Failed to get export stats' });
    }
};

export const getDebug = (req, res) => {
    const hasSheetId = !!process.env.GOOGLE_SHEET_ID;
    const hasCredentials = !!process.env.GOOGLE_CREDENTIALS;
    const hasMongoUri = !!process.env.MONGODB_URI;
    let credentialsValid = false;
    let credentialsError = null;
    let clientEmail = null;

    if (hasCredentials) {
        try {
            const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            credentialsValid = !!(creds.client_email && creds.private_key);
            clientEmail = creds.client_email ? creds.client_email.substring(0, 20) + '...' : null;
        } catch (e) {
            credentialsError = e.message;
        }
    }

    res.json({
        storage: 'mongodb',
        mongodb: {
            uriSet: hasMongoUri,
            uriPreview: hasMongoUri ? process.env.MONGODB_URI.substring(0, 30) + '...' : null
        },
        googleSheets: {
            sheetIdSet: hasSheetId,
            sheetIdValue: hasSheetId ? process.env.GOOGLE_SHEET_ID.substring(0, 10) + '...' : null,
            credentialsSet: hasCredentials,
            credentialsValid,
            credentialsError,
            clientEmail
        },
        environment: process.env.NODE_ENV || 'development'
    });
};
