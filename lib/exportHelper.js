import { exportToSheets } from './sheets.js';
import { markLogsAsExported, getArchive, updateArchive } from './mongoStore.js';
import { formatDateIST } from './time.js';

/**
 * Export logs to Google Sheets and update archive metadata.
 * Shared by stop.js, export.js, and daily-export cron.
 */
export async function exportAndArchiveLogs(logs) {
    const logsToExport = logs.map(log => ({
        date: log.date,
        startTime: log.startTime,
        endTime: log.endTime,
        durationMinutes: log.durationMinutes
    }));

    await exportToSheets(logsToExport);
    await markLogsAsExported(logs.map(log => log._id));

    const archive = await getArchive();
    await updateArchive({
        lastExportDate: formatDateIST(new Date()),
        totalArchivedEntries: archive.totalArchivedEntries + logs.length
    });

    return logs.length;
}
