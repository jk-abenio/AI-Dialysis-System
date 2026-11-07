
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaShieldAlt } from "react-icons/fa";

const FADE_DURATION = 2000;
const FADE_OUT_DELAY = 6000;

export default function AdminLoading({
    message = "Loading admin dashboard...",
    title = "AI Dialysis",
    subtitle = "Administration Portal",
    fadeOut = false,
    onFadeOutComplete,
}) {
    const [visible, setVisible] = useState(false);

    // Control fade-in and when fade-out begins.
    useEffect(() => {
        if (fadeOut) {
            const timer = setTimeout(() => {
                setVisible(false);
            }, FADE_OUT_DELAY);

            return () => clearTimeout(timer);
        }

        const frame = requestAnimationFrame(() => {
            setVisible(true);
        });

        return () => cancelAnimationFrame(frame);
    }, [fadeOut]);

    // Notify the parent after the 2-second fade-out finishes.
    useEffect(() => {
        if (!fadeOut || visible) return;

        const timer = setTimeout(() => {
            onFadeOutComplete?.();
        }, FADE_DURATION);

        return () => clearTimeout(timer);
    }, [fadeOut, visible, onFadeOutComplete]);

    return createPortal(
        <div
            className={`fixed inset-0 z-[2147483647] flex h-screen min-h-screen w-screen items-center justify-center overflow-hidden bg-slate-100 px-6 ease-in-out ${
                visible
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
            }`}
            style={{
                transitionProperty: "opacity",
                transitionDuration: `${FADE_DURATION}ms`,
            }}
            role="status"
            aria-live="polite"
        >
            <div
                className={`flex w-full max-w-sm flex-col items-center text-center ease-in-out ${
                    visible ? "translate-y-0" : "translate-y-2"
                }`}
                style={{
                    transitionProperty: "transform",
                    transitionDuration: `${FADE_DURATION}ms`,
                }}
            >
                {/* Admin logo */}
                <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-blue-900 shadow-xl shadow-slate-900/20">
                    <FaShieldAlt className="text-4xl text-white" />

                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                    </span>
                </div>

                {/* Portal heading */}
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                    {title}
                </h1>

                <p className="mt-2 text-sm font-medium text-slate-500">
                    {subtitle}
                </p>

                {/* Loading spinner */}
                <div
                    className="mt-8 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700"
                    aria-label="Loading"
                />

                <p className="mt-5 text-sm font-semibold text-slate-700">
                    {message}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                    Please wait while we prepare your workspace.
                </p>

                {/* Animated progress line */}
                <div className="mt-7 h-1 w-32 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-700" />
                </div>
            </div>
        </div>,
        document.body
    );
}
