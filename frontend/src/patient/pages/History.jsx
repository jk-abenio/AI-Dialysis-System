
import PatientLayout from "../layouts/PatientLayout";
import { useEffect, useState, useCallback } from "react";

import {
    FaHeartbeat,
    FaCalendarCheck,
    FaClock,
    FaDesktop,
    FaUserNurse,
    FaCheckCircle,
    FaHistory,
    FaArrowRight,
} from "react-icons/fa";

import { getHistory } from "../services/historyService";
import PatientLoading from "../components/PatientLoading";

export default function History() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);
    const [loadError, setLoadError] = useState("");

    const handleFadeOutComplete = useCallback(() => {
        setLoading(false);
    }, []);

    const loadHistory = useCallback(async () => {
        const startTime = Date.now();

        try {
            const data = await getHistory();

            setHistory(Array.isArray(data) ? data : []);
            setLoadError("");
        } catch (error) {
            console.error("Unable to load treatment history:", error);

            setLoadError(
                "We couldn't load your treatment history. Please try again."
            );
        } finally {
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, 2000 - elapsed);

            if (remainingTime > 0) {
                await new Promise((resolve) =>
                    setTimeout(resolve, remainingTime)
                );
            }

            setFadeOut(true);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const handleRetry = () => {
        setHistory([]);
        setLoadError("");
        setLoading(true);
        setFadeOut(false);
        loadHistory();
    };

    const formatDate = (date) => {
        if (!date) return "Date unavailable";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Date unavailable";
        }

        return parsedDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatTime = (time) => {
        if (!time) return "Time unavailable";

        const [hours, minutes] = time.split(":");

        if (hours === undefined || minutes === undefined) {
            return time;
        }

        return new Date(
            2000,
            0,
            1,
            Number(hours),
            Number(minutes)
        ).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const latestDate = history.reduce((latest, item) => {
        if (!item.dialysis_date) return latest;
        if (!latest) return item.dialysis_date;

        return new Date(item.dialysis_date) > new Date(latest)
            ? item.dialysis_date
            : latest;
    }, null);

    return (
        <PatientLayout>
            <div className="min-h-screen bg-slate-50/70 -m-4 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
                <div className="mx-auto max-w-7xl space-y-7">

                    {/* Page header - consistent with Home.jsx */}
                    <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-700">
                                <FaHeartbeat />
                                <span>PATIENT PORTAL</span>
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                                Treatment History
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                                Review your previous dialysis sessions and
                                keep track of your treatment records.
                            </p>
                        </div>

                        <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-700 sm:flex">
                            <FaHistory />
                        </div>
                    </header>

                    {/* Hero - same gradient as dashboard */}
                    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#28383f] via-[#30474d] to-[#176c70] p-6 text-white shadow-xl shadow-slate-300/30 sm:p-8">
                        <div
                            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10"
                            aria-hidden="true"
                        />
                        <div
                            className="pointer-events-none absolute -right-6 -top-10 h-44 w-44 rounded-full border border-white/10"
                            aria-hidden="true"
                        />
                        <div
                            className="pointer-events-none absolute bottom-0 right-24 h-28 w-28 rounded-full bg-teal-300/10 blur-2xl"
                            aria-hidden="true"
                        />

                        <div className="relative">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-teal-100">
                                        <span className="h-2 w-2 rounded-full bg-teal-300" />
                                        YOUR HEALTHCARE JOURNEY
                                    </div>

                                    <h2 className="text-xl font-semibold text-white sm:text-2xl">
                                        Your Treatment Records
                                    </h2>

                                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                                        Keep track of your recorded dialysis
                                        sessions, appointment details, and
                                        treatment history in one place.
                                    </p>
                                </div>

                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl text-teal-200 shadow-inner">
                                    <FaHistory />
                                </div>
                            </div>

                            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                                            <FaCalendarCheck />
                                        </div>

                                        <div>
                                            <p className="text-xs text-slate-300">
                                                Sessions in your records
                                            </p>
                                            <p className="mt-1 font-semibold text-white">
                                                {history.length}{" "}
                                                {history.length === 1
                                                    ? "session"
                                                    : "sessions"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                                            <FaClock />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-300">
                                                Latest recorded treatment
                                            </p>
                                            <p className="mt-1 break-words font-semibold text-white">
                                                {latestDate
                                                    ? formatDate(latestDate)
                                                    : "No sessions yet"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Summary cards */}
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-700">
                                    <FaCalendarCheck />
                                </div>

                                <div>
                                    <p className="text-sm text-slate-500">
                                        Recorded sessions
                                    </p>

                                    <p className="mt-1 text-2xl font-bold text-slate-800">
                                        {history.length}
                                    </p>
                                </div>
                            </div>

                            <p className="mt-4 text-xs leading-5 text-slate-400">
                                Total sessions returned by your treatment
                                history records.
                            </p>
                        </article>

                        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-xl text-teal-700">
                                    <FaClock />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm text-slate-500">
                                        Latest treatment
                                    </p>

                                    <p className="mt-1 break-words text-lg font-bold text-slate-800">
                                        {latestDate
                                            ? formatDate(latestDate)
                                            : "No sessions yet"}
                                    </p>
                                </div>
                            </div>

                            <p className="mt-4 text-xs leading-5 text-slate-400">
                                Most recent treatment date available in
                                your records.
                            </p>
                        </article>
                    </section>

                    {/* Session history */}
                    <section>
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                                    Your records
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                                    Previous Sessions
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Review the details of your recorded
                                    dialysis treatments.
                                </p>
                            </div>

                            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                                <FaHistory className="text-teal-600" />
                                {history.length}{" "}
                                {history.length === 1 ? "record" : "records"}
                            </span>
                        </div>

                        {/* Error state */}
                        {loadError ? (
                            <div
                                role="alert"
                                className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                            >
                                <div>
                                    <h3 className="font-semibold text-red-800">
                                        Unable to load treatment history
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-red-700">
                                        {loadError}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleRetry}
                                    className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                                >
                                    Try again
                                    <FaArrowRight />
                                </button>
                            </div>
                        ) : history.length === 0 ? (
                            /* Empty state */
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-700">
                                    <FaHistory />
                                </div>

                                <h3 className="mt-4 font-semibold text-slate-800">
                                    No treatment history yet
                                </h3>

                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                    Your treatment records will appear here
                                    when they are available in your patient
                                    history.
                                </p>

                                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-xs text-slate-500">
                                    <FaCheckCircle className="text-emerald-600" />
                                    Your records will appear here
                                </div>
                            </div>
                        ) : (
                            /* Session cards */
                            <div className="space-y-4">
                                {history.map((item) => (
                                    <article
                                        key={item.id}
                                        className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60"
                                    >
                                        <div className="p-5 sm:p-6">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="flex min-w-0 items-start gap-4">
                                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-700">
                                                        <FaHeartbeat />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">
                                                            Dialysis session
                                                        </p>

                                                        <h3 className="mt-1 break-words font-bold text-slate-800 sm:text-lg">
                                                            {formatDate(
                                                                item.dialysis_date
                                                            )}
                                                        </h3>

                                                        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                                            <FaClock className="shrink-0 text-teal-600" />
                                                            {formatTime(
                                                                item.dialysis_time
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                                    <FaCheckCircle />
                                                    Completed
                                                </span>
                                            </div>

                                            <div className="my-5 border-t border-slate-100" />

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
                                                            <FaCalendarCheck />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="text-xs text-slate-400">
                                                                Shift
                                                            </p>

                                                            <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                                                {item.shift ||
                                                                    "Not specified"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
                                                            <FaDesktop />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="text-xs text-slate-400">
                                                                Machine
                                                            </p>

                                                            <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                                                {item.machine ||
                                                                    "Not specified"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
                                                            <FaUserNurse />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="text-xs text-slate-400">
                                                                Assigned staff
                                                            </p>

                                                            <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                                                {item.staff ||
                                                                    "Not specified"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                            <p className="flex items-center gap-2 text-xs text-slate-400">
                                                <FaHeartbeat className="text-teal-600" />
                                                Treatment record
                                            </p>

                                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
                                                <FaCheckCircle />
                                                Session completed
                                            </span>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Footer */}
                    <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex items-center gap-2">
                            <FaHeartbeat className="text-teal-600" />
                            Your care, organized in one place.
                        </p>

                        <p>AI Dialysis System · Patient Portal</p>
                    </footer>
                </div>
            </div>

            {/* Loading overlay */}
            {loading && (
                <PatientLoading
                    message="Loading your history..."
                    fadeOut={fadeOut}
                    onFadeOutComplete={handleFadeOutComplete}
                />
            )}
        </PatientLayout>
    );
}
