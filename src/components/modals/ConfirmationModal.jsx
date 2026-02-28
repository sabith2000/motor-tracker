import { useState, useEffect, useRef } from 'react'

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDangerous = false,
    requireTypedConfirmation = null // e.g. "DELETE" — user must type this to enable confirm
}) {
    const [typedValue, setTypedValue] = useState('')
    const cancelRef = useRef(null)

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return
        const handleEscape = (e) => {
            if (e.key === 'Escape') onCancel()
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onCancel])

    // Reset typed value and focus cancel button when modal opens
    useEffect(() => {
        if (isOpen) {
            setTypedValue('')
            // Small delay to let the modal render before focusing
            setTimeout(() => cancelRef.current?.focus(), 50)
        }
    }, [isOpen])

    if (!isOpen) return null

    const isConfirmDisabled = requireTypedConfirmation
        ? typedValue !== requireTypedConfirmation
        : false

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div
                className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl scale-100 animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-300 mb-4 text-base leading-relaxed whitespace-pre-line">
                    {message}
                </p>

                {/* Typed confirmation input (for dangerous bulk actions) */}
                {requireTypedConfirmation && (
                    <div className="mb-4">
                        <p className="text-sm text-slate-400 mb-2">
                            Type <span className="font-bold text-red-400">{requireTypedConfirmation}</span> to confirm:
                        </p>
                        <input
                            type="text"
                            value={typedValue}
                            onChange={(e) => setTypedValue(e.target.value)}
                            placeholder={requireTypedConfirmation}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                            autoFocus
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-700 hover:text-white transition-colors font-medium"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isConfirmDisabled}
                        className={`px-4 py-2 rounded-xl text-white font-semibold shadow-lg transition-all active:scale-95 ${isConfirmDisabled
                            ? 'bg-slate-600 cursor-not-allowed opacity-50'
                            : isDangerous
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
