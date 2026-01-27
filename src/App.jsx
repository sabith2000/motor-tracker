import { useState, useEffect, useCallback, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { healthCheck, getStatus, startMotor, stopMotor, exportToSheets, heartbeat, isOnline } from './api'

// App version
const APP_VERSION = '0.1.5'

function App() {
  // Server state
  const [isServerWaking, setIsServerWaking] = useState(true)
  const [serverError, setServerError] = useState(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden)

  // Responsive Toast Position
  const [toastPosition, setToastPosition] = useState('bottom-center')

  // Motor state
  const [isRunning, setIsRunning] = useState(false)
  const [tempStartTime, setTempStartTime] = useState(null)
  const [lastActionTime, setLastActionTime] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Refs for intervals
  const heartbeatRef = useRef(null)
  const timerRef = useRef(null)

  // Handle screen resize for Toast position
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setToastPosition('top-center')
      } else {
        setToastPosition('bottom-center')
      }
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Page Visibility Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      setIsPageVisible(isVisible)

      if (isVisible) {
        console.log('👀 Tab active - Waking up sync...')
        // Immediate sync when tab becomes visible
        syncWithServer()
      } else {
        console.log('💤 Tab hidden - Pausing sync to save server hours')
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      toast.success('Back online!', { icon: '🌐' })
      // Resync with server
      syncWithServer()
    }

    const handleOffline = () => {
      setIsOffline(true)
      toast.error('No internet connection', { icon: '📡', duration: 5000 })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync with server (heartbeat)
  const syncWithServer = useCallback(async () => {
    try {
      const data = await heartbeat()
      setIsRunning(data.isRunning)
      setTempStartTime(data.startTime)
      // Only force update elapsed time if significantly different to avoid jitter
      if (Math.abs(data.elapsedSeconds - elapsedTime) > 2) {
        setElapsedTime(data.elapsedSeconds)
      }
    } catch (error) {
      console.error('Heartbeat failed:', error)
    }
  }, [elapsedTime])

  // Wake up server and get initial status
  useEffect(() => {
    let isMounted = true

    async function wakeUpServer() {
      try {
        // First, health check to wake server
        await healthCheck()

        // Get status via heartbeat (includes elapsed time)
        const data = await heartbeat()

        if (isMounted) {
          setIsRunning(data.isRunning)
          setTempStartTime(data.startTime)
          setElapsedTime(data.elapsedSeconds)
          setIsServerWaking(false)

          // Show toast if motor was already running
          if (data.isRunning) {
            toast.success(`Motor is running since ${data.startTimeFormatted}`, { icon: '⚡', duration: 4000 })
          }
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

  // Smart Heartbeat Logic
  useEffect(() => {
    // Stop all polling if offline or tab hidden (Huge savings for free tier)
    if (isOffline || !isPageVisible) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      return
    }

    // Determine poll interval based on state
    // ON = 3s (Fast sync), OFF = 15s (Idle check)
    const intervalTime = isRunning ? 3000 : 15000

    console.log(`⏱️ Polling every ${intervalTime / 1000}s`)

    heartbeatRef.current = setInterval(syncWithServer, intervalTime)

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
    }
  }, [isRunning, isOffline, isPageVisible, syncWithServer])

  // Local timer - updates every second while motor is running
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning])

  const handleButtonClick = useCallback(async () => {
    if (isProcessing || isOffline) {
      if (isOffline) {
        toast.error('Cannot perform action while offline')
      }
      return
    }

    setIsProcessing(true)

    try {
      if (!isRunning) {
        // Starting the motor
        const result = await startMotor()
        if (result.success) {
          setIsRunning(true)
          setTempStartTime(result.startTime)
          setElapsedTime(0)
          setLastActionTime(result.startTimeFormatted)
          toast.success('Motor started!', { icon: '🟢' })
          // Force immediate sync to update other clients faster
          setTimeout(syncWithServer, 500)
        }
      } else {
        // Stopping the motor
        const result = await stopMotor()
        if (result.success) {
          setIsRunning(false)
          setTempStartTime(null)
          setLastActionTime(result.log.endTime)
          toast.success(`Motor stopped. Ran for ${result.log.durationMinutes} minutes`, { icon: '🔴' })
          // Force immediate sync
          setTimeout(syncWithServer, 500)
        }
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }, [isRunning, isProcessing, isOffline, syncWithServer])

  const handleExport = async () => {
    if (isOffline) {
      toast.error('Cannot export while offline')
      return
    }

    // Confirmation check
    const confirmed = window.confirm(
      'Export all logs to Google Sheets?\n\nThis will:\n• Send logs to your Google Sheet\n• Clear local logs after export\n\nProceed?'
    )

    if (!confirmed) {
      return
    }

    setIsExporting(true)

    try {
      const result = await exportToSheets()
      toast.success(result.message, { icon: '📊', duration: 4000 })
      setShowSettings(false)
    } catch (error) {
      // Specific error handling
      if (error.message?.includes('No logs')) {
        toast.error('No logs to export', { icon: '📭' })
      } else if (error.message?.includes('not configured')) {
        toast.error('Google Sheets not configured', { icon: '⚙️' })
      } else {
        toast.error(error.message || 'Export failed. Please try again.')
      }
    } finally {
      setIsExporting(false)
    }
  }

  const formatElapsedTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`
    } else if (mins > 0) {
      return `${mins}m ${secs}s`
    } else {
      return `${secs}s`
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
        <Toaster position="top-center" />
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
        <Toaster position="top-center" />
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
      <Toaster
        position={toastPosition}
        containerStyle={{
          bottom: toastPosition === 'bottom-center' ? 80 : undefined,
          top: toastPosition === 'top-center' ? 20 : undefined
        }}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155'
          }
        }}
      />

      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
          📡 No internet connection - Actions disabled
        </div>
      )}

      {/* Header with Logo */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <img src="/logo.svg" alt="Motor Tracker" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
        <span className="brand-title text-xl sm:text-2xl tracking-wider pt-1">Motor Tracker</span>
      </div>

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
                  disabled={isExporting || isOffline}
                  className={`w-full py-3 px-4 rounded-xl text-white font-semibold transition-all ${isExporting || isOffline
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
              </div>

              {/* Version Info */}
              <div className="text-center text-slate-500 text-sm pt-4 border-t border-slate-700">
                Motor Tracker v{APP_VERSION}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Display */}
      <div className="text-center mb-8 mt-8">
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
        Motor Tracker v{APP_VERSION}
      </footer>
    </div>
  )
}

export default App
