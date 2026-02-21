import { connectDB } from '../lib/db.js';
import { getLogs, getArchive, getLogCount } from '../lib/mongoStore.js';

// Max logs before auto-export
const MAX_LOG_ENTRIES = 100;

export default async function handler(req, res) {
    try {
        await connectDB();

        const logs = await getLogs();
        const archive = await getArchive();
        const logCount = await getLogCount();

        res.json({
            logs: logs.map(log => ({
                id: log._id,
                date: log.date,
                startTime: log.startTime,
                endTime: log.endTime,
                durationMinutes: log.durationMinutes,
                exportedToSheets: log.exportedToSheets
            })),
            count: logCount,
            maxEntries: MAX_LOG_ENTRIES,
            archive: {
                lastExportDate: archive.lastExportDate,
                totalArchivedEntries: archive.totalArchivedEntries
            }
        });
    } catch (error) {
        console.error('Get logs error:', error.message);
        res.status(500).json({ error: 'Failed to read logs' });
    }
}
