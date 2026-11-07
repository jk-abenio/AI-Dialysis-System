
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    FaTimes,
    FaTrashAlt,
    FaExclamationTriangle,
    FaUser,
    FaSpinner,
    FaCheckCircle,
    FaExclamationCircle,
} from "react-icons/fa";

import { deletePatient } from "../../services/patientService";

export default function DeletePatientModal({
    open,
    patient,
    onClose,
    onSuccess,
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setDeleting(false);
            setError("");
        }
    }, [open, patient?.id]);

    if (!open || !patient) return null;

    const handleClose = () => {
        if (deleting) return;
        onClose();
    };

    const handleDelete = async () => {
        if (deleting) return;

        setDeleting(true);
        setError("");

        try {
            await deletePatient(patient.id);

            // Close the dialog even if refreshing the list fails.
            onClose();

            try {
                await onSuccess?.();
            } catch (refreshError) {
                console.error(
                    "Patient deleted, but refreshing the list failed:",
                    refreshError
                );
            }
        } catch (err) {
            console.error("Unable to delete patient:", err);

            const message =
                err?.response?.data?.detail ||
                err?.response?.data?.message;

            setError(
                typeof message === "string"
                    ? message
                    : "Unable to delete this patient. Please try again."
            );
        } finally {
            setDeleting(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !deleting
                ) {
                    handleClose();
                }
            }}
        >
            <section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-patient-title"
                aria-describedby="delete-patient-description"
                className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                            <FaTrashAlt size={17} />
                        </div>

                        <div>
                            <h2
                                id="delete-patient-title"
                                className="text-lg font-bold text-slate-800"
                            >
                                Delete Patient
                            </h2>

                            <p className="mt-0.5 text-xs text-slate-500">
                                This action requires confirmation.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={deleting}
                        aria-label="Close confirmation"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Confirmation */}
                <div className="px-6 py-6">
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                        <FaExclamationTriangle className="mt-0.5 shrink-0 text-rose-600" />

                        <p
                            id="delete-patient-description"
                            className="text-sm leading-relaxed text-rose-800"
                        >
                            Are you sure you want to delete this patient?
                            Please verify the patient details before
                            continuing.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                            <FaUser size={18} />
                        </div>

                        <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">
                                {[
                                    patient.first_name,
                                    patient.middle_name,
                                    patient.last_name,
                                ]
                                    .filter(Boolean)
                                    .join(" ") || "Unnamed Patient"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Patient ID: {patient.patient_id || patient.id}
                            </p>

                            {patient.email && (
                                <p className="mt-1 break-all text-xs text-slate-500">
                                    {patient.email}
                                </p>
                            )}
                        </div>
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-slate-500">
                        Deleting this record may affect information linked
                        to this patient, depending on your backend's
                        deletion rules.
                    </p>

                    {error && (
                        <div
                            role="alert"
                            className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
                        >
                            <FaExclamationCircle className="mt-0.5 shrink-0" />

                            <p className="min-w-0 flex-1 break-words">
                                {error}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={deleting}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {deleting ? (
                            <>
                                <FaSpinner className="animate-spin" />
                                Deleting Patient...
                            </>
                        ) : (
                            <>
                                <FaTrashAlt />
                                Delete Patient
                            </>
                        )}
                    </button>
                </div>
            </section>
        </div>,
        document.body
    );
}
