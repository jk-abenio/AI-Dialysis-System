import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaSms,
    FaPaperPlane,
    FaHistory,
    FaCalendarAlt,
    FaSyncAlt,
    FaSearch,
    FaCheckCircle,
    FaExclamationCircle,
    FaClock,
    FaFlask,
    FaUsers,
    FaTimes,
    FaUserCheck,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";

import DashboardLayout from "../layouts/DashboardLayout";
import SMSConfirmationModal from "../components/sms/SMSConfirmationModal";
import {
    getSMSHistory,
    sendTestSMS,
    getSMSReminders,
    sendSMSReminders,
    getSMSPatients,
    sendBulkSMS,
} from "../services/smsService";

const HISTORY_PAGE_SIZE = 7;

const initialTestForm = {
    phone_number: "",
    message: "This is a test SMS from the AI Dialysis System. No action is required.",
};

const statusStyles = {
    simulated: "bg-violet-100 text-violet-700",
    pending: "bg-amber-100 text-amber-700",
    sent: "bg-blue-100 text-blue-700",
    delivered: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
};

const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatAppointment = (date, time) => {
    if (!date) return "Date unavailable";

    const dateText = new Date(`${date}T00:00:00`).toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    if (!time) return dateText;

    const [hours, minutes] = time.split(":");
    const appointmentTime = new Date();

    appointmentTime.setHours(Number(hours), Number(minutes), 0, 0);

    return `${dateText} · ${appointmentTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    })}`;
};

function StatCard({ label, value, icon: Icon, color }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">
                        {value}
                    </p>
                </div>

                <div className={`rounded-xl p-3 ${color}`}>
                    <Icon className="text-xl" />
                </div>
            </div>
        </div>
    );
}

function SMSResultModal({ result, onClose }) {
    if (!result) return null;

    const isSuccess = result.type === "success";

    return createPortal(
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="sms-result-title"
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex justify-end px-5 pt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close result"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="px-6 pb-7 text-center">
                    <div
                        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                            isSuccess
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-red-100 text-red-600"
                        }`}
                    >
                        {isSuccess ? (
                            <FaCheckCircle className="text-3xl" />
                        ) : (
                            <FaExclamationCircle className="text-3xl" />
                        )}
                    </div>

                    <h2
                        id="sms-result-title"
                        className="mt-5 text-xl font-bold text-slate-900"
                    >
                        {result.title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {result.message}
                    </p>

                    {isSuccess && (
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                                <p className="text-2xl font-bold text-emerald-700">
                                    {result.processed}
                                </p>
                                <p className="mt-1 text-xs font-medium text-emerald-700">
                                    Processed
                                </p>
                            </div>

                            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                                <p className="text-2xl font-bold text-red-700">
                                    {result.failed}
                                </p>
                                <p className="mt-1 text-xs font-medium text-red-700">
                                    Failed
                                </p>
                            </div>
                        </div>
                    )}

                    {result.simulated && (
                        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-left">
                            <div className="flex items-start gap-2">
                                <FaFlask className="mt-0.5 shrink-0 text-violet-600" />
                                <p className="text-xs leading-5 text-violet-800">
                                    Mock SMS mode is active. Messages were
                                    simulated and recorded; no real SMS was
                                    delivered.
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function SMSCenter() {
    // SMS history and pagination
    const [history, setHistory] = useState([]);
    const [total, setTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);

    const historyOffset = (historyPage - 1) * HISTORY_PAGE_SIZE;
    const totalHistoryPages = Math.max(
        1,
        Math.ceil(total / HISTORY_PAGE_SIZE)
    );

    // Appointments and patients
    const [reminders, setReminders] = useState([]);
    const [patients, setPatients] = useState([]);
    const [selectedSchedules, setSelectedSchedules] = useState([]);
    const [selectedPatients, setSelectedPatients] = useState([]);

    // Form fields
    const [testForm, setTestForm] = useState(initialTestForm);
    const [patientSearch, setPatientSearch] = useState("");
    const [bulkMessage, setBulkMessage] = useState("");

    // History filters (currently applied to the loaded page only)
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");

    // Loading and submission states
    const [loading, setLoading] = useState(true);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [sendingReminders, setSendingReminders] = useState(false);
    const [sendingBulk, setSendingBulk] = useState(false);

    // Feedback and modals
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [confirmation, setConfirmation] = useState(null);
    const [smsResult, setSmsResult] = useState(null);

    // Load SMS history for the current page, appointments, and patients.
    const loadData = useCallback(async () => {
        setLoading(true);
        setLoadingPatients(true);
        setError("");

        try {
            const [historyResult, reminderResult, patientResult] =
                await Promise.all([
                    getSMSHistory({
                        limit: HISTORY_PAGE_SIZE,
                        offset: historyOffset,
                    }),
                    getSMSReminders(),
                    getSMSPatients(),
                ]);

            setHistory(historyResult.results || []);
            setTotal(
                historyResult.total ??
                    historyResult.count ??
                    0
            );

            setReminders(reminderResult.results || []);
            setPatients(patientResult.results || []);
        } catch (err) {
            console.error("Failed to load SMS Center data:", err);

            setError(
                err.response?.data?.detail ||
                    err.response?.data?.error ||
                    "Unable to load SMS Center data. Check your connection and login status."
            );
        } finally {
            setLoading(false);
            setLoadingPatients(false);
        }
    }, [historyOffset]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Refresh the currently selected page.
    const refreshData = () => {
        loadData();
    };

    // Change the history page.
    const goToHistoryPage = (nextPage) => {
        const safePage = Math.max(
            1,
            Math.min(nextPage, totalHistoryPages)
        );

        if (safePage !== historyPage) {
            setHistoryPage(safePage);
        }
    };

    // Filter SMS records on the currently loaded page.
    const filteredHistory = useMemo(() => {
        const term = search.trim().toLowerCase();

        return history.filter((item) => {
            const matchesSearch =
                !term ||
                (item.recipient_name || "").toLowerCase().includes(term) ||
                (item.recipient_number || "").toLowerCase().includes(term) ||
                (item.message || "").toLowerCase().includes(term);

            const matchesStatus =
                !statusFilter || item.status === statusFilter;

            const matchesType =
                !typeFilter || item.message_type === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [history, search, statusFilter, typeFilter]);

    // Search patients by name, patient ID, or registered phone number.
    const filteredPatients = useMemo(() => {
        const term = patientSearch.trim().toLowerCase();

        return patients.filter((patient) => {
            const name = (patient.name || "").toLowerCase();
            const patientId = String(
                patient.patient_id || ""
            ).toLowerCase();
            const phone = (patient.contact_number || "").toLowerCase();

            return (
                !term ||
                name.includes(term) ||
                patientId.includes(term) ||
                phone.includes(term)
            );
        });
    }, [patients, patientSearch]);

    // Statistics reflect the currently loaded history page.
    const stats = useMemo(
        () => ({
            simulated: history.filter(
                (item) => item.status === "simulated"
            ).length,

            sent: history.filter((item) =>
                ["sent", "delivered"].includes(item.status)
            ).length,

            failed: history.filter(
                (item) => item.status === "failed"
            ).length,
        }),
        [history]
    );

    // Fetch the current history page after an operation fails.
    const refreshHistoryAfterError = async () => {
        try {
            const result = await getSMSHistory({
                limit: HISTORY_PAGE_SIZE,
                offset: historyOffset,
            });

            setHistory(result.results || []);
            setTotal(result.total ?? result.count ?? 0);
        } catch (historyError) {
            console.error(
                "Unable to refresh SMS history after the error:",
                historyError
            );
        }
    };

    // Test SMS.
    const handleTestSubmit = async (event) => {
        event.preventDefault();
        setNotice("");
        setError("");

        if (
            !testForm.phone_number.trim() ||
            !testForm.message.trim()
        ) {
            setError("Enter a recipient phone number and message.");
            return;
        }

        if (testForm.message.trim().length > 1600) {
            setError("The message cannot exceed 1600 characters.");
            return;
        }

        setSendingTest(true);

        try {
            const result = await sendTestSMS({
                phone_number: testForm.phone_number.trim(),
                message: testForm.message.trim(),
            });

            setNotice(
                result.message ||
                    "Test SMS processed. Check its status in SMS history."
            );

            setTestForm(initialTestForm);

            // Return to page 1 so the newest records are easier to find.
            setHistoryPage(1);

            if (historyPage === 1) {
                await loadData();
            }
        } catch (err) {
            console.error("Test SMS failed:", err);

            setError(
                err.response?.data?.error ||
                    err.response?.data?.detail ||
                    "Unable to process the test SMS."
            );

            await refreshHistoryAfterError();
        } finally {
            setSendingTest(false);
        }
    };

    // Select or deselect an appointment.
    const toggleSchedule = (scheduleId) => {
        setSelectedSchedules((current) =>
            current.includes(scheduleId)
                ? current.filter((id) => id !== scheduleId)
                : [...current, scheduleId]
        );
    };

    // Open confirmation for appointment reminders.
    const handleSendReminders = () => {
        setError("");
        setNotice("");

        if (selectedSchedules.length === 0) {
            setError("Select at least one appointment first.");
            return;
        }

        const selectedRecipients = reminders
            .filter((item) =>
                selectedSchedules.includes(item.schedule_id)
            )
            .map((item) => ({
                id: item.schedule_id,
                schedule_id: item.schedule_id,
                name: item.patient_name || "Unnamed patient",
                patient_id: item.patient_code,
                contact_number: item.contact_number,
                dialysis_date: item.dialysis_date,
                dialysis_time: item.dialysis_time,
                shift: item.shift,
            }));

        if (selectedRecipients.length === 0) {
            setError(
                "The selected appointments could not be found. Refresh the appointment list and try again."
            );
            return;
        }

        setConfirmation({
            type: "reminders",
            title: "Confirm Appointment Reminders",
            message: `Review the ${selectedRecipients.length} selected appointment(s) before processing their reminders.`,
            count: selectedRecipients.length,
            recipients: selectedRecipients,
        });
    };

    // Select or deselect an individual patient using the database primary key.
    const togglePatient = (patientId) => {
        setSelectedPatients((current) =>
            current.includes(patientId)
                ? current.filter((id) => id !== patientId)
                : [...current, patientId]
        );
    };

    // Select or deselect all patients currently visible in search results.
    const toggleAllPatients = () => {
        const visibleIds = filteredPatients.map(
            (patient) => patient.id
        );

        if (visibleIds.length === 0) return;

        const allVisibleSelected = visibleIds.every((id) =>
            selectedPatients.includes(id)
        );

        setSelectedPatients((current) =>
            allVisibleSelected
                ? current.filter((id) => !visibleIds.includes(id))
                : [
                      ...new Set([
                          ...current,
                          ...visibleIds.filter(
                              (id) => !current.includes(id)
                          ),
                      ]),
                  ]
        );
    };

    // Open confirmation for bulk SMS.
    const handleBulkSend = (event) => {
        event.preventDefault();
        setError("");
        setNotice("");

        if (selectedPatients.length === 0) {
            setError("Select at least one patient.");
            return;
        }

        if (!bulkMessage.trim()) {
            setError("Enter a message before sending.");
            return;
        }

        if (bulkMessage.trim().length > 1600) {
            setError("The message cannot exceed 1600 characters.");
            return;
        }

        const selectedRecipients = patients
            .filter((patient) =>
                selectedPatients.includes(patient.id)
            )
            .map((patient) => ({
                id: patient.id,
                name: patient.name,
                patient_id: patient.patient_id,
                contact_number: patient.contact_number,
            }));

        if (selectedRecipients.length === 0) {
            setError(
                "The selected patients could not be found. Refresh the patient list and try again."
            );
            return;
        }

        setConfirmation({
            type: "bulk",
            title: "Confirm Bulk SMS",
            // message: `Review the recipient list before processing your message: "${bulkMessage.trim()}"`,
             message: `Review the ${selectedRecipients.length} selected appointment(s) before processing their reminders.`,
            count: selectedRecipients.length,
            recipients: selectedRecipients,
        });
    };

    // Execute the selected action only after confirmation.
    const confirmSMSAction = async () => {
        if (!confirmation) return;

        const action = confirmation.type;

        setConfirmation(null);
        setSmsResult(null);
        setError("");
        setNotice("");

        if (action === "bulk") {
            setSendingBulk(true);

            try {
                const result = await sendBulkSMS({
                    patient_ids: selectedPatients,
                    message: bulkMessage.trim(),
                });

                const processed = result.processed ?? 0;
                const failed = result.failed ?? 0;

                setSelectedPatients([]);
                setBulkMessage("");

                // Refresh the newest SMS records.
                setHistoryPage(1);

                setSmsResult({
                    type: "success",
                    title:
                        failed > 0
                            ? "Bulk SMS Processing Completed"
                            : "Bulk SMS Processing Successful",
                    message:
                        "The bulk SMS request has finished processing. Review the results below.",
                    processed,
                    failed,
                    simulated: true,
                });

                if (historyPage === 1) {
                    await loadData();
                }
            } catch (err) {
                console.error("Bulk SMS failed:", err);

                setSmsResult({
                    type: "error",
                    title: "Bulk SMS Processing Failed",
                    message:
                        err.response?.data?.error ||
                        err.response?.data?.detail ||
                        "Unable to process bulk SMS. Please try again.",
                });

                await refreshHistoryAfterError();
            } finally {
                setSendingBulk(false);
            }

            return;
        }

        if (action === "reminders") {
            setSendingReminders(true);

            try {
                const result = await sendSMSReminders(
                    selectedSchedules
                );

                const processed = result.processed ?? 0;
                const failed = result.failed ?? 0;

                setSelectedSchedules([]);

                // Refresh the newest SMS records.
                setHistoryPage(1);

                setSmsResult({
                    type: "success",
                    title:
                        failed > 0
                            ? "Reminder Processing Completed"
                            : "Appointment Reminders Processed",
                    message:
                        "The appointment reminder request has finished processing. Review the results below.",
                    processed,
                    failed,
                    simulated: true,
                });

                if (historyPage === 1) {
                    await loadData();
                }
            } catch (err) {
                console.error("Reminder processing failed:", err);

                setSmsResult({
                    type: "error",
                    title: "Reminder Processing Failed",
                    message:
                        err.response?.data?.error ||
                        err.response?.data?.detail ||
                        "Unable to process appointment reminders. Please try again.",
                });

                await refreshHistoryAfterError();
            } finally {
                setSendingReminders(false);
            }
        }
    };

    const showingFrom =
        total === 0 ? 0 : historyOffset + 1;

    const showingTo = Math.min(
        historyOffset + history.length,
        total
    );

    return (
        <DashboardLayout>
            <SMSConfirmationModal
                isOpen={Boolean(confirmation)}
                title={confirmation?.title || ""}
                message={confirmation?.message || ""}
                recipientCount={confirmation?.count || 0}
                recipients={confirmation?.recipients || []}
                smsMessage={
                    confirmation?.type === "bulk"
                        ? bulkMessage.trim()
                        : ""
                }
                confirmLabel={
                    confirmation?.type === "bulk"
                        ? "Confirm Bulk SMS"
                        : "Confirm Reminders"
                }
                confirmColor={
                    confirmation?.type === "reminders"
                        ? "bg-teal-600 hover:bg-teal-700"
                        : "bg-indigo-600 hover:bg-indigo-700"
                }
                loading={sendingBulk || sendingReminders}
                onConfirm={confirmSMSAction}
                onCancel={() => {
                    if (!sendingBulk && !sendingReminders) {
                        setConfirmation(null);
                    }
                }}
            />

            <SMSResultModal
                result={smsResult}
                onClose={() => setSmsResult(null)}
            />

            <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    {/* Page heading */}
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                                <FaSms className="text-2xl" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                                    SMS Center
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Test messages, bulk SMS, dialysis
                                    reminders, and message history
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={refreshData}
                            disabled={loading || loadingPatients}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FaSyncAlt
                                className={
                                    loading || loadingPatients
                                        ? "animate-spin"
                                        : ""
                                }
                            />
                            Refresh
                        </button>
                    </div>

                    {/* Mock-mode warning */}
                    <div className="flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:flex-row sm:items-center">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                            <FaFlask className="text-lg" />
                        </div>

                        <div>
                            <p className="font-semibold text-violet-900">
                                Mock SMS mode is active
                            </p>
                            <p className="mt-1 text-sm text-violet-800">
                                Messages are recorded as simulations. No SMS
                                is delivered to the recipient in this mode.
                            </p>
                        </div>
                    </div>

                    {/* Global feedback */}
                    {error && (
                        <div
                            role="alert"
                            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                        >
                            <FaExclamationCircle className="mt-0.5 shrink-0" />
                            <p className="flex-1">{error}</p>

                            <button
                                type="button"
                                onClick={() => setError("")}
                                aria-label="Dismiss error"
                                className="rounded-lg p-1 transition hover:bg-red-100"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    )}

                    {notice && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm"
                        >
                            <FaCheckCircle className="mt-0.5 shrink-0 text-lg text-emerald-600" />

                            <div className="min-w-0 flex-1">
                                <p className="font-bold">
                                    Processing Completed
                                </p>
                                <p className="mt-1 text-sm leading-6">
                                    {notice}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setNotice("")}
                                aria-label="Dismiss success message"
                                className="rounded-lg p-1 text-emerald-700 transition hover:bg-emerald-100"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    )}

                    {/* Statistics */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Total SMS Records"
                            value={total}
                            icon={FaHistory}
                            color="bg-blue-100 text-blue-700"
                        />

                        <StatCard
                            label="Simulated"
                            value={stats.simulated}
                            icon={FaFlask}
                            color="bg-violet-100 text-violet-700"
                        />

                        <StatCard
                            label="Sent / Delivered"
                            value={stats.sent}
                            icon={FaCheckCircle}
                            color="bg-emerald-100 text-emerald-700"
                        />

                        <StatCard
                            label="Failed"
                            value={stats.failed}
                            icon={FaExclamationCircle}
                            color="bg-red-100 text-red-700"
                        />
                    </div>

                    {/* Test SMS and appointment reminders */}
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {/* Test SMS */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                                    <FaPaperPlane />
                                </div>

                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        Test SMS
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Test validation and message recording
                                    </p>
                                </div>
                            </div>

                            <form
                                onSubmit={handleTestSubmit}
                                className="space-y-4"
                            >
                                <div>
                                    <label
                                        htmlFor="sms-phone"
                                        className="mb-1.5 block text-sm font-semibold text-slate-700"
                                    >
                                        Recipient phone number
                                    </label>

                                    <input
                                        id="sms-phone"
                                        type="tel"
                                        autoComplete="tel"
                                        placeholder="+639XXXXXXXXX"
                                        value={testForm.phone_number}
                                        onChange={(event) =>
                                            setTestForm((current) => ({
                                                ...current,
                                                phone_number:
                                                    event.target.value,
                                            }))
                                        }
                                        maxLength={30}
                                        required
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                <div>
                                    <div className="mb-1.5 flex items-center justify-between gap-2">
                                        <label
                                            htmlFor="sms-message"
                                            className="block text-sm font-semibold text-slate-700"
                                        >
                                            Message
                                        </label>

                                        <span className="text-xs text-slate-500">
                                            {testForm.message.length}/1600
                                        </span>
                                    </div>

                                    <textarea
                                        id="sms-message"
                                        rows={4}
                                        maxLength={1600}
                                        value={testForm.message}
                                        onChange={(event) =>
                                            setTestForm((current) => ({
                                                ...current,
                                                message: event.target.value,
                                            }))
                                        }
                                        required
                                        className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={sendingTest}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <FaPaperPlane />
                                    {sendingTest
                                        ? "Processing..."
                                        : "Simulate Test SMS"}
                                </button>
                            </form>
                        </section>

                        {/* Appointment reminders */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-teal-100 p-3 text-teal-700">
                                        <FaCalendarAlt />
                                    </div>

                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">
                                            Appointment Reminders
                                        </h2>
                                        <p className="text-sm text-slate-500">
                                            Active patients with upcoming
                                            scheduled sessions
                                        </p>
                                    </div>
                                </div>

                                <span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                                    {reminders.length} appointments
                                </span>
                            </div>

                            {loading ? (
                                <div className="py-12 text-center text-sm text-slate-500">
                                    Loading appointments...
                                </div>
                            ) : reminders.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
                                    <FaCalendarAlt className="mx-auto mb-3 text-3xl text-slate-300" />
                                    <p className="font-semibold text-slate-700">
                                        No upcoming appointments
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Eligible scheduled sessions will appear
                                        here.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                        <label className="flex items-center gap-2 text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    reminders.length > 0 &&
                                                    reminders.every((item) =>
                                                        selectedSchedules.includes(
                                                            item.schedule_id
                                                        )
                                                    )
                                                }
                                                onChange={(event) => {
                                                    setSelectedSchedules(
                                                        event.target.checked
                                                            ? reminders.map(
                                                                  (item) =>
                                                                      item.schedule_id
                                                              )
                                                            : []
                                                    );
                                                }}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            Select all
                                        </label>

                                        <span className="text-xs text-slate-500">
                                            {selectedSchedules.length} selected
                                        </span>
                                    </div>

                                    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                                        {reminders.map((item) => (
                                            <label
                                                key={item.schedule_id}
                                                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                                                    selectedSchedules.includes(
                                                        item.schedule_id
                                                    )
                                                        ? "border-blue-300 bg-blue-50"
                                                        : "border-slate-200 hover:bg-slate-50"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSchedules.includes(
                                                        item.schedule_id
                                                    )}
                                                    onChange={() =>
                                                        toggleSchedule(
                                                            item.schedule_id
                                                        )
                                                    }
                                                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-semibold text-slate-800">
                                                        {item.patient_name ||
                                                            item.patient_code}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Patient ID:{" "}
                                                        {item.patient_code ||
                                                            "—"}
                                                    </p>

                                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                                                        <FaClock className="shrink-0 text-slate-400" />
                                                        {formatAppointment(
                                                            item.dialysis_date,
                                                            item.dialysis_time
                                                        )}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {item.contact_number ||
                                                            "No contact number"}
                                                        {item.shift
                                                            ? ` · ${item.shift} shift`
                                                            : ""}
                                                    </p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSendReminders}
                                        disabled={
                                            sendingReminders ||
                                            selectedSchedules.length === 0
                                        }
                                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <FaPaperPlane />
                                        {sendingReminders
                                            ? "Processing reminders..."
                                            : `Simulate Reminders (${selectedSchedules.length})`}
                                    </button>
                                </>
                            )}
                        </section>
                    </div>

                    {/* Bulk SMS */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                                <FaUsers className="text-lg" />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Bulk SMS
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Select patients and prepare one message
                                    for all selected recipients.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleBulkSend} className="space-y-5">
                            {/* Patient search */}
                            <div>
                                <label
                                    htmlFor="bulk-patient-search"
                                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                                >
                                    Search active patients
                                </label>

                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                                    <input
                                        id="bulk-patient-search"
                                        type="search"
                                        placeholder="Search by name, patient ID, or phone..."
                                        value={patientSearch}
                                        onChange={(event) =>
                                            setPatientSearch(event.target.value)
                                        }
                                        className="w-full rounded-xl border border-slate-300 py-3 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                            </div>

                            {/* Selection controls */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={
                                            filteredPatients.length > 0 &&
                                            filteredPatients.every((patient) =>
                                                selectedPatients.includes(
                                                    patient.id
                                                )
                                            )
                                        }
                                        onChange={toggleAllPatients}
                                        disabled={
                                            loadingPatients ||
                                            filteredPatients.length === 0
                                        }
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Select all visible
                                </label>

                                <div className="flex items-center gap-3">
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                        {selectedPatients.length} selected
                                    </span>

                                    {selectedPatients.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedPatients([])
                                            }
                                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                                        >
                                            Clear selection
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Patient selection list */}
                            <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                                {loadingPatients ? (
                                    <div className="py-8 text-center text-sm text-slate-500">
                                        <FaSyncAlt className="mx-auto mb-2 animate-spin text-lg" />
                                        Loading patients...
                                    </div>
                                ) : filteredPatients.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-slate-500">
                                        <FaUsers className="mx-auto mb-2 text-2xl text-slate-300" />
                                        No matching active patients found.
                                    </div>
                                ) : (
                                    filteredPatients.map((patient) => {
                                        const selected =
                                            selectedPatients.includes(
                                                patient.id
                                            );

                                        const hasPhone = Boolean(
                                            patient.contact_number?.trim()
                                        );

                                        return (
                                            <label
                                                key={patient.id}
                                                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                                                    selected
                                                        ? "border-blue-300 bg-blue-50"
                                                        : "border-slate-200 hover:bg-slate-50"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() =>
                                                        togglePatient(
                                                            patient.id
                                                        )
                                                    }
                                                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />

                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-slate-800">
                                                        {patient.name ||
                                                            "Unnamed patient"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Patient ID:{" "}
                                                        {patient.patient_id ||
                                                            "—"}
                                                    </p>

                                                    <p
                                                        className={`mt-1 break-words text-sm ${
                                                            hasPhone
                                                                ? "text-slate-600"
                                                                : "font-medium text-red-600"
                                                        }`}
                                                    >
                                                        {hasPhone
                                                            ? patient.contact_number
                                                            : "No registered mobile number"}
                                                    </p>
                                                </div>

                                                {selected && (
                                                    <FaUserCheck className="mt-1 shrink-0 text-blue-600" />
                                                )}
                                            </label>
                                        );
                                    })
                                )}
                            </div>

                            <p className="text-xs leading-relaxed text-slate-500">
                                The recipient number comes from the patient's
                                registered contact number. Patients without a
                                valid number may be recorded as failed.
                            </p>

                            {/* Bulk message */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <label
                                        htmlFor="bulk-sms-message"
                                        className="block text-sm font-semibold text-slate-700"
                                    >
                                        Message for selected patients
                                    </label>

                                    <span
                                        className={`text-xs ${
                                            bulkMessage.length >= 1600
                                                ? "font-semibold text-red-600"
                                                : "text-slate-500"
                                        }`}
                                    >
                                        {bulkMessage.length}/1600
                                    </span>
                                </div>

                                <textarea
                                    id="bulk-sms-message"
                                    rows={5}
                                    maxLength={1600}
                                    placeholder="Type the message you want to send to all selected patients..."
                                    value={bulkMessage}
                                    onChange={(event) =>
                                        setBulkMessage(event.target.value)
                                    }
                                    required
                                    className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                />
                            </div>

                            {/* Bulk action */}
                            <button
                                type="submit"
                                disabled={
                                    sendingBulk ||
                                    loadingPatients ||
                                    selectedPatients.length === 0 ||
                                    !bulkMessage.trim()
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <FaPaperPlane />
                                {sendingBulk
                                    ? "Processing bulk SMS..."
                                    : `Simulate Bulk SMS (${selectedPatients.length})`}
                            </button>

                            <p className="text-center text-xs text-violet-700">
                                Mock mode is active. This records simulated
                                messages and does not deliver real SMS.
                            </p>
                        </form>
                    </section>

                    {/* SMS History */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {/* History heading and filters */}
                        <div className="border-b border-slate-200 p-5 sm:p-6">
                            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                                        <FaHistory />
                                    </div>

                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">
                                            SMS History
                                        </h2>
                                        <p className="text-sm text-slate-500">
                                            Persistent message records stored
                                            in your database
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="relative sm:col-span-1">
                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                                        <input
                                            type="search"
                                            placeholder="Search history..."
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    <select
                                        value={statusFilter}
                                        onChange={(event) =>
                                            setStatusFilter(event.target.value)
                                        }
                                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                                    >
                                        <option value="">All statuses</option>
                                        <option value="simulated">
                                            Simulated
                                        </option>
                                        <option value="pending">Pending</option>
                                        <option value="sent">Sent</option>
                                        <option value="delivered">
                                            Delivered
                                        </option>
                                        <option value="failed">Failed</option>
                                    </select>

                                    <select
                                        value={typeFilter}
                                        onChange={(event) =>
                                            setTypeFilter(event.target.value)
                                        }
                                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                                    >
                                        <option value="">
                                            All message types
                                        </option>
                                        <option value="test">Test SMS</option>
                                        <option value="appointment_reminder">
                                            Appointment reminder
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* History table */}
                        {loading ? (
                            <div className="px-6 py-12 text-center text-sm text-slate-500">
                                <FaSyncAlt className="mx-auto mb-3 animate-spin text-xl text-blue-600" />
                                Loading SMS history...
                            </div>
                        ) : filteredHistory.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <FaHistory className="mx-auto mb-3 text-3xl text-slate-300" />

                                <p className="font-semibold text-slate-700">
                                    No matching SMS records
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    Try another search or process a test SMS.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[850px] text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-5 py-4 font-semibold">
                                                Recipient
                                            </th>
                                            <th className="px-5 py-4 font-semibold">
                                                Message
                                            </th>
                                            <th className="px-5 py-4 font-semibold">
                                                Type
                                            </th>
                                            <th className="px-5 py-4 font-semibold">
                                                Provider
                                            </th>
                                            <th className="px-5 py-4 font-semibold">
                                                Status
                                            </th>
                                            <th className="px-5 py-4 font-semibold">
                                                Date
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {filteredHistory.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="transition hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-slate-800">
                                                        {item.recipient_name ||
                                                            "Recipient"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {item.recipient_number ||
                                                            "—"}
                                                    </p>
                                                </td>

                                                <td className="max-w-xs px-5 py-4">
                                                    <p className="line-clamp-3 text-slate-600">
                                                        {item.message || "—"}
                                                    </p>

                                                    {item.error_message && (
                                                        <p className="mt-1 text-xs text-red-600">
                                                            Error:{" "}
                                                            {item.error_message}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 text-slate-600">
                                                    {item.message_type ===
                                                    "appointment_reminder"
                                                        ? "Appointment reminder"
                                                        : item.message_type ===
                                                          "test"
                                                        ? "Test SMS"
                                                        : item.message_type ||
                                                          "—"}
                                                </td>

                                                <td className="px-5 py-4 text-slate-600">
                                                    {item.provider || "—"}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                                                            statusStyles[
                                                                item.status
                                                            ] ||
                                                            "bg-slate-100 text-slate-600"
                                                        }`}
                                                    >
                                                        {item.status || "Unknown"}
                                                    </span>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                                    {formatDate(
                                                        item.created_at
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination footer */}
                        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-slate-500">
                                Showing{" "}
                                <span className="font-semibold text-slate-700">
                                    {showingFrom}–{showingTo}
                                </span>{" "}
                                of{" "}
                                <span className="font-semibold text-slate-700">
                                    {total}
                                </span>{" "}
                                SMS records
                            </p>

                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() =>
                                        goToHistoryPage(historyPage - 1)
                                    }
                                    disabled={
                                        loading ||
                                        historyPage <= 1
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <FaChevronLeft className="text-xs" />
                                    Previous
                                </button>

                                <span className="whitespace-nowrap text-sm font-medium text-slate-600">
                                    Page {historyPage} of {totalHistoryPages}
                                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        goToHistoryPage(historyPage + 1)
                                    }
                                    disabled={
                                        loading ||
                                        historyPage >= totalHistoryPages ||
                                        history.length === 0
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                    <FaChevronRight className="text-xs" />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Production reminder */}
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <FaUsers className="mt-0.5 shrink-0" />
                        <p>
                            <strong>Before production:</strong> confirm patient
                            consent, verify phone numbers, prevent duplicate
                            reminders, and configure a real SMS provider. This
                            page currently uses mock mode only.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}