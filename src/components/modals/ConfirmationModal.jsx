import { useEffect } from 'react'

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDangerous = false
}) {
    // Close on Escape key - must be before any conditional returns (React Rules of Hooks)
    useEffect(() => {
        if (!isOpen) return
        const handleEscape = (e) => {
            if (e.key === 'Escape') onCancel()
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onCancel])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div
                className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl scale-100 animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-300 mb-6 text-base leading-relaxed whitespace-pre-line">
                    {message}
                </p>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-colors font-medium"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-xl text-white font-semibold shadow-lg transition-transform active:scale-95 ${isDangerous
                                ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
