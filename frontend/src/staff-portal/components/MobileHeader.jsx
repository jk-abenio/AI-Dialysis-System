import { useNavigate } from "react-router-dom";
import { FaHeartbeat, FaSignOutAlt } from "react-icons/fa";
import { useStaffAuth } from "../context/StaffAuthContext";

export default function MobileHeader() {
    const navigate = useNavigate();
    const { user, logout } = useStaffAuth();

    const staffName =
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
        user?.name ||
        "Staff Member";

    const handleLogout = () => {
        logout();
        navigate("/staff/login", { replace: true });
    };

    return (
        <header
            className="
                fixed inset-x-0 top-0 z-50
                border-b border-white/10
                bg-[#26363D]
                text-white
                shadow-[0_2px_12px_rgba(0,0,0,0.12)]
            "
        >
            <div
                className="
                    mx-auto flex h-16 max-w-7xl
                    items-center justify-between
                    gap-3 px-4 sm:px-5
                    pt-[env(safe-area-inset-top)]
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
                            text-cyan-300
                        "
                        aria-hidden="true"
                    >
                        <FaHeartbeat className="text-xl" />
                    </div>

                    {/* Portal title and staff name */}
                    <div className="min-w-0">
                        <h1 className="truncate text-base font-bold tracking-wide">
                            AI Dialysis
                        </h1>

                        <p className="mt-0.5 truncate text-[11px] font-medium tracking-wider text-slate-300">
                            STAFF PORTAL
                        </p>

                        <p className="hidden truncate text-xs text-slate-400 sm:block">
                            {staffName}
                        </p>
                    </div>
                </div>

                {/* Logout button */}
                <div className="ml-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleLogout}
                        aria-label="Sign out"
                        title="Sign out"
                        className="
                            inline-flex items-center justify-center gap-2
                            rounded-xl border border-white/15
                            bg-white/10 px-3 py-2
                            text-sm font-semibold text-white
                            transition duration-200
                            hover:border-red-300/30
                            hover:bg-red-500/15
                            hover:text-red-200
                            focus:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-cyan-300
                            active:scale-[0.98]
                        "
                    >
                        <FaSignOutAlt className="text-sm" />
                        <span className="hidden sm:inline">
                            Sign out
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
}
