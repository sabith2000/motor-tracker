import { connectDB } from '../lib/db.js';
import { getLogs, getLogsPaginated, getArchive, getLogCount } from '../lib/mongoStore.js';

// Max logs before auto-export
const MAX_LOG_ENTRIES = 100;

export default async function handler(req, res) {
    try {
        await connectDB();

        // Parse query params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const dateFilter = req.query.date || null;

        if (req.query.page || req.query.limit || req.query.date) {
            // Paginated request for History View
            const data = await getLogsPaginated(page, limit, dateFilter);

            res.json({
                logs: data.logs.map(log => ({
                    id: log._id,
                    date: log.date,
                    startTime: log.startTime,
                    endTime: log.endTime,
                    durationMinutes: log.durationMinutes,
                    exportedToSheets: log.exportedToSheets
                })),
                pagination: {
                    page: data.page,
                    limit: data.limit,
                    total: data.total,
                    totalPages: data.totalPages,
                    hasMore: data.hasMore
                }
            });
        } else {
            // Legacy/Export request (all logs + archive details)
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
        }
    } catch (error) {
        console.error('Get logs error:', error.message);
        res.status(500).json({ error: 'Failed to read logs' });
    }
}
