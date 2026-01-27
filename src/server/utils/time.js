// Format date in IST: DD/MM/YYYY
export function formatDateIST(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).split('/').join('/');
}

// Format time in IST: HH:MM AM/PM
export function formatTimeIST(date) {
    return new Date(date).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Calculate duration in minutes
export function calculateDurationMinutes(startTime, endTime) {
    const diff = new Date(endTime) - new Date(startTime);
    return Math.round(diff / (1000 * 60));
}
