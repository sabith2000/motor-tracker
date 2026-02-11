import { google } from 'googleapis';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatDateIST, formatTimeIST } from './time.js';
import {
    getLogs,
    markLogsAsExported,
    getArchive,
    updateArchive
} from './mongoStore.js';
import { isDBConnected } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');

// Credentials file path (local development fallback)
const CREDENTIALS_FILE = path.join(PROJECT_ROOT, 'credentials.json');

// Sheet ID from environment
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Column definitions
const COLUMNS = ['Date', 'Start Time', 'End Time', 'Duration (min)', 'Exported At'];
const COLUMN_COUNT = COLUMNS.length;

// ============================================
// Credentials & Auth
// ============================================

/**
 * Get Google credentials from env var (production) or file (local dev).
 */
function getCredentials() {
    // Try environment variable first (cloud deployment)
    if (process.env.GOOGLE_CREDENTIALS) {
        try {
            const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            // Fix escaped newlines in private_key (common issue with env vars)
            if (creds.private_key) {
                creds.private_key = creds.private_key.replace(/\\n/g, '\n');
            }
            return creds;
        } catch (e) {
            console.error('❌ Failed to parse GOOGLE_CREDENTIALS env var:', e.message);
            return null;
        }
    }

    // Fallback to local credentials file
    if (fs.existsSync(CREDENTIALS_FILE)) {
        return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    }

    console.log('⚠️ No Google credentials found');
    return null;
}

/**
 * Check if Google Sheets integration is fully configured.
 */
function isConfigured() {
    const creds = getCredentials();
    return creds !== null && !!SHEET_ID;
}

/**
 * Get authenticated Google Sheets API client.
 */
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

// ============================================
// Sheet Formatting Helpers
// ============================================

/**
 * Format the header row: bold white text on blue background, centered.
 */
function buildHeaderFormatRequest() {
    return {
        repeatCell: {
            range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: COLUMN_COUNT
            },
            cell: {
                userEnteredFormat: {
                    backgroundColor: { red: 0.16, green: 0.38, blue: 0.7 },
                    textFormat: {
                        bold: true,
                        fontSize: 11,
                        foregroundColor: { red: 1, green: 1, blue: 1 }
                    },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE'
                }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
    };
}

/**
 * Freeze the first row so headers stay visible when scrolling.
 */
function buildFreezeRowRequest() {
    return {
        updateSheetProperties: {
            properties: {
                sheetId: 0,
                gridProperties: { frozenRowCount: 1 }
            },
            fields: 'gridProperties.frozenRowCount'
        }
    };
}

/**
 * Auto-resize all columns to fit content.
 */
function buildAutoResizeRequest() {
    return {
        autoResizeDimensions: {
            dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: COLUMN_COUNT
            }
        }
    };
}

/**
 * Apply alternating row colors (zebra stripes) to a range of data rows.
 */
function buildZebraStripeRequests(startRowIndex, endRowIndex) {
    const requests = [];
    const lightGray = { red: 0.95, green: 0.95, blue: 0.97 };
    const white = { red: 1, green: 1, blue: 1 };

    for (let row = startRowIndex; row < endRowIndex; row++) {
        const bgColor = (row % 2 === 0) ? white : lightGray;
        requests.push({
            repeatCell: {
                range: {
                    sheetId: 0,
                    startRowIndex: row,
                    endRowIndex: row + 1,
                    startColumnIndex: 0,
                    endColumnIndex: COLUMN_COUNT
                },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: bgColor
                    }
                },
                fields: 'userEnteredFormat.backgroundColor'
            }
        });
    }
    return requests;
}

/**
 * Format the summary row: bold text on a dark background.
 */
function buildSummaryRowFormatRequest(rowIndex) {
    return {
        repeatCell: {
            range: {
                sheetId: 0,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 0,
                endColumnIndex: COLUMN_COUNT
            },
            cell: {
                userEnteredFormat: {
                    backgroundColor: { red: 0.9, green: 0.93, blue: 0.98 },
                    textFormat: {
                        bold: true,
                        fontSize: 10
                    },
                    horizontalAlignment: 'CENTER'
                }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
    };
}

/**
 * Format the duration column with 1 decimal number format.
 */
function buildDurationFormatRequest(startRowIndex, endRowIndex) {
    return {
        repeatCell: {
            range: {
                sheetId: 0,
                startRowIndex: startRowIndex,
                endRowIndex: endRowIndex,
                startColumnIndex: 3,
                endColumnIndex: 4
            },
            cell: {
                userEnteredFormat: {
                    numberFormat: {
                        type: 'NUMBER',
                        pattern: '0.0'
                    },
                    horizontalAlignment: 'CENTER'
                }
            },
            fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
        }
    };
}

// ============================================
// Error Classification
// ============================================

/**
 * Classify Google Sheets API errors into user-friendly messages.
 */
function classifyExportError(error) {
    const message = error.message || '';
    const code = error.code || error.status;

    if (code === 401 || message.includes('invalid_grant') || message.includes('unauthorized')) {
        return 'Authentication failed. Google credentials may be expired or invalid.';
    }
    if (code === 403 || message.includes('permission') || message.includes('forbidden')) {
        return 'Permission denied. Ensure the service account has Editor access to the Google Sheet.';
    }
    if (code === 404 || message.includes('not found') || message.includes('notFound')) {
        return 'Google Sheet not found. Verify GOOGLE_SHEET_ID is correct.';
    }
    if (code === 429 || message.includes('rate limit') || message.includes('quota')) {
        return 'Google API rate limit exceeded. Please wait a few minutes and try again.';
    }
    if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED') || message.includes('network')) {
        return 'Network error. Unable to reach Google Sheets API.';
    }

    return `Export failed: ${message}`;
}

// ============================================
// Core Export Function
// ============================================

/**
 * Export logs to Google Sheets with professional formatting.
 *
 * Features:
 * - Auto-creates and formats header row on first export
 * - Freezes header row for easy scrolling
 * - Applies alternating row colors (zebra stripes) to new data
 * - Adds a bold summary row at the end of each export batch
 * - Auto-resizes columns to fit content
 * - Formats duration column with 1 decimal precision
 * - Classifies errors with helpful messages
 */
export async function exportToSheets(logs) {
    if (!isConfigured()) {
        throw new Error('Google Sheets not configured. Check GOOGLE_CREDENTIALS and GOOGLE_SHEET_ID environment variables.');
    }

    if (!logs || logs.length === 0) {
        throw new Error('No logs to export');
    }

    try {
        const sheets = await getSheetsClient();
        const exportTimestamp = `${formatDateIST(new Date())} ${formatTimeIST(new Date())}`;

        // Check if headers already exist
        const existingData = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A1:E1'
        });

        const firstRow = existingData.data.values?.[0] || [];
        const headersExist = firstRow.length > 0 && firstRow[0] === COLUMNS[0];

        // Setup formatting requests
        const formatRequests = [];

        // If headers don't exist, create them
        if (!headersExist) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: 'Sheet1!A1:E1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [COLUMNS] }
            });

            formatRequests.push(buildHeaderFormatRequest());
            formatRequests.push(buildFreezeRowRequest());
        }

        // Get current row count to calculate where new data starts
        const allData = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:A'
        });
        const currentRowCount = allData.data.values?.length || 1;

        // Prepare data rows
        const dataRows = logs.map(log => [
            log.date,
            log.startTime,
            log.endTime,
            log.durationMinutes,
            exportTimestamp
        ]);

        // Create summary row
        const totalDuration = logs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
        const summaryRow = [
            `📊 Batch: ${logs.length} sessions`,
            '',
            'Total Duration:',
            Math.round(totalDuration * 10) / 10,
            exportTimestamp
        ];

        // Append data rows + summary row
        const allRows = [...dataRows, summaryRow];
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:E',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: allRows }
        });

        // Calculate row indices for formatting (0-indexed for API)
        const dataStartRow = currentRowCount;
        const dataEndRow = dataStartRow + dataRows.length;
        const summaryRowIndex = dataEndRow;

        // Apply formatting
        formatRequests.push(...buildZebraStripeRequests(dataStartRow, dataEndRow));
        formatRequests.push(buildSummaryRowFormatRequest(summaryRowIndex));
        formatRequests.push(buildDurationFormatRequest(dataStartRow, dataEndRow));
        formatRequests.push(buildAutoResizeRequest());

        if (formatRequests.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SHEET_ID,
                resource: { requests: formatRequests }
            });
        }

        console.log(`✅ Exported ${logs.length} logs to Google Sheets (${exportTimestamp})`);
        return true;
    } catch (error) {
        const friendlyMessage = classifyExportError(error);
        console.error('❌ Export failed:', friendlyMessage);
        throw new Error(friendlyMessage);
    }
}

// ============================================
// Scheduled Export (Cron)
// ============================================

/**
 * Schedule daily export at midnight IST.
 * Exports all unexported logs, marks them as exported, and updates archive.
 */
export function scheduleExport() {
    if (!isConfigured()) {
        console.log('⚠️ Google Sheets not configured, daily export disabled');
        return;
    }

    cron.schedule('0 0 * * *', async () => {
        console.log('🕛 Running scheduled daily export...');

        try {
            if (!isDBConnected()) {
                console.error('❌ Database not connected, skipping scheduled export');
                return;
            }

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

                console.log(`✅ Daily export completed: ${logs.length} logs exported`);
            } else {
                console.log('📭 No logs to export today');
            }
        } catch (error) {
            console.error('❌ Daily export failed:', error.message);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    console.log('📅 Daily export scheduled for midnight IST');
}
