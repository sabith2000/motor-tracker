import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import MotorStatus from './components/motor/MotorStatus'
import ControlPanel from './components/motor/ControlPanel'
import SettingsModal from './components/modals/SettingsModal'
import ConfirmationModal from './components/modals/ConfirmationModal'
import { useMotorSync } from './hooks/useMotorSync'

// App version
const APP_VERSION = '0.2.6-dev'

function App() {
  const {
    isRunning, setIsRunning, setTempStartTime,
    elapsedTime, setElapsedTime, lastActionTime, setLastActionTime,
    isServerWaking, serverError, syncWithServer,
    heartbeatRef, elapsedTimeRef,
    getStartTimeFormatted, formatElapsedTime
  } = useMotorSync();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
  const [toastPosition, setToastPosition] = useState('bottom-center');
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Confirmation Modal State
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDangerous: false,
    confirmText: 'Confirm'
  });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setToastPosition(window.innerWidth < 640 ? 'top-center' : 'bottom-center');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);
      if (isVisible) {
        console.log('👀 Tab active - Waking up sync...');
        syncWithServer();
      } else {
        console.log('💤 Tab hidden - Pausing sync');
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [syncWithServer]);

  // Handle Online/Offline
  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); syncWithServer(); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncWithServer]);

  // Smart Sync Polling
  useEffect(() => {
    if (isOffline || !isPageVisible) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }
    const intervalTime = isRunning ? 3000 : 15000;
    heartbeatRef.current = setInterval(syncWithServer, intervalTime);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [isRunning, isOffline, isPageVisible, syncWithServer, heartbeatRef]);

  // Connection state
  const isConnected = !isOffline && !isServerWaking && !serverError;

  // Loading State
  if (isServerWaking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
        <Toaster position="top-center" />
        <div className="text-center animate-fade-in-up">
          <img
            src="/logo.svg"
            alt="Motor Tracker"
            className="w-20 h-20 mx-auto mb-6 animate-pulse-glow"
          />
          <h1 className="brand-title text-2xl md:text-3xl mb-3">Motor Tracker</h1>
          <p className="text-slate-400 text-lg mb-6">Connecting to server...</p>
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (serverError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
        <Toaster position="top-center" />
        <div className="text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Connection Failed</h1>
          <p className="text-slate-400 mb-8 max-w-sm">{serverError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 pt-20 pb-24 relative">
      <Toaster
        position={toastPosition}
        containerStyle={{
          bottom: toastPosition === 'bottom-center' ? 100 : undefined,
          top: toastPosition === 'top-center' ? 60 : undefined
        }}
        toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
        }}
      />

      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50 text-sm">
          📡 No internet connection
        </div>
      )}

      <Header isConnected={isConnected} onSettingsClick={() => setShowSettings(true)} />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isOffline={isOffline}
        setConfirmation={setConfirmation}
        appVersion={APP_VERSION}
      />

      <MotorStatus isRunning={isRunning} />

      <ControlPanel
        motorState={{
          isRunning,
          isProcessing,
          isOffline,
          elapsedTime,
          startTimeFormatted: getStartTimeFormatted(),
          lastActionTime
        }}
        motorActions={{
          setIsRunning,
          setIsProcessing,
          setTempStartTime,
          setElapsedTime,
          setLastActionTime,
          formatElapsedTime,
          syncWithServer,
          elapsedTimeRef
        }}
      />

      {!lastActionTime && !isRunning && (
        <div className="mt-8 px-5 py-3 stat-card rounded-xl animate-fade-in-up">
          <p className="text-base text-blue-300 text-center flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tap the green button to start the motor
          </p>
        </div>
      )}

      <Footer appVersion={APP_VERSION} isConnected={isConnected} />

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        isDangerous={confirmation.isDangerous}
        onConfirm={confirmation.onConfirm}
        onCancel={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}

export default App
