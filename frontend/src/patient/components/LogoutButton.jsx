import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import { usePatientAuth } from "../context/PatientAuthContext";

export default function LogoutButton() {
    const navigate = useNavigate();
    const { logout } = usePatientAuth();

    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    const timersRef = useRef([]);

    useEffect(() => {
        return () => {
            timersRef.current.forEach(clearTimeout);
        };
    }, []);

    const handleLogout = () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        // Remove saved credentials immediately.
        logout({ deferPatientState: true });

        setShowConfirmation(true);
        setFadeIn(false);
        setFadeOut(false);

        // Trigger fade-in after the overlay renders.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setFadeIn(true);
            });
        });

        // Start fading out after 5 seconds.
        const confirmationTimer = setTimeout(() => {
            setFadeOut(true);
        }, 5000);

        // Redirect after the 1-second fade-out completes.
        const redirectTimer = setTimeout(() => {
            logout();
            navigate("/patient/login", { replace: true });
        }, 6000);

        timersRef.current.push(
            confirmationTimer,
            redirectTimer
        );
    };

    return (
        <>
            {/* Mobile Header Logout Button */}
            <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Log out of patient portal"
                className="
                    inline-flex shrink-0 items-center justify-center gap-2
                    rounded-lg border border-red-400/30
                    bg-red-500/15 px-3 py-2
                    text-sm font-semibold text-red-100
                    transition-colors duration-200
                    hover:bg-red-500/30
                    focus:outline-none focus:ring-2 focus:ring-red-300
                    disabled:cursor-not-allowed disabled:opacity-60
                "
            >
                {isLoggingOut ? (
                    <>
                        <span
                            className="
                                h-4 w-4 shrink-0 animate-spin
                                rounded-full border-2
                                border-red-100/40 border-t-red-100
                            "
                            aria-hidden="true"
                        />
                        <span className="hidden sm:inline">
                            Logging out
                        </span>
                    </>
                ) : (
                    <>
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                        >
                            <path
                                d="M10 17l5-5-5-5M15 12H3m9-8h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>

                        <span>Logout</span>
                    </>
                )}
            </button>

            {/* Logout Confirmation Overlay */}
            {showConfirmation && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`
                        fixed inset-0 z-[99999]
                        flex min-h-screen items-center justify-center
                        bg-slate-50 px-6
                        transition-opacity duration-1000 ease-in-out
                        ${
                            fadeIn && !fadeOut
                                ? "opacity-100"
                                : "pointer-events-none opacity-0"
                        }
                    `}
                >
                    <div
                        className={`
                            flex w-full max-w-sm flex-col items-center
                            text-center
                            transition-all duration-1000 ease-in-out
                            ${
                                fadeIn && !fadeOut
                                    ? "translate-y-0 scale-100"
                                    : "translate-y-3 scale-95"
                            }
                        `}
                    >
                        <div
                            className="
                                mb-6 flex h-20 w-20 items-center
                                justify-center rounded-2xl bg-emerald-100
                            "
                        >
                            <FaCheckCircle className="text-5xl text-emerald-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-[#323d42]">
                            Successfully Logged Out!
                        </h1>

                        <p className="mt-3 text-sm text-gray-500">
                            Your patient session has ended successfully.
                        </p>

                        <div
                            className="
                                mt-7 h-8 w-8 animate-spin rounded-full
                                border-4 border-gray-200 border-t-blue-600
                            "
                            aria-hidden="true"
                        />

                        <p className="mt-4 text-sm font-medium text-gray-600">
                            Redirecting to login...
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
