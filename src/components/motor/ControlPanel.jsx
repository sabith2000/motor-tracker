import toast from 'react-hot-toast'
import { startMotor, stopMotor } from '../../api'

export default function ControlPanel({
    motorState,
    motorActions
}) {
    const {
        isRunning, isProcessing, isOffline,
        elapsedTime, startTimeFormatted, lastActionTime
    } = motorState;

    const {
        setIsRunning, setIsProcessing, setTempStartTime,
        setElapsedTime, setLastActionTime, formatElapsedTime,
        syncWithServer, elapsedTimeRef
    } = motorActions;

    const handleButtonClick = async () => {
        if (isProcessing || isOffline) {
            if (isOffline) toast.error('Cannot perform action while offline')
            return
        }

        setIsProcessing(true)

        try {
            if (!isRunning) {
                // Start
                const result = await startMotor()
                if (result.success) {
                    setIsRunning(true)
                    setTempStartTime(result.startTime)
                    setElapsedTime(0)
                    elapsedTimeRef.current = 0
                    setLastActionTime(result.startTimeFormatted)
                    toast.success('Motor started!', { icon: '🟢' })
                    setTimeout(syncWithServer, 500)
                }
            } else {
                // Stop
                const result = await stopMotor()
                if (result.success) {
                    setIsRunning(false)
                    setTempStartTime(null)
                    setElapsedTime(0)
                    elapsedTimeRef.current = 0
                    setLastActionTime(result.log.endTime)
                    toast.success(`Motor stopped. Ran for ${result.log.durationMinutes} minutes`, { icon: '🔴' })
                    setTimeout(syncWithServer, 500)
                }
            }
        } catch (error) {
            if (error.message?.includes('already running')) {
                toast('Motor is already on', { icon: '⚠️' })
                setIsRunning(true)
                syncWithServer()
            } else if (error.message?.includes('not running')) {
                toast('Motor is already off', { icon: '⚠️' })
                setIsRunning(false)
                syncWithServer()
            } else {
                toast.error(error.message || 'Something went wrong')
            }
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <>
            {/* Live Info Panel (Running) */}
            {isRunning && (
                <div className="w-full max-w-sm mb-8 stat-card rounded-2xl p-5 border-green-500/30 shadow-lg shadow-green-500/10 animate-fade-in-up">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-base text-slate-400 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Started at
                            </span>
                            <span className="text-lg font-semibold text-green-400">{startTimeFormatted}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-base text-slate-400 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Running for
                            </span>
                            <span className="text-2xl font-bold text-yellow-400 tabular-nums">
                                {formatElapsedTime(elapsedTime)}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-slate-700/50">
                            <p className="text-center text-green-300 text-sm flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Motor is running fine
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stopped Info Panel (Not Running) */}
            {!isRunning && lastActionTime && (
                <div className="w-full max-w-sm mb-8 stat-card rounded-2xl p-4 animate-fade-in-up">
                    <p className="text-center text-slate-400 text-base flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Last stopped at <span className="text-white font-medium">{lastActionTime}</span>
                    </p>
                </div>
            )}

            {/* Main Button */}
            <button
                onClick={handleButtonClick}
                disabled={isProcessing || isOffline}
                className={`
                    w-52 h-52 md:w-64 md:h-64
                    rounded-full
                    text-4xl md:text-5xl font-bold text-white
                    transform transition-all duration-200 ease-out
                    focus:outline-none focus:ring-4 focus:ring-offset-4 focus:ring-offset-slate-900
                    ${isProcessing || isOffline
                        ? 'opacity-70 cursor-not-allowed scale-95'
                        : 'active:scale-95 hover:scale-[1.02]'
                    }
                    ${isRunning
                        ? 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 focus:ring-red-500 btn-glow-red'
                        : 'bg-gradient-to-br from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 focus:ring-green-500 btn-glow-green'
                    }
                `}
            >
                <span className="drop-shadow-lg">
                    {isProcessing ? '...' : (isRunning ? 'STOP' : 'START')}
                </span>
            </button>

            {/* Button Description */}
            <p className="text-lg md:text-xl text-slate-400 mt-8 text-center">
                {isOffline
                    ? '📡 Waiting for connection...'
                    : isProcessing
                        ? 'Please wait...'
                        : (isRunning
                            ? 'Tap to stop the motor'
                            : 'Tap to start the motor')
                }
            </p>
        </>
    )
}
