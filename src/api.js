// API Base URL — auto-detects environment
// Vercel: same-origin (/api)
// Dev mode (vercel dev): same-origin (/api)
// Fallback for local Vite dev without vercel dev: hits localhost:3000
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Helper for fetch with retry logic and exponential backoff
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    let lastError;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            lastError = error;

            // Don't retry on client errors (4xx) except network failures
            if (error.message?.includes('HTTP 4')) {
                throw error;
            }

            // Wait before retrying (exponential backoff)
            if (attempt < retries - 1) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
                console.log(`API call failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

// Check if online
export function isOnline() {
    return navigator.onLine;
}

// Health check - used to wake up the server
export async function healthCheck() {
    return fetchWithRetry(`${API_BASE}/health`);
}

// Get current motor status
export async function getStatus() {
    return fetchWithRetry(`${API_BASE}/status`);
}

// Start the motor
export async function startMotor() {
    return fetchWithRetry(`${API_BASE}/start`, { method: 'POST' });
}

// Stop the motor
export async function stopMotor() {
    return fetchWithRetry(`${API_BASE}/stop`, { method: 'POST' });
}

// Get all logs
export async function getLogs() {
    return fetchWithRetry(`${API_BASE}/logs`);
}

// Manual export to Google Sheets
export async function exportToSheets(force = false) {
    const url = force ? `${API_BASE}/export?force=true` : `${API_BASE}/export`;
    return fetchWithRetry(url, { method: 'POST' });
}

// Get export stats (total, unexported, exported counts)
export async function getExportStats() {
    return fetchWithRetry(`${API_BASE}/export-stats`);
}

// Heartbeat - get server time and current status
export async function heartbeat() {
    return fetchWithRetry(`${API_BASE}/heartbeat`);
}
