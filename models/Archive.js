import mongoose from 'mongoose';

const archiveSchema = new mongoose.Schema({
    lastExportDate: { type: String, default: null },
    totalArchivedEntries: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.Archive || mongoose.model('Archive', archiveSchema);
