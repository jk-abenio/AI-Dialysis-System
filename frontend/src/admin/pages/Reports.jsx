
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

import {
    FaCalendarAlt,
    FaFilePdf,
    FaFileExcel,
    FaSyncAlt,
    FaDownload,
    FaExclamationCircle,
    FaCheckCircle,
    FaClock,
    FaTimesCircle,
    FaUsers,
    FaClipboardList,
    FaUser,
    FaFilter,
} from "react-icons/fa";

import { getPatients } from "../services/patientService";

import {
    getDailyReport,
    downloadDailyPdf,
    downloadDailyExcel,
} from "../services/reportService";

const getLocalDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const formatDate = (dateString) => {
    if (!dateString) return "—";

    const [year, month, day] = dateString.split("-").map(Number);

    if (!year || !month || !day) return dateString;

    return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

const getPatientName = (patient) => {
    if (!patient) return "Unnamed patient";

    const fullName = [
        patient.first_name,
        patient.middle_name,
        patient.last_name,
        patient.suffix,
    ]
        .filter(Boolean)
        .join(" ")
        .trim();

    return (
        fullName ||
        patient.full_name ||
        patient.name ||
        patient.patient_name ||
        patient.patient_id ||
        `Patient #${patient.id}`
    );
};

const getStatusStyle = (status) => {
    const normalizedStatus = String(status || "")
        .toLowerCase()
        .replaceAll("_", " ")
        .trim();

    if (normalizedStatus === "completed") {
        return {
            icon: FaCheckCircle,
            className: "bg-green-50 text-green-700 ring-green-200",
        };
    }

    if (normalizedStatus === "cancelled") {
        return {
            icon: FaTimesCircle,
            className: "bg-red-50 text-red-700 ring-red-200",
        };
    }

    if (normalizedStatus === "missed") {
        return {
            icon: FaExclamationCircle,
            className: "bg-orange-50 text-orange-700 ring-orange-200",
        };
    }

    if (
        normalizedStatus === "in progress" ||
        normalizedStatus === "active"
    ) {
        return {
            icon: FaClock,
            className: "bg-amber-50 text-amber-700 ring-amber-200",
        };
    }

    if (normalizedStatus === "scheduled") {
        return {
            icon: FaCalendarAlt,
            className: "bg-blue-50 text-blue-700 ring-blue-200",
        };
    }

    return {
        icon: FaClipboardList,
        className: "bg-gray-50 text-gray-600 ring-gray-200",
    };
};

const getErrorMessage = (error, fallback) => {
    const data = error?.response?.data;

    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;

    return error?.message || fallback;
};

const getExportFileName = (type, filters) => {
    const patientPart =
        filters.scope === "patient"
            ? `Patient_${filters.patientId}`
            : "All_Patients";

    const statusPart =
        filters.status === "All"
            ? "All_Statuses"
            : filters.status;

    let periodPart;

    if (filters.date) {
        periodPart = filters.date;
    } else if (filters.startDate && filters.endDate) {
        periodPart = `${filters.startDate}_to_${filters.endDate}`;
    } else {
        periodPart = "All_Dates";
    }

    return `Dialysis_Report_${patientPart}_${statusPart}_${periodPart}.${type === "pdf" ? "pdf" : "xlsx"}`;
};

export default function Reports() {
    const today = useMemo(() => getLocalDate(), []);

    // Report scope
    const [reportScope, setReportScope] = useState("all");

    // Patient selection
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState("");
    const [patientsLoading, setPatientsLoading] = useState(true);
    const [patientsError, setPatientsError] = useState("");

    // Status and date filters
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [dateMode, setDateMode] = useState("day");
    const [selectedDate, setSelectedDate] = useState(today);
    const [startDate, setStartDate] = useState(
        `${today.slice(0, 7)}-01`
    );
    const [endDate, setEndDate] = useState(today);

    // Report data
    const [report, setReport] = useState({
        summary: {},
        records: [],
        title: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [exporting, setExporting] = useState("");

    // Load patients for the patient selector.
    useEffect(() => {
        let active = true;

        const loadPatients = async () => {
            setPatientsLoading(true);
            setPatientsError("");

            try {
                const data = await getPatients();

                if (!active) return;

                const patientList = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.results)
                      ? data.results
                      : Array.isArray(data?.data)
                        ? data.data
                        : [];

                setPatients(patientList);
            } catch (err) {
                if (!active) return;

                console.error("Unable to load patients:", err);

                setPatientsError(
                    getErrorMessage(
                        err,
                        "Unable to load the patient list."
                    )
                );
            } finally {
                if (active) setPatientsLoading(false);
            }
        };

        loadPatients();

        return () => {
            active = false;
        };
    }, []);

    // Build the exact filters used for both the report and exports.
        
    const filters = useMemo(() => {
        const result = {
            scope: reportScope,
            status: selectedStatus,
        };

        if (reportScope === "patient" && selectedPatient) {
            result.patientId = selectedPatient;
        }

        if (dateMode === "day") {
            result.date = selectedDate;
        } else if (dateMode === "range") {
            result.startDate = startDate;
            result.endDate = endDate;
        }

        // For dateMode === "all", leave the dates undefined.
        // reportService.js will send date_mode=all.
        // This allows the backend to include future scheduled sessions.

        return result;
    }, [
        reportScope,
        selectedPatient,
        selectedStatus,
        dateMode,
        selectedDate,
        startDate,
        endDate,
    ]);

    const filtersValid =
    (reportScope !== "patient" || !!selectedPatient) &&
    (dateMode !== "day" || !!selectedDate) &&
    (
        dateMode !== "range" ||
        (
            !!startDate &&
            !!endDate &&
            startDate <= endDate
        )
    );

    const loadReport = useCallback(
        async (currentFilters, signal) => {
            if (
                currentFilters.scope === "patient" &&
                !currentFilters.patientId
            ) {
                setReport({
                    summary: {},
                    records: [],
                    title: "",
                });
                setLoading(false);
                setError("");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const data = await getDailyReport(currentFilters);

                if (signal.aborted) return;

                setReport({
                    summary: data?.summary ?? {},
                    records: Array.isArray(data?.records)
                        ? data.records
                        : [],
                    title: data?.title ?? "",
                });
            } catch (err) {
                if (signal.aborted) return;

                console.error("Unable to load report:", err);

                setError(
                    getErrorMessage(
                        err,
                        "Unable to load the report. Please try again."
                    )
                );

                setReport({
                    summary: {},
                    records: [],
                    title: "",
                });
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        },
        []
    );

    useEffect(() => {
        if (!filtersValid) {
            setLoading(false);
            setReport({
                summary: {},
                records: [],
                title: "",
            });
            setError(
                dateMode === "range"
                    ? "Please select a valid date range."
                    : ""
            );
            return;
        }

        const controller = new AbortController();

        loadReport(filters, controller.signal);

        return () => controller.abort();
    }, [
        filters,
        filtersValid,
        dateMode,
        refreshKey,
        loadReport,
    ]);

    const handleRefresh = () => {
        setRefreshKey((previous) => previous + 1);
    };

    const handleExport = async (type) => {
        if (!filtersValid || loading || exporting) return;

        if (reportScope === "patient" && !selectedPatient) {
            setError("Please select a patient first.");
            return;
        }

        setExporting(type);
        setError("");

        try {
            const blob =
                type === "pdf"
                    ? await downloadDailyPdf(filters)
                    : await downloadDailyExcel(filters);

            if (!(blob instanceof Blob) || blob.size === 0) {
                throw new Error("The downloaded file is empty.");
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = getExportFileName(type, filters);

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);
        } catch (err) {
            console.error(
                `Unable to export ${type.toUpperCase()}:`,
                err
            );

            setError(
                getErrorMessage(
                    err,
                    `Unable to download the ${type.toUpperCase()} report. Please try again.`
                )
            );
        } finally {
            setExporting("");
        }
    };

    const summary = report.summary || {};
    const records = report.records || [];

    const summaryCards = [
        {
            title: "Total Sessions",
            value: summary.total ?? records.length,
            color: "bg-indigo-600",
            icon: FaClipboardList,
        },
        {
            title: "Completed",
            value: summary.completed ?? 0,
            color: "bg-green-600",
            icon: FaCheckCircle,
        },
        {
            title: "Scheduled",
            value: summary.scheduled ?? 0,
            color: "bg-blue-600",
            icon: FaCalendarAlt,
        },
        {
            title: "Cancelled",
            value: summary.cancelled ?? 0,
            color: "bg-red-600",
            icon: FaTimesCircle,
        },
        {
            title: "Missed",
            value: summary.missed ?? 0,
            color: "bg-orange-600",
            icon: FaExclamationCircle,
        },
        {
            title: "Patients in Report",
            value: summary.patients ?? 0,
            color: "bg-purple-600",
            icon: FaUsers,
        },
    ];

    const selectedPatientName = patients.find(
        (patient) => String(patient.id) === String(selectedPatient)
    );

    const reportPeriodLabel =
        dateMode === "day"
            ? formatDate(selectedDate)
            : dateMode === "range"
              ? `${formatDate(startDate)} – ${formatDate(endDate)}`
              : `All available dates through ${formatDate(today)}`;

    const reportScopeLabel =
        reportScope === "patient"
            ? selectedPatientName
                ? getPatientName(selectedPatientName)
                : "Select a patient"
            : "All Patients";

    const reportStatusLabel =
        selectedStatus === "All" ? "All Statuses" : selectedStatus;

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-8">
                {/* Page header */}
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-700">
                        <FaClipboardList />
                        Reports & Analytics
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl">
                        Dialysis Reports
                    </h1>

                    <p className="mt-1 text-sm text-gray-500 sm:text-base">
                        Generate patient-specific or all-patient reports
                        for scheduled, completed, cancelled, and missed
                        dialysis sessions.
                    </p>
                </div>

                {/* Report filters */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <FaFilter className="text-green-600" />
                        <h2 className="text-lg font-bold text-gray-800">
                            Report Configuration
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {/* Scope */}
                        <div>
                            <label
                                htmlFor="report-scope"
                                className="mb-1.5 block text-sm font-semibold text-gray-700"
                            >
                                Report Type
                            </label>

                            <select
                                id="report-scope"
                                value={reportScope}
                                onChange={(e) => {
                                    setReportScope(e.target.value);
                                    setError("");
                                }}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            >
                                <option value="all">
                                    All Patients Report
                                </option>
                                <option value="patient">
                                    Specific Patient Report
                                </option>
                            </select>
                        </div>

                        {/* Patient */}
                        <div>
                            <label
                                htmlFor="report-patient"
                                className="mb-1.5 block text-sm font-semibold text-gray-700"
                            >
                                Select Patient
                            </label>

                            <div className="relative">
                                <FaUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                                <select
                                    id="report-patient"
                                    value={selectedPatient}
                                    onChange={(e) =>
                                        setSelectedPatient(e.target.value)
                                    }
                                    disabled={
                                        reportScope !== "patient" ||
                                        patientsLoading
                                    }
                                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <option value="">
                                        {patientsLoading
                                            ? "Loading patients..."
                                            : reportScope === "patient"
                                              ? "Choose a patient"
                                              : "Not required for all patients"}
                                    </option>

                                    {patients.map((patient) => (
                                        <option
                                            key={patient.id}
                                            value={patient.id}
                                        >
                                            {getPatientName(patient)}
                                            {patient.patient_id
                                                ? ` (${patient.patient_id})`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {patientsError && (
                                <p className="mt-1 text-xs text-red-600">
                                    {patientsError}
                                </p>
                            )}
                        </div>

                        {/* Status */}
                        <div>
                            <label
                                htmlFor="report-status"
                                className="mb-1.5 block text-sm font-semibold text-gray-700"
                            >
                                Session Status
                            </label>

                            <select
                                id="report-status"
                                value={selectedStatus}
                                onChange={(e) =>
                                    setSelectedStatus(e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="Missed">Missed</option>
                            </select>
                        </div>

                        {/* Date mode */}
                        <div>
                            <label
                                htmlFor="report-date-mode"
                                className="mb-1.5 block text-sm font-semibold text-gray-700"
                            >
                                Date Filter
                            </label>

                            <select
                                id="report-date-mode"
                                value={dateMode}
                                onChange={(e) => setDateMode(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            >
                                <option value="day">Specific Day</option>
                                <option value="range">Custom Date Range</option>
                                <option value="all">All Available Dates</option>
                            </select>
                        </div>

                        {dateMode === "day" && (
                            <div>
                                <label
                                    htmlFor="report-date"
                                    className="mb-1.5 block text-sm font-semibold text-gray-700"
                                >
                                    Report Date
                                </label>

                                <input
                                    id="report-date"
                                    type="date"
                                    value={selectedDate}
                                    max={today}
                                    onChange={(e) =>
                                        setSelectedDate(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                />
                            </div>
                        )}

                        {dateMode === "range" && (
                            <>
                                <div>
                                    <label
                                        htmlFor="report-start-date"
                                        className="mb-1.5 block text-sm font-semibold text-gray-700"
                                    >
                                        Start Date
                                    </label>

                                    <input
                                        id="report-start-date"
                                        type="date"
                                        value={startDate}
                                        max={endDate || undefined}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="report-end-date"
                                        className="mb-1.5 block text-sm font-semibold text-gray-700"
                                    >
                                        End Date
                                    </label>

                                    <input
                                        id="report-end-date"
                                        type="date"
                                        value={endDate}
                                        min={startDate || undefined}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {dateMode === "all" && (
                        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                            All available dialysis records up to today will
                            be included.
                        </div>
                    )}

                    {reportScope === "patient" && !selectedPatient && (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            Select a patient to generate an individual
                            patient report.
                        </div>
                    )}

                    {dateMode === "range" &&
                        startDate &&
                        endDate &&
                        startDate > endDate && (
                            <div className="mt-4 text-sm text-red-600">
                                Start date cannot be later than end date.
                            </div>
                        )}

                    <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:flex-wrap">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={
                                loading ||
                                !filtersValid ||
                                (reportScope === "patient" && !selectedPatient)
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FaSyncAlt
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh Report
                        </button>

                        <button
                            type="button"
                            onClick={() => handleExport("pdf")}
                            disabled={
                                loading ||
                                !filtersValid ||
                                !!exporting ||
                                (reportScope === "patient" && !selectedPatient)
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {exporting === "pdf" ? (
                                <FaSyncAlt className="animate-spin" />
                            ) : (
                                <FaFilePdf />
                            )}
                            {exporting === "pdf"
                                ? "Exporting..."
                                : "Export PDF"}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleExport("excel")}
                            disabled={
                                loading ||
                                !filtersValid ||
                                !!exporting ||
                                (reportScope === "patient" && !selectedPatient)
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {exporting === "excel" ? (
                                <FaSyncAlt className="animate-spin" />
                            ) : (
                                <FaFileExcel />
                            )}
                            {exporting === "excel"
                                ? "Exporting..."
                                : "Export Excel"}
                        </button>
                    </div>
                </div>

                {/* Active report description */}
                <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Current Report
                        </p>

                        <h2 className="mt-1 text-lg font-bold text-gray-800">
                            {report.title ||
                                (reportScope === "patient"
                                    ? "Specific Patient Report"
                                    : "All Patients Report")}
                        </h2>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700">
                                {reportScopeLabel}
                            </span>

                            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                                {reportStatusLabel}
                            </span>

                            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
                                {reportPeriodLabel}
                            </span>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600">
                        <FaClipboardList />
                        {loading
                            ? "Loading..."
                            : `${records.length} ${
                                  records.length === 1 ? "record" : "records"
                              }`}
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div
                        role="alert"
                        className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="flex items-start gap-3">
                            <FaExclamationCircle className="mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>

                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loading || !filtersValid}
                            className="shrink-0 self-start rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 sm:self-center"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {summaryCards.map((card) => (
                        <div
                            key={card.title}
                            className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <div className="flex items-center justify-between gap-3 p-5">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-500">
                                        {card.title}
                                    </p>

                                    <p className="mt-2 text-3xl font-bold tracking-tight text-gray-800">
                                        {loading
                                            ? "—"
                                            : Number(card.value).toLocaleString()}
                                    </p>
                                </div>

                                <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${card.color}`}
                                >
                                    <card.icon size={20} />
                                </div>
                            </div>

                            <div className={`h-1 w-full ${card.color}`} />
                        </div>
                    ))}
                </div>

                {/* Records table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                Dialysis Sessions
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Records matching the selected patient,
                                status, and date filters.
                            </p>
                        </div>

                        <span className="text-sm font-medium text-gray-500">
                            {loading
                                ? "Updating..."
                                : `${records.length} total`}
                        </span>
                    </div>

                    {loading || (reportScope === "patient" && !selectedPatient) ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16">
                            {loading ? (
                                <>
                                    <FaSyncAlt className="animate-spin text-3xl text-green-600" />
                                    <p className="mt-4 text-sm font-medium text-gray-600">
                                        Loading report...
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        Please wait while records are retrieved.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <FaUser className="text-3xl text-gray-400" />
                                    <p className="mt-4 font-semibold text-gray-700">
                                        Select a patient
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Choose a patient above to view their
                                        dialysis history.
                                    </p>
                                </>
                            )}
                        </div>
                    ) : error ? (
                        <div className="px-6 py-12 text-center">
                            <FaExclamationCircle className="mx-auto text-3xl text-red-400" />
                            <p className="mt-3 font-semibold text-gray-700">
                                Unable to display records
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                Check the filters or refresh the report.
                            </p>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                <FaClipboardList size={23} />
                            </div>

                            <h3 className="mt-4 font-semibold text-gray-800">
                                No records found
                            </h3>

                            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                                No dialysis sessions match the selected
                                patient, status, and date filters.
                                Try changing your filters.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6">
                                            Patient
                                        </th>
                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Machine
                                        </th>
                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Staff
                                        </th>
                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Date
                                        </th>
                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Time
                                        </th>
                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Shift
                                        </th>
                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Status
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {records.map((schedule, index) => {
                                        const statusStyle = getStatusStyle(
                                            schedule.status
                                        );
                                        const StatusIcon = statusStyle.icon;

                                        const patientName =
                                            schedule.patient_name ||
                                            (
                                                typeof schedule.patient === "object"
                                                    ? getPatientName(schedule.patient)
                                                    : null
                                            ) ||
                                            "—";

                                        const machineName =
                                            schedule.machine_name ||
                                            (
                                                typeof schedule.machine === "object"
                                                    ? schedule.machine.machine_number ||
                                                      schedule.machine.name
                                                    : null
                                            ) ||
                                            "—";

                                        const staffName =
                                            schedule.staff_name ||
                                            (
                                                typeof schedule.staff === "object"
                                                    ? [
                                                          schedule.staff.first_name,
                                                          schedule.staff.last_name,
                                                      ]
                                                          .filter(Boolean)
                                                          .join(" ")
                                                    : null
                                            ) ||
                                            "—";

                                        return (
                                            <tr
                                                key={
                                                    schedule.id ??
                                                    `${schedule.dialysis_date}-${index}`
                                                }
                                                className="transition-colors hover:bg-gray-50"
                                            >
                                                <td className="px-5 py-4 sm:px-6">
                                                    <span className="font-medium text-gray-800">
                                                        {patientName}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    {machineName}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    {staffName}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                                                    {formatDate(
                                                        schedule.dialysis_date
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                                                    {schedule.dialysis_time ||
                                                        "—"}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="inline-flex rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                                        {schedule.shift || "—"}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyle.className}`}
                                                    >
                                                        <StatusIcon size={11} />
                                                        {schedule.status ||
                                                            "Unknown"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && !error && records.length > 0 && (
                        <div className="flex flex-col gap-1 border-t border-gray-100 bg-gray-50 px-5 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <span>
                                Showing {records.length}{" "}
                                {records.length === 1
                                    ? "dialysis session"
                                    : "dialysis sessions"}
                            </span>

                            <span>Period: {reportPeriodLabel}</span>
                        </div>
                    )}
                </div>

                {/* Export information */}
                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                    <FaDownload className="mt-0.5 shrink-0 text-blue-600" />

                    <div>
                        <p className="text-sm font-semibold text-blue-900">
                            Export your report
                        </p>
                        <p className="mt-1 text-sm text-blue-800/80">
                            PDF and Excel exports use the same patient,
                            status, and date filters as the displayed report.
                            The downloaded report includes its summary
                            statistics and matching dialysis sessions.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
