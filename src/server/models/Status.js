import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema({
    isRunning: { type: Boolean, default: false },
    tempStartTime: { type: Date, default: null },
    lastStoppedTime: { type: String, default: null },
    lastHeartbeat: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Status', statusSchema);
