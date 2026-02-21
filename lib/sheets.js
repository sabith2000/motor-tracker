import { google } from 'googleapis';
import { formatDateIST, formatTimeIST } from './time.js';

// Sheet ID from environment
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Column definitions
const COLUMNS = ['Date', 'Start Time', 'End Time', 'Duration (min)', 'Exported At', 'Batch Info'];
const COLUMN_COUNT = COLUMNS.length;

// ============================================
// Credentials & Auth
// ============================================

/**
 * Get Google credentials from environment variable.
 */
function getCredentials() {
    if (process.env.GOOGLE_CREDENTIALS) {
        try {
            const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            if (creds.private_key) {
                creds.private_key = creds.private_key.replace(/\\n/g, '\n');
            }
            return creds;
        } catch (e) {
            console.error('❌ Failed to parse GOOGLE_CREDENTIALS env var:', e.message);
            return null;
        }
    }

    console.log('⚠️ No Google credentials found (set GOOGLE_CREDENTIALS env var)');
    return null;
}

/**
 * Check if Google Sheets integration is fully configured.
 */
export function isConfigured() {
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

function buildBatchInfoFormatRequest(rowIndex) {
    return {
        repeatCell: {
            range: {
                sheetId: 0,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 5,
                endColumnIndex: 6
            },
            cell: {
                userEnteredFormat: {
                    textFormat: {
                        bold: true,
                        italic: true,
                        fontSize: 9,
                        foregroundColor: { red: 0.33, green: 0.33, blue: 0.33 }
                    }
                }
            },
            fields: 'userEnteredFormat(textFormat)'
        }
    };
}

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

        // Step 1: Ensure headers exist
        let headersComplete = false;
        try {
            const headerCheck = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: 'Sheet1!A1:F1'
            });
            const firstRow = headerCheck.data.values?.[0] || [];
            headersComplete = firstRow.length >= COLUMN_COUNT && firstRow[0] === COLUMNS[0];
        } catch {
            headersComplete = false;
        }

        const formatRequests = [];

        if (!headersComplete) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: 'Sheet1!A1:F1',
                valueInputOption: 'RAW',
                resource: { values: [COLUMNS] }
            });
            formatRequests.push(buildHeaderFormatRequest());
            formatRequests.push(buildFreezeRowRequest());
            console.log('📋 Headers written/updated');
        }

        // Step 2: Find the true last row
        const colA = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:A'
        });
        const lastOccupiedRow = colA.data.values?.length || 1;
        const nextRow = lastOccupiedRow + 1;

        console.log(`📍 Sheet last occupied row: ${lastOccupiedRow}, will write starting at row ${nextRow}`);

        // Step 3: Prepare data
        const totalDuration = logs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
        const batchInfo = `📊 ${logs.length} sessions | Total: ${Math.round(totalDuration * 10) / 10} min`;

        const dataRows = logs.map((log, index) => [
            log.date,
            log.startTime,
            log.endTime,
            log.durationMinutes,
            exportTimestamp,
            index === logs.length - 1 ? batchInfo : ''
        ]);

        // Step 4: Write data
        const writeRange = `Sheet1!A${nextRow}:F${nextRow + dataRows.length - 1}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: writeRange,
            valueInputOption: 'RAW',
            resource: { values: dataRows }
        });

        console.log(`📝 Wrote ${dataRows.length} rows to range ${writeRange}`);

        // Step 5: Apply formatting
        const dataStartRow = nextRow - 1;
        const dataEndRow = dataStartRow + dataRows.length;
        const lastDataRowIndex = dataEndRow - 1;

        formatRequests.push(...buildZebraStripeRequests(dataStartRow, dataEndRow));
        formatRequests.push(buildBatchInfoFormatRequest(lastDataRowIndex));
        formatRequests.push(buildDurationFormatRequest(dataStartRow, dataEndRow));
        formatRequests.push(buildAutoResizeRequest());

        if (formatRequests.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SHEET_ID,
                resource: { requests: formatRequests }
            });
        }

        console.log(`✅ Exported ${logs.length} logs to Google Sheets at rows ${nextRow}-${nextRow + dataRows.length - 1} (${exportTimestamp})`);
        return true;
    } catch (error) {
        const friendlyMessage = classifyExportError(error);
        console.error('❌ Export failed:', friendlyMessage);
        throw new Error(friendlyMessage);
    }
}
