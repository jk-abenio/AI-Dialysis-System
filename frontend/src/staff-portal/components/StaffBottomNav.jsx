
import { NavLink } from "react-router-dom";
import { FaHome, FaCalendarAlt } from "react-icons/fa";

const navItems = [
    {
        to: "/staff/dashboard",
        label: "Home",
        icon: FaHome,
        end: true,
    },
    {
        to: "/staff/schedules",
        label: "Schedules",
        icon: FaCalendarAlt,
        end: true,
    },
];

export default function StaffBottomNav() {
    return (
        <nav
            aria-label="Staff navigation"
            className="fixed bottom-0 left-0 right-0 z-[9999] block border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(15,23,42,0.08)]"
            style={{
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
        >
            <div className="mx-auto grid max-w-xl grid-cols-2 px-3 py-2">
                {navItems.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl transition ${
                                isActive
                                    ? "bg-teal-50 text-teal-700"
                                    : "text-slate-500 hover:bg-slate-50"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon
                                    className={isActive ? "text-xl" : "text-lg"}
                                />
                                <span
                                    className={`text-xs ${
                                        isActive
                                            ? "font-bold"
                                            : "font-medium"
                                    }`}
                                >
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
