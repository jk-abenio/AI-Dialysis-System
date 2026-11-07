
import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
    FaExclamationCircle,
    FaFlask,
    FaPaperPlane,
    FaTimes,
    FaUser,
    FaPhone,
    FaCalendarAlt,
    FaSpinner,
    FaExclamationTriangle,
} from "react-icons/fa";

const formatAppointment = (date, time) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";

    const dateText = parsedDate.toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    if (!time) return dateText;

    const [hours, minutes] = time.split(":");
    const hourNumber = Number(hours);
    const minuteNumber = Number(minutes);

    if (
        !Number.isFinite(hourNumber) ||
        !Number.isFinite(minuteNumber) ||
        hourNumber < 0 ||
        hourNumber > 23 ||
        minuteNumber < 0 ||
        minuteNumber > 59
    ) {
        return dateText;
    }

    const appointmentTime = new Date();
    appointmentTime.setHours(hourNumber, minuteNumber, 0, 0);

    return `${dateText} · ${appointmentTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    })}`;
};

const createReminderMessage = (recipient) => {
    const firstName =
        recipient.name?.trim()?.split(/\s+/)[0] || "Patient";

    const appointmentDate = recipient.dialysis_date
        ? formatAppointment(
              recipient.dialysis_date,
              recipient.dialysis_time
          )
        : "your scheduled appointment date";

    return (
        `Hello ${firstName}, this is a reminder of your upcoming ` +
        `dialysis appointment on ${appointmentDate}. ` +
        `Please contact the clinic if you need assistance. ` +
        `IMPORTANT: This is an automated message. Please do not ` +
        `reply to this SMS. For inquiries or assistance, please ` +
        `contact the clinic.`
    );
};

export default function SMSConfirmationModal({
    isOpen,
    title,
    message,
    recipientCount,
    recipients = [],
    confirmLabel = "Confirm",
    confirmColor = "bg-blue-600 hover:bg-blue-700",
    loading = false,
    onConfirm,
    onCancel,
    smsMessage = "",
}) {
    useEffect(() => {
        if (!isOpen || loading) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") onCancel?.();
        };

        window.addEventListener("keydown", handleKeyDown);

        return () =>
            window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, loading, onCancel]);

    if (!isOpen) return null;

    // Appointment reminders have dialysis_date on their recipients.
    // Bulk SMS recipients generally do not.
    const isReminder = recipients.some(
        (recipient) => Boolean(recipient.dialysis_date)
    );

    const missingPhoneCount = recipients.filter(
        (recipient) => !recipient.contact_number?.trim()
    ).length;

    const displayedRecipientCount =
        recipientCount ?? recipients.length;

    // Appointment reminders use personalized messages.
    // Bulk SMS uses the exact body typed by the admin.
    const previewMessages = isReminder
        ? recipients.map((recipient, index) => ({
              id:
                  recipient.id ??
                  recipient.schedule_id ??
                  recipient.patient_id ??
                  index,
              name: recipient.name || "Unnamed patient",
              text: createReminderMessage(recipient),
          }))
        : [
              {
                  id: "bulk-message",
                  name: "Bulk SMS",
                  text: smsMessage?.trim() || "",
              },
          ];

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !loading
                ) {
                    onCancel?.();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="sms-confirmation-title"
                aria-describedby="sms-confirmation-message"
                className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 p-4 sm:gap-4 sm:p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 sm:h-12 sm:w-12">
                        <FaExclamationCircle className="text-xl" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2
                            id="sms-confirmation-title"
                            className="break-words text-lg font-bold text-slate-900"
                        >
                            {title}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Review the message and recipients before
                            continuing.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        aria-label="Close confirmation"
                        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                    {/* Confirmation description */}
                    <p
                        id="sms-confirmation-message"
                        className="whitespace-pre-line break-words text-sm leading-6 text-slate-600"
                    >
                        {message}
                    </p>

                    {/* SMS Message Preview */}
                    <section className="overflow-hidden rounded-xl border border-teal-200 bg-white">
                        <div className="flex items-center justify-between gap-3 border-b border-teal-100 bg-teal-50 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <FaPhone className="text-teal-700" />

                                <h3 className="text-sm font-bold text-teal-900">
                                    {isReminder
                                        ? "Appointment Reminder Preview"
                                        : "Bulk SMS Message Preview"}
                                </h3>
                            </div>

                            <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
                                Preview
                            </span>
                        </div>

                        <div className="space-y-4 bg-slate-50 p-4">
                            {previewMessages.map((preview, index) => (
                                <div
                                    key={`${preview.id}-${index}`}
                                    className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0"
                                >
                                    {isReminder &&
                                        previewMessages.length > 1 && (
                                            <p className="mb-2 text-xs font-semibold text-slate-600">
                                                Message for {preview.name}
                                            </p>
                                        )}

                                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                                        {isReminder ? (
                                            <>
                                                <FaUser />
                                                <span>
                                                    Automated appointment
                                                    reminder
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPhone />
                                                <span>
                                                    Message written by admin
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    <div className="w-fit max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                                        {preview.text ||
                                            "No message has been entered."}
                                    </div>

                                    {preview.text && (
                                        <p className="mt-2 text-right text-xs text-slate-500">
                                            {preview.text.length} characters
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Mock SMS notice */}
                    <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
                        <FaFlask className="mt-1 shrink-0 text-violet-700" />

                        <div>
                            <p className="text-sm font-semibold text-violet-900">
                                Mock SMS mode
                            </p>

                            <p className="mt-1 text-xs leading-5 text-violet-800">
                                Messages will be recorded as simulations.
                                No real SMS will be delivered.
                            </p>
                        </div>
                    </div>

                    {/* Recipient count */}
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                        <span className="text-sm font-medium text-slate-600">
                            Selected recipients
                        </span>

                        <span className="text-lg font-bold tabular-nums text-slate-900">
                            {displayedRecipientCount}
                        </span>
                    </div>

                    {/* Missing phone warning */}
                    {missingPhoneCount > 0 && (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-700" />

                            <p className="text-sm leading-5 text-amber-900">
                                <span className="font-semibold">
                                    {missingPhoneCount}{" "}
                                    {missingPhoneCount === 1
                                        ? "recipient has"
                                        : "recipients have"}{" "}
                                    no registered mobile number.
                                </span>{" "}
                                Review the list before confirming. These
                                records may not be eligible for sending.
                            </p>
                        </div>
                    )}

                    {/* Recipient list */}
                    <div>
                        <h3 className="mb-3 text-sm font-bold text-slate-800">
                            Recipient Details
                        </h3>

                        {recipients.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                                No recipient details available.
                            </div>
                        ) : (
                            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                                {recipients.map((recipient, index) => (
                                    <div
                                        key={
                                            recipient.id ??
                                            recipient.schedule_id ??
                                            `${recipient.patient_id ?? "patient"}-${index}`
                                        }
                                        className="rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-slate-50 sm:p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                                <FaUser />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="break-words font-semibold text-slate-900">
                                                    {recipient.name ||
                                                        "Unnamed patient"}
                                                </p>

                                                <p className="mt-1 break-words text-xs text-slate-500">
                                                    Patient ID:{" "}
                                                    {recipient.patient_id ||
                                                        "—"}
                                                </p>

                                                <p className="mt-2 flex items-start gap-2 break-all text-sm text-slate-600">
                                                    <FaPhone className="mt-1 shrink-0 text-slate-400" />

                                                    <span>
                                                        {recipient.contact_number ||
                                                            "No registered mobile number"}
                                                    </span>
                                                </p>

                                                {recipient.dialysis_date && (
                                                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                                        <p className="flex items-start gap-2 text-sm text-slate-600">
                                                            <FaCalendarAlt className="mt-1 shrink-0 text-teal-600" />

                                                            <span>
                                                                {formatAppointment(
                                                                    recipient.dialysis_date,
                                                                    recipient.dialysis_time
                                                                )}
                                                            </span>
                                                        </p>

                                                        {recipient.shift && (
                                                            <p className="text-xs text-slate-500">
                                                                Shift:{" "}
                                                                {recipient.shift}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {!recipient.contact_number?.trim() && (
                                                    <p className="mt-2 text-xs font-medium text-red-600">
                                                        Missing mobile number
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {isReminder && (
                        <p className="text-xs leading-5 text-slate-500">
                            Appointment details are shown for review.
                            Verify the schedule and registered phone
                            number before confirming.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end sm:p-5">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading || recipients.length === 0}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmColor}`}
                    >
                        {loading ? (
                            <FaSpinner className="animate-spin" />
                        ) : (
                            <FaPaperPlane />
                        )}

                        {loading ? "Processing..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
