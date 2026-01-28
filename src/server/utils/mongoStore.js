import mongoose from 'mongoose';
import { isDBConnected } from './db.js';

// ============================================
// Schemas
// ============================================

const statusSchema = new mongoose.Schema({
    isRunning: { type: Boolean, default: false },
    tempStartTime: { type: Date, default: null },
    lastStoppedTime: { type: String, default: null },
    lastHeartbeat: { type: Date, default: null }
}, { timestamps: true });

const logSchema = new mongoose.Schema({
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    rawStartTime: { type: Date, required: true, index: true },
    rawEndTime: { type: Date, required: true },
    exportedToSheets: { type: Boolean, default: false }
}, { timestamps: true });

const archiveSchema = new mongoose.Schema({
    lastExportDate: { type: String, default: null },
    totalArchivedEntries: { type: Number, default: 0 }
}, { timestamps: true });

// ============================================
// Models
// ============================================

const Status = mongoose.model('Status', statusSchema);
const Log = mongoose.model('Log', logSchema);
const Archive = mongoose.model('Archive', archiveSchema);

// ============================================
// Status Operations
// ============================================

/**
 * Get current motor status (creates default if none exists)
 */
export async function getStatus() {
    if (!isDBConnected()) {
        throw new Error('Database not connected');
    }

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
    if (!isDBConnected()) {
        throw new Error('Database not connected');
    }

    const status = await Status.findOneAndUpdate(
        {},
        { ...updates, lastHeartbeat: new Date() },
        { new: true, upsert: true }
    );
    return status;
}

// ============================================
// Log Operations
// ============================================

/**
 * Add a new log entry
 */
export async function addLog(logEntry) {
    if (!isDBConnected()) {
        throw new Error('Database not connected');
    }

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
 * Get all logs (optionally filter by export status)
 */
export async function getLogs(unexportedOnly = false) {
    if (!isDBConnected()) {
        throw new Error('Database not connected');
    }

    const query = unexportedOnly ? { exportedToSheets: false } : {};
    const logs = await Log.find(query).sort({ rawStartTime: -1 });
    return logs;
}

/**
 * Get log count
 */
export async function getLogCount() {
    if (!isDBConnected()) {
        throw new Error('Database not connected');
    }
    return await Log.countDocuments();
}

/**
 * Mark logs as exported
 */
export async function markLogsAsExported(logIds) {
    if (!isDBConnected()) {
        throw new Error('Database not connected');
    }

    await Log.updateMany(
        { _id: { $in: logIds } },
        { exportedToSheets: true }
    );
}

/**
 * Delete exported logs (cleanup after successful export)
 */
export async function deleteExportedLogs() {
    if (!isDBConnected()) {
        throw new Error('Database not connected');
    }

    const result = await Log.deleteMany({ exportedToSheets: true });
    return result.deletedCount;
}

// ============================================
// Archive Operations
// ============================================

/**
 * Get archive metadata
 */
export async function getArchive() {
    if (!isDBConnected()) {
        throw new Error('Database not connected');
    }

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
    if (!isDBConnected()) {
        throw new Error('Database not connected');
    }

    const archive = await Archive.findOneAndUpdate(
        {},
        updates,
        { new: true, upsert: true }
    );
    return archive;
}

// ============================================
// Utility
// ============================================

/**
 * Initialize database with default data if empty
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
