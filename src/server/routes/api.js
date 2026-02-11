import express from 'express';
import {
    getHealth,
    getHeartbeat,
    getStatusEndpoint,
    startMotor,
    stopMotor,
    getLogsEndpoint,
    exportLogsEndpoint,
    exportStatsEndpoint,
    getDebug
} from '../controllers/motorController.js';

const router = express.Router();

router.get('/health', getHealth);
router.get('/heartbeat', getHeartbeat);
router.get('/status', getStatusEndpoint);
router.post('/start', startMotor);
router.post('/stop', stopMotor);
router.get('/logs', getLogsEndpoint);
router.post('/export', exportLogsEndpoint);
router.get('/export-stats', exportStatsEndpoint);
router.get('/debug', getDebug);

export default router;
