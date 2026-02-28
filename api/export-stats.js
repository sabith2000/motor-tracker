import { connectDB } from '../lib/db.js';
import { getExportStats, getArchive } from '../lib/mongoStore.js';
import { isConfigured } from '../lib/sheets.js';
import { formatDateIST, formatTimeIST } from '../lib/time.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const stats = await getExportStats();
        const archive = await getArchive();
        const configured = isConfigured();

        // Format lastExportDate with date + time if it's a Date object
        let lastExportFormatted = null;
        if (archive.lastExportDate) {
            const d = new Date(archive.lastExportDate);
            if (!isNaN(d.getTime())) {
                lastExportFormatted = `${formatDateIST(d)}, ${formatTimeIST(d)}`;
            } else {
                // Fallback for old string format
                lastExportFormatted = archive.lastExportDate;
            }
        }

        res.json({
            totalLogs: stats.totalLogs,
            unexportedCount: stats.unexportedCount,
            exportedCount: stats.exportedCount,
            lastExportDate: lastExportFormatted,
            totalArchivedEntries: archive.totalArchivedEntries,
            configured
        });
    } catch (error) {
        console.error('Export stats error:', error.message);
        res.status(500).json({ error: 'Failed to get export stats' });
    }
}
