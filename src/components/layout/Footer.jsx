export default function Footer({ appVersion, isConnected = true }) {
    return (
        <footer className="absolute bottom-0 left-0 right-0 pb-4 pt-2">
            <div className="flex flex-col items-center gap-2">
                {/* Mobile connection status */}
                <div className={`sm:hidden flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isConnected
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    {isConnected ? 'Connected' : 'Offline'}
                </div>

                {/* Version + Tagline */}
                <div className="text-center">
                    <p className="text-slate-500 text-xs">
                        Motor Tracker v{appVersion}
                    </p>
                    <p className="text-slate-600 text-[10px] mt-0.5">
                        Built for smart homes
                    </p>
                </div>
            </div>
        </footer>
    )
}
