import { connectDB } from '../lib/db.js';
import { getUsageStats } from '../lib/mongoStore.js';

export default async function handler(req, res) {
    try {
        await connectDB();

        // Parse days filter (e.g. ?days=7)
        const days = req.query.days ? parseInt(req.query.days) : null;

        const stats = await getUsageStats(days);
        res.json(stats);

    } catch (error) {
        console.error('Get stats error:', error.message);
        res.status(500).json({ error: 'Failed to calculate usage stats' });
    }
}
