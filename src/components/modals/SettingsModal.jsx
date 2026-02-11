import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { exportToSheets, getLogs } from '../../api'

export default function SettingsModal({ isOpen, onClose, isOffline, setConfirmation, appVersion }) {
    const [isExporting, setIsExporting] = useState(false)
    const [stats, setStats] = useState({ totalSessions: 0, lastRun: null })
    const [isLoadingStats, setIsLoadingStats] = useState(true)

    // Fetch stats when modal opens
    useEffect(() => {
        if (!isOpen || isOffline) return

        async function fetchStats() {
            setIsLoadingStats(true)
            try {
                const data = await getLogs()
                const logs = data.logs || []
                setStats({
                    totalSessions: data.count || logs.length,
                    lastRun: logs.length > 0 ? `${logs[0].date} ${logs[0].endTime}` : null
                })
            } catch (error) {
                console.error('Failed to fetch stats:', error)
            } finally {
                setIsLoadingStats(false)
            }
        }

        fetchStats()
    }, [isOpen, isOffline])

    if (!isOpen) return null

    const handleExportClick = () => {
        if (isOffline) {
            toast.error('Cannot export while offline')
            return
        }

        setConfirmation({
            isOpen: true,
            title: 'Export Logs?',
            message: 'This will export all logs to your Google Sheet.\n\nLogs are also automatically exported every night at midnight.',
            confirmText: 'Export Now',
            isDangerous: false,
            onConfirm: async () => {
                setConfirmation(prev => ({ ...prev, isOpen: false }))
                await performExport()
            }
        })
    }

    const performExport = async () => {
        setIsExporting(true)
        try {
            const result = await exportToSheets()
            toast.success(result.message, { icon: '📊', duration: 4000 })
            onClose()
        } catch (error) {
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

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl animate-fade-in-up overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Quick Stats */}
                    <div className="stat-card rounded-xl p-4">
                        <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Quick Stats
                        </h3>
                        {isLoadingStats ? (
                            <div className="flex items-center gap-2 text-slate-500">
                                <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                                Loading...
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-900/50 rounded-lg p-3">
                                    <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
                                    <p className="text-xs text-slate-500">Total Sessions</p>
                                </div>
                                <div className="bg-slate-900/50 rounded-lg p-3">
                                    <p className="text-sm font-medium text-white truncate">
                                        {stats.lastRun || 'No runs yet'}
                                    </p>
                                    <p className="text-xs text-slate-500">Last Run</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Export Section */}
                    <div className="stat-card rounded-xl p-4">
                        <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Export to Google Sheets
                        </h3>
                        <p className="text-slate-500 text-xs mb-3">
                            Export logs to your connected Google Sheet. Auto-exports at midnight IST.
                        </p>

                        <button
                            onClick={handleExportClick}
                            disabled={isExporting || isOffline}
                            className={`w-full py-2.5 px-4 rounded-lg text-white text-sm font-medium transition-all ${isExporting || isOffline
                                ? 'bg-slate-600 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-500 active:scale-[0.98]'
                                }`}
                        >
                            {isExporting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Exporting...
                                </span>
                            ) : (
                                'Export Now'
                            )}
                        </button>
                    </div>

                    {/* About Section */}
                    <div className="pt-3 border-t border-slate-700/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white text-sm font-medium">Motor Tracker</p>
                                <p className="text-slate-500 text-xs">Version {appVersion}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-500 text-xs">Built for smart homes</p>
                                <p className="text-slate-600 text-xs">© 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
