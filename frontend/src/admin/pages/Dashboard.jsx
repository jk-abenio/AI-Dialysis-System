import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import DashboardCard from "../components/dashboard/DashboardCard";
import { getDashboardStats } from "../services/dashboardService";

import {
    FaUsers,
    FaCalendarDay,
    FaProcedures,
    FaUserNurse,
    FaCheckCircle,
    FaClock,
    FaUserCheck,
    FaHeartbeat,
    FaSyncAlt,
    FaExclamationCircle,
} from "react-icons/fa";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from "recharts";

const INITIAL_STATS = {
    patients: 0,
    active_patients: 0,
    machines: 0,
    staff: 0,
    today_schedules: 0,
    completed_today: 0,
    pending_today: 0,
    total_treatments: 0,
    recent_schedules: [],
    treatments_last_7_days: [],
    machine_utilization: [],
    staff_workload: [],
    schedule_status: [],
};

const STATUS_COLORS = {
    Completed: "#16A34A",
    Scheduled: "#2563EB",
    Pending: "#D97706",
    Cancelled: "#DC2626",
};

const CHART_COLORS = [
    "#16A34A",
    "#2563EB",
    "#DC2626",
    "#D97706",
    "#7C3AED",
];

const panelClass =
    "min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6";

function ChartEmptyState({ message = "No data available yet." }) {
    return (
        <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <FaChartPlaceholder />
            </div>
            <p className="text-sm text-slate-500">{message}</p>
        </div>
    );
}

function FaChartPlaceholder() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-slate-400"
            aria-hidden="true"
        >
            <path
                d="M4 19V5m0 14h16M7 15l4-4 3 2 5-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function PanelHeading({ title, description, action }) {
    return (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
            <div>
                <h2 className="text-base font-bold text-slate-800 sm:text-lg">
                    {title}
                </h2>
                {description && (
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        {description}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}

function getStatusClass(status) {
    switch (String(status || "").toLowerCase()) {
        case "completed":
            return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
        case "scheduled":
            return "bg-blue-50 text-blue-700 ring-blue-600/20";
        case "pending":
            return "bg-amber-50 text-amber-700 ring-amber-600/20";
        case "cancelled":
            return "bg-rose-50 text-rose-700 ring-rose-600/20";
        default:
            return "bg-slate-100 text-slate-600 ring-slate-500/20";
    }
}

function formatDate(value) {
    if (!value) return "—";

    // Keep date-only values in local calendar terms.
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);

    const date = dateOnly
        ? new Date(`${value}T00:00:00`)
        : new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function ProgressRow({ label, value, total, color }) {
    const count = Number(value) || 0;
    const denominator = Number(total) || 0;

    // Clamp the visual width to prevent overflowing the progress bar.
    const percentage =
        denominator > 0
            ? Math.min(100, Math.max(0, (count / denominator) * 100))
            : 0;

    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-600">
                    {label}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-slate-800">
                        {count.toLocaleString()}
                    </span>
                    <span className="w-11 text-right text-xs text-slate-400">
                        {percentage.toFixed(0)}%
                    </span>
                </div>
            </div>

            <div
                className="h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={denominator}
                aria-valuenow={Math.min(count, denominator)}
            >
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState(INITIAL_STATS);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError("");

        try {
            const data = await getDashboardStats();

            if (!data || typeof data !== "object") {
                throw new Error("The server returned invalid dashboard data.");
            }

            setStats({
                ...INITIAL_STATS,
                ...data,
                recent_schedules: Array.isArray(data.recent_schedules)
                    ? data.recent_schedules
                    : [],
                treatments_last_7_days: Array.isArray(
                    data.treatments_last_7_days
                )
                    ? data.treatments_last_7_days
                    : [],
                machine_utilization: Array.isArray(data.machine_utilization)
                    ? data.machine_utilization
                    : [],
                staff_workload: Array.isArray(data.staff_workload)
                    ? data.staff_workload
                    : [],
                schedule_status: Array.isArray(data.schedule_status)
                    ? data.schedule_status
                    : [],
            });
        } catch (err) {
            console.error("Failed to load dashboard statistics:", err);
            setError(
                "Unable to load dashboard data. Check your connection and try again."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const today = new Intl.DateTimeFormat("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(new Date());

    const totalSchedules = Number(stats.today_schedules) || 0;
    const completedToday = Number(stats.completed_today) || 0;
    const pendingToday = Number(stats.pending_today) || 0;

    const otherSchedules = Math.max(
        0,
        totalSchedules - completedToday - pendingToday
    );

    const statusData = stats.schedule_status.map((item) => ({
        ...item,
        fill:
            STATUS_COLORS[item.name] ||
            CHART_COLORS[
                stats.schedule_status.indexOf(item) % CHART_COLORS.length
            ],
    }));

    const numberFormatter = (value) =>
        Number(value || 0).toLocaleString();

    return (
        <DashboardLayout>
            <div className="min-h-full space-y-6 pb-6 sm:space-y-8">

                {/* Dashboard heading */}
                <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
                            AI Dialysis / Overview
                        </p>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                            Dashboard
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Monitor your dialysis operations at a glance.
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                            {today}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => loadDashboard(true)}
                        disabled={loading || refreshing}
                        className="
                            inline-flex min-h-10 items-center justify-center
                            gap-2 self-start rounded-xl
                            border border-slate-200 bg-white
                            px-4 py-2 text-sm font-semibold text-slate-700
                            shadow-sm transition
                            hover:border-cyan-300 hover:bg-cyan-50
                            hover:text-cyan-800
                            disabled:cursor-not-allowed disabled:opacity-60
                            focus-visible:outline-none focus-visible:ring-2
                            focus-visible:ring-cyan-500
                            sm:self-auto
                        "
                    >
                        <FaSyncAlt
                            className={refreshing ? "animate-spin" : ""}
                            aria-hidden="true"
                        />
                        {refreshing ? "Refreshing..." : "Refresh data"}
                    </button>
                </section>

                {/* API error */}
                {error && (
                    <div
                        role="alert"
                        className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="flex items-start gap-3">
                            <FaExclamationCircle
                                className="mt-0.5 shrink-0 text-rose-600"
                                aria-hidden="true"
                            />
                            <p className="text-sm text-rose-800">{error}</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadDashboard()}
                            disabled={loading}
                            className="self-start text-sm font-semibold text-rose-700 underline underline-offset-4 hover:text-rose-900 sm:self-center"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Statistics */}
                <section
                    aria-label="Dashboard statistics"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <DashboardCard
                        title="Total Patients"
                        value={numberFormatter(stats.patients)}
                        description="Registered patients"
                        icon={FaUsers}
                        color="blue"
                    />

                    <DashboardCard
                        title="Today's Sessions"
                        value={numberFormatter(stats.today_schedules)}
                        description="Dialysis sessions today"
                        icon={FaCalendarDay}
                        color="green"
                    />

                    <DashboardCard
                        title="Machines"
                        value={numberFormatter(stats.machines)}
                        description="Registered dialysis machines"
                        icon={FaProcedures}
                        color="purple"
                    />

                    <DashboardCard
                        title="Staff"
                        value={numberFormatter(stats.staff)}
                        description="Registered staff members"
                        icon={FaUserNurse}
                        color="orange"
                    />

                    <DashboardCard
                        title="Completed Today"
                        value={numberFormatter(stats.completed_today)}
                        description="Completed dialysis sessions"
                        icon={FaCheckCircle}
                        color="emerald"
                    />

                    <DashboardCard
                        title="Pending Today"
                        value={numberFormatter(stats.pending_today)}
                        description="Sessions still pending"
                        icon={FaClock}
                        color="yellow"
                    />

                    <DashboardCard
                        title="Active Patients"
                        value={numberFormatter(stats.active_patients)}
                        description="Currently active patients"
                        icon={FaUserCheck}
                        color="cyan"
                    />

                    <DashboardCard
                        title="Treatments"
                        value={numberFormatter(stats.total_treatments)}
                        description="Total recorded treatments"
                        icon={FaHeartbeat}
                        color="red"
                    />
                </section>

                {/* Loading indicator */}
                {loading && (
                    <div
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500"
                        role="status"
                    >
                        <FaSyncAlt className="animate-spin text-cyan-600" />
                        Loading dashboard statistics...
                    </div>
                )}

                {/* Schedule summary and weekly treatments */}
                <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">

                    {/* Today's schedule summary */}
                    <div className={panelClass}>
                        <PanelHeading
                            title="Today's Schedule Summary"
                            description="Progress of today's dialysis sessions"
                        />

                        <div className="mb-6 grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-emerald-50 p-4">
                                <p className="text-xs font-medium text-emerald-700">
                                    Completed
                                </p>
                                <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-800">
                                    {numberFormatter(completedToday)}
                                </p>
                            </div>

                            <div className="rounded-xl bg-amber-50 p-4">
                                <p className="text-xs font-medium text-amber-700">
                                    Pending
                                </p>
                                <p className="mt-2 text-3xl font-bold tabular-nums text-amber-800">
                                    {numberFormatter(pendingToday)}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <ProgressRow
                                label="Completed sessions"
                                value={completedToday}
                                total={totalSchedules}
                                color="bg-emerald-500"
                            />

                            <ProgressRow
                                label="Pending sessions"
                                value={pendingToday}
                                total={totalSchedules}
                                color="bg-amber-500"
                            />

                            <ProgressRow
                                label="Other / unclassified"
                                value={otherSchedules}
                                total={totalSchedules}
                                color="bg-slate-400"
                            />
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                            <span className="text-sm text-slate-500">
                                Total sessions
                            </span>
                            <span className="text-lg font-bold text-slate-800">
                                {numberFormatter(totalSchedules)}
                            </span>
                        </div>
                    </div>

                    {/* Treatments last 7 days */}
                    <div className={panelClass}>
                        <PanelHeading
                            title="Treatments Last 7 Days"
                            description="Completed treatments by day"
                        />

                        <div className="h-72 sm:h-80">
                            {stats.treatments_last_7_days.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={stats.treatments_last_7_days}
                                        margin={{
                                            top: 8,
                                            right: 12,
                                            left: -18,
                                            bottom: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            stroke="#E2E8F0"
                                            strokeDasharray="4 4"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="day"
                                            tick={{ fontSize: 11, fill: "#64748B" }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickMargin={10}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tick={{ fontSize: 11, fill: "#64748B" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: 12,
                                                border: "1px solid #E2E8F0",
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="completed"
                                            name="Completed treatments"
                                            stroke="#0891B2"
                                            strokeWidth={3}
                                            dot={{
                                                r: 4,
                                                fill: "#0891B2",
                                                strokeWidth: 2,
                                                stroke: "#FFFFFF",
                                            }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <ChartEmptyState />
                            )}
                        </div>
                    </div>
                </section>

                {/* Machine utilization and staff workload */}
                <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">

                    {/* Machine utilization */}
                    <div className={panelClass}>
                        <PanelHeading
                            title="Machine Utilization"
                            description="Completed sessions by machine"
                        />

                        <div className="h-72 sm:h-80">
                            {stats.machine_utilization.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={stats.machine_utilization}
                                        margin={{
                                            top: 8,
                                            right: 8,
                                            left: -18,
                                            bottom: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            stroke="#E2E8F0"
                                            strokeDasharray="4 4"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="machine"
                                            tick={{ fontSize: 11, fill: "#64748B" }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickMargin={10}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tick={{ fontSize: 11, fill: "#64748B" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: 12,
                                                border: "1px solid #E2E8F0",
                                            }}
                                        />
                                        <Bar
                                            dataKey="completed"
                                            name="Completed sessions"
                                            fill="#0891B2"
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={44}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <ChartEmptyState />
                            )}
                        </div>
                    </div>

                    {/* Staff workload */}
                    <div className={panelClass}>
                        <PanelHeading
                            title="Staff Workload"
                            description="Completed sessions assigned to each staff member"
                        />

                        <div className="h-72 sm:h-80">
                            {stats.staff_workload.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={stats.staff_workload}
                                        margin={{
                                            top: 8,
                                            right: 8,
                                            left: -18,
                                            bottom: 12,
                                        }}
                                    >
                                        <CartesianGrid
                                            stroke="#E2E8F0"
                                            strokeDasharray="4 4"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="staff"
                                            tick={{ fontSize: 10, fill: "#64748B" }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickMargin={10}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tick={{ fontSize: 11, fill: "#64748B" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: 12,
                                                border: "1px solid #E2E8F0",
                                            }}
                                        />
                                        <Bar
                                            dataKey="completed"
                                            name="Completed sessions"
                                            fill="#7C3AED"
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={44}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <ChartEmptyState />
                            )}
                        </div>
                    </div>
                </section>

                {/* Schedule status */}
                <section className={panelClass}>
                    <PanelHeading
                        title="Schedule Status Distribution"
                        description="Breakdown of the schedule statuses returned by the server"
                    />

                    {statusData.length > 0 ? (
                        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
                            <div className="h-72 min-w-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={100}
                                            paddingAngle={3}
                                            labelLine={false}
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell
                                                    key={`${entry.name}-${index}`}
                                                    fill={entry.fill}
                                                    stroke="#FFFFFF"
                                                    strokeWidth={2}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: 12,
                                                border: "1px solid #E2E8F0",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-4">
                                {statusData.map((item, index) => (
                                    <div
                                        key={`${item.name}-${index}`}
                                        className="flex items-center justify-between gap-4"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span
                                                className="h-3 w-3 shrink-0 rounded-full"
                                                style={{ backgroundColor: item.fill }}
                                            />
                                            <span className="truncate text-sm font-medium text-slate-600">
                                                {item.name}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold tabular-nums text-slate-800">
                                            {numberFormatter(item.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-48">
                            <ChartEmptyState />
                        </div>
                    )}
                </section>

                {/* Recent schedules */}
                <section className={`${panelClass} overflow-hidden`}>
                    <PanelHeading
                        title="Recent Schedules"
                        description="Latest schedule records returned by the server"
                    />

                    <div className="-mx-5 overflow-x-auto sm:-mx-6">
                        <table className="w-full min-w-[760px] border-collapse text-left">
                            <thead>
                                <tr className="border-y border-slate-100 bg-slate-50">
                                    {[
                                        "Patient",
                                        "Machine",
                                        "Staff",
                                        "Date",
                                        "Shift",
                                        "Status",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            scope="col"
                                            className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {stats.recent_schedules.length > 0 ? (
                                    stats.recent_schedules.map((schedule) => (
                                        <tr
                                            key={schedule.id}
                                            className="transition-colors duration-150 hover:bg-slate-50/80"
                                        >
                                            <td className="px-5 py-4">
                                                <span className="font-semibold text-slate-800">
                                                    {schedule.patient_name || "—"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {schedule.machine_name || "—"}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {schedule.staff_name || "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                                {formatDate(schedule.dialysis_date)}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {schedule.shift || "—"}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClass(schedule.status)}`}
                                                >
                                                    {schedule.status || "Unknown"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-5 py-12 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <FaCalendarDay
                                                    className="text-2xl text-slate-300"
                                                    aria-hidden="true"
                                                />
                                                <p className="text-sm font-medium text-slate-600">
                                                    No schedules found
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    Schedule records will appear here when available.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-400">
                            Showing {stats.recent_schedules.length} records
                        </p>

                        <button
                            type="button"
                            onClick={() => loadDashboard(true)}
                            disabled={loading || refreshing}
                            className="text-xs font-semibold text-cyan-700 transition hover:text-cyan-900 disabled:opacity-50"
                        >
                            Refresh records
                        </button>
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}