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
 * Delete exported logs (cleanup after successful export)
 */
export async function deleteExportedLogs() {
    const result = await Log.deleteMany({ exportedToSheets: true });
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
