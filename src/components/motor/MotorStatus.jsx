export default function MotorStatus({ isRunning }) {
    return (
        <div className="text-center mb-8 mt-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Motor Controller
            </h1>
            <div className={`text-2xl md:text-3xl font-semibold tracking-wide ${isRunning ? 'text-red-400' : 'text-green-400'
                }`}>
                {isRunning ? '⚡ Motor is RUNNING' : '○ Motor is OFF'}
            </div>
        </div>
    )
}
