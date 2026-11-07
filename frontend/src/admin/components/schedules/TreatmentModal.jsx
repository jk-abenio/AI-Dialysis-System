import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    FaTimes,
    FaWeight,
    FaHeartbeat,
    FaStickyNote,
    FaSave,
    FaExclamationCircle,
    FaSpinner,
    FaCheckCircle,
    FaTint,
} from "react-icons/fa";

import { createTreatmentRecord } from "../../services/treatmentService";
import { updateSchedule } from "../../services/scheduleService";

const initialForm = {
    pre_weight: "",
    post_weight: "",
    blood_pressure_before: "",
    blood_pressure_after: "",
    pulse_before: "",
    pulse_after: "",
    notes: "",
};

const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-100";

const labelClass =
    "mb-1.5 block text-sm font-medium text-gray-700";

export default function TreatmentModal({
    open,
    schedule,
    onClose,
    onSuccess,
}) {
    const [form, setForm] = useState({ ...initialForm });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [validationError, setValidationError] = useState("");

    useEffect(() => {
        if (!open) return;

        setForm({ ...initialForm });
        setError("");
        setValidationError("");
        setSaving(false);
    }, [open, schedule?.id]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        setError("");
        setValidationError("");
    };

    const handleClose = () => {
        if (saving) return;

        setError("");
        setValidationError("");
        onClose?.();
    };

    const validateForm = () => {
        const numericFields = [
            {
                name: "pre_weight",
                label: "Pre-treatment weight",
            },
            {
                name: "post_weight",
                label: "Post-treatment weight",
            },
            {
                name: "pulse_before",
                label: "Pre-treatment pulse",
            },
            {
                name: "pulse_after",
                label: "Post-treatment pulse",
            },
        ];

        for (const field of numericFields) {
            const value = form[field.name];

            if (value === "") continue;

            if (!Number.isFinite(Number(value)) || Number(value) < 0) {
                setValidationError(
                    `${field.label} must be a valid non-negative number.`
                );
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (saving) return;

        if (!schedule?.id) {
            setError("Schedule information is missing. Please reopen the treatment form.");
            return;
        }

        if (!validateForm()) return;

        setSaving(true);
        setError("");
        setValidationError("");

        try {
            const treatmentData = {
                ...form,
                schedule: schedule.id,
                pre_weight:
                    form.pre_weight === ""
                        ? null
                        : Number(form.pre_weight),
                post_weight:
                    form.post_weight === ""
                        ? null
                        : Number(form.post_weight),
                pulse_before:
                    form.pulse_before === ""
                        ? null
                        : Number(form.pulse_before),
                pulse_after:
                    form.pulse_after === ""
                        ? null
                        : Number(form.pulse_after),
            };

            await createTreatmentRecord(treatmentData);

            await updateSchedule(schedule.id, {
                status: "Completed",
            });

            await onSuccess?.();
            onClose?.();
        } catch (err) {
            console.error("Unable to complete treatment:", err);

            const responseData = err?.response?.data;
            const apiMessage =
                responseData?.detail ||
                responseData?.message ||
                (typeof responseData === "object" && responseData
                    ? Object.entries(responseData)
                        .map(([key, value]) => {
                            const message = Array.isArray(value)
                                ? value.join(", ")
                                : String(value);

                            return `${key.replaceAll("_", " ")}: ${message}`;
                        })
                        .join(" ")
                    : null);

            setError(
                apiMessage ||
                    "Unable to save the treatment. Please check your information and try again."
            );
        } finally {
            setSaving(false);
        }
    };

    if (!open || !schedule) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="treatment-modal-title"
                className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                            <FaHeartbeat size={20} />
                        </div>

                        <div>
                            <h2
                                id="treatment-modal-title"
                                className="text-lg font-bold text-gray-800 sm:text-xl"
                            >
                                Dialysis Treatment
                            </h2>
                            <p className="mt-0.5 text-sm text-gray-500">
                                Record the patient's treatment measurements.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={saving}
                        aria-label="Close treatment form"
                        title="Close"
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="overflow-y-auto px-5 py-6 sm:px-7">
                        {/* Schedule details */}
                        <div className="mb-6 rounded-xl border border-green-100 bg-green-50/70 p-4">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-800">
                                <FaCheckCircle />
                                Selected Schedule
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                                <p className="text-gray-600">
                                    <span className="font-medium text-gray-800">
                                        Patient:
                                    </span>{" "}
                                    {schedule.patient_name || "Not specified"}
                                </p>

                                <p className="text-gray-600">
                                    <span className="font-medium text-gray-800">
                                        Machine:
                                    </span>{" "}
                                    {schedule.machine_name || "Not specified"}
                                </p>

                                <p className="text-gray-600">
                                    <span className="font-medium text-gray-800">
                                        Date:
                                    </span>{" "}
                                    {schedule.dialysis_date || "Not specified"}
                                </p>

                                <p className="text-gray-600">
                                    <span className="font-medium text-gray-800">
                                        Time:
                                    </span>{" "}
                                    {schedule.dialysis_time || "Not specified"}
                                </p>
                            </div>
                        </div>

                        {/* Weight measurements */}
                        <section className="mb-6">
                            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <FaWeight className="text-green-600" />
                                <h3 className="font-semibold text-gray-800">
                                    Weight Measurements
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="pre_weight"
                                        className={labelClass}
                                    >
                                        Pre-treatment Weight (kg)
                                    </label>
                                    <input
                                        id="pre_weight"
                                        name="pre_weight"
                                        type="number"
                                        min="0"
                                        step="any"
                                        inputMode="decimal"
                                        placeholder="e.g. 65.5"
                                        value={form.pre_weight}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="post_weight"
                                        className={labelClass}
                                    >
                                        Post-treatment Weight (kg)
                                    </label>
                                    <input
                                        id="post_weight"
                                        name="post_weight"
                                        type="number"
                                        min="0"
                                        step="any"
                                        inputMode="decimal"
                                        placeholder="e.g. 63.0"
                                        value={form.post_weight}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Blood pressure */}
                        <section className="mb-6">
                            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <FaTint className="text-red-500" />
                                <h3 className="font-semibold text-gray-800">
                                    Blood Pressure
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="blood_pressure_before"
                                        className={labelClass}
                                    >
                                        Before Treatment
                                    </label>
                                    <input
                                        id="blood_pressure_before"
                                        name="blood_pressure_before"
                                        type="text"
                                        placeholder="e.g. 120/80"
                                        value={form.blood_pressure_before}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="blood_pressure_after"
                                        className={labelClass}
                                    >
                                        After Treatment
                                    </label>
                                    <input
                                        id="blood_pressure_after"
                                        name="blood_pressure_after"
                                        type="text"
                                        placeholder="e.g. 118/78"
                                        value={form.blood_pressure_after}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Pulse */}
                        <section className="mb-6">
                            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <FaHeartbeat className="text-rose-500" />
                                <h3 className="font-semibold text-gray-800">
                                    Pulse Rate
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="pulse_before"
                                        className={labelClass}
                                    >
                                        Before Treatment (bpm)
                                    </label>
                                    <input
                                        id="pulse_before"
                                        name="pulse_before"
                                        type="number"
                                        min="0"
                                        step="1"
                                        inputMode="numeric"
                                        placeholder="e.g. 78"
                                        value={form.pulse_before}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="pulse_after"
                                        className={labelClass}
                                    >
                                        After Treatment (bpm)
                                    </label>
                                    <input
                                        id="pulse_after"
                                        name="pulse_after"
                                        type="number"
                                        min="0"
                                        step="1"
                                        inputMode="numeric"
                                        placeholder="e.g. 76"
                                        value={form.pulse_after}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Notes */}
                        <section>
                            <div className="mb-3 flex items-center gap-2">
                                <FaStickyNote className="text-amber-500" />
                                <h3 className="font-semibold text-gray-800">
                                    Treatment Notes
                                </h3>
                                <span className="text-xs font-normal text-gray-400">
                                    Optional
                                </span>
                            </div>

                            <textarea
                                id="notes"
                                name="notes"
                                rows={4}
                                placeholder="Enter observations or additional treatment notes..."
                                value={form.notes}
                                onChange={handleChange}
                                disabled={saving}
                                className={`${inputClass} resize-y`}
                            />
                        </section>

                        {/* Error messages */}
                        {(error || validationError) && (
                            <div
                                role="alert"
                                className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                            >
                                <FaExclamationCircle className="mt-0.5 shrink-0" />
                                <p>{validationError || error}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={saving}
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <FaSpinner className="animate-spin" />
                                    Saving Treatment...
                                </>
                            ) : (
                                <>
                                    <FaSave />
                                    Complete Treatment
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
