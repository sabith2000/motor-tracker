export default function Header() {
    return (
        <>
            <div className="absolute top-6 left-6 flex items-center gap-3">
                <img src="/logo.svg" alt="Motor Tracker" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="brand-title text-xl sm:text-2xl tracking-wider pt-1">Motor Tracker</span>
            </div>
        </>
    )
}
