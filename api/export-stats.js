import { connectDB } from '../lib/db.js';
import { getExportStats, getArchive } from '../lib/mongoStore.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const stats = await getExportStats();
        const archive = await getArchive();

        res.json({
            totalLogs: stats.totalLogs,
            unexportedCount: stats.unexportedCount,
            exportedCount: stats.exportedCount,
            lastExportDate: archive.lastExportDate,
            totalArchivedEntries: archive.totalArchivedEntries
        });
    } catch (error) {
        console.error('Export stats error:', error.message);
        res.status(500).json({ error: 'Failed to get export stats' });
    }
}
