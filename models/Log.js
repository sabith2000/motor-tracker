import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    rawStartTime: { type: Date, required: true, index: true },
    rawEndTime: { type: Date, required: true },
    exportedToSheets: { type: Boolean, default: false },
    exportCount: { type: Number, default: 0 },
    lastExportedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.models.Log || mongoose.model('Log', logSchema);
