import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './src/server/routes/api.js';
import { connectDB } from './src/server/utils/db.js';
import { initializeDB } from './src/server/utils/mongoStore.js';
import { scheduleExport } from './src/server/utils/sheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Start Server
async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Initialize database with default data
        await initializeDB();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`🚀 Motor Tracker Server running on port ${PORT}`);
            console.log(`📦 Storage: MongoDB`);
            console.log(`📊 API endpoints:`);
            console.log(`   GET  /api/health    - Health check`);
            console.log(`   GET  /api/heartbeat - Heartbeat with status`);
            console.log(`   GET  /api/status    - Get motor status`);
            console.log(`   POST /api/start     - Start motor`);
            console.log(`   POST /api/stop      - Stop motor`);
            console.log(`   GET  /api/logs      - Get logs`);
            console.log(`   POST /api/export    - Export to Sheets`);
            console.log(`   GET  /api/debug     - Debug info`);

            // Schedule daily export at midnight IST
            scheduleExport();
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();
