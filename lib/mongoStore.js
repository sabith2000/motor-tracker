import Status from '../models/Status.js';
import Log from '../models/Log.js';
import Archive from '../models/Archive.js';

// ============================================
// Status Operations
// ============================================

/**
 * Get current motor status (creates default if none exists)
 */
export async function getStatus() {
    let status = await Status.findOne();
    if (!status) {
        status = await Status.create({
            isRunning: false,
            tempStartTime: null,
            lastStoppedTime: null,
            lastHeartbeat: new Date()
        });
    }
    return status;
}

/**
 * Update motor status
 */
export async function updateStatus(updates) {
    const status = await Status.findOneAndUpdate(
        {},
        { ...updates, lastHeartbeat: new Date() },
        { new: true, upsert: true }
    );
    return status;
}

/**
 * Atomically start the motor — only succeeds if motor is currently stopped.
 * Returns the updated document, or null if motor was already running.
 */
export async function atomicStart(startTime) {
    return await Status.findOneAndUpdate(
        { isRunning: false },
        {
            isRunning: true,
            tempStartTime: startTime,
            lastHeartbeat: new Date()
        },
        { new: true }
    );
}

/**
 * Atomically stop the motor — only succeeds if motor is currently running.
 * Returns the OLD document (to read tempStartTime), or null if motor was already stopped.
 */
export async function atomicStop(lastStoppedTime) {
    return await Status.findOneAndUpdate(
        { isRunning: true },
        {
            isRunning: false,
            tempStartTime: null,
            lastStoppedTime,
            lastHeartbeat: new Date()
        },
        { new: false }
    );
}

// ============================================
// Log Operations
// ============================================

/**
 * Add a new log entry (with duplicate detection)
 */
export async function addLog(logEntry) {
    // Check for duplicate (same rawStartTime)
    const existing = await Log.findOne({ rawStartTime: logEntry.rawStartTime });
    if (existing) {
        console.log('⚠️ Duplicate log entry detected, skipping');
        return existing;
    }

    const log = await Log.create({
        ...logEntry,
        exportedToSheets: false
    });
    return log;
}

/**
 * Get logs filtered by export status.
 * @param {'unexported'|'exported'|'all'} filter - Which logs to return
 */
export async function getLogs(filter = 'all') {
    let query = {};
    if (filter === 'unexported') query = { exportedToSheets: false };
    else if (filter === 'exported') query = { exportedToSheets: true };

    const logs = await Log.find(query).sort({ rawStartTime: -1 });
    return logs;
}

/**
 * Get paginated logs, optionally filtered by date string (DD/MM/YYYY)
 */
export async function getLogsPaginated(page = 1, limit = 20, dateFilter = null) {
    const query = dateFilter ? { date: dateFilter } : {};

    // Calculate skip
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        Log.find(query)
            .sort({ rawStartTime: -1 }) // Newest first
            .skip(skip)
            .limit(limit),
        Log.countDocuments(query)
    ]);

    return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + logs.length < total
    };
}

/**
 * Get total log count
 */
export async function getLogCount() {
    return await Log.countDocuments();
}

/**
 * Mark specific logs as exported to Google Sheets.
 */
export async function markLogsAsExported(logIds) {
    await Log.updateMany(
        { _id: { $in: logIds } },
        {
            exportedToSheets: true,
            lastExportedAt: new Date(),
            $inc: { exportCount: 1 }
        }
    );
}

/**
 * Get export stats for frontend display
 */
export async function getExportStats() {
    const totalLogs = await Log.countDocuments();
    const unexportedCount = await Log.countDocuments({ exportedToSheets: false });
    const exportedCount = totalLogs - unexportedCount;

    return { totalLogs, unexportedCount, exportedCount };
}

/**
 * Get usage analytics (totals, averages, daily breakdowns)
 * limitDays: optional filter to last N days
 */
export async function getUsageStats(limitDays = null) {
    const matchStage = {};

    if (limitDays) {
        let cutoff;
        if (limitDays === 1) {
            // "Today" — use start of today in IST (UTC+5:30)
            cutoff = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istNow = new Date(cutoff.getTime() + istOffset);
            istNow.setUTCHours(0, 0, 0, 0);
            cutoff = new Date(istNow.getTime() - istOffset);
        } else {
            cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - limitDays);
        }
        matchStage.rawStartTime = { $gte: cutoff };
    }

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                totalMinutes: { $sum: "$durationMinutes" },
                avgDuration: { $avg: "$durationMinutes" },
                longestSession: { $max: "$durationMinutes" }
            }
        }
    ];

    const [totals] = await Log.aggregate(pipeline);

    // Daily breakdown sorted by most recent rawStartTime per group
    const improvedDailyPipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: "$date",
                sessions: { $sum: 1 },
                totalMinutes: { $sum: "$durationMinutes" },
                latestRecord: { $max: "$rawStartTime" }
            }
        },
        { $sort: { latestRecord: -1 } }, // Sort precisely by time
        { $project: { _id: 0, date: "$_id", sessions: 1, totalMinutes: 1 } }
    ];

    const dailyUsage = await Log.aggregate(improvedDailyPipeline);

    return {
        totalSessions: totals?.totalSessions || 0,
        totalMinutes: Number((totals?.totalMinutes || 0).toFixed(1)),
        avgDuration: Number((totals?.avgDuration || 0).toFixed(1)),
        longestSession: Number((totals?.longestSession || 0).toFixed(1)),
        dailyUsage: dailyUsage.map(d => ({
            ...d,
            totalMinutes: Number(d.totalMinutes.toFixed(1))
        }))
    };
}

/**
 * Delete exported logs (cleanup after successful export)
 */
export async function deleteExportedLogs() {
    const result = await Log.deleteMany({ exportedToSheets: true });
    return result.deletedCount;
}

/**
 * Delete a single log entry by ID
 */
export async function deleteLog(logId) {
    const result = await Log.deleteOne({ _id: logId });
    return result.deletedCount;
}

/**
 * Delete all log entries and reset archive counters
 */
export async function deleteAllLogs() {
    const result = await Log.deleteMany({});
    await Archive.findOneAndUpdate(
        {},
        { lastExportDate: null, totalArchivedEntries: 0 },
        { upsert: true }
    );
    return result.deletedCount;
}

// ============================================
// Archive Operations
// ============================================

/**
 * Get archive metadata (creates default if none exists)
 */
export async function getArchive() {
    let archive = await Archive.findOne();
    if (!archive) {
        archive = await Archive.create({
            lastExportDate: null,
            totalArchivedEntries: 0
        });
    }
    return archive;
}

/**
 * Update archive metadata
 */
export async function updateArchive(updates) {
    const archive = await Archive.findOneAndUpdate(
        {},
        updates,
        { new: true, upsert: true }
    );
    return archive;
}

/**
 * Initialize database with default documents if empty
 */
export async function initializeDB() {
    try {
        await getStatus();
        await getArchive();
        console.log('📦 Database initialized');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error.message);
        throw error;
    }
}
