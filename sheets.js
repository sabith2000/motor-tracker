import { google } from 'googleapis';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');
const LOGS_FILE = path.join(__dirname, 'data', 'logs.json');
const ARCHIVE_FILE = path.join(__dirname, 'data', 'archive.json');

// Get Sheet ID from environment
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Get credentials (supports both file and environment variable)
function getCredentials() {
    // First, try environment variable (for cloud deployment)
    if (process.env.GOOGLE_CREDENTIALS) {
        try {
            return JSON.parse(process.env.GOOGLE_CREDENTIALS);
        } catch (e) {
            console.error('Failed to parse GOOGLE_CREDENTIALS env var:', e.message);
        }
    }

    // Fallback to file (for local development)
    if (fs.existsSync(CREDENTIALS_FILE)) {
        return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    }

    return null;
}

// Check if Google Sheets is configured
function isConfigured() {
    return getCredentials() !== null && SHEET_ID;
}

// Get authenticated Sheets client
async function getSheetsClient() {
    const credentials = getCredentials();

    if (!credentials || !SHEET_ID) {
        throw new Error('Google Sheets not configured. Set GOOGLE_CREDENTIALS and GOOGLE_SHEET_ID');
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
}

// Format date for IST
function formatDateIST(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Format time for IST
function formatTimeIST(date) {
    return new Date(date).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Export logs to Google Sheets
export async function exportToSheets(logs) {
    if (!isConfigured()) {
        console.log('⚠️ Google Sheets not configured, skipping export');
        return false;
    }

    if (!logs || logs.length === 0) {
        console.log('No logs to export');
        return false;
    }

    try {
        const sheets = await getSheetsClient();

        // Prepare rows for the sheet
        const rows = logs.map(log => [
            log.date,
            log.startTime,
            log.endTime,
            log.durationMinutes,
            `${formatDateIST(new Date())} ${formatTimeIST(new Date())}` // Exported at
        ]);

        // Append to sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:E',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: rows
            }
        });

        console.log(`✅ Exported ${logs.length} logs to Google Sheets`);
        return true;
    } catch (error) {
        console.error('❌ Failed to export to Google Sheets:', error.message);
        throw error;
    }
}

// Schedule daily export at midnight IST
export function scheduleExport() {
    if (!isConfigured()) {
        console.log('⚠️ Google Sheets not configured, daily export disabled');
        return;
    }

    cron.schedule('0 0 * * *', async () => {
        console.log('🕛 Running scheduled daily export...');

        try {
            // Read current logs
            const logsData = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));

            if (logsData.logs.length > 0) {
                await exportToSheets(logsData.logs);

                // Update archive info
                const archiveData = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
                archiveData.lastExportDate = formatDateIST(new Date());
                archiveData.totalArchivedEntries += logsData.logs.length;
                fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archiveData, null, 2));

                // Clear logs after export
                logsData.logs = [];
                fs.writeFileSync(LOGS_FILE, JSON.stringify(logsData, null, 2));

                console.log('✅ Daily export completed');
            } else {
                console.log('No logs to export today');
            }
        } catch (error) {
            console.error('❌ Daily export failed:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('📅 Daily export scheduled for midnight IST');
}
