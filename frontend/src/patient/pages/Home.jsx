
import PatientLayout from "../layouts/PatientLayout";
import {
    FaHeartbeat,
    FaHistory,
    FaChevronRight,
    FaCalendarAlt,
    FaClock,
    FaDesktop,
    FaUserNurse,
    FaRegCalendarCheck,
    FaStethoscope,
    FaArrowRight,
    FaCalendarCheck,
} from "react-icons/fa";
import LogoutButton from "../components/LogoutButton";
import { useEffect, useState, useCallback } from "react";
import { getPatientDashboard } from "../services/dashboardService";
import { useNavigate } from "react-router-dom";
import PatientLoading from "../components/PatientLoading";

export default function Home() {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState({
        patient: {},
        today_schedule: null,
        upcoming: [],
    });

    const [loading, setLoading] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const handleFadeOutComplete = useCallback(() => {
        setLoading(false);
    }, []);

    const loadDashboard = useCallback(async () => {
        const startTime = Date.now();

        try {
            setLoadError(false);

            const data = await getPatientDashboard();

            setDashboard({
                patient: data?.patient || {},
                today_schedule: data?.today_schedule || null,
                upcoming: Array.isArray(data?.upcoming)
                    ? data.upcoming
                    : [],
            });
        } catch (error) {
            console.error("Failed to load patient dashboard:", error);
            setLoadError(true);
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
        loadDashboard();
    }, [loadDashboard]);

    const hour = new Date().getHours();

    const greeting =
        hour < 12
            ? "Good morning"
            : hour < 18
              ? "Good afternoon"
              : "Good evening";

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

    const statusStyles = {
        Scheduled: "bg-blue-50 text-blue-700 ring-blue-200",
        Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        Missed: "bg-red-50 text-red-700 ring-red-200",
        Cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
    };

    const getStatusStyle = (status) =>
        statusStyles[status] ||
        "bg-slate-100 text-slate-600 ring-slate-200";

    const today = dashboard.today_schedule;
    const upcoming = dashboard.upcoming || [];

    return (
        <PatientLayout>
            <div className="min-h-screen bg-slate-50/70 -m-4 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
                <div className="mx-auto max-w-7xl space-y-7">

                    {/* Page header */}
                    <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-700">
                                <FaHeartbeat />
                                <span>PATIENT PORTAL</span>
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                                {greeting},{" "}
                                {dashboard.patient?.first_name || "there"}!
                                <span className="ml-2" role="img" aria-label="wave">
                                    👋
                                </span>
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                                Here’s your dialysis schedule and treatment overview.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-xl text-teal-700 sm:flex">
                                <FaStethoscope />
                            </div>
                            
                        </div>
                    </header>

                    {/* Error message */}
                    {loadError && (
                        <div
                            role="alert"
                            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div>
                                <p className="font-semibold text-red-800">
                                    Unable to load your dashboard
                                </p>
                                <p className="mt-1 text-sm text-red-700">
                                    Please check your connection and try again.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setLoading(true);
                                    setFadeOut(false);
                                    loadDashboard();
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                Try again
                                <FaArrowRight />
                            </button>
                        </div>
                    )}

                    {/* Today's dialysis */}
                    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#28383f] via-[#30474d] to-[#176c70] p-6 text-white shadow-xl shadow-slate-300/30 sm:p-8">
                        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
                        <div className="pointer-events-none absolute -right-6 -top-10 h-44 w-44 rounded-full border border-white/10" />
                        <div className="pointer-events-none absolute bottom-0 right-24 h-28 w-28 rounded-full bg-teal-300/10 blur-2xl" />

                        <div className="relative">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-teal-100">
                                        <span className="h-2 w-2 rounded-full bg-teal-300" />
                                        YOUR DAILY OVERVIEW
                                    </div>

                                    <h2 className="text-xl font-semibold text-white sm:text-2xl">
                                        Today’s Dialysis
                                    </h2>

                                    <p className="mt-2 text-sm text-slate-300">
                                        Your treatment schedule at a glance.
                                    </p>
                                </div>

                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl text-teal-200 shadow-inner">
                                    <FaHeartbeat />
                                </div>
                            </div>

                            {today ? (
                                <>
                                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-300">
                                                Scheduled treatment time
                                            </p>

                                            <p className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
                                                {formatTime(today.dialysis_time)}
                                            </p>

                                            <p className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                                                <FaCalendarAlt className="text-teal-300" />
                                                {formatDate(today.dialysis_date)}
                                            </p>
                                        </div>

                                        <span
                                            className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset ${
                                                today.status === "Completed"
                                                    ? "bg-emerald-400/15 text-emerald-100 ring-emerald-300/30"
                                                    : today.status === "Missed"
                                                      ? "bg-red-400/15 text-red-100 ring-red-300/30"
                                                      : today.status === "Cancelled"
                                                        ? "bg-white/10 text-slate-200 ring-white/20"
                                                        : "bg-blue-400/15 text-blue-100 ring-blue-300/30"
                                            }`}
                                        >
                                            <span className="h-2 w-2 rounded-full bg-current" />
                                            {today.status || "Scheduled"}
                                        </span>
                                    </div>

                                    <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                                                    <FaClock />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-slate-300">
                                                        Shift
                                                    </p>
                                                    <p className="mt-1 break-words font-semibold text-white">
                                                        {today.shift || "Not assigned"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                                                    <FaDesktop />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-slate-300">
                                                        Dialysis machine
                                                    </p>
                                                    <p className="mt-1 break-words font-semibold text-white">
                                                        {today.machine || "Not assigned"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                                                    <FaUserNurse />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-slate-300">
                                                        Assigned staff
                                                    </p>
                                                    <p className="mt-1 break-words font-semibold text-white">
                                                        {today.staff || "Not assigned"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.07] p-6 sm:p-8">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl text-teal-200">
                                        <FaCalendarCheck />
                                    </div>

                                    <h3 className="mt-4 text-lg font-semibold">
                                        No dialysis scheduled today
                                    </h3>

                                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                                        There is no treatment listed for today. If you believe this is incorrect, please contact your dialysis center.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Upcoming sessions */}
                    <section>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                                    Your schedule
                                </p>
                                <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                                    Upcoming Sessions
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Keep track of your scheduled treatments.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate("/patient/history")}
                                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
                            >
                                View treatment history
                                <FaChevronRight className="text-xs" />
                            </button>
                        </div>

                        {upcoming.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                {upcoming.map((schedule) => (
                                    <article
                                        key={schedule.id}
                                        className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                                                <FaCalendarAlt className="mb-1 text-lg" />
                                                <span className="text-[10px] font-bold uppercase tracking-wide">
                                                    Session
                                                </span>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <h3 className="font-bold text-slate-800">
                                                            {formatDate(schedule.dialysis_date)}
                                                        </h3>
                                                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                                            <FaClock className="text-teal-600" />
                                                            {formatTime(schedule.dialysis_time)}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(schedule.status)}`}
                                                    >
                                                        {schedule.status || "Scheduled"}
                                                    </span>
                                                </div>

                                                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                                                    <div>
                                                        <p className="text-xs text-slate-400">
                                                            Shift
                                                        </p>
                                                        <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                                            {schedule.shift || "Not assigned"}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs text-slate-400">
                                                            Machine
                                                        </p>
                                                        <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                                            {schedule.machine || "Not assigned"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                                                    <FaUserNurse className="shrink-0 text-teal-600" />
                                                    <span className="text-xs">
                                                        Assigned staff:
                                                    </span>
                                                    <span className="break-words font-medium text-slate-700">
                                                        {schedule.staff || "Not assigned"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
                                    <FaCalendarAlt />
                                </div>
                                <h3 className="mt-4 font-semibold text-slate-700">
                                    No upcoming sessions
                                </h3>
                                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                    Your upcoming dialysis appointments will appear here once they are scheduled.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Quick access */}
                    <section>
                        <div className="mb-4">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                                Patient resources
                            </p>
                            <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                                Quick Access
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Access your personal medical information and records.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => navigate("/patient/profile")}
                                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6"
                            >
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700 transition group-hover:bg-blue-100">
                                    <FaHeartbeat />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-slate-800">
                                        Medical Profile
                                    </h3>
                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                        View your personal and medical information.
                                    </p>
                                </div>

                                <FaChevronRight className="shrink-0 text-sm text-slate-400 transition group-hover:translate-x-1 group-hover:text-teal-700" />
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/patient/history")}
                                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6"
                            >
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700 transition group-hover:bg-emerald-100">
                                    <FaHistory />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-slate-800">
                                        Treatment History
                                    </h3>
                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                        Review your previous dialysis sessions.
                                    </p>
                                </div>

                                <FaChevronRight className="shrink-0 text-sm text-slate-400 transition group-hover:translate-x-1 group-hover:text-teal-700" />
                            </button>
                        </div>
                    </section>

                    {/* Footer note */}
                    <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex items-center gap-2">
                            <FaHeartbeat className="text-teal-600" />
                            Your care, organized in one place.
                        </p>
                        <p>Patient Portal</p>
                    </footer>
                </div>
            </div>

            {/* Loading overlay */}
            {loading && (
                <PatientLoading
                    message="Loading your dashboard..."
                    fadeOut={fadeOut}
                    onFadeOutComplete={handleFadeOutComplete}
                />
            )}
        </PatientLayout>
    );
}
