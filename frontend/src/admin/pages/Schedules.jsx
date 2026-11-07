import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { getSchedules } from "../services/scheduleService";
import DeleteScheduleModal from "../components/schedules/DeleteScheduleModal";
import AddScheduleModal from "../components/schedules/AddScheduleModal";
import TreatmentModal from "../components/schedules/TreatmentModal";
import Toast from "../components/Toast";
import {
    FaPlus,
    FaSearch,
    FaEdit,
    FaTrash,
    FaProcedures,
    FaSyncAlt,
    FaCheckCircle,
    FaTimesCircle,
    FaCalendarDay,
    FaCalendarAlt,
    FaClock,
    FaExclamationCircle,
    FaTimes,
} from "react-icons/fa";

// Returns the local date in YYYY-MM-DD format.
function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export default function Schedules() {
    const [schedules, setSchedules] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [search, setSearch] = useState("");
    const [scheduleFilter, setScheduleFilter] = useState("all");
    const [deleteModal, setDeleteModal] = useState(false);
    const [treatmentModal, setTreatmentModal] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [toast, setToast] = useState({
        message: "",
        type: "success",
    });

    const closeToast = useCallback(() => {
        setToast({ message: "", type: "success" });
    }, []);

    const loadSchedules = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getSchedules();
            setSchedules(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load schedules:", err);
            setError("Unable to load schedules. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSchedules();
    }, [loadSchedules]);

    const getText = (value) => String(value ?? "").trim();

    const todayDateKey = getLocalDateKey();

    const getScheduleDateKey = (schedule) =>
        getText(schedule.dialysis_date).slice(0, 10);

    const getStatus = (schedule) =>
        getText(schedule.status).toLowerCase();

    // Summary counts.
    const todaySchedulesCount = schedules.filter(
        (schedule) =>
            getScheduleDateKey(schedule) === todayDateKey
    ).length;

    const scheduledCount = schedules.filter(
        (schedule) => getStatus(schedule) === "scheduled"
    ).length;

    const completedSchedulesCount = schedules.filter(
        (schedule) => getStatus(schedule) === "completed"
    ).length;

    const upcomingSchedulesCount = schedules.filter((schedule) => {
        const date = getScheduleDateKey(schedule);

        return (
            date > todayDateKey &&
            getStatus(schedule) === "scheduled"
        );
    }).length;

    const missedSchedulesCount = schedules.filter(
        (schedule) => getStatus(schedule) === "missed"
    ).length;

    const cancelledSchedulesCount = schedules.filter(
        (schedule) => getStatus(schedule) === "cancelled"
    ).length;

    // Apply selected filter, then search.
    const filteredSchedules = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return schedules.filter((schedule) => {
            const scheduleDate = getText(
                schedule.dialysis_date
            ).slice(0, 10);

            const status = getText(schedule.status).toLowerCase();

            let matchesFilter = true;

            switch (scheduleFilter) {
                case "today":
                    matchesFilter = scheduleDate === todayDateKey;
                    break;

                case "upcoming":
                    matchesFilter =
                        scheduleDate > todayDateKey &&
                        status === "scheduled";
                    break;

                case "completed":
                    matchesFilter = status === "completed";
                    break;

                case "missed":
                    matchesFilter = status === "missed";
                    break;

                case "cancelled":
                    matchesFilter = status === "cancelled";
                    break;

                default:
                    matchesFilter = true;
            }

            if (!matchesFilter) return false;
            if (!keyword) return true;

            return [
                schedule.patient_name,
                schedule.machine_name,
                schedule.staff_name,
                schedule.dialysis_date,
                schedule.dialysis_time,
                schedule.shift,
                schedule.status,
            ].some((field) =>
                getText(field).toLowerCase().includes(keyword)
            );
        });
    }, [schedules, search, scheduleFilter, todayDateKey]);

    const handleSuccess = async (message) => {
        await loadSchedules();

        setToast({
            message,
            type: "success",
        });
    };

    const statusClasses = (status) => {
        switch (getText(status).toLowerCase()) {
            case "scheduled":
                return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200";

            case "completed":
                return "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200";

            case "cancelled":
                return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";

            case "missed":
                return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";

            default:
                return "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200";
        }
    };

    const formatDate = (date) => {
        if (!date) return "—";

        // Avoid timezone shifts for date-only ISO values.
        const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (match) {
            const [, year, month, day] = match;

            return new Date(
                Number(year),
                Number(month) - 1,
                Number(day)
            ).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        }

        return getText(date) || "—";
    };

    const scheduleFilters = [
        {
            id: "all",
            label: "All Schedules",
            count: schedules.length,
            icon: FaProcedures,
        },
        {
            id: "today",
            label: "Today's Sessions",
            count: todaySchedulesCount,
            icon: FaCalendarDay,
        },
        {
            id: "upcoming",
            label: "Upcoming",
            count: upcomingSchedulesCount,
            icon: FaCalendarAlt,
        },
        {
            id: "completed",
            label: "Completed",
            count: completedSchedulesCount,
            icon: FaCheckCircle,
        },
        {
            id: "missed",
            label: "Missed",
            count: missedSchedulesCount,
            icon: FaTimesCircle,
        },
        {
            id: "cancelled",
            label: "Cancelled",
            count: cancelledSchedulesCount,
            icon: FaTrash,
        },
    ];

    const summaryCards = [
        {
            label: "Total Schedules",
            count: schedules.length,
            icon: FaProcedures,
            iconStyle: "bg-blue-50 text-blue-600",
            description: "All registered appointments",
        },
        {
            label: "Today's Sessions",
            count: todaySchedulesCount,
            icon: FaCalendarDay,
            iconStyle: "bg-indigo-50 text-indigo-600",
            description: "Appointments dated today",
        },
        {
            label: "Scheduled",
            count: scheduledCount,
            icon: FaClock,
            iconStyle: "bg-amber-50 text-amber-600",
            description: "Awaiting completion",
        },
        {
            label: "Completed",
            count: completedSchedulesCount,
            icon: FaCheckCircle,
            iconStyle: "bg-green-50 text-green-600",
            description: "Completed appointments",
        },
    ];

    const emptyStateTitle = search.trim()
        ? "No matching schedules found"
        : scheduleFilter === "today"
        ? "No sessions scheduled for today"
        : scheduleFilter === "upcoming"
        ? "No upcoming sessions"
        : scheduleFilter === "completed"
        ? "No completed treatments found"
        : scheduleFilter === "missed"
        ? "No missed sessions"
        : scheduleFilter === "cancelled"
        ? "No cancelled schedules"
        : "No schedules yet";

    const emptyStateDescription = search.trim()
        ? "Try another search term or clear your filters."
        : scheduleFilter === "today"
        ? "There are no appointments recorded for today's date."
        : scheduleFilter === "upcoming"
        ? "Future appointments with Scheduled status will appear here."
        : scheduleFilter === "completed"
        ? "Completed treatments will appear here."
        : scheduleFilter === "missed"
        ? "Appointments marked as missed will appear here."
        : scheduleFilter === "cancelled"
        ? "Appointments marked as cancelled will appear here."
        : "Add a dialysis schedule to start managing appointments.";

    const handleAddSchedule = () => {
        setSelectedSchedule(null);
        setOpenModal(true);
    };

    return (
        <DashboardLayout>
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={closeToast}
            />

            <div className="space-y-6 pb-8">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                            <FaCalendarAlt className="text-blue-600" />
                            <span>Appointment Management</span>
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl">
                            Schedule Management
                        </h1>

                        <p className="mt-2 text-sm text-gray-500 sm:text-base">
                            Manage dialysis appointments, assignments, and treatments.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={loadSchedules}
                            disabled={loading}
                            aria-label="Refresh schedule list"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FaSyncAlt
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={handleAddSchedule}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                        >
                            <FaPlus />
                            Add Schedule
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <div
                                key={card.label}
                                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">
                                            {card.label}
                                        </p>

                                        <p className="mt-3 text-3xl font-bold tracking-tight text-gray-800">
                                            {loading ? "—" : card.count}
                                        </p>

                                        <p className="mt-2 text-xs text-gray-400">
                                            {card.description}
                                        </p>
                                    </div>

                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconStyle}`}
                                    >
                                        <Icon className="text-lg" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Filters */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-100 p-5">
                        <h2 className="text-lg font-bold text-gray-800">
                            Filter Schedules
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Quickly filter appointments by date and treatment status.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 p-5">
                        {scheduleFilters.map((filter) => {
                            const Icon = filter.icon;
                            const isActive = scheduleFilter === filter.id;

                            return (
                                <button
                                    key={filter.id}
                                    type="button"
                                    onClick={() => setScheduleFilter(filter.id)}
                                    aria-pressed={isActive}
                                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
                                        isActive
                                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                            : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                    }`}
                                >
                                    <Icon className="shrink-0" />
                                    <span>{filter.label}</span>

                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs ${
                                            isActive
                                                ? "bg-white/20 text-white"
                                                : "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                        {filter.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Schedule Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    {/* Table Header and Search */}
                    <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                Dialysis Appointments
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                View and manage scheduled treatments.
                            </p>
                        </div>

                        <div className="relative w-full sm:max-w-sm">
                            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search patient, machine, staff..."
                                aria-label="Search schedules"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-10 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    aria-label="Clear search"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                                >
                                    <FaTimes />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Filter */}
                    {scheduleFilter !== "all" && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-blue-50/50 px-5 py-3">
                            <span className="text-xs text-gray-500">
                                Active filter:
                            </span>

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                {scheduleFilters.find(
                                    (filter) => filter.id === scheduleFilter
                                )?.label}
                            </span>

                            <button
                                type="button"
                                onClick={() => setScheduleFilter("all")}
                                className="ml-auto text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                                Clear filter
                            </button>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div
                            role="alert"
                            className="m-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex items-start gap-3">
                                <FaExclamationCircle className="mt-0.5 shrink-0 text-red-500" />

                                <div>
                                    <p className="text-sm font-semibold text-red-700">
                                        Something went wrong
                                    </p>

                                    <p className="mt-1 text-sm text-red-600">
                                        {error}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={loadSchedules}
                                className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 sm:self-center"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Schedule Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-left">
                            <thead className="bg-gray-50">
                                <tr className="border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Patient
                                    </th>

                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Machine
                                    </th>

                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Staff
                                    </th>

                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Date
                                    </th>

                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Time
                                    </th>

                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Shift
                                    </th>

                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Status
                                    </th>

                                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

                                                <p className="mt-4 text-sm font-medium text-gray-600">
                                                    Loading schedules...
                                                </p>

                                                <p className="mt-1 text-xs text-gray-400">
                                                    Please wait a moment.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                                            Schedule data could not be displayed.
                                        </td>
                                    </tr>
                                ) : filteredSchedules.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center">
                                            <div className="mx-auto flex max-w-sm flex-col items-center">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                                                    <FaProcedures className="text-2xl" />
                                                </div>

                                                <h3 className="mt-4 text-base font-semibold text-gray-700">
                                                    {emptyStateTitle}
                                                </h3>

                                                <p className="mt-2 text-sm text-gray-500">
                                                    {emptyStateDescription}
                                                </p>

                                                {search.trim() || scheduleFilter !== "all" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSearch("");
                                                            setScheduleFilter("all");
                                                        }}
                                                        className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800"
                                                    >
                                                        Clear filters
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleAddSchedule}
                                                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                                                    >
                                                        <FaPlus />
                                                        Add Schedule
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSchedules.map((schedule) => (
                                        <tr
                                            key={schedule.id}
                                            className="transition-colors duration-150 hover:bg-blue-50/40"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                                        <FaProcedures />
                                                    </div>

                                                    <div>
                                                        <p className="font-semibold text-gray-800">
                                                            {getText(schedule.patient_name) || "Unknown patient"}
                                                        </p>

                                                        <p className="mt-1 text-xs text-gray-400">
                                                            Schedule ID: {schedule.id ?? "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {getText(schedule.machine_name) || "—"}
                                            </td>

                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {getText(schedule.staff_name) || "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                {formatDate(schedule.dialysis_date)}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                {getText(schedule.dialysis_time) || "—"}
                                            </td>

                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {getText(schedule.shift) || "—"}
                                            </td>

                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses(schedule.status)}`}
                                                >
                                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                    {getText(schedule.status) || "Unknown"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {getStatus(schedule) === "completed" ? (
                                                        <span
                                                            title="Treatment completed"
                                                            aria-label="Treatment completed"
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-100 bg-green-50 text-green-600"
                                                        >
                                                            <FaCheckCircle />
                                                        </span>
                                                    ) : getStatus(schedule) === "cancelled" ? (
                                                        <span
                                                            title="Schedule cancelled"
                                                            aria-label="Schedule cancelled"
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
                                                        >
                                                            <FaTimesCircle />
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedSchedule(schedule);
                                                                setTreatmentModal(true);
                                                            }}
                                                            title="Record treatment"
                                                            aria-label={`Record treatment for ${getText(schedule.patient_name) || "patient"}`}
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-100 bg-green-50 text-green-600 transition hover:border-green-200 hover:bg-green-100 active:scale-95"
                                                        >
                                                            <FaProcedures />
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedSchedule(schedule);
                                                            setOpenModal(true);
                                                        }}
                                                        title="Edit schedule"
                                                        aria-label={`Edit schedule for ${getText(schedule.patient_name) || "patient"}`}
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition hover:border-blue-200 hover:bg-blue-100 active:scale-95"
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedSchedule(schedule);
                                                            setDeleteModal(true);
                                                        }}
                                                        title="Delete schedule"
                                                        aria-label={`Delete schedule for ${getText(schedule.patient_name) || "patient"}`}
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:border-red-200 hover:bg-red-100 active:scale-95"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    {!loading && !error && (
                        <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50/70 px-5 py-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                Showing{" "}
                                <span className="font-semibold text-gray-700">
                                    {filteredSchedules.length}
                                </span>{" "}
                                of{" "}
                                <span className="font-semibold text-gray-700">
                                    {schedules.length}
                                </span>{" "}
                                schedules
                            </p>

                            <div className="flex flex-wrap items-center gap-2">
                                {search.trim() && (
                                    <span>
                                        Search:{" "}
                                        <span className="font-medium text-gray-700">
                                            "{search}"
                                        </span>
                                    </span>
                                )}

                                {scheduleFilter !== "all" && (
                                    <span className="font-medium text-blue-600">
                                        {scheduleFilters.find(
                                            (filter) => filter.id === scheduleFilter
                                        )?.label}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Add / Edit Schedule Modal */}
                <AddScheduleModal
                    open={openModal}
                    schedule={selectedSchedule}
                    onClose={() => {
                        setOpenModal(false);
                        setSelectedSchedule(null);
                    }}
                    onSuccess={async () => {
                        const message = selectedSchedule
                            ? "Schedule updated successfully."
                            : "Schedule added successfully.";

                        await handleSuccess(message);
                    }}
                />

                {/* Delete Confirmation Modal */}
                <DeleteScheduleModal
                    open={deleteModal}
                    schedule={selectedSchedule}
                    onClose={() => {
                        setDeleteModal(false);
                        setSelectedSchedule(null);
                    }}
                    onSuccess={async () => {
                        await handleSuccess("Schedule deleted successfully.");
                    }}
                />

                {/* Record Treatment Modal */}
                <TreatmentModal
                    open={treatmentModal}
                    schedule={selectedSchedule}
                    onClose={() => {
                        setTreatmentModal(false);
                        setSelectedSchedule(null);
                    }}
                    onSuccess={async () => {
                        await handleSuccess("Treatment recorded successfully.");
                    }}
                />
            </div>
        </DashboardLayout>
    );
}