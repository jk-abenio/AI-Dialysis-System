
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    FaBrain,
    FaCalendarAlt,
    FaClock,
    FaUserInjured,
    FaProcedures,
    FaUserMd,
    FaSyncAlt,
    FaCheckCircle,
    FaExclamationCircle,
    FaLightbulb,
    FaTimes,
    FaTimesCircle,
    FaChevronDown,
    FaChevronUp,
    FaChartBar,
} from "react-icons/fa";

import DashboardLayout from "../layouts/DashboardLayout";
import { getPatients } from "../services/patientService";
import {
    getScheduleRecommendations,
    bookRecommendedSchedule,
} from "../services/aiRecommendationService";

function getLocalDate(daysFromToday = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getPatientName(patient = {}) {
    return [
        patient.first_name,
        patient.middle_name,
        patient.last_name,
    ]
        .filter(Boolean)
        .join(" ");
}

function getPatientList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.patients)) return data.patients;
    return [];
}

function getErrorMessage(err) {
    const data = err?.response?.data;

    if (data?.message) return data.message;
    if (data?.detail) return data.detail;

    if (data && typeof data === "object") {
        const firstError = Object.values(data)
            .flat(Infinity)
            .find((value) => typeof value === "string");

        if (firstError) return firstError;
    }

    return err?.message || "Something went wrong. Please try again.";
}

function formatDate(dateString) {
    if (!dateString) return "—";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function formatStatus(status) {
    if (!status) return "Unknown";

    return String(status)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getWorkloadColor(percentage) {
    if (percentage === null) {
        return {
            bar: "bg-slate-400",
            text: "text-slate-600",
            badge: "bg-slate-100 text-slate-600",
        };
    }

    if (percentage >= 90) {
        return {
            bar: "bg-red-500",
            text: "text-red-700",
            badge: "bg-red-50 text-red-700",
        };
    }

    if (percentage >= 70) {
        return {
            bar: "bg-amber-500",
            text: "text-amber-700",
            badge: "bg-amber-50 text-amber-700",
        };
    }

    return {
        bar: "bg-emerald-500",
        text: "text-emerald-700",
        badge: "bg-emerald-50 text-emerald-700",
    };
}

/**
 * Displays workload information for a machine or staff member.
 *
 * Expected API structure:
 * {
 *   scheduled_count: 2,
 *   daily_capacity: 6,
 *   workload_percentage: 33,
 *   upcoming_schedule_count: 3,
 *   upcoming_schedules: [
 *     {
 *       schedule_id: 1,
 *       patient_id: 5,
 *       date: "2026-10-16",
 *       time: "08:00",
 *       shift: "Morning",
 *       status: "Scheduled"
 *     }
 *   ]
 * }
 */
function WorkloadPanel({ title, icon, workload }) {
    const [showSchedules, setShowSchedules] = useState(false);

    if (!workload || typeof workload !== "object") {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    {icon}
                    {title}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                    Workload information is unavailable. Please check the
                    recommendation API response.
                </p>
            </div>
        );
    }

    const count = Math.max(
        0,
        Number(workload.scheduled_count ?? 0)
    );

    const capacityValue = Number(workload.daily_capacity ?? 0);
    const capacity =
        Number.isFinite(capacityValue) && capacityValue > 0
            ? capacityValue
            : null;

    const rawPercentage = Number(workload.workload_percentage);

    const percentage =
        workload.workload_percentage !== null &&
        workload.workload_percentage !== undefined &&
        Number.isFinite(rawPercentage)
            ? Math.max(0, Math.min(100, rawPercentage))
            : null;

    const schedules = Array.isArray(workload.upcoming_schedules)
        ? workload.upcoming_schedules
        : [];

    const upcomingCount =
        workload.upcoming_schedule_count ?? schedules.length;

    const colors = getWorkloadColor(percentage);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                        {icon}
                    </div>

                    <div className="min-w-0">
                        <h4 className="break-words text-sm font-bold text-slate-800">
                            {title || "Resource"}
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Daily scheduled appointments
                        </p>
                    </div>
                </div>

                {percentage !== null && (
                    <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${colors.badge}`}
                    >
                        {Math.round(percentage)}%
                    </span>
                )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                        Scheduled today
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-800">
                        {count}
                    </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                        Configured capacity
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-800">
                        {capacity ?? "—"}
                    </p>
                </div>
            </div>

            <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-600">
                        Capacity utilization
                    </span>
                    <span className={`text-xs font-bold ${colors.text}`}>
                        {percentage === null
                            ? "Unavailable"
                            : `${Math.round(percentage)}%`}
                    </span>
                </div>

                <div
                    className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`${title} workload percentage`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage ?? 0}
                    aria-valuetext={
                        percentage === null
                            ? "Workload unavailable"
                            : `${Math.round(percentage)} percent`
                    }
                >
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                        style={{
                            width: `${percentage ?? 0}%`,
                        }}
                    />
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                    {capacity
                        ? `${count} of ${capacity} configured daily appointment slots are scheduled.`
                        : "Daily capacity has not been configured."}
                </p>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
                <button
                    type="button"
                    onClick={() => setShowSchedules((previous) => !previous)}
                    aria-expanded={showSchedules}
                    className="flex w-full items-center justify-between gap-3 rounded-lg py-2 text-left text-sm font-semibold text-cyan-800 transition hover:text-cyan-950 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                >
                    <span>
                        Upcoming appointments ({upcomingCount})
                    </span>

                    {showSchedules ? (
                        <FaChevronUp className="shrink-0" />
                    ) : (
                        <FaChevronDown className="shrink-0" />
                    )}
                </button>

                {showSchedules && (
                    <div className="mt-3 space-y-3">
                        {schedules.length === 0 ? (
                            <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                                No upcoming scheduled appointments were
                                returned for this resource.
                            </div>
                        ) : (
                            schedules.map((schedule, index) => (
                                <div
                                    key={
                                        schedule.schedule_id ??
                                        `${schedule.date}-${schedule.time}-${schedule.patient_id}-${index}`
                                    }
                                    className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-2">
                                            <FaCalendarAlt className="mt-0.5 shrink-0 text-cyan-600" />

                                            <div className="min-w-0">
                                                <p className="break-words text-sm font-semibold text-slate-800">
                                                    {formatDate(schedule.date)}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {schedule.time || "Time unavailable"}
                                                    {schedule.shift
                                                        ? ` · ${schedule.shift} shift`
                                                        : ""}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                                            {formatStatus(schedule.status)}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                        {schedule.schedule_id != null && (
                                            <span>
                                                Schedule #{schedule.schedule_id}
                                            </span>
                                        )}

                                        {schedule.patient_id != null && (
                                            <span>
                                                Patient ID: {schedule.patient_id}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        <p className="text-xs leading-5 text-slate-400">
                            Upcoming appointments depend on the records
                            supplied by the backend.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function getRecommendationKey(item = {}) {
    return [
        item.date ?? "date",
        item.time ?? "time",
        item.machine_id ?? "machine",
        item.staff_id ?? "staff",
    ].join("-");
}

export default function AIRecommendations() {
    const [patients, setPatients] = useState([]);
    const [patientId, setPatientId] = useState("");
    const [requestedDate, setRequestedDate] = useState(
        () => getLocalDate(1)
    );
    const [requestedTime, setRequestedTime] = useState("");

    const [recommendations, setRecommendations] = useState([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [bookingKey, setBookingKey] = useState("");
    const [bookingModalItem, setBookingModalItem] = useState(null);
    const [bookingResult, setBookingResult] = useState(null);

    const [loadingPatients, setLoadingPatients] = useState(true);
    const [generating, setGenerating] = useState(false);

    const selectedPatient = patients.find(
        (patient) => String(patient.id) === String(patientId)
    );

    const bookingPatient = bookingModalItem
        ? patients.find(
              (patient) =>
                  String(patient.id) ===
                  String(bookingModalItem.patient_id)
          )
        : selectedPatient;

    useEffect(() => {
        let cancelled = false;

        async function loadPatients() {
            setLoadingPatients(true);
            setError("");

            try {
                const data = await getPatients();

                if (cancelled) return;

                const activePatients = getPatientList(data).filter(
                    (patient) => patient.status === "Active"
                );

                setPatients(activePatients);
                setPatientId("");
            } catch (err) {
                if (!cancelled) {
                    setError(getErrorMessage(err));
                }
            } finally {
                if (!cancelled) {
                    setLoadingPatients(false);
                }
            }
        }

        loadPatients();

        return () => {
            cancelled = true;
        };
    }, []);

    function handlePatientChange(event) {
        setPatientId(event.target.value);
        setRecommendations([]);
        setMessage("");
        setError("");
        setBookingResult(null);
    }

    async function handleGenerate(event) {
        event.preventDefault();

        setError("");
        setMessage("");
        setRecommendations([]);
        setBookingResult(null);

        if (!patientId) {
            setError("Please select an active patient.");
            return;
        }

        if (!requestedDate) {
            setError("Please select a date.");
            return;
        }

        if (requestedDate < getLocalDate()) {
            setError("Please select today or a future date.");
            return;
        }

        setGenerating(true);

        try {
            const requestData = {
                patient_id: patientId,
                requested_date: requestedDate,
            };

            if (requestedTime) {
                requestData.requested_time = requestedTime;
            }

            const result = await getScheduleRecommendations(requestData);

            setRecommendations(
                Array.isArray(result.recommendations)
                    ? result.recommendations
                    : []
            );

            setMessage(result.message || "Recommendations generated.");
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setGenerating(false);
        }
    }

    function handleBookSchedule(item) {
        if (bookingKey || generating) return;

        setError("");
        setBookingResult(null);
        setBookingModalItem(item);
    }

    function closeConfirmationModal() {
        if (bookingKey) return;
        setBookingModalItem(null);
    }

    async function confirmBooking() {
        if (!bookingModalItem || bookingKey) return;

        const item = bookingModalItem;
        const key = getRecommendationKey(item);

        const patient =
            patients.find(
                (entry) =>
                    String(entry.id) === String(item.patient_id)
            ) || {};

        const patientName =
            getPatientName(patient) ||
            `Patient ${patient.patient_id || item.patient_id}`;

        const patientCode = patient.patient_id || "";

        setBookingKey(key);
        setBookingResult(null);
        setError("");

        try {
            const result = await bookRecommendedSchedule({
                patient_id: item.patient_id,
                requested_date: item.date,
                requested_time: item.time,
                machine_id: item.machine_id,
                staff_id: item.staff_id,
            });

            if (!result.success) {
                setBookingResult({
                    type: "error",
                    title: "Booking Failed",
                    message:
                        result.message ||
                        "Unable to book this schedule. Please try again.",
                });

                setBookingModalItem(null);
                return;
            }

            const schedule = result.schedule || {
                date: item.date,
                time: item.time,
                shift: item.shift,
                machine_number: item.machine_number,
                staff_name: item.staff_name,
                patient_id: item.patient_id,
            };

            setBookingResult({
                type: "success",
                title: "Booking Successful!",
                message:
                    result.message ||
                    "The dialysis appointment has been booked successfully.",
                patientName,
                patientCode,
                scheduleId: schedule.id ?? schedule.schedule_id,
                schedule,
            });

            setBookingModalItem(null);

            try {
                const refreshRequest = {
                    patient_id: item.patient_id,
                    requested_date: item.date,
                };

                if (requestedTime) {
                    refreshRequest.requested_time = requestedTime;
                }

                const refreshed = await getScheduleRecommendations(refreshRequest);

                setRecommendations(
                    Array.isArray(refreshed.recommendations)
                        ? refreshed.recommendations
                        : []
                );

                setMessage(
                    refreshed.message || "Recommendations refreshed."
                );
            } catch {
                setMessage(
                    "Booking completed. Generate recommendations again to refresh availability."
                );
            }
        } catch (err) {
            setBookingResult({
                type: "error",
                title: "Booking Failed",
                message: getErrorMessage(err),
            });

            setBookingModalItem(null);
        } finally {
            setBookingKey("");
        }
    }

    function closeResultModal() {
        setBookingResult(null);
    }

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl space-y-7">
                {/* Page heading */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-700">
                            <FaBrain />
                            Intelligent Scheduling
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                            AI Recommendations
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Generate rule-based suggestions for available
                            dialysis machines and eligible staff.
                        </p>
                    </div>

                    <div className="flex w-fit items-center gap-2 rounded-xl border border-cyan-100 bg-white px-4 py-3 shadow-sm">
                        <FaBrain className="text-cyan-600" />
                        <span className="text-sm font-semibold text-slate-700">
                            Recommendation Engine
                        </span>
                    </div>
                </div>

                {/* Safety notice */}
                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <FaExclamationCircle className="mt-0.5 shrink-0 text-amber-600" />

                    <div>
                        <p className="text-sm font-bold text-amber-900">
                            Administrator review required
                        </p>
                        <p className="mt-1 text-sm leading-6 text-amber-800">
                            These are preliminary scheduling suggestions,
                            not clinical decisions. Confirm patient details,
                            treatment duration, staff eligibility, and clinic
                            operating hours before approving a schedule.
                            Booking creates a real appointment.
                        </p>
                    </div>
                </div>

                {/* Recommendation request */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                                <FaCalendarAlt size={18} />
                            </div>

                            <div>
                                <h2 className="font-bold text-slate-800">
                                    Recommendation Request
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Select a patient and date. You may specify a time or leave it blank to scan the full day.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form
                        onSubmit={handleGenerate}
                        className="space-y-5 p-5 sm:p-7"
                    >
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            <div>
                                <label
                                    htmlFor="ai-patient"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Patient
                                </label>

                                <select
                                    id="ai-patient"
                                    value={patientId}
                                    onChange={handlePatientChange}
                                    disabled={
                                        loadingPatients ||
                                        patients.length === 0 ||
                                        generating ||
                                        Boolean(bookingKey)
                                    }
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                >
                                    <option value="">
                                        {loadingPatients
                                            ? "Loading patients..."
                                            : patients.length === 0
                                              ? "No active patients available"
                                              : "-- Select a patient --"}
                                    </option>

                                    {patients.map((patient) => (
                                        <option
                                            key={patient.id}
                                            value={String(patient.id)}
                                        >
                                            {patient.patient_id} -{" "}
                                            {patient.first_name}{" "}
                                            {patient.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="ai-date"
                                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
                                >
                                    <FaCalendarAlt className="text-slate-400" />
                                    Requested Date
                                </label>

                                <input
                                    id="ai-date"
                                    type="date"
                                    value={requestedDate}
                                    min={getLocalDate()}
                                    onChange={(event) => {
                                        setRequestedDate(event.target.value);
                                        setRecommendations([]);
                                        setMessage("");
                                        setError("");
                                    }}
                                    disabled={generating || Boolean(bookingKey)}
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="ai-time"
                                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
                                >
                                    <FaClock className="text-slate-400" />
                                    Requested Time (Optional)
                                </label>

                                <input
                                    id="ai-time"
                                    type="time"
                                    value={requestedTime}
                                    onChange={(event) => {
                                        setRequestedTime(event.target.value);
                                        setRecommendations([]);
                                        setMessage("");
                                        setError("");
                                    }}
                                    disabled={generating || Boolean(bookingKey)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-50"
                                />
                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                    Leave this blank to request recommendations for the full operating day. Choose a time to focus on that specific start time.
                                </p>
                            </div>
                        </div>

                        {selectedPatient && (
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                                <span className="flex items-center gap-2 text-slate-600">
                                    <FaUserInjured className="text-cyan-600" />
                                    <span className="font-semibold">
                                        {getPatientName(selectedPatient)}
                                    </span>
                                </span>

                                {selectedPatient.patient_id && (
                                    <span className="text-slate-500">
                                        Patient ID: {selectedPatient.patient_id}
                                    </span>
                                )}

                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                    Active
                                </span>
                            </div>
                        )}

                        {error && (
                            <div
                                role="alert"
                                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                            >
                                <FaExclamationCircle className="mt-0.5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs leading-5 text-slate-500">
                                Leave time blank for full-day recommendations. Results depend on backend availability checks and current scheduling rules.
                            </p>

                            <button
                                type="submit"
                                disabled={
                                    generating ||
                                    loadingPatients ||
                                    patients.length === 0 ||
                                    Boolean(bookingKey)
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800 focus:outline-none focus:ring-4 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {generating ? (
                                    <>
                                        <FaSyncAlt className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FaBrain />
                                        Generate Recommendations
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Recommendation results */}
                {(message || recommendations.length > 0) && (
                    <section className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    Suggested Combinations
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Review each option and its resource workload
                                    before making a scheduling decision.
                                </p>
                            </div>

                            {recommendations.length > 0 && (
                                <span className="w-fit rounded-full bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800">
                                    {recommendations.length} option
                                    {recommendations.length !== 1 ? "s" : ""} found
                                </span>
                            )}
                        </div>

                        {message && (
                            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />
                                <p>{message}</p>
                            </div>
                        )}

                        {recommendations.length > 0 && (
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                {recommendations.map((item, index) => {
                                    const key = getRecommendationKey(item);
                                    const isBooking = bookingKey === key;

                                    return (
                                        <article
                                            key={key}
                                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow-md sm:p-6"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                                                        <FaLightbulb size={19} />
                                                    </div>

                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                            Option {index + 1}
                                                        </p>
                                                        <h3 className="mt-1 font-bold text-slate-800">
                                                            {item.machine_number}
                                                        </h3>
                                                    </div>
                                                </div>

                                                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                                                    Review required
                                                </span>
                                            </div>

                                            <div className="mt-5 grid grid-cols-2 gap-3">
                                                <div className="rounded-xl bg-slate-50 p-4">
                                                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                                                        <FaProcedures />
                                                        Machine
                                                    </div>
                                                    <p className="break-words font-semibold text-slate-800">
                                                        {item.machine_number}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Machine ID: {item.machine_id}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl bg-slate-50 p-4">
                                                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                                                        <FaUserMd />
                                                        Staff
                                                    </div>
                                                    <p className="break-words font-semibold text-slate-800">
                                                        {item.staff_name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Staff ID: {item.staff_id}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                                <span className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600">
                                                    <FaCalendarAlt className="mr-1.5 inline" />
                                                    {formatDate(item.date)}
                                                </span>

                                                <span className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600">
                                                    <FaClock className="mr-1.5 inline" />
                                                    {item.time}–{item.estimated_end_time}
                                                </span>

                                                <span className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600">
                                                    Shift: {item.shift}
                                                </span>
                                            </div>

                                            {/* Resource workload */}
                                            <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                                                <div>
                                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                        <FaChartBar className="text-cyan-600" />
                                                        Resource Workload
                                                    </h4>
                                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                                        Review the existing appointments
                                                        associated with this machine
                                                        and staff member.
                                                    </p>
                                                </div>

                                                <WorkloadPanel
                                                    title={`Machine ${item.machine_number ?? item.machine_id}`}
                                                    icon={<FaProcedures size={16} />}
                                                    workload={item.machine_workload}
                                                />

                                                <WorkloadPanel
                                                    title={item.staff_name || `Staff ${item.staff_id}`}
                                                    icon={<FaUserMd size={16} />}
                                                    workload={item.staff_workload}
                                                />
                                            </div>

                                            {/* Recommendation reasons */}
                                            <div className="mt-5 border-t border-slate-100 pt-4">
                                                <p className="mb-3 text-sm font-bold text-slate-700">
                                                    Recommendation reasons
                                                </p>

                                                <ul className="space-y-2">
                                                    {(item.reasons || []).map(
                                                        (reason, reasonIndex) => (
                                                            <li
                                                                key={reasonIndex}
                                                                className="flex items-start gap-2 text-sm leading-5 text-slate-600"
                                                            >
                                                                <FaCheckCircle className="mt-1 shrink-0 text-emerald-500" />
                                                                <span>{reason}</span>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </div>

                                            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                                                Preliminary rule-based suggestion.
                                                Workload percentages use configured
                                                capacity and do not indicate clinical
                                                suitability. Confirm appointment details
                                                before booking.
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() => handleBookSchedule(item)}
                                                disabled={Boolean(bookingKey) || generating}
                                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800 focus:outline-none focus:ring-4 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isBooking ? (
                                                    <>
                                                        <FaSyncAlt className="animate-spin" />
                                                        Booking...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaCheckCircle />
                                                        Book Schedule
                                                    </>
                                                )}
                                            </button>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}
            </div>

            {/* Booking confirmation modal */}
            {bookingModalItem &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                        onClick={closeConfirmationModal}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="booking-confirm-title"
                            className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-[fadeIn_0.2s_ease-out]"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="bg-gradient-to-br from-cyan-800 to-cyan-500 px-6 py-7 text-white sm:px-8">
                                <div className="flex items-start justify-between">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                                        {bookingKey ? (
                                            <FaSyncAlt
                                                size={25}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <FaCalendarAlt size={25} />
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        aria-label="Close confirmation"
                                        onClick={closeConfirmationModal}
                                        disabled={Boolean(bookingKey)}
                                        className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <FaTimes size={18} />
                                    </button>
                                </div>

                                <p className="mt-5 text-xs font-bold tracking-[0.2em] text-cyan-100">
                                    APPOINTMENT CONFIRMATION
                                </p>

                                <h2
                                    id="booking-confirm-title"
                                    className="mt-2 text-2xl font-bold"
                                >
                                    {bookingKey
                                        ? "Booking in progress..."
                                        : "Confirm this booking?"}
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-cyan-50">
                                    {bookingKey
                                        ? "Please wait while the appointment is being validated and saved."
                                        : "Review all details and resource workload before creating this appointment."}
                                </p>
                            </div>

                            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6 sm:p-8">
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                                        <FaUserInjured size={20} />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            Patient
                                        </p>
                                        <p className="mt-1 break-words font-bold text-slate-800">
                                            {getPatientName(bookingPatient || {}) ||
                                                `Patient ${bookingModalItem.patient_id}`}
                                        </p>

                                        {bookingPatient?.patient_id && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                Patient ID: {bookingPatient.patient_id}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border border-slate-100 p-4">
                                        <FaCalendarAlt className="text-cyan-600" />
                                        <p className="mt-3 text-xs text-slate-500">
                                            Appointment date
                                        </p>
                                        <p className="mt-1 text-sm font-bold text-slate-800">
                                            {formatDate(bookingModalItem.date)}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-100 p-4">
                                        <FaClock className="text-cyan-600" />
                                        <p className="mt-3 text-xs text-slate-500">
                                            Appointment time
                                        </p>
                                        <p className="mt-1 text-sm font-bold text-slate-800">
                                            {bookingModalItem.time} –{" "}
                                            {bookingModalItem.estimated_end_time}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {bookingModalItem.shift} shift
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-100 p-4">
                                        <FaProcedures className="text-cyan-600" />
                                        <p className="mt-3 text-xs text-slate-500">
                                            Assigned machine
                                        </p>
                                        <p className="mt-1 break-words text-sm font-bold text-slate-800">
                                            {bookingModalItem.machine_number}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            ID: {bookingModalItem.machine_id}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-100 p-4">
                                        <FaUserMd className="text-cyan-600" />
                                        <p className="mt-3 text-xs text-slate-500">
                                            Assigned staff
                                        </p>
                                        <p className="mt-1 break-words text-sm font-bold text-slate-800">
                                            {bookingModalItem.staff_name}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            ID: {bookingModalItem.staff_id}
                                        </p>
                                    </div>
                                </div>

                                {/* Workload review before booking */}
                                <div className="space-y-3 border-t border-slate-100 pt-5">
                                    <div>
                                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                            <FaChartBar className="text-cyan-600" />
                                            Workload Review
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            Check the existing appointments for
                                            the selected machine and staff member.
                                        </p>
                                    </div>

                                    <WorkloadPanel
                                        title={`Machine ${bookingModalItem.machine_number ?? bookingModalItem.machine_id}`}
                                        icon={<FaProcedures size={16} />}
                                        workload={bookingModalItem.machine_workload}
                                    />

                                    <WorkloadPanel
                                        title={bookingModalItem.staff_name || `Staff ${bookingModalItem.staff_id}`}
                                        icon={<FaUserMd size={16} />}
                                        workload={bookingModalItem.staff_workload}
                                    />
                                </div>

                                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                                    <FaExclamationCircle className="mt-0.5 shrink-0 text-amber-600" />
                                    <p className="text-xs leading-5 text-amber-800">
                                        Confirming creates a real appointment.
                                        Availability will be validated again before
                                        the schedule is saved. Workload information
                                        is advisory and may not reflect live changes
                                        until the backend refreshes it.
                                    </p>
                                </div>

                                {bookingKey && (
                                    <div
                                        role="status"
                                        className="flex items-center justify-center gap-3 rounded-xl bg-cyan-50 p-4 text-sm font-medium text-cyan-800"
                                    >
                                        <FaSyncAlt className="animate-spin" />
                                        Processing your booking. Please wait...
                                    </div>
                                )}

                                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={closeConfirmationModal}
                                        disabled={Boolean(bookingKey)}
                                        className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={confirmBooking}
                                        disabled={Boolean(bookingKey)}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800 focus:outline-none focus:ring-4 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {bookingKey ? (
                                            <>
                                                <FaSyncAlt className="animate-spin" />
                                                Booking...
                                            </>
                                        ) : (
                                            <>
                                                <FaCheckCircle />
                                                Confirm Booking
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {/* Booking success or failure modal */}
            {bookingResult &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                        onClick={closeResultModal}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="booking-result-title"
                            className="my-auto w-full max-w-md overflow-hidden rounded-3xl bg-white text-center shadow-2xl animate-[fadeIn_0.2s_ease-out]"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div
                                className={`px-6 pb-7 pt-8 ${
                                    bookingResult.type === "success"
                                        ? "bg-emerald-50"
                                        : "bg-red-50"
                                }`}
                            >
                                <div
                                    className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                                        bookingResult.type === "success"
                                            ? "bg-emerald-100 text-emerald-600"
                                            : "bg-red-100 text-red-600"
                                    }`}
                                >
                                    {bookingResult.type === "success" ? (
                                        <FaCheckCircle size={42} />
                                    ) : (
                                        <FaTimesCircle size={42} />
                                    )}
                                </div>

                                <h2
                                    id="booking-result-title"
                                    className="mt-5 text-2xl font-bold text-slate-800"
                                >
                                    {bookingResult.title}
                                </h2>

                                <p
                                    className={`mt-2 text-sm leading-6 ${
                                        bookingResult.type === "success"
                                            ? "text-emerald-800"
                                            : "text-red-700"
                                    }`}
                                >
                                    {bookingResult.message}
                                </p>
                            </div>

                            <div className="space-y-4 p-6 sm:p-7">
                                {bookingResult.type === "success" && (
                                    <>
                                        {bookingResult.scheduleId != null && (
                                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Schedule reference
                                                </p>
                                                <p className="mt-1 text-2xl font-bold text-emerald-700">
                                                    #{bookingResult.scheduleId}
                                                </p>
                                            </div>
                                        )}

                                        {bookingResult.schedule && (
                                            <div className="space-y-3 text-left text-sm">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-slate-500">
                                                        Patient
                                                    </span>
                                                    <span className="text-right font-semibold text-slate-800">
                                                        {bookingResult.patientName ||
                                                            `Patient ${bookingResult.schedule.patient_id || ""}`}
                                                    </span>
                                                </div>

                                                {bookingResult.patientCode && (
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-slate-500">
                                                            Patient ID
                                                        </span>
                                                        <span className="text-right font-semibold text-slate-800">
                                                            {bookingResult.patientCode}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between gap-4">
                                                    <span className="text-slate-500">
                                                        Date
                                                    </span>
                                                    <span className="text-right font-semibold text-slate-800">
                                                        {formatDate(bookingResult.schedule.date)}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between gap-4">
                                                    <span className="text-slate-500">
                                                        Time
                                                    </span>
                                                    <span className="text-right font-semibold text-slate-800">
                                                        {bookingResult.schedule.time}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between gap-4">
                                                    <span className="text-slate-500">
                                                        Machine
                                                    </span>
                                                    <span className="text-right font-semibold text-slate-800">
                                                        {bookingResult.schedule.machine_number}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between gap-4">
                                                    <span className="text-slate-500">
                                                        Staff
                                                    </span>
                                                    <span className="text-right font-semibold text-slate-800">
                                                        {bookingResult.schedule.staff_name}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                <button
                                    type="button"
                                    onClick={closeResultModal}
                                    className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4 ${
                                        bookingResult.type === "success"
                                            ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-200"
                                            : "bg-red-600 hover:bg-red-700 focus:ring-red-200"
                                    }`}
                                >
                                    {bookingResult.type === "success"
                                        ? "Done"
                                        : "Close"}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </DashboardLayout>
    );
}
