import { useEffect, useState } from "react";
import { deleteMachine } from "../../services/machineService";
import { createPortal } from "react-dom";
import {
    FaTrash,
    FaTimes,
    FaExclamationTriangle,
    FaDesktop,
    FaBarcode,
    FaMapMarkerAlt,
    FaExclamationCircle,
} from "react-icons/fa";

export default function DeleteMachineModal({
    open,
    machine,
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
    }, [open, machine]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !deleting) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, deleting, onClose]);

    if (!open || !machine) return null;

    const machineNumber = String(
        machine.machine_number ?? "Unnamed machine"
    );

    const handleDelete = async () => {
        if (deleting) return;

        setDeleting(true);
        setError("");

        try {
            await deleteMachine(machine.id);
            await onSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to delete machine:", err);

            setError(
                err?.response?.data?.message ||
                    err?.message ||
                    "Unable to delete this machine. Please try again."
            );
        } finally {
            setDeleting(false);
        }
    };

    const statusStyles = {
        Available: "bg-green-50 text-green-700",
        "In Use": "bg-amber-50 text-amber-700",
        Maintenance: "bg-orange-50 text-orange-700",
        Unavailable: "bg-red-50 text-red-700",
        "Out of Service": "bg-red-50 text-red-700",
    };

    const status = String(machine.status ?? "Unknown");

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !deleting
                ) {
                    onClose();
                }
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-machine-title"
                aria-describedby="delete-machine-description"
                className="my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <FaTrash className="text-lg" />
                        </div>

                        <div>
                            <h2
                                id="delete-machine-title"
                                className="text-xl font-bold text-gray-800"
                            >
                                Delete Machine
                            </h2>

                            <p className="mt-1 text-xs text-gray-500">
                                Confirm equipment removal
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={deleting}
                        aria-label="Close confirmation"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-5 p-6">
                    <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                        <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-500" />

                        <div>
                            <p className="text-sm font-semibold text-red-800">
                                This action cannot be undone
                            </p>

                            <p
                                id="delete-machine-description"
                                className="mt-1 text-sm leading-relaxed text-red-700"
                            >
                                Are you sure you want to delete this machine?
                                Please verify its details before proceeding.
                            </p>
                        </div>
                    </div>

                    {/* Machine Details */}
                    <div className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                                <FaDesktop className="text-lg" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="break-words font-bold text-gray-800">
                                    {machineNumber}
                                </h3>

                                <p className="mt-1 text-sm text-gray-500">
                                    {machine.brand || "Unknown brand"}
                                </p>

                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <FaBarcode className="shrink-0 text-gray-400" />

                                        <span className="break-all">
                                            Code: {machine.machine_code || "—"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <FaMapMarkerAlt className="shrink-0 text-gray-400" />

                                        <span className="break-words">
                                            {machine.location || "No location assigned"}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                            statusStyles[status] ||
                                            "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                        {status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div
                            role="alert"
                            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3"
                        >
                            <FaExclamationCircle className="mt-0.5 shrink-0 text-red-500" />

                            <p className="text-sm leading-relaxed text-red-700">
                                {error}
                            </p>
                        </div>
                    )}

                    <p className="text-sm leading-relaxed text-gray-500">
                        Deleting this machine may affect records associated
                        with it. Make sure it is safe to remove before
                        continuing.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-5 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={deleting}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {deleting ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <FaTrash />
                                Delete Machine
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
