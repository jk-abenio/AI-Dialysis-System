import { NavLink } from "react-router-dom";
import {
    FaTachometerAlt,
    FaUserInjured,
    FaProcedures,
    FaUserMd,
    FaCalendarAlt,
    FaChartBar,
    FaCog,
    FaEnvelope,
    FaBrain,
    FaSms,
} from "react-icons/fa";

import dialysisLogo from "../../../assets/logo/newlogo.png";

const navItems = [
    {
        label: "Dashboard",
        to: "/dashboard",
        icon: FaTachometerAlt,
        end: true,
    },
    {
        label: "Patients",
        to: "/patients",
        icon: FaUserInjured,
    },
    {
        label: "Machines",
        to: "/machines",
        icon: FaProcedures,
    },
    {
        label: "Staff",
        to: "/staff",
        icon: FaUserMd,
    },
    {
        label: "Schedules",
        to: "/schedules",
        icon: FaCalendarAlt,
    },
    {
        label: "Email Center",
        to: "/notifications",
        icon: FaEnvelope,
    },
    {
        label: "SMS Center",
        to: "/sms-center",
        icon: FaSms,
    },
    {
        label: "Reports",
        to: "/reports",
        icon: FaChartBar,
    },
    {
        label: "AI Recommendations",
        to: "/ai-recommendations",
        icon: FaBrain,
    },
    {
        label: "Settings",
        to: "/settings",
        icon: FaCog,
    },

];

export default function Sidebar() {
    return (
        <aside
            aria-label="Admin sidebar"
            className="
                fixed inset-y-0 left-0 z-40
                flex h-screen w-64 flex-col
                overflow-hidden
                border-r border-slate-700/60
                bg-[#26363D] text-slate-200
                shadow-xl
            "
        >
            {/* Brand */}
            <div
                className="
                    flex shrink-0 items-center gap-3
                    border-b border-white/10
                    px-5 py-5
                "
            >
                <div
                    className="
                        flex h-12 w-12 shrink-0
                        items-center justify-center
                        rounded-xl border border-white/10
                        bg-white/10 p-1.5
                    "
                >
                    <img
                        src={dialysisLogo}
                        alt="AI Dialysis logo"
                        className="h-full w-full object-contain"
                    />
                </div>

                <div className="min-w-0">
                    <h1 className="truncate text-base font-bold tracking-wide text-white">
                        AI Dialysis
                    </h1>

                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">
                        Scheduling System
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav
                aria-label="Main navigation"
                className="
                    min-h-0 flex-1 overflow-y-auto px-3 py-6
                    [scrollbar-width:none]
                    [&::-webkit-scrollbar]:hidden
                "
            >
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Main Menu
                </p>

                <div className="space-y-1">
                    {navItems.map(({ label, to, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) => `
                                group relative flex items-center gap-3
                                rounded-xl px-3 py-3
                                text-sm transition-all duration-200
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-inset
                                focus-visible:ring-cyan-400
                                ${
                                    isActive
                                        ? "bg-cyan-400/10 font-semibold text-cyan-300"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                }
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active indicator */}
                                    <span
                                        className={`
                                            absolute bottom-2 left-0 top-2
                                            w-[3px] rounded-r-full
                                            transition-colors duration-200
                                            ${
                                                isActive
                                                    ? "bg-cyan-400"
                                                    : "bg-transparent"
                                            }
                                        `}
                                        aria-hidden="true"
                                    />

                                    <span
                                        className={`
                                            flex h-9 w-9 shrink-0
                                            items-center justify-center
                                            rounded-lg transition-all duration-200
                                            ${
                                                isActive
                                                    ? "bg-cyan-400/15 text-cyan-300"
                                                    : "text-slate-400 group-hover:bg-white/5 group-hover:text-white"
                                            }
                                        `}
                                    >
                                        <Icon
                                            size={17}
                                            aria-hidden="true"
                                        />
                                    </span>

                                    <span className="flex-1">
                                        {label}
                                    </span>

                                    {isActive && (
                                        <span
                                            className="h-1.5 w-1.5 rounded-full bg-cyan-400"
                                            aria-hidden="true"
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Footer */}
            <div className="shrink-0 border-t border-white/10 p-4">
                <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10">
                        <FaProcedures
                            size={14}
                            className="text-cyan-300"
                            aria-hidden="true"
                        />
                    </span>

                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200">
                            Admin Workspace
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                            Dialysis Management
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}