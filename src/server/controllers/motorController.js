import path from 'path';
import { fileURLToPath } from 'url';
import { readJSON, writeJSON } from '../utils/fileStore.js';
import { formatDateIST, formatTimeIST, calculateDurationMinutes } from '../utils/time.js';
import { exportToSheets } from '../utils/sheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..'); // Up 3 levels from src/server/controllers
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

const STATUS_FILE = path.join(DATA_DIR, 'status.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const ARCHIVE_FILE = path.join(DATA_DIR, 'archive.json');

// Check and archive logs if limit reached
async function checkAndArchiveLogs() {
    const logsData = readJSON(LOGS_FILE);
    if (!logsData) return;

    if (logsData.logs.length >= logsData.maxEntries) {
        console.log('Log limit reached, archiving to Google Sheets...');
        try {
            await exportToSheets(logsData.logs);

            const archiveData = readJSON(ARCHIVE_FILE) || { lastExportDate: null, totalArchivedEntries: 0 };
            archiveData.lastExportDate = formatDateIST(new Date());
            archiveData.totalArchivedEntries += logsData.logs.length;
            writeJSON(ARCHIVE_FILE, archiveData);

            logsData.logs = [];
            writeJSON(LOGS_FILE, logsData);
            console.log('Logs archived successfully');
        } catch (error) {
            console.error('Failed to archive logs:', error);
        }
    }
}

export const getHealth = (req, res) => {
    res.json({ status: 'ok', message: 'Server is awake', timestamp: new Date().toISOString() });
};

export const getHeartbeat = (req, res) => {
    const status = readJSON(STATUS_FILE);
    if (!status) return res.status(500).json({ error: 'Failed to read status' });

    const serverTime = new Date().toISOString();
    let elapsedSeconds = 0;

    if (status.isRunning && status.tempStartTime) {
        elapsedSeconds = Math.floor((Date.now() - new Date(status.tempStartTime).getTime()) / 1000);
    }

    status.lastHeartbeat = serverTime;
    writeJSON(STATUS_FILE, status);

    res.json({
        serverTime,
        isRunning: status.isRunning,
        startTime: status.tempStartTime,
        elapsedSeconds,
        startTimeFormatted: status.tempStartTime ? formatTimeIST(status.tempStartTime) : null,
        lastStoppedTime: status.lastStoppedTime || null
    });
};

export const getStatus = (req, res) => {
    const status = readJSON(STATUS_FILE);
    if (!status) return res.status(500).json({ error: 'Failed to read status' });
    res.json(status);
};

export const startMotor = (req, res) => {
    const status = readJSON(STATUS_FILE);
    if (!status) return res.status(500).json({ error: 'Failed to read status' });

    if (status.isRunning) {
        return res.status(400).json({ success: false, error: 'Motor is already running' });
    }

    const startTime = new Date().toISOString();
    status.isRunning = true;
    status.tempStartTime = startTime;

    if (!writeJSON(STATUS_FILE, status)) return res.status(500).json({ error: 'Failed to save status' });

    res.json({
        success: true,
        message: 'Motor started',
        startTime,
        startTimeFormatted: formatTimeIST(startTime)
    });
};

export const stopMotor = async (req, res) => {
    const status = readJSON(STATUS_FILE);
    if (!status) return res.status(500).json({ error: 'Failed to read status' });

    if (!status.isRunning) {
        return res.status(400).json({ success: false, error: 'Motor is not running' });
    }

    const endTime = new Date().toISOString();
    const startTime = status.tempStartTime;

    const logsData = readJSON(LOGS_FILE);
    if (!logsData) return res.status(500).json({ error: 'Failed to read logs' });

    const logEntry = {
        id: logsData.logs.length + 1,
        date: formatDateIST(startTime),
        startTime: formatTimeIST(startTime),
        endTime: formatTimeIST(endTime),
        durationMinutes: calculateDurationMinutes(startTime, endTime),
        rawStartTime: startTime,
        rawEndTime: endTime
    };

    logsData.logs.push(logEntry);
    if (!writeJSON(LOGS_FILE, logsData)) return res.status(500).json({ error: 'Failed to save log' });

    status.isRunning = false;
    status.tempStartTime = null;
    status.lastStoppedTime = formatTimeIST(endTime);

    if (!writeJSON(STATUS_FILE, status)) return res.status(500).json({ error: 'Failed to save status' });

    await checkAndArchiveLogs();

    res.json({ success: true, message: 'Motor stopped', log: logEntry });
};

export const getLogs = (req, res) => {
    const logsData = readJSON(LOGS_FILE);
    if (!logsData) return res.status(500).json({ error: 'Failed to read logs' });
    const archiveData = readJSON(ARCHIVE_FILE);
    res.json({
        logs: logsData.logs,
        count: logsData.logs.length,
        maxEntries: logsData.maxEntries,
        archive: archiveData
    });
};

export const exportLogs = async (req, res) => {
    const logsData = readJSON(LOGS_FILE);
    if (!logsData) return res.status(500).json({ error: 'Failed to read logs' });

    if (logsData.logs.length === 0) {
        return res.status(400).json({ success: false, error: 'No logs to export' });
    }

    try {
        await exportToSheets(logsData.logs);

        const archiveData = readJSON(ARCHIVE_FILE) || { lastExportDate: null, totalArchivedEntries: 0 };
        archiveData.lastExportDate = formatDateIST(new Date());
        archiveData.totalArchivedEntries += logsData.logs.length;
        writeJSON(ARCHIVE_FILE, archiveData);

        const exportedCount = logsData.logs.length;
        logsData.logs = [];
        writeJSON(LOGS_FILE, logsData);

        res.json({
            success: true,
            message: `Exported ${exportedCount} logs to Google Sheets`,
            exportedAt: `${formatDateIST(new Date())} ${formatTimeIST(new Date())}`
        });
    } catch (error) {
        console.error('Export failed:', error);
        res.status(500).json({ success: false, error: error.message || 'Export failed' });
    }
};

export const getDebug = (req, res) => {
    const hasSheetId = !!process.env.GOOGLE_SHEET_ID;
    const hasCredentials = !!process.env.GOOGLE_CREDENTIALS;
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
