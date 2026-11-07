import { useState } from "react";
import { createPortal } from "react-dom";
import {
    FaTimes,
    FaTrash,
    FaExclamationTriangle,
    FaCalendarAlt,
    FaClock,
    FaSpinner,
} from "react-icons/fa";

import { deleteSchedule } from "../../services/scheduleService";

export default function DeleteScheduleModal({
    open,
    onClose,
    onSuccess,
    schedule,
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    if (!open || !schedule) return null;

    const formatDate = (date) => {
        if (!date) return "—";

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

        return date;
    };

    const handleClose = () => {
        if (deleting) return;

        setError("");
        onClose();
    };

    const handleDelete = async () => {
        if (deleting || !schedule?.id) return;

        setDeleting(true);
        setError("");

        try {
            await deleteSchedule(schedule.id);

            await onSuccess?.();
            onClose();
        } catch (err) {
            console.error("Failed to delete schedule:", err);

            const responseData = err.response?.data;

            let message = "";

            if (typeof responseData === "string") {
                message = responseData;
            } else if (responseData && typeof responseData === "object") {
                message = Object.values(responseData)
                    .flat()
                    .filter((item) => typeof item === "string")
                    .join(" ");
            }

            setError(
                message ||
                    "Unable to delete this schedule. Please try again."
            );
        } finally {
            setDeleting(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-schedule-title"
                aria-describedby="delete-schedule-description"
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <FaTrash />
                        </div>

                        <h2
                            id="delete-schedule-title"
                            className="text-lg font-bold text-gray-800"
                        >
                            Delete Schedule
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={deleting}
                        aria-label="Close delete confirmation"
                        title="Close"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                        <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-600" />

                        <div>
                            <p className="text-sm font-semibold text-red-800">
                                This action cannot be undone.
                            </p>

                            <p
                                id="delete-schedule-description"
                                className="mt-1 text-sm leading-relaxed text-red-700"
                            >
                                Are you sure you want to permanently delete
                                this dialysis schedule?
                            </p>
                        </div>
                    </div>

                    {/* Schedule Details */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Schedule Details
                        </p>

                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500">
                                    Patient
                                </p>

                                <p className="mt-1 font-semibold text-gray-800">
                                    {schedule.patient_name || "Unknown patient"}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="mb-1 text-xs text-gray-500">
                                        <FaCalendarAlt className="mr-1 inline" />
                                        Date
                                    </p>

                                    <p className="text-sm font-medium text-gray-700">
                                        {formatDate(schedule.dialysis_date)}
                                    </p>
                                </div>

                                <div>
                                    <p className="mb-1 text-xs text-gray-500">
                                        <FaClock className="mr-1 inline" />
                                        Time
                                    </p>

                                    <p className="text-sm font-medium text-gray-700">
                                        {schedule.dialysis_time || "—"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Machine
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-gray-700">
                                        {schedule.machine_name || "—"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500">
                                        Status
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-gray-700">
                                        {schedule.status || "Unknown"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div
                            role="alert"
                            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            <FaExclamationTriangle className="mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={deleting}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {deleting ? (
                            <>
                                <FaSpinner className="animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <FaTrash />
                                Delete Schedule
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
