import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exportToSheets, scheduleExport } from './sheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const STATUS_FILE = path.join(DATA_DIR, 'status.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const ARCHIVE_FILE = path.join(DATA_DIR, 'archive.json');

// ============ Helper Functions ============

// Read JSON file
function readJSON(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return null;
    }
}

// Write JSON file
function writeJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

// Format date in IST: DD/MM/YYYY
function formatDateIST(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).split('/').join('/');
}

// Format time in IST: HH:MM AM/PM
function formatTimeIST(date) {
    return new Date(date).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Calculate duration in minutes
function calculateDurationMinutes(startTime, endTime) {
    const diff = new Date(endTime) - new Date(startTime);
    return Math.round(diff / (1000 * 60));
}

// Check and archive logs if limit reached
async function checkAndArchiveLogs() {
    const logsData = readJSON(LOGS_FILE);
    if (!logsData) return;

    if (logsData.logs.length >= logsData.maxEntries) {
        console.log('Log limit reached, archiving to Google Sheets...');

        try {
            await exportToSheets(logsData.logs);

            // Update archive info
            const archiveData = readJSON(ARCHIVE_FILE) || { lastExportDate: null, totalArchivedEntries: 0 };
            archiveData.lastExportDate = formatDateIST(new Date());
            archiveData.totalArchivedEntries += logsData.logs.length;
            writeJSON(ARCHIVE_FILE, archiveData);

            // Clear logs
            logsData.logs = [];
            writeJSON(LOGS_FILE, logsData);

            console.log('Logs archived successfully');
        } catch (error) {
            console.error('Failed to archive logs:', error);
        }
    }
}

// ============ API Endpoints ============

// Health check / wake up endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is awake', timestamp: new Date().toISOString() });
});

// Heartbeat - returns server time and status for sync
app.get('/api/heartbeat', (req, res) => {
    const status = readJSON(STATUS_FILE);
    if (!status) {
        return res.status(500).json({ error: 'Failed to read status' });
    }

    const serverTime = new Date().toISOString();
    let elapsedSeconds = 0;

    if (status.isRunning && status.tempStartTime) {
        elapsedSeconds = Math.floor((Date.now() - new Date(status.tempStartTime).getTime()) / 1000);
    }

    // Update last heartbeat
    status.lastHeartbeat = serverTime;
    writeJSON(STATUS_FILE, status);

    res.json({
        serverTime,
        isRunning: status.isRunning,
        startTime: status.tempStartTime,
        elapsedSeconds,
        elapsedSeconds,
        startTimeFormatted: status.tempStartTime ? formatTimeIST(status.tempStartTime) : null,
        lastStoppedTime: status.lastStoppedTime || null
    });
});

// Debug endpoint - check Google Sheets configuration
app.get('/api/debug', (req, res) => {
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
            credentialsValid: credentialsValid,
            credentialsError: credentialsError,
            clientEmail: clientEmail
        },
        environment: process.env.NODE_ENV || 'development'
    });
});

// GET /api/status - Get current motor status
app.get('/api/status', (req, res) => {
    const status = readJSON(STATUS_FILE);
    if (!status) {
        return res.status(500).json({ error: 'Failed to read status' });
    }
    res.json(status);
});

// POST /api/start - Start the motor
app.post('/api/start', (req, res) => {
    const status = readJSON(STATUS_FILE);
    if (!status) {
        return res.status(500).json({ error: 'Failed to read status' });
    }

    // Prevent double start
    if (status.isRunning) {
        return res.status(400).json({
            success: false,
            error: 'Motor is already running'
        });
    }

    // Update status
    const startTime = new Date().toISOString();
    status.isRunning = true;
    status.tempStartTime = startTime;

    if (!writeJSON(STATUS_FILE, status)) {
        return res.status(500).json({ error: 'Failed to save status' });
    }

    res.json({
        success: true,
        message: 'Motor started',
        startTime: startTime,
        startTimeFormatted: formatTimeIST(startTime)
    });
});

// POST /api/stop - Stop the motor
app.post('/api/stop', async (req, res) => {
    const status = readJSON(STATUS_FILE);
    if (!status) {
        return res.status(500).json({ error: 'Failed to read status' });
    }

    // Prevent stop without start
    if (!status.isRunning) {
        return res.status(400).json({
            success: false,
            error: 'Motor is not running'
        });
    }

    const endTime = new Date().toISOString();
    const startTime = status.tempStartTime;

    // Create log entry
    const logsData = readJSON(LOGS_FILE);
    if (!logsData) {
        return res.status(500).json({ error: 'Failed to read logs' });
    }

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

    if (!writeJSON(LOGS_FILE, logsData)) {
        return res.status(500).json({ error: 'Failed to save log' });
    }

    // Update status
    status.isRunning = false;
    status.tempStartTime = null;
    status.lastStoppedTime = formatTimeIST(endTime);

    if (!writeJSON(STATUS_FILE, status)) {
        return res.status(500).json({ error: 'Failed to save status' });
    }

    // Check if we need to archive
    await checkAndArchiveLogs();

    res.json({
        success: true,
        message: 'Motor stopped',
        log: logEntry
    });
});

// GET /api/logs - Get all logs
app.get('/api/logs', (req, res) => {
    const logsData = readJSON(LOGS_FILE);
    if (!logsData) {
        return res.status(500).json({ error: 'Failed to read logs' });
    }

    const archiveData = readJSON(ARCHIVE_FILE);

    res.json({
        logs: logsData.logs,
        count: logsData.logs.length,
        maxEntries: logsData.maxEntries,
        archive: archiveData
    });
});

// POST /api/export - Manual export to Google Sheets
app.post('/api/export', async (req, res) => {
    const logsData = readJSON(LOGS_FILE);
    if (!logsData) {
        return res.status(500).json({ error: 'Failed to read logs' });
    }

    if (logsData.logs.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'No logs to export'
        });
    }

    try {
        await exportToSheets(logsData.logs);

        // Update archive info
        const archiveData = readJSON(ARCHIVE_FILE) || { lastExportDate: null, totalArchivedEntries: 0 };
        archiveData.lastExportDate = formatDateIST(new Date());
        archiveData.totalArchivedEntries += logsData.logs.length;
        writeJSON(ARCHIVE_FILE, archiveData);

        const exportedCount = logsData.logs.length;

        // Clear logs after export
        logsData.logs = [];
        writeJSON(LOGS_FILE, logsData);

        res.json({
            success: true,
            message: `Exported ${exportedCount} logs to Google Sheets`,
            exportedAt: `${formatDateIST(new Date())} ${formatTimeIST(new Date())}`
        });
    } catch (error) {
        console.error('Export failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to export to Google Sheets. Check credentials and sheet ID.'
        });
    }
});

// ============ Start Server ============

app.listen(PORT, () => {
    console.log(`🚀 Motor Tracker Server running on port ${PORT}`);
    console.log(`📊 API endpoints:`);
    console.log(`   GET  /api/health - Health check`);
    console.log(`   GET  /api/status - Get motor status`);
    console.log(`   POST /api/start  - Start motor`);
    console.log(`   POST /api/stop   - Stop motor`);
    console.log(`   GET  /api/logs   - Get logs`);
    console.log(`   POST /api/export - Export to Sheets`);

    // Schedule daily export at midnight IST
    scheduleExport();
});
