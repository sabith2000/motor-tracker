import { useState } from 'react'
import toast from 'react-hot-toast'
import { exportToSheets } from '../../api'

export default function SettingsModal({ isOpen, onClose, isOffline, setConfirmation, appVersion }) {
    const [isExporting, setIsExporting] = useState(false)

    if (!isOpen) return null

    const handleExportClick = () => {
        if (isOffline) {
            toast.error('Cannot export while offline')
            return
        }

        setConfirmation({
            isOpen: true,
            title: 'Export Logs?',
            message: 'This will export all logs to your Google Sheet and clear them from the local device.\n\nLogs are also automatically exported every night at midnight.',
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Settings</h2>
                    <button
                        onClick={onClose}
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
                            onClick={handleExportClick}
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
                        Motor Tracker v{appVersion}
                    </div>
                </div>
            </div>
        </div>
    )
}
