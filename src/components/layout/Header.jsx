export default function Header({ isConnected = true, onSettingsClick }) {
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

                {/* Right side: Status pill + Settings */}
                <div className="flex items-center gap-3">
                    {/* Connection Status Pill - hidden on mobile */}
                    <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        {isConnected ? 'Connected' : 'Offline'}
                    </div>

                    {/* Settings Button */}
                    <button
                        onClick={onSettingsClick}
                        className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/50 transition-colors"
                        aria-label="Settings"
                    >
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    )
}
