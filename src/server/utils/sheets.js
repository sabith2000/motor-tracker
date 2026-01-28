import { google } from 'googleapis';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatDateIST, formatTimeIST } from './time.js';
import {
    getLogs,
    markLogsAsExported,
    deleteExportedLogs,
    getArchive,
    updateArchive
} from './mongoStore.js';
import { isDBConnected } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');

// Paths (kept for reference, credentials file still uses local path for dev)
const CREDENTIALS_FILE = path.join(PROJECT_ROOT, 'credentials.json');

// Get Sheet ID from environment
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Get credentials (supports both file and environment variable)
function getCredentials() {
    // First, try environment variable (for cloud deployment)
    if (process.env.GOOGLE_CREDENTIALS) {
        try {
            const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            // Fix newlines in private_key if needed (common issue with env vars)
            if (creds.private_key) {
                creds.private_key = creds.private_key.replace(/\\n/g, '\n');
            }
            console.log('✅ Using GOOGLE_CREDENTIALS from environment');
            return creds;
        } catch (e) {
            console.error('❌ Failed to parse GOOGLE_CREDENTIALS env var:', e.message);
            console.error('Make sure to paste the ENTIRE credentials.json content');
            return null;
        }
    }

    // Fallback to file (for local development)
    if (fs.existsSync(CREDENTIALS_FILE)) {
        console.log('✅ Using credentials.json file');
        return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    }

    console.log('⚠️ No Google credentials found');
    return null;
}

// Check if Google Sheets is configured
function isConfigured() {
    const creds = getCredentials();
    const configured = creds !== null && SHEET_ID;
    if (!configured) {
        console.log('⚠️ Google Sheets not configured. SHEET_ID:', SHEET_ID ? 'set' : 'missing', 'Credentials:', creds ? 'set' : 'missing');
    }
    return configured;
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

// Export logs to Google Sheets
export async function exportToSheets(logs) {
    if (!isConfigured()) {
        console.log('⚠️ Google Sheets not configured, skipping export');
        throw new Error('Google Sheets not configured. Check GOOGLE_CREDENTIALS and GOOGLE_SHEET_ID environment variables.');
    }

    if (!logs || logs.length === 0) {
        console.log('No logs to export');
        throw new Error('No logs to export');
    }

    try {
        const sheets = await getSheetsClient();

        // Define headers
        const headers = ['Date', 'Start Time', 'End Time', 'Duration (min)', 'Exported At'];

        // Check if headers already exist (check first row)
        const existingData = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A1:E1'
        });

        const firstRow = existingData.data.values?.[0] || [];
        const headersExist = firstRow.length > 0 && firstRow[0] === headers[0];

        // If headers don't exist, add them first
        if (!headersExist) {
            console.log('Adding headers to sheet...');
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: 'Sheet1!A1:E1',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [headers]
                }
            });

            // Format header row (bold + background color)
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SHEET_ID,
                resource: {
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: 0,
                                    endRowIndex: 1,
                                    startColumnIndex: 0,
                                    endColumnIndex: 5
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
                                        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                                        horizontalAlignment: 'CENTER'
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                            }
                        }
                    ]
                }
            });
            console.log('✅ Headers added and formatted');
        }

        // Prepare data rows
        const rows = logs.map(log => [
            log.date,
            log.startTime,
            log.endTime,
            log.durationMinutes,
            `${formatDateIST(new Date())} ${formatTimeIST(new Date())}`
        ]);

        // Append data below existing content (never overwrites)
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
            // Check if database is connected
            if (!isDBConnected()) {
                console.error('❌ Database not connected, skipping scheduled export');
                return;
            }

            // Get unexported logs from MongoDB
            const logs = await getLogs(true); // unexported only

            if (logs.length > 0) {
                await exportToSheets(logs.map(log => ({
                    date: log.date,
                    startTime: log.startTime,
                    endTime: log.endTime,
                    durationMinutes: log.durationMinutes
                })));

                // Mark as exported
                await markLogsAsExported(logs.map(log => log._id));

                // Update archive info
                const archive = await getArchive();
                await updateArchive({
                    lastExportDate: formatDateIST(new Date()),
                    totalArchivedEntries: archive.totalArchivedEntries + logs.length
                });

                // Delete exported logs
                const deletedCount = await deleteExportedLogs();

                console.log(`✅ Daily export completed: ${logs.length} logs exported, ${deletedCount} deleted`);
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
