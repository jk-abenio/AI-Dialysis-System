
import { NavLink } from "react-router-dom";
import {
    FaHome,
    FaCalendarAlt,
    FaNotesMedical,
    FaUser,
    FaInfoCircle,
} from "react-icons/fa";

const navItems = [
    {
        to: "/patient",
        label: "Home",
        icon: FaHome,
        end: true,
    },
    {
        to: "/patient/schedule",
        label: "Schedule",
        icon: FaCalendarAlt,
    },
    {
        to: "/patient/history",
        label: "History",
        icon: FaNotesMedical,
    },
    {
        to: "/patient/profile",
        label: "Profile",
        icon: FaUser,
    },
    {
        to: "/patient/about",
        label: "About",
        icon: FaInfoCircle,
    },
];

export default function BottomNav() {
    return (
        <nav
            aria-label="Patient navigation"
            className="
                fixed bottom-0 left-0 right-0 z-50
                border-t border-gray-200/80
                bg-white
                shadow-[0_-4px_20px_rgba(0,0,0,0.06)]
                supports-[backdrop-filter]:bg-white/95
                supports-[backdrop-filter]:backdrop-blur-xl
            "
            style={{
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
        >
            <div
                className="
                    mx-auto grid h-[68px] w-full max-w-xl
                    grid-cols-5 items-stretch
                    px-1 sm:px-3
                "
            >
                {navItems.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        aria-label={label}
                        className={({ isActive }) => `
                            relative flex min-w-0 flex-col
                            items-center justify-center
                            gap-1 px-0.5
                            transition-colors duration-200
                            focus-visible:z-10
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-inset
                            focus-visible:ring-blue-500
                            ${
                                isActive
                                    ? "text-blue-600"
                                    : "text-gray-500 active:text-blue-600"
                            }
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                {/* Active indicator */}
                                <span
                                    aria-hidden="true"
                                    className={`
                                        absolute left-1/2 top-0
                                        h-[3px] w-7 -translate-x-1/2
                                        rounded-b-full
                                        ${
                                            isActive
                                                ? "bg-blue-600"
                                                : "bg-transparent"
                                        }
                                    `}
                                />

                                {/* Icon container */}
                                <span
                                    className={`
                                        flex h-8 w-9 max-w-full
                                        items-center justify-center
                                        rounded-xl
                                        transition-colors duration-200
                                        ${
                                            isActive
                                                ? "bg-blue-50"
                                                : "bg-transparent"
                                        }
                                    `}
                                >
                                    <Icon
                                        size={18}
                                        aria-hidden="true"
                                    />
                                </span>

                                {/* Label */}
                                <span
                                    className={`
                                        max-w-full truncate
                                        text-[10px] leading-tight
                                        sm:text-[11px]
                                        ${
                                            isActive
                                                ? "font-semibold"
                                                : "font-medium"
                                        }
                                    `}
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
