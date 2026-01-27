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
const APP_VERSION = '0.1.8'

function App() {
  const {
    isRunning, setIsRunning, tempStartTime, setTempStartTime,
    elapsedTime, setElapsedTime, lastActionTime, setLastActionTime,
    isServerWaking, serverError, syncWithServer,
    heartbeatRef, elapsedTimeRef, timerRef,
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
  }, [isRunning, isOffline, isPageVisible, syncWithServer]);


  // Loading/Error States
  if (isServerWaking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
        <Toaster position="top-center" />
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Connecting to Server...</h1>
          <p className="text-xl text-slate-400">Please wait, the server is waking up</p>
        </div>
      </div>
    )
  }

  if (serverError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
        <Toaster position="top-center" />
        <div className="text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl md:text-4xl font-bold text-red-400 mb-4">Connection Failed</h1>
          <p className="text-xl text-slate-400 mb-8">{serverError}</p>
          <button onClick={() => window.location.reload()} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-xl rounded-xl transition-colors">Try Again</button>
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
          style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
        }}
      />

      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
          📡 No internet connection - Actions disabled
        </div>
      )}

      <Header appVersion={APP_VERSION} />

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

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isOffline={isOffline}
        setConfirmation={setConfirmation}
        appVersion={APP_VERSION}
      />

      <MotorStatus isRunning={isRunning} />

      <ControlPanel
        isRunning={isRunning}
        setIsRunning={setIsRunning}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        isOffline={isOffline}
        elapsedTime={elapsedTime}
        startTimeFormatted={getStartTimeFormatted()}
        formatElapsedTime={formatElapsedTime}
        syncWithServer={syncWithServer}
        setTempStartTime={setTempStartTime}
        setElapsedTime={setElapsedTime}
        elapsedTimeRef={elapsedTimeRef}
        setLastActionTime={setLastActionTime}
      />

      {!isRunning && lastActionTime && (
        <div className="w-full max-w-sm mb-8 bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <p className="text-center text-slate-400 text-lg">
            ✓ Motor was stopped at <span className="text-white font-medium">{lastActionTime}</span>
          </p>
        </div>
      )}

      {!lastActionTime && !isRunning && (
        <div className="mt-8 px-6 py-3 bg-blue-900/30 rounded-xl border border-blue-500/30">
          <p className="text-lg text-blue-300 text-center">
            💡 Press the big green button above to start the motor
          </p>
        </div>
      )}

      <Footer appVersion={APP_VERSION} />

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
