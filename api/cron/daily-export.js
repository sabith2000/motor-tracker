import { connectDB } from '../../lib/db.js';
import { getLogs } from '../../lib/mongoStore.js';
import { isConfigured } from '../../lib/sheets.js';
import { exportAndArchiveLogs } from '../../lib/exportHelper.js';

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

        const exportedCount = await exportAndArchiveLogs(logs);

        console.log(`✅ Daily export completed: ${exportedCount} logs exported`);
        return res.json({
            message: `Exported ${exportedCount} logs to Google Sheets`,
            count: exportedCount,
            exportedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Daily export failed:', error.message);
        return res.status(500).json({ error: error.message || 'Daily export failed' });
    }
}
