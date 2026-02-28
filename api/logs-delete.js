import { connectDB } from '../lib/db.js';
import { deleteLog, deleteAllLogs } from '../lib/mongoStore.js';

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();

        // Clear all sessions
        if (req.query.all === 'true') {
            const deletedCount = await deleteAllLogs();
            return res.json({
                success: true,
                message: `Cleared all ${deletedCount} sessions`,
                deletedCount
            });
        }

        // Delete single session by ID
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ error: 'Missing id or all parameter' });
        }

        const deletedCount = await deleteLog(id);
        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            success: true,
            message: 'Session deleted',
            deletedCount
        });
    } catch (error) {
        console.error('Delete logs error:', error.message);
        res.status(500).json({ error: 'Failed to delete session(s)' });
    }
}
