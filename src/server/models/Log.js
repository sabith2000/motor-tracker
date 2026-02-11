import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    rawStartTime: { type: Date, required: true, index: true },
    rawEndTime: { type: Date, required: true },
    exportedToSheets: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Log', logSchema);
