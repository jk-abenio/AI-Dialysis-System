
import { useCallback, useEffect, useMemo, useState } from "react";
import StaffLayout from "../layouts/StaffLayout";
import {
    FaHeartbeat,
    FaCalendarAlt,
    FaClock,
    FaUserNurse,
    FaCalendarCheck,
    FaChevronRight,
    FaArrowRight,
    FaCheckCircle,
    FaSyncAlt,
    FaUser,
    FaClipboardList,
    FaStethoscope,
} from "react-icons/fa";
import { useStaffAuth } from "../context/StaffAuthContext";
import PatientLoading from "../../patient/components/PatientLoading";

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const API_BASE = (
    configuredApiUrl ||
    `${window.location.protocol}//${window.location.hostname}:8000/api/`
).replace(/\/?$/, "/");

const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const [year, month, day] = date.split("-").map(Number);

    if (!year || !month || !day) return "Date unavailable";

    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
};

const formatTime = (time) => {
    if (!time) return "Time unavailable";

    const [hours, minutes] = time.split(":");

    if (hours === undefined || minutes === undefined) return time;

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
    statusStyles[status] || "bg-slate-100 text-slate-600 ring-slate-200";

const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.schedules)) return data.schedules;
    return [];
};

const getPatientName = (schedule) => {
    if (schedule.patient_name) return schedule.patient_name;

    if (schedule.patient && typeof schedule.patient === "object") {
        const patient = schedule.patient;
        const name = `${patient.first_name || ""} ${patient.last_name || ""}`.trim();

        return name || patient.full_name || "Patient";
    }

    return `Patient #${schedule.patient ?? "Unknown"}`;
};

const getMachineName = (schedule) =>
    schedule.machine_name ||
    (typeof schedule.machine === "object"
        ? schedule.machine?.machine_number
        : schedule.machine
          ? `Machine #${schedule.machine}`
          : "Not assigned");

const getStaffName = (schedule) =>
    schedule.staff_name ||
    (typeof schedule.staff === "object"
        ? `${schedule.staff?.first_name || ""} ${schedule.staff?.last_name || ""}`.trim()
        : "") ||
    "Not assigned";

function SummaryCard({ icon: Icon, label, value, description, color }) {
    return (
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                        {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
                        {value}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        {description}
                    </p>
                </div>

                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${color}`}
                >
                    <Icon />
                </div>
            </div>
        </article>
    );
}

function EmptyState({ title, description }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
                <FaCalendarAlt />
            </div>

            <h3 className="mt-4 font-semibold text-slate-700">{title}</h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {description}
            </p>
        </div>
    );
}

function ScheduleCard({ schedule }) {
    return (
        <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6">
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
                                {getPatientName(schedule)}
                            </h3>

                            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                <FaCalendarAlt className="shrink-0 text-teal-600" />
                                {formatDate(schedule.dialysis_date)}
                            </p>

                            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
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

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                        <div>
                            <p className="text-xs text-slate-400">Shift</p>
                            <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                {schedule.shift || "Not assigned"}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-400">Machine</p>
                            <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                                {getMachineName(schedule)}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                        <FaUserNurse className="shrink-0 text-teal-600" />
                        <span className="text-xs">Assigned staff:</span>
                        <span className="break-words font-medium text-slate-700">
                            {getStaffName(schedule)}
                        </span>
                    </div>
                </div>
            </div>
        </article>
    );
}

export default function StaffDashboard() {
    const { user, accessToken } = useStaffAuth();

    const [staffProfile, setStaffProfile] = useState(user || {});
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const today = getLocalDateString();

    const hour = new Date().getHours();
    const greeting =
        hour < 12
            ? "Good morning"
            : hour < 18
              ? "Good afternoon"
              : "Good evening";

    const handleFadeOutComplete = useCallback(() => {
        setLoading(false);
    }, []);

    const loadDashboard = useCallback(async () => {
        const startTime = Date.now();

        try {
            setLoadError(false);

            if (!accessToken) {
                throw new Error("Your staff session is unavailable.");
            }

            const headers = {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
            };

            const [profileResponse, schedulesResponse] = await Promise.all([
                fetch(`${API_BASE}staff/me/`, { headers }),
                fetch(`${API_BASE}schedules/`, { headers }),
            ]);

            if (
                profileResponse.status === 401 ||
                profileResponse.status === 403 ||
                schedulesResponse.status === 401 ||
                schedulesResponse.status === 403
            ) {
                throw new Error(
                    "Your session could not access the dashboard. Please sign in again."
                );
            }

            if (!profileResponse.ok) {
                throw new Error("Unable to load your staff profile.");
            }

            if (!schedulesResponse.ok) {
                throw new Error("Unable to load dialysis schedules.");
            }

            const profileData = await profileResponse.json();
            const schedulesData = await schedulesResponse.json();

            setStaffProfile(profileData?.staff || user || {});
            setSchedules(normalizeList(schedulesData));
        } catch (error) {
            console.error("Failed to load staff dashboard:", error);
            setLoadError(true);
        } finally {
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, 2000 - elapsed);

            if (remainingTime > 0) {
                await new Promise((resolve) => setTimeout(resolve, remainingTime));
            }

            setFadeOut(true);
            setRefreshing(false);
        }
    }, [accessToken, user]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const todaySchedules = useMemo(
        () =>
            schedules
                .filter((schedule) => schedule.dialysis_date === today)
                .sort((a, b) =>
                    (a.dialysis_time || "").localeCompare(
                        b.dialysis_time || ""
                    )
                ),
        [schedules, today]
    );

    const completedToday = todaySchedules.filter(
        (schedule) => schedule.status === "Completed"
    ).length;

    const upcomingSchedules = useMemo(
        () =>
            schedules
                .filter(
                    (schedule) =>
                        schedule.dialysis_date > today &&
                        schedule.status === "Scheduled"
                )
                .sort((a, b) => {
                    const dateComparison = a.dialysis_date.localeCompare(
                        b.dialysis_date
                    );

                    return dateComparison !== 0
                        ? dateComparison
                        : (a.dialysis_time || "").localeCompare(
                              b.dialysis_time || ""
                          );
                }),
        [schedules, today]
    );

    const staffName =
        `${staffProfile?.first_name || ""} ${staffProfile?.last_name || ""}`.trim() ||
        staffProfile?.name ||
        "there";

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadDashboard();
    };

    return (
        <StaffLayout>
            <div className="mx-auto max-w-7xl space-y-7">
                {/* Page header */}
                <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-700">
                            <FaHeartbeat />
                            <span>STAFF PORTAL</span>
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                            {greeting}, {staffName}!
                            <span
                                className="ml-2"
                                role="img"
                                aria-label="wave"
                            >
                                👋
                            </span>
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                            Here’s your assigned dialysis schedule and daily
                            treatment overview.
                        </p>
                    </div>

                    <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-xl text-teal-700 sm:flex">
                        <FaStethoscope />
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

                {/* Today's overview */}
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
                                    Today’s Assignments
                                </h2>

                                <p className="mt-2 text-sm text-slate-300">
                                    Your dialysis sessions at a glance.
                                </p>
                            </div>

                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl text-teal-200 shadow-inner">
                                <FaHeartbeat />
                            </div>
                        </div>

                        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-300">
                                    Assigned sessions today
                                </p>

                                <p className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
                                    {todaySchedules.length}
                                </p>

                                <p className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                                    <FaCalendarAlt className="text-teal-300" />
                                    {formatDate(today)}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
                            >
                                <FaSyncAlt
                                    className={refreshing ? "animate-spin" : ""}
                                />
                                {refreshing ? "Refreshing..." : "Refresh data"}
                            </button>
                        </div>

                        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                                        <FaUser />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-300">
                                            Employee ID
                                        </p>
                                        <p className="mt-1 break-words font-semibold text-white">
                                            {staffProfile?.employee_id || "Unavailable"}
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
                                            Staff role
                                        </p>
                                        <p className="mt-1 break-words font-semibold text-white">
                                            {staffProfile?.role || "Staff"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                                        <FaCheckCircle />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-300">
                                            Completed today
                                        </p>
                                        <p className="mt-1 break-words font-semibold text-white">
                                            {completedToday} of {todaySchedules.length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Summary cards */}
                <section>
                    <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                            Session summary
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                            Your Overview
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            A quick summary of your current assignments.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <SummaryCard
                            icon={FaCalendarAlt}
                            label="Today's Assignments"
                            value={todaySchedules.length}
                            description="All sessions scheduled for today."
                            color="bg-teal-50 text-teal-700"
                        />

                        <SummaryCard
                            icon={FaCheckCircle}
                            label="Completed Today"
                            value={completedToday}
                            description="Sessions marked as completed."
                            color="bg-emerald-50 text-emerald-700"
                        />

                        <SummaryCard
                            icon={FaClock}
                            label="Upcoming Sessions"
                            value={upcomingSchedules.length}
                            description="Future appointments currently scheduled."
                            color="bg-blue-50 text-blue-700"
                        />
                    </div>
                </section>

                {/* Today's sessions */}
                <section>
                    <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                            Daily assignments
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                            Today’s Dialysis Sessions
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Review each patient's appointment time, machine,
                            and status.
                        </p>
                    </div>

                    {todaySchedules.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            {todaySchedules.map((schedule) => (
                                <ScheduleCard
                                    key={schedule.id}
                                    schedule={schedule}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            title="No sessions scheduled today"
                            description="Your assigned dialysis sessions will appear here when they are scheduled."
                        />
                    )}
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
                                Keep track of your upcoming dialysis appointments.
                            </p>
                        </div>

                        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
                            <FaCalendarCheck />
                            {upcomingSchedules.length} upcoming
                        </span>
                    </div>

                    {upcomingSchedules.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            {upcomingSchedules.slice(0, 6).map((schedule) => (
                                <ScheduleCard
                                    key={schedule.id}
                                    schedule={schedule}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            title="No upcoming sessions"
                            description="Future appointments will appear here once they have been scheduled."
                        />
                    )}

                    {upcomingSchedules.length > 6 && (
                        <p className="mt-3 text-center text-sm text-slate-500">
                            Showing the next 6 of {upcomingSchedules.length} upcoming sessions.
                        </p>
                    )}
                </section>

                {/* Quick access */}
                <section>
                    <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                            Staff resources
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                            Quick Access
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Important information about your staff account and assignments.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <article className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700">
                                <FaUserNurse />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-800">
                                    Staff Profile
                                </h3>
                                <p className="mt-1 break-words text-sm leading-5 text-slate-500">
                                    {staffName}
                                    {staffProfile?.email
                                        ? ` · ${staffProfile.email}`
                                        : ""}
                                </p>
                            </div>
                        </article>

                        <article className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
                                <FaClipboardList />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-800">
                                    Assignment Summary
                                </h3>
                                <p className="mt-1 text-sm leading-5 text-slate-500">
                                    {todaySchedules.length} today ·{" "}
                                    {upcomingSchedules.length} upcoming
                                </p>
                            </div>

                            <FaChevronRight className="shrink-0 text-sm text-slate-400" />
                        </article>
                    </div>
                </section>

                {/* Footer */}
                <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2">
                        <FaHeartbeat className="text-teal-600" />
                        Supporting your team's dialysis care.
                    </p>
                    <p>Staff Portal</p>
                </footer>
            </div>

            {/* Loading overlay */}
            {loading && (
                <PatientLoading
                    message="Loading your staff dashboard..."
                    fadeOut={fadeOut}
                    onFadeOutComplete={handleFadeOutComplete}
                />
            )}
        </StaffLayout>
    );
}
