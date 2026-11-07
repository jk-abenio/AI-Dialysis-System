
import { useEffect, useState, useCallback } from "react";
import PatientLayout from "../layouts/PatientLayout";
import { getSchedules } from "../services/scheduleService";
import {
    FaCalendarAlt,
    FaClock,
    FaUserNurse,
    FaCogs,
    FaCalendarCheck,
    FaHeartbeat,
    FaArrowRight,
    FaCheckCircle,
    FaRegCalendarTimes,
    FaExclamationCircle,
} from "react-icons/fa";
import PatientLoading from "../components/PatientLoading";

export default function Schedule() {
    const [schedules, setSchedules] = useState([]);
    const [fadeOut, setFadeOut] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const handleFadeOutComplete = useCallback(() => {
        setLoading(false);
    }, []);

    const loadSchedules = useCallback(async () => {
        const startTime = Date.now();

        try {
            setLoadError(false);

            const data = await getSchedules();
            setSchedules(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load dialysis schedules:", err);
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
        loadSchedules();
    }, [loadSchedules]);

    const handleRetry = () => {
        setLoading(true);
        setFadeOut(false);
        loadSchedules();
    };

    const upcoming = schedules.filter(
        (schedule) => schedule.status === "Scheduled"
    );

    const completed = schedules.filter(
        (schedule) => schedule.status === "Completed"
    );

    const missed = schedules.filter(
        (schedule) => schedule.status === "Missed"
    );

    const otherSchedules = schedules.filter(
        (schedule) =>
            !["Scheduled", "Completed"].includes(schedule.status)
    );

    const nextSchedule = [...upcoming].sort((a, b) => {
        const dateA = new Date(
            `${a.dialysis_date || ""}T${a.dialysis_time || "00:00:00"}`
        ).getTime();

        const dateB = new Date(
            `${b.dialysis_date || ""}T${b.dialysis_time || "00:00:00"}`
        ).getTime();

        return dateA - dateB;
    })[0];

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

    return (
        <PatientLayout>
            <div className="min-h-screen bg-slate-50/70 -m-4 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
                <div className="mx-auto max-w-7xl space-y-7">

                    {/* Page heading */}
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-700">
                                <FaHeartbeat />
                                <span>PATIENT PORTAL</span>
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                                My Schedule
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                                Keep track of your dialysis appointments,
                                treatment times, and assigned staff.
                            </p>
                        </div>

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-xl text-teal-700">
                            <FaCalendarAlt />
                        </div>
                    </header>

                    {/* Error state */}
                    {loadError && (
                        <div
                            role="alert"
                            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex items-start gap-3">
                                <FaExclamationCircle className="mt-1 shrink-0 text-red-600" />

                                <div>
                                    <p className="font-semibold text-red-800">
                                        Unable to load your schedule
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-red-700">
                                        Please check your connection and try again.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleRetry}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                                Try again
                                <FaArrowRight />
                            </button>
                        </div>
                    )}

                    {/* Summary cards */}
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <SummaryCard
                            title="Upcoming Sessions"
                            count={upcoming.length}
                            description="Scheduled treatments"
                            icon={<FaCalendarAlt />}
                            iconStyle="bg-blue-50 text-blue-700"
                        />

                        <SummaryCard
                            title="Completed Sessions"
                            count={completed.length}
                            description="Completed treatments"
                            icon={<FaCheckCircle />}
                            iconStyle="bg-emerald-50 text-emerald-700"
                        />

                        <SummaryCard
                            title="Missed Sessions"
                            count={missed.length}
                            description="Treatments marked missed"
                            icon={<FaRegCalendarTimes />}
                            iconStyle="bg-red-50 text-red-700"
                        />
                    </section>

                    {/* Next appointment hero */}
                    {nextSchedule && (
                        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#28383f] via-[#30474d] to-[#176c70] p-6 text-white shadow-xl shadow-slate-300/30 sm:p-8">
                            <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/10" />
                            <div className="pointer-events-none absolute -right-4 -top-8 h-36 w-36 rounded-full border border-white/10" />

                            <div className="relative">
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-teal-100">
                                            <span className="h-2 w-2 rounded-full bg-teal-300" />
                                            NEXT APPOINTMENT
                                        </div>

                                        <h2 className="text-xl font-bold sm:text-2xl">
                                            Your Next Dialysis
                                        </h2>

                                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                                            Review your upcoming treatment details
                                            and follow the schedule provided by
                                            your care team.
                                        </p>
                                    </div>

                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl text-teal-200">
                                        <FaCalendarCheck />
                                    </div>
                                </div>

                                <div className="mt-7">
                                    <p className="flex items-center gap-2 text-sm text-slate-300">
                                        <FaCalendarAlt className="text-teal-300" />
                                        Appointment date
                                    </p>

                                    <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                                        {formatDate(nextSchedule.dialysis_date)}
                                    </h3>

                                    <p className="mt-3 flex items-center gap-2 text-lg font-medium text-teal-100">
                                        <FaClock />
                                        {formatTime(nextSchedule.dialysis_time)}
                                    </p>
                                </div>

                                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <HeroDetail
                                        icon={<FaCogs />}
                                        label="Dialysis machine"
                                        value={nextSchedule.machine || "Not assigned"}
                                    />

                                    <HeroDetail
                                        icon={<FaUserNurse />}
                                        label="Assigned staff"
                                        value={nextSchedule.staff || "Not assigned"}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Upcoming appointments */}
                    <ScheduleSection
                        eyebrow="PLAN AHEAD"
                        title="Upcoming Sessions"
                        description="Your scheduled dialysis appointments."
                        count={upcoming.length}
                        countStyle="bg-blue-50 text-blue-700"
                        schedules={upcoming}
                        emptyIcon={<FaCalendarAlt />}
                        emptyTitle="No upcoming dialysis sessions"
                        emptyDescription="Your future appointments will appear here when they have been scheduled."
                        formatDate={formatDate}
                        formatTime={formatTime}
                        getStatusStyle={getStatusStyle}
                    />

                    {/* Completed appointments */}
                    <ScheduleSection
                        eyebrow="PAST TREATMENTS"
                        title="Completed Sessions"
                        description="Review your previously completed dialysis appointments."
                        count={completed.length}
                        countStyle="bg-emerald-50 text-emerald-700"
                        schedules={completed}
                        emptyIcon={<FaCheckCircle />}
                        emptyTitle="No completed sessions yet"
                        emptyDescription="Completed appointments will appear here once their status is updated."
                        formatDate={formatDate}
                        formatTime={formatTime}
                        getStatusStyle={getStatusStyle}
                    />

                    {/* Other appointment statuses */}
                    {otherSchedules.length > 0 && (
                        <ScheduleSection
                            eyebrow="OTHER APPOINTMENTS"
                            title="Other Sessions"
                            description="Appointments marked missed, cancelled, or with another status."
                            count={otherSchedules.length}
                            countStyle="bg-slate-100 text-slate-700"
                            schedules={otherSchedules}
                            emptyIcon={<FaRegCalendarTimes />}
                            emptyTitle="No other appointments"
                            emptyDescription="Other appointment statuses will appear here."
                            formatDate={formatDate}
                            formatTime={formatTime}
                            getStatusStyle={getStatusStyle}
                        />
                    )}

                    {/* Footer */}
                    <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex items-center gap-2">
                            <FaHeartbeat className="text-teal-600" />
                            Your care, organized in one place.
                        </p>
                        <p>Patient Portal</p>
                    </footer>
                </div>
            </div>

            {/* Loading overlay with fade-out */}
            {loading && (
                <PatientLoading
                    message="Loading your schedule..."
                    fadeOut={fadeOut}
                    onFadeOutComplete={handleFadeOutComplete}
                />
            )}
        </PatientLayout>
    );
}

function SummaryCard({ title, count, description, icon, iconStyle }) {
    return (
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                        {title}
                    </p>

                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                        {count}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                        {description}
                    </p>
                </div>

                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${iconStyle}`}
                >
                    {icon}
                </div>
            </div>
        </article>
    );
}

function HeroDetail({ icon, label, value }) {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                {icon}
            </div>

            <div className="min-w-0">
                <p className="text-xs text-slate-300">{label}</p>
                <p className="mt-1 break-words font-semibold">{value}</p>
            </div>
        </div>
    );
}

function ScheduleSection({
    eyebrow,
    title,
    description,
    count,
    countStyle,
    schedules,
    emptyIcon,
    emptyTitle,
    emptyDescription,
    formatDate,
    formatTime,
    getStatusStyle,
}) {
    return (
        <section>
            <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                    {eyebrow}
                </p>

                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
                        {title}
                    </h2>

                    <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${countStyle}`}
                    >
                        {count} {count === 1 ? "session" : "sessions"}
                    </span>
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>

            {schedules.length === 0 ? (
                <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {schedules.map((schedule, index) => (
                        <ScheduleCard
                            key={schedule.id ?? `${schedule.dialysis_date}-${schedule.dialysis_time}-${index}`}
                            schedule={schedule}
                            formatDate={formatDate}
                            formatTime={formatTime}
                            getStatusStyle={getStatusStyle}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function ScheduleCard({
    schedule,
    formatDate,
    formatTime,
    getStatusStyle,
}) {
    return (
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6">
            <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                    <FaCalendarAlt className="mb-1 text-lg" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                        Session
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h3 className="break-words font-bold text-slate-800">
                                {formatDate(schedule.dialysis_date)}
                            </h3>

                            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                <FaClock className="shrink-0 text-teal-600" />
                                {formatTime(schedule.dialysis_time)}
                            </p>
                        </div>

                        <span
                            className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(schedule.status)}`}
                        >
                            {schedule.status || "Unknown"}
                        </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                            <FaCogs className="mt-1 shrink-0 text-teal-600" />

                            <div className="min-w-0">
                                <p className="text-xs text-slate-400">
                                    Dialysis machine
                                </p>
                                <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                    {schedule.machine || "Not assigned"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FaUserNurse className="mt-1 shrink-0 text-teal-600" />

                            <div className="min-w-0">
                                <p className="text-xs text-slate-400">
                                    Assigned staff
                                </p>
                                <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                    {schedule.staff || "Not assigned"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}

function EmptyState({ icon, title, description }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
                {icon}
            </div>

            <h3 className="mt-4 font-semibold text-slate-700">
                {title}
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {description}
            </p>
        </div>
    );
}
