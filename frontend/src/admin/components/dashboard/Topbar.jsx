
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import LogoutButton from "../common/LogoutButton";
import { FaBell, FaUserCircle } from "react-icons/fa";
import api from "../../services/api";

const pageTitles = [
    { path: "/dashboard", title: "Dashboard" },
    { path: "/patients", title: "Patients" },
    { path: "/machines", title: "Machines" },
    { path: "/staff", title: "Staff" },
    { path: "/schedules", title: "Schedules" },
    { path: "/reports", title: "Reports" },
    { path: "/settings", title: "Settings" },
    { path: "/notifications", title: "Email Center" },
];

export default function Topbar() {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await api.get("/email/inbox/");

            // Support common inbox response formats.
            const messages = Array.isArray(response.data)
                ? response.data
                : response.data?.messages ??
                  response.data?.emails ??
                  response.data?.results ??
                  [];

            const count = messages.filter(
                (email) =>
                    email.unread === true ||
                    email.is_unread === true
            ).length;

            setUnreadCount(count);
        } catch (error) {
            // Preserve the last known count if Gmail is unavailable.
            console.error(
                "Failed to fetch unread email count:",
                error
            );
        }
    }, []);

    // Initial fetch and periodic refresh as a fallback.
    useEffect(() => {
        fetchUnreadCount();

        const intervalId = setInterval(
            fetchUnreadCount,
            60000
        );

        return () => clearInterval(intervalId);
    }, [fetchUnreadCount]);

    // Immediately refresh when Email Center changes an email's read status.
    useEffect(() => {
        const handleEmailReadStatusChange = () => {
            fetchUnreadCount();
        };

        window.addEventListener(
            "email-read-status-changed",
            handleEmailReadStatusChange
        );

        return () => {
            window.removeEventListener(
                "email-read-status-changed",
                handleEmailReadStatusChange
            );
        };
    }, [fetchUnreadCount]);

    // Refresh when returning to the tab after checking Gmail elsewhere.
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                fetchUnreadCount();
            }
        };

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [fetchUnreadCount]);

    const currentPage = [...pageTitles]
        .sort((a, b) => b.path.length - a.path.length)
        .find(
            ({ path }) =>
                pathname === path ||
                pathname.startsWith(`${path}/`)
        );

    const pageTitle = currentPage?.title || "Admin Portal";

    return (
        <header
            className="
                fixed left-64 right-0 top-0 z-30
                flex h-20 items-center justify-between
                border-b border-slate-700/60
                bg-[#26363D] px-8 text-white
                shadow-[0_2px_12px_rgba(0,0,0,0.10)]
            "
        >
            {/* Page title */}
            <div className="min-w-0">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
                    AI DIALYSIS / ADMIN
                </p>

                <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                    {pageTitle}
                </h2>
            </div>

            {/* Right side */}
            <div className="ml-4 flex shrink-0 items-center gap-4 lg:gap-5">
                {/* Email notifications */}
                <button
                    type="button"
                    aria-label={`Email Center, ${unreadCount} unread emails`}
                    title={`${unreadCount} unread email${unreadCount === 1 ? "" : "s"}`}
                    onClick={() => navigate("/notifications")}
                    className="
                        relative flex h-10 w-10 items-center justify-center
                        rounded-xl border border-white/10
                        bg-white/5 text-slate-300
                        transition-all duration-200
                        hover:bg-white/10 hover:text-white
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-cyan-400
                    "
                >
                    <FaBell size={17} aria-hidden="true" />

                    {unreadCount > 0 && (
                        <span
                            className="
                                absolute -right-2 -top-2
                                flex h-5 min-w-5 items-center justify-center
                                rounded-full bg-rose-500 px-1
                                text-[10px] font-bold text-white
                                ring-2 ring-[#26363D]
                            "
                            aria-hidden="true"
                        >
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>

                <div className="h-9 w-px bg-white/10" />

                {/* User profile */}
                <div className="flex items-center gap-3">
                    <div
                        className="
                            flex h-10 w-10 shrink-0 items-center justify-center
                            rounded-xl border border-cyan-400/20
                            bg-cyan-400/10
                        "
                    >
                        <FaUserCircle
                            size={24}
                            className="text-cyan-300"
                            aria-hidden="true"
                        />
                    </div>

                    <div className="hidden min-w-0 sm:block">
                        <p className="text-[11px] font-medium text-slate-400">
                            Welcome back,
                        </p>

                        <p className="max-w-40 truncate text-sm font-semibold text-white">
                            {user?.username || "Administrator"}
                        </p>

                        <p className="mt-0.5 text-[10px] font-medium text-cyan-400">
                            Administrator
                        </p>
                    </div>
                </div>

                <div className="h-9 w-px bg-white/10" />

                {/* Logout */}
                <div className="shrink-0">
                    <LogoutButton />
                </div>
            </div>
        </header>
    );
}
