import { useEffect, useState } from "react";
import { FaHeartbeat } from "react-icons/fa";

export default function PatientLoading({
    message = "Loading your portal...",
    title = "AI Dialysis",
    subtitle = "Patient Portal",
    fadeOut = false,
    onFadeOutComplete,
}) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!fadeOut) {
            setVisible(true);
            return;
        }

        setVisible(false);

        const timer = setTimeout(() => {
            onFadeOutComplete?.();
        }, 500);

        return () => clearTimeout(timer);
    }, [fadeOut, onFadeOutComplete]);

    return (
        <div
            className={`fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-slate-50 px-6 transition-opacity duration-500 ease-in-out ${
                visible
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
            }`}
        >
            <div className="flex w-full max-w-sm flex-col items-center text-center">
                <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#323d42] shadow-lg">
                    <FaHeartbeat className="text-4xl text-white" />

                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex h-4 w-4 rounded-full bg-blue-500" />
                    </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-[#323d42]">
                    {title}
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                    {subtitle}
                </p>

                <div className="mt-8 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                <p className="mt-5 text-sm font-medium text-gray-600">
                    {message}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                    Please wait a moment.
                </p>
            </div>
        </div>
    );
}