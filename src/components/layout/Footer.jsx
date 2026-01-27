export default function Footer({ appVersion }) {
    return (
        <footer className="absolute bottom-6 text-slate-500 text-sm">
            Motor Tracker v{appVersion}
        </footer>
    )
}
