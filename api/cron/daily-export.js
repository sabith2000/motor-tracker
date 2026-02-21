import { connectDB } from '../../lib/db.js';
import { getLogs, markLogsAsExported, getArchive, updateArchive } from '../../lib/mongoStore.js';
import { exportToSheets, isConfigured } from '../../lib/sheets.js';
import { formatDateIST } from '../../lib/time.js';

export default async function handler(req, res) {
    // Verify cron secret — Vercel sends this automatically for cron invocations
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!isConfigured()) {
        return res.json({ message: 'Google Sheets not configured, skipping export' });
    }

    try {
        await connectDB();

        const logs = await getLogs('unexported');

        if (logs.length === 0) {
            console.log('📭 No logs to export today');
            return res.json({ message: 'No logs to export', count: 0 });
        }

        // Export to Google Sheets
        await exportToSheets(logs.map(log => ({
            date: log.date,
            startTime: log.startTime,
            endTime: log.endTime,
            durationMinutes: log.durationMinutes
        })));

        // Mark as exported
        await markLogsAsExported(logs.map(log => log._id));

        // Update archive metadata
        const archive = await getArchive();
        await updateArchive({
            lastExportDate: formatDateIST(new Date()),
            totalArchivedEntries: archive.totalArchivedEntries + logs.length
        });

        console.log(`✅ Daily export completed: ${logs.length} logs exported`);
        return res.json({
            message: `Exported ${logs.length} logs to Google Sheets`,
            count: logs.length,
            exportedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Daily export failed:', error.message);
        return res.status(500).json({ error: error.message || 'Daily export failed' });
    }
}
