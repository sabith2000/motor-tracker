import express from 'express';
import {
    getHealth,
    getHeartbeat,
    getStatus,
    startMotor,
    stopMotor,
    getLogs,
    exportLogs,
    getDebug
} from '../controllers/motorController.js';

const router = express.Router();

router.get('/health', getHealth);
router.get('/heartbeat', getHeartbeat);
router.get('/status', getStatus);
router.post('/start', startMotor);
router.post('/stop', stopMotor);
router.get('/logs', getLogs);
router.post('/export', exportLogs);
router.get('/debug', getDebug);

export default router;
