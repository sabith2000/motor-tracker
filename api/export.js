import { connectDB } from '../lib/db.js';
import { getLogs } from '../lib/mongoStore.js';
import { exportAndArchiveLogs } from '../lib/exportHelper.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const forceReExport = req.query.force === 'true';
        const logs = await getLogs(forceReExport ? 'exported' : 'unexported');

        if (logs.length === 0) {
            const message = forceReExport
                ? 'No logs found in the database'
                : 'No new logs to export (all logs already exported)';
            return res.status(400).json({ success: false, error: message });
        }

        const exportedCount = await exportAndArchiveLogs(logs);
        const mode = forceReExport ? 're-export (all logs)' : 'new logs only';

        res.json({
            success: true,
            message: `Exported ${exportedCount} logs to Google Sheets`,
            mode,
            exportedCount,
            exportedAt: `${formatDateIST(new Date())} ${formatTimeIST(new Date())}`
        });
    } catch (error) {
        console.error('Export failed:', error.message);
        res.status(500).json({ success: false, error: error.message || 'Export failed' });
    }
}
