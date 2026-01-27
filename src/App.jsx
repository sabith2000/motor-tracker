import { useState, useEffect, useCallback } from 'react'
import { healthCheck, getStatus, startMotor, stopMotor, exportToSheets } from './api'

function App() {
  // Server state
  const [isServerWaking, setIsServerWaking] = useState(true)
  const [serverError, setServerError] = useState(null)

  // Motor state
  const [isRunning, setIsRunning] = useState(false)
  const [tempStartTime, setTempStartTime] = useState(null)
  const [lastActionTime, setLastActionTime] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState(null)

  // Wake up server and get initial status
  useEffect(() => {
    let isMounted = true

    async function wakeUpServer() {
      try {
        // First, health check to wake server
        await healthCheck()

        // Then get status
        const status = await getStatus()

        if (isMounted) {
          setIsRunning(status.isRunning)
          setTempStartTime(status.tempStartTime)
          setIsServerWaking(false)
        }
      } catch (error) {
        if (isMounted) {
          setServerError('Could not connect to server. Please try again.')
          setIsServerWaking(false)
        }
      }
    }

    wakeUpServer()

    return () => { isMounted = false }
  }, [])

  // Live timer - updates every second while motor is running
  useEffect(() => {
    let interval = null
    if (isRunning && tempStartTime) {
      // Calculate initial elapsed time
      setElapsedTime(Math.floor((Date.now() - new Date(tempStartTime).getTime()) / 1000))

      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - new Date(tempStartTime).getTime()) / 1000))
      }, 1000)
    } else {
      setElapsedTime(0)
    }
    return () => clearInterval(interval)
  }, [isRunning, tempStartTime])

  const handleButtonClick = useCallback(async () => {
    if (isProcessing) return

    setIsProcessing(true)

    try {
      if (!isRunning) {
        // Starting the motor
        const result = await startMotor()
        if (result.success) {
          setIsRunning(true)
          setTempStartTime(result.startTime)
          setLastActionTime(result.startTimeFormatted)
        }
      } else {
        // Stopping the motor
        const result = await stopMotor()
        if (result.success) {
          setIsRunning(false)
          setTempStartTime(null)
          setLastActionTime(result.log.endTime)
        }
      }
    } catch (error) {
      alert(error.message || 'Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }, [isRunning, isProcessing])

  const handleExport = async () => {
    setIsExporting(true)
    setExportMessage(null)

    try {
      const result = await exportToSheets()
      setExportMessage({ type: 'success', text: result.message })
    } catch (error) {
      setExportMessage({ type: 'error', text: error.message || 'Export failed' })
    } finally {
      setIsExporting(false)
    }
  }

  const formatElapsedTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs} hour${hrs > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`
    } else if (mins > 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`
    } else {
      return `${secs} second${secs !== 1 ? 's' : ''}`
    }
  }

  const getStartTimeFormatted = () => {
    if (!tempStartTime) return ''
    return new Date(tempStartTime).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Loading screen while server wakes up
  if (isServerWaking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Connecting to Server...
          </h1>
          <p className="text-xl text-slate-400">
            Please wait, the server is waking up
          </p>
          <p className="text-lg text-slate-500 mt-2">
            This may take up to 30 seconds
          </p>
        </div>
      </div>
    )
  }

  // Error screen if server connection failed
  if (serverError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl md:text-4xl font-bold text-red-400 mb-4">
            Connection Failed
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            {serverError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-xl rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 relative">

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(true)}
        className="absolute top-6 right-6 p-3 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
        aria-label="Settings"
      >
        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Export Section */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-700/50 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-2">📊 Export to Google Sheets</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Export all current logs to your Google Sheet. Logs are also exported automatically at midnight IST.
                </p>

                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className={`w-full py-3 px-4 rounded-xl text-white font-semibold transition-all ${isExporting
                      ? 'bg-slate-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500 active:scale-98'
                    }`}
                >
                  {isExporting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Exporting...
                    </span>
                  ) : (
                    'Export Now'
                  )}
                </button>

                {exportMessage && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${exportMessage.type === 'success'
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-red-900/50 text-red-300'
                    }`}>
                    {exportMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Display */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Motor Controller
        </h1>
        <div className={`text-2xl md:text-3xl font-semibold tracking-wide ${isRunning ? 'text-red-400' : 'text-green-400'
          }`}>
          {isRunning ? '⚡ Motor is RUNNING' : '○ Motor is OFF'}
        </div>
      </div>

      {/* Live Info Panel - Shows when motor is running */}
      {isRunning && (
        <div className="w-full max-w-sm mb-8 bg-slate-800/80 rounded-2xl p-5 border border-green-500/30 shadow-lg shadow-green-500/10">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg text-slate-400">Started at:</span>
              <span className="text-xl font-semibold text-green-400">{getStartTimeFormatted()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg text-slate-400">Running for:</span>
              <span className="text-xl font-semibold text-yellow-400 tabular-nums">
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

      {/* Helpful tip when motor is off */}
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
        disabled={isProcessing}
        className={`
          w-56 h-56 md:w-72 md:h-72
          rounded-full
          text-4xl md:text-5xl font-bold text-white
          shadow-2xl
          transform transition-all duration-200 ease-out
          focus:outline-none focus:ring-4 focus:ring-offset-4 focus:ring-offset-slate-900
          ${isProcessing
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
        {isProcessing
          ? 'Please wait...'
          : (isRunning
            ? '👆 Tap the RED button to stop'
            : '👆 Tap the GREEN button to start')
        }
      </p>

      {/* First time helper */}
      {!lastActionTime && !isRunning && (
        <div className="mt-8 px-6 py-3 bg-blue-900/30 rounded-xl border border-blue-500/30">
          <p className="text-lg text-blue-300 text-center">
            💡 Press the big green button above to start the motor
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="absolute bottom-6 text-slate-500 text-sm">
        Home Motor Control System
      </footer>
    </div>
  )
}

export default App
