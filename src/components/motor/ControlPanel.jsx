import toast from 'react-hot-toast'
import { startMotor, stopMotor } from '../../api'

export default function ControlPanel({
    isRunning,
    setIsRunning,
    isProcessing,
    setIsProcessing,
    isOffline,
    elapsedTime,
    startTimeFormatted,
    formatElapsedTime,
    syncWithServer,
    setTempStartTime,
    setElapsedTime,
    elapsedTimeRef,
    setLastActionTime,
    lastActionTime
}) {

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
            {/* Live Info Panel */}
            {/* Live Info Panel (Running) */}
            {isRunning && (
                <div className="w-full max-w-sm mb-8 bg-slate-800/80 rounded-2xl p-5 border border-green-500/30 shadow-lg shadow-green-500/10">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-lg text-slate-400">Started at:</span>
                            <span className="text-xl font-semibold text-green-400">{startTimeFormatted}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-lg text-slate-400">Running for:</span>
                            <span className="text-2xl font-bold text-yellow-400 tabular-nums">
                                {formatElapsedTime(elapsedTime)}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-slate-700">
                            <p className="text-center text-green-300 text-lg animate-pulse">
                                🟢 Motor is working fine
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stopped Info Panel (Not Running) */}
            {!isRunning && lastActionTime && (
                <div className="w-full max-w-sm mb-8 bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
                    <p className="text-center text-slate-400 text-lg">
                        ✓ Motor was stopped at <span className="text-white font-medium">{lastActionTime}</span>
                    </p>
                </div>
            )}

            {/* Main Button */}
            <button
                onClick={handleButtonClick}
                disabled={isProcessing || isOffline}
                className={`
          w-56 h-56 md:w-72 md:h-72
          rounded-full
          text-4xl md:text-5xl font-bold text-white
          shadow-2xl
          transform transition-all duration-200 ease-out
          focus:outline-none focus:ring-4 focus:ring-offset-4 focus:ring-offset-slate-900
          ${isProcessing || isOffline
                        ? 'opacity-70 cursor-not-allowed scale-95'
                        : 'active:scale-95'
                    }
          ${isRunning
                        ? 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 focus:ring-red-500 shadow-red-500/40'
                        : 'bg-gradient-to-br from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 focus:ring-green-500 shadow-green-500/40'
                    }
        `}
            >
                <span className="drop-shadow-lg">
                    {isProcessing ? '...' : (isRunning ? 'STOP' : 'START')}
                </span>
            </button>

            {/* Button Description */}
            <p className="text-xl md:text-2xl text-slate-300 mt-8 text-center">
                {isOffline
                    ? '📡 Waiting for connection...'
                    : isProcessing
                        ? 'Please wait...'
                        : (isRunning
                            ? '👆 Tap the RED button to stop'
                            : '👆 Tap the GREEN button to start')
                }
            </p>
        </>
    )
}
