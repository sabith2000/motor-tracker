// API Base URL - change this when deploying to production
const API_BASE = import.meta.env.VITE_API_URL || 'https://motor-tracker-backend.onrender.com/api';

// Helper for fetch with error handling
async function fetchAPI(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
}

// Health check - used to wake up the server
export async function healthCheck() {
    return fetchAPI('/health');
}

// Get current motor status
export async function getStatus() {
    return fetchAPI('/status');
}

// Start the motor
export async function startMotor() {
    return fetchAPI('/start', { method: 'POST' });
}

// Stop the motor
export async function stopMotor() {
    return fetchAPI('/stop', { method: 'POST' });
}

// Get all logs
export async function getLogs() {
    return fetchAPI('/logs');
}

// Manual export to Google Sheets
export async function exportToSheets() {
    return fetchAPI('/export', { method: 'POST' });
}
