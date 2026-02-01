export default function Header({ isConnected = true }) {
    return (
        <header className="absolute top-0 left-0 right-0 z-40">
            {/* Top Bar with Status */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                {/* Logo + Brand */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img
                            src="/logo.svg"
                            alt="Motor Tracker"
                            className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        />
                        {/* Status dot on logo */}
                        <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${isConnected ? 'bg-green-500' : 'bg-red-500'
                                }`}
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="brand-title text-lg sm:text-xl tracking-wider leading-tight">
                            Motor Tracker
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest">
                            Home Automation
                        </span>
                    </div>
                </div>

                {/* Connection Status Pill */}
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    {isConnected ? 'Connected' : 'Offline'}
                </div>
            </div>
        </header>
    )
}
