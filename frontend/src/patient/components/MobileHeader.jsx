import LogoutButton from "../components/LogoutButton";

export default function MobileHeader() {
    return (
        <header
            className="
                fixed inset-x-0 top-0 z-50
                flex h-16 items-center justify-between
                border-b border-white/10
                bg-[#26363D]
                px-4 sm:px-5
                pt-[env(safe-area-inset-top)]
                text-white
                shadow-[0_2px_12px_rgba(0,0,0,0.12)]
            "
        >
            {/* Brand */}
            <div className="flex min-w-0 items-center gap-3">
                <div
                    className="
                        flex h-10 w-10 shrink-0
                        items-center justify-center
                        rounded-xl border border-white/10
                        bg-white/10
                    "
                    aria-hidden="true"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-6 w-6 text-cyan-300"
                    >
                        <path
                            d="M12 3v18M3 12h18"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                        <path
                            d="M17 5.5a7.5 7.5 0 1 1-10.5 0"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            opacity=".65"
                        />
                    </svg>
                </div>

                {/* Portal title */}
                <div className="min-w-0">
                    <h1 className="truncate text-base font-bold tracking-wide">
                        AI Dialysis
                    </h1>

                    <p className="mt-0.5 text-[11px] font-medium tracking-wider text-slate-300">
                        PATIENT PORTAL
                    </p>
                </div>
            </div>

            {/* Logout button */}
            <div
                className="
                    ml-3 shrink-0
                    [&_button]:inline-flex
                    [&_button]:items-center
                    [&_button]:justify-center
                    [&_button]:gap-2
                    [&_button]:rounded-xl
                    [&_button]:border
                    [&_button]:border-white/15
                    [&_button]:bg-white/10
                    [&_button]:px-3
                    [&_button]:py-2
                    [&_button]:text-sm
                    [&_button]:font-semibold
                    [&_button]:text-white
                    [&_button]:transition
                    [&_button]:duration-200
                    [&_button]:hover:border-red-300/30
                    [&_button]:hover:bg-red-500/15
                    [&_button]:hover:text-red-200
                    [&_button]:focus-visible:outline-none
                    [&_button]:focus-visible:ring-2
                    [&_button]:focus-visible:ring-cyan-300
                    [&_button]:active:scale-[0.98]
                "
            >
                <LogoutButton />
            </div>
        </header>
    );
}