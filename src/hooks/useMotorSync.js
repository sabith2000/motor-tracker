import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { heartbeat, healthCheck } from '../api';

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
        });
    }, [tempStartTime]);

    // Sync with server
    const syncWithServer = useCallback(async () => {
        try {
            const data = await heartbeat();

            // Check for remote stop
            if (isRunning && !data.isRunning) {
                console.log('📉 Remote stop detected');
                setIsRunning(false);
                setTempStartTime(null);
                if (data.lastStoppedTime) {
                    setLastActionTime(data.lastStoppedTime);
                    toast('Motor was stopped remotely', { icon: '📴' });
                }
                if (timerRef.current) clearInterval(timerRef.current);
            } else {
                setIsRunning(data.isRunning);
                setTempStartTime(data.startTime);
            }

            // Sync elapsed time
            if (Math.abs(data.elapsedSeconds - elapsedTimeRef.current) > 2) {
                setElapsedTime(data.elapsedSeconds);
                elapsedTimeRef.current = data.elapsedSeconds;
            }
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }, [isRunning]);

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
                    if (data.isRunning) {
                        toast.success(`Motor is running since ${data.startTimeFormatted}`, { icon: '⚡', duration: 4000 });
                    }
                }
            } catch (error) {
                if (isMounted) {
                    setServerError('Could not connect to server.');
                    setIsServerWaking(false);
                }
            }
        }
        wakeUp();
        return () => { isMounted = false; };
    }, []);

    // Local Timer
    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => {
                    const newVal = prev + 1;
                    elapsedTimeRef.current = newVal;
                    return newVal;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning]);

    return {
        isRunning,
        setIsRunning,
        tempStartTime,
        setTempStartTime,
        elapsedTime,
        setElapsedTime,
        lastActionTime,
        setLastActionTime, // Exporting this setter for manual updates
        isServerWaking,
        serverError,
        syncWithServer,
        heartbeatRef,
        elapsedTimeRef,
        timerRef, // Exporting timerRef to clear it manually
        getStartTimeFormatted,
        formatElapsedTime
    };
}
