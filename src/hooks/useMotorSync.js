import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { heartbeat, healthCheck } from '../api';

// Warning thresholds (in seconds)
const WARN_THRESHOLD = 15 * 60;     // 15 minutes — caution
const CRITICAL_THRESHOLD = 30 * 60; // 30 minutes — heavy warning

export function useMotorSync() {
    const [isRunning, setIsRunning] = useState(false);
    const [tempStartTime, setTempStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [lastActionTime, setLastActionTime] = useState(null);
    const [isServerWaking, setIsServerWaking] = useState(true);
    const [serverError, setServerError] = useState(null);

    // Refs
    const heartbeatRef = useRef(null);
    const timerRef = useRef(null);
    const elapsedTimeRef = useRef(0);
    const isRunningRef = useRef(false);

    // Warning tracking refs (fire once per threshold, reset on stop)
    const warnFiredRef = useRef(false);
    const criticalFiredRef = useRef(false);

    // Keep isRunningRef in sync with isRunning state
    useEffect(() => {
        isRunningRef.current = isRunning;
    }, [isRunning]);

    // Derive warning level from elapsed time
    const warningLevel = useMemo(() => {
        if (!isRunning) return 'normal';
        if (elapsedTime >= CRITICAL_THRESHOLD) return 'critical';
        if (elapsedTime >= WARN_THRESHOLD) return 'warning';
        return 'normal';
    }, [isRunning, elapsedTime]);

    const formatElapsedTime = useCallback((seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    }, []);

    const getStartTimeFormatted = useCallback(() => {
        if (!tempStartTime) return '';
        return new Date(tempStartTime).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace(/\b(am|pm)\b/i, match => match.toUpperCase());
    }, [tempStartTime]);

    // Reset warning refs when motor stops
    const resetWarnings = useCallback(() => {
        warnFiredRef.current = false;
        criticalFiredRef.current = false;
    }, []);

    // Sync with server
    const syncWithServer = useCallback(async () => {
        try {
            const data = await heartbeat();

            // Handle server-side auto-stop
            if (data.autoStopped) {
                setIsRunning(false);
                setTempStartTime(null);
                setElapsedTime(0);
                elapsedTimeRef.current = 0;
                resetWarnings();
                if (timerRef.current) clearInterval(timerRef.current);
                toast.error(data.autoStopReason || 'Motor auto-stopped (safety limit)', {
                    icon: '🛑',
                    duration: 8000
                });
                if (data.lastStoppedTime) {
                    setLastActionTime(data.lastStoppedTime);
                }
                return;
            }

            // Use ref to avoid stale closure over isRunning
            if (isRunningRef.current && !data.isRunning) {
                console.log('📉 Remote stop detected');
                setIsRunning(false);
                setTempStartTime(null);
                setElapsedTime(0);
                elapsedTimeRef.current = 0;
                resetWarnings();
                if (data.lastStoppedTime) {
                    setLastActionTime(data.lastStoppedTime);
                    toast('Motor was stopped remotely', { icon: '📴' });
                }
                if (timerRef.current) clearInterval(timerRef.current);
            } else {
                setIsRunning(data.isRunning);
                setTempStartTime(data.startTime);
            }

            // Sync elapsed time if drifted by more than 2 seconds
            if (Math.abs(data.elapsedSeconds - elapsedTimeRef.current) > 2) {
                setElapsedTime(data.elapsedSeconds);
                elapsedTimeRef.current = data.elapsedSeconds;
            }
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }, [resetWarnings]);

    // Initial Wakeup
    useEffect(() => {
        let isMounted = true;
        async function wakeUp() {
            try {
                await healthCheck();
                const data = await heartbeat();
                if (isMounted) {
                    setIsRunning(data.isRunning);
                    setTempStartTime(data.startTime);
                    setElapsedTime(data.elapsedSeconds);
                    elapsedTimeRef.current = data.elapsedSeconds;
                    setIsServerWaking(false);

                    // Handle auto-stop detected on first load
                    if (data.autoStopped) {
                        toast.error(data.autoStopReason || 'Motor was auto-stopped (safety limit)', {
                            icon: '🛑',
                            duration: 8000
                        });
                    } else if (data.isRunning) {
                        toast.success(`Motor is running since ${data.startTimeFormatted}`, { icon: '⚡', duration: 4000 });

                        // Fire warnings immediately if we open the app mid-run
                        if (data.elapsedSeconds >= CRITICAL_THRESHOLD) {
                            criticalFiredRef.current = true;
                            warnFiredRef.current = true;
                            toast.error('Motor running for over 30 minutes! Consider stopping.', { icon: '🔴', duration: 10000 });
                        } else if (data.elapsedSeconds >= WARN_THRESHOLD) {
                            warnFiredRef.current = true;
                            toast('Motor running for over 15 minutes', { icon: '⚠️', duration: 6000 });
                        }
                    }
                }
            } catch {
                if (isMounted) {
                    setServerError('Could not connect to server.');
                    setIsServerWaking(false);
                }
            }
        }
        wakeUp();
        return () => { isMounted = false; };
    }, []);

    // Local Timer + Threshold Checks
    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => {
                    const newVal = prev + 1;
                    elapsedTimeRef.current = newVal;

                    // Fire warning toasts at exact thresholds (once each)
                    if (newVal === WARN_THRESHOLD && !warnFiredRef.current) {
                        warnFiredRef.current = true;
                        toast('Motor running for 15 minutes', { icon: '⚠️', duration: 6000 });
                    }
                    if (newVal === CRITICAL_THRESHOLD && !criticalFiredRef.current) {
                        criticalFiredRef.current = true;
                        toast.error('Motor running for 30 minutes! Consider stopping.', { icon: '🔴', duration: 10000 });
                    }

                    return newVal;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            resetWarnings();
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning, resetWarnings]);

    return {
        isRunning,
        setIsRunning,
        tempStartTime,
        setTempStartTime,
        elapsedTime,
        setElapsedTime,
        lastActionTime,
        setLastActionTime,
        isServerWaking,
        serverError,
        syncWithServer,
        heartbeatRef,
        elapsedTimeRef,
        timerRef,
        getStartTimeFormatted,
        formatElapsedTime,
        warningLevel
    };
}
