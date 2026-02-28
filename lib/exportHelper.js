import { exportToSheets } from './sheets.js';
import { markLogsAsExported, getArchive, updateArchive } from './mongoStore.js';

/**
 * Export logs to Google Sheets and update archive metadata.
 * Shared by stop.js, export.js, and daily-export cron.
 *
 * Robustness: if Sheets write succeeds but marking logs fails,
 * we log a warning but don't throw — data is already in the sheet.
 * Next export may produce duplicates, but no data is lost.
 */
export async function exportAndArchiveLogs(logs) {
    const logsToExport = logs.map(log => ({
        date: log.date,
        startTime: log.startTime,
        endTime: log.endTime,
        durationMinutes: log.durationMinutes
    }));

    // Step 1: Write to Google Sheets (this is the critical step)
    await exportToSheets(logsToExport);

    // Step 2: Mark as exported in MongoDB (best-effort after Sheets success)
    try {
        await markLogsAsExported(logs.map(log => log._id));
    } catch (markError) {
        console.error(`⚠️ Sheets write succeeded but failed to mark ${logs.length} logs as exported:`, markError.message);
        // Don't throw — data is safely in the sheet already
    }

    // Step 3: Update archive metadata (best-effort)
    try {
        const archive = await getArchive();
        await updateArchive({
            lastExportDate: new Date(), // Store as ISO Date, not string
            totalArchivedEntries: archive.totalArchivedEntries + logs.length
        });
    } catch (archiveError) {
        console.error('⚠️ Failed to update archive metadata:', archiveError.message);
        // Don't throw — export itself succeeded
    }

    return logs.length;
}
