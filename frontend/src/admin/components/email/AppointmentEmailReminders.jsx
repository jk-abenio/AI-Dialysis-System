
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaCalendarAlt,
    FaCheckCircle,
    FaEnvelope,
    FaExclamationCircle,
    FaPaperPlane,
    FaSyncAlt,
    FaTimes,
    FaUser,
} from "react-icons/fa";
import api from "../../services/api";

const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
          });
};

const formatTime = (value) => {
    if (!value) return "—";

    const [hours, minutes] = value.split(":").map(Number);

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes)
    ) {
        return value;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
};

export default function AppointmentEmailReminders() {
    const [appointments, setAppointments] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [results, setResults] = useState(null);

    const loadAppointments = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("email/reminders/");
            const rows = response.data?.results ?? [];

            setAppointments(rows);
            setSelectedIds((current) =>
                current.filter((id) =>
                    rows.some(
                        (item) => item.schedule_id === id
                    )
                )
            );
        } catch (err) {
            setError(
                err.response?.data?.error ||
                    "Unable to load upcoming appointments."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);

    const selectedAppointments = useMemo(
        () =>
            appointments.filter((item) =>
                selectedIds.includes(item.schedule_id)
            ),
        [appointments, selectedIds]
    );

    const allSelected =
        appointments.length > 0 &&
        selectedIds.length === appointments.length;

    const toggleAppointment = (id) => {
        setSelectedIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    };

    const toggleAll = () => {
        setSelectedIds(
            allSelected
                ? []
                : appointments.map((item) => item.schedule_id)
        );
    };

    const sendReminders = async () => {
        if (!selectedIds.length || sending) return;

        setSending(true);
        setError("");
        setShowConfirmation(false);
        setResults(null);

        try {
            const response = await api.post("email/reminders/", {
                schedule_ids: selectedIds,
            });

            setResults(response.data);
            setSelectedIds([]);
            await loadAppointments();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                    "Unable to process the email reminders."
            );
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">
                        Appointment Email Reminders
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Select upcoming dialysis appointments to email
                        patients individually through your connected Gmail.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadAppointments}
                    disabled={loading || sending}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FaSyncAlt
                        className={loading ? "animate-spin" : ""}
                    />
                    Refresh
                </button>
            </div>

            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    <FaExclamationCircle className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {results && (
                <div
                    role="status"
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                    <div className="flex items-center gap-2">
                        <FaCheckCircle className="text-emerald-600" />
                        <h3 className="font-bold text-slate-800">
                            Reminder processing results
                        </h3>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">
                                Selected
                            </p>
                            <p className="mt-1 text-2xl font-bold text-slate-800">
                                {results.selected ?? 0}
                            </p>
                        </div>

                        <div className="rounded-lg bg-emerald-50 p-3">
                            <p className="text-xs text-emerald-700">
                                Accepted by Gmail
                            </p>
                            <p className="mt-1 text-2xl font-bold text-emerald-800">
                                {results.processed ?? 0}
                            </p>
                        </div>

                        <div className="rounded-lg bg-red-50 p-3">
                            <p className="text-xs text-red-700">
                                Failed
                            </p>
                            <p className="mt-1 text-2xl font-bold text-red-800">
                                {results.failed ?? 0}
                            </p>
                        </div>
                    </div>

                    {results.results?.length > 0 && (
                        <div className="mt-4 divide-y divide-slate-100">
                            {results.results.map((item, index) => (
                                <div
                                    key={`${item.schedule_id}-${index}`}
                                    className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800">
                                            {item.patient_name ||
                                                `Appointment #${item.schedule_id}`}
                                        </p>
                                        <p className="break-all text-sm text-slate-500">
                                            {item.email || "No email address"}
                                        </p>
                                        {!item.success && (
                                            <p className="mt-1 text-sm text-red-600">
                                                {item.error ||
                                                    "Reminder failed."}
                                            </p>
                                        )}
                                    </div>

                                    <span
                                        className={`mt-1 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold sm:mt-0 ${
                                            item.success
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-red-100 text-red-700"
                                        }`}
                                    >
                                        {item.success
                                            ? "Accepted by Gmail"
                                            : "Failed"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="mt-3 text-xs text-slate-500">
                        Gmail acceptance confirms that the message was
                        accepted for sending; it does not guarantee delivery
                        to the recipient's inbox.
                    </p>

                    <button
                        type="button"
                        onClick={() => setResults(null)}
                        className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
                    >
                        Dismiss results
                    </button>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            disabled={
                                loading ||
                                appointments.length === 0 ||
                                sending
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        Select all appointments
                    </label>

                    <span className="text-sm text-slate-500">
                        {selectedIds.length} selected
                    </span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
                        <FaSyncAlt className="animate-spin" />
                        Loading upcoming appointments...
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="p-12 text-center">
                        <FaCalendarAlt className="mx-auto text-3xl text-slate-300" />
                        <p className="mt-3 font-semibold text-slate-700">
                            No upcoming appointments
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Eligible scheduled appointments will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {appointments.map((item) => {
                            const selected = selectedIds.includes(
                                item.schedule_id
                            );
                            const hasEmail = Boolean(
                                item.email?.trim()
                            );

                            return (
                                <label
                                    key={item.schedule_id}
                                    className={`flex cursor-pointer items-start gap-3 p-4 transition hover:bg-slate-50 ${
                                        selected ? "bg-blue-50/60" : ""
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() =>
                                            toggleAppointment(
                                                item.schedule_id
                                            )
                                        }
                                        disabled={sending}
                                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600"
                                    />

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800">
                                                    {item.patient_name}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Patient ID:{" "}
                                                    {item.patient_code || "—"}
                                                </p>
                                            </div>

                                            <span className="w-fit rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                {item.shift || "Scheduled"}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                                            <p className="flex min-w-0 items-center gap-2">
                                                <FaEnvelope className="shrink-0 text-slate-400" />
                                                <span className="break-all">
                                                    {item.email ||
                                                        "No email registered"}
                                                </span>
                                            </p>

                                            <p className="flex items-center gap-2">
                                                <FaCalendarAlt className="shrink-0 text-slate-400" />
                                                <span>
                                                    {formatDate(
                                                        item.dialysis_date
                                                    )}
                                                    {" · "}
                                                    {formatTime(
                                                        item.dialysis_time
                                                    )}
                                                </span>
                                            </p>
                                        </div>

                                        {!hasEmail && (
                                            <p className="mt-2 text-xs font-medium text-amber-700">
                                                This patient has no registered
                                                email. Selecting this
                                                appointment will report a
                                                failure instead of sending.
                                            </p>
                                        )}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                        Each patient receives an individual email. Other
                        patients' email addresses are not exposed.
                    </p>

                    <button
                        type="button"
                        onClick={() => setShowConfirmation(true)}
                        disabled={
                            !selectedIds.length ||
                            loading ||
                            sending
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FaPaperPlane />
                        {sending
                            ? "Sending reminders..."
                            : `Send reminders (${selectedIds.length})`}
                    </button>
                </div>
            </div>

            {showConfirmation && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowConfirmation(false);
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="email-reminder-confirm-title"
                        className="max-h-[85vh] w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 p-5">
                            <div>
                                <h3
                                    id="email-reminder-confirm-title"
                                    className="text-lg font-bold text-slate-800"
                                >
                                    Confirm email reminders
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Review the appointments before sending.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowConfirmation(false)
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                aria-label="Close confirmation"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="max-h-[50vh] space-y-3 overflow-y-auto p-5">
                            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                                You are about to send{" "}
                                <strong>
                                    {selectedAppointments.length}
                                </strong>{" "}
                                individual appointment reminder emails.
                            </div>

                            {selectedAppointments.map((item) => (
                                <div
                                    key={item.schedule_id}
                                    className="rounded-lg border border-slate-200 p-3"
                                >
                                    <p className="font-semibold text-slate-800">
                                        <FaUser className="mr-2 inline text-slate-400" />
                                        {item.patient_name}
                                    </p>
                                    <p className="mt-1 break-all text-sm text-slate-600">
                                        {item.email || "No email registered"}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {formatDate(item.dialysis_date)}
                                        {" · "}
                                        {formatTime(item.dialysis_time)}
                                        {" · "}
                                        {item.shift}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowConfirmation(false)
                                }
                                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={sendReminders}
                                disabled={sending}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                <FaPaperPlane />
                                Confirm and send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
