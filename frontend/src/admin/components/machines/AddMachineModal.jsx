import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    createMachine,
    updateMachine,
} from "../../services/machineService";

import {
    FaDesktop,
    FaTimes,
    FaCheckCircle,
    FaMapMarkerAlt,
    FaBarcode,
    FaTag,
    FaExclamationCircle,
    FaSave,
} from "react-icons/fa";

const initialForm = {
    machine_number: "",
    machine_code: "",
    brand: "",
    location: "",
    status: "Available",
};

export default function AddMachineModal({
    open,
    onClose,
    onSuccess,
    machine,
}) {
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const isEditing = Boolean(machine);

    useEffect(() => {
        if (!open) return;

        if (machine) {
            setForm({
                machine_number: machine.machine_number ?? "",
                machine_code: machine.machine_code ?? "",
                brand: machine.brand ?? "",
                location: machine.location ?? "",
                status: machine.status ?? "Available",
            });
        } else {
            setForm({ ...initialForm });
        }

        setError("");
        setSaving(false);
    }, [machine, open]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !saving) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, saving, onClose]);

    if (!open) return null;

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving) return;

        const payload = {
            machine_number: form.machine_number.trim(),
            machine_code: form.machine_code.trim(),
            brand: form.brand.trim(),
            location: form.location.trim(),
            status: form.status,
        };

        if (
            !payload.machine_number ||
            !payload.machine_code ||
            !payload.brand ||
            !payload.location
        ) {
            setError("Please complete all required fields.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            if (isEditing) {
                await updateMachine(machine.id, payload);
            } else {
                await createMachine(payload);
            }

            await onSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to save machine:", err);

            setError(
                err?.response?.data?.message ||
                    err?.message ||
                    "Unable to save the machine. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    const inputClass =
        "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60";

    const labelClass =
        "mb-2 block text-sm font-semibold text-gray-700";

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="machine-modal-title"
                className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <FaDesktop className="text-xl" />
                        </div>

                        <div>
                            <h2
                                id="machine-modal-title"
                                className="text-xl font-bold text-gray-800 sm:text-2xl"
                            >
                                {isEditing
                                    ? "Edit Machine"
                                    : "Add New Machine"}
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                {isEditing
                                    ? "Update the machine information below."
                                    : "Enter the details of your dialysis machine."}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close modal"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="space-y-6 px-6 py-6 sm:px-8">
                        {/* Error Message */}
                        {error && (
                            <div
                                role="alert"
                                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                            >
                                <FaExclamationCircle className="mt-0.5 shrink-0 text-red-500" />

                                <div>
                                    <p className="text-sm font-semibold text-red-700">
                                        Unable to save machine
                                    </p>

                                    <p className="mt-1 text-sm text-red-600">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Machine Information */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                                Machine Information
                            </h3>

                            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                {/* Machine Number */}
                                <div>
                                    <label
                                        htmlFor="machine_number"
                                        className={labelClass}
                                    >
                                        Machine Number
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    </label>

                                    <div className="relative">
                                        <FaDesktop className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

                                        <input
                                            id="machine_number"
                                            name="machine_number"
                                            type="text"
                                            placeholder="e.g. Machine 001"
                                            value={form.machine_number}
                                            onChange={handleChange}
                                            className={`${inputClass} pl-11`}
                                            required
                                            maxLength={100}
                                            autoComplete="off"
                                            disabled={saving}
                                        />
                                    </div>
                                </div>

                                {/* Machine Code */}
                                <div>
                                    <label
                                        htmlFor="machine_code"
                                        className={labelClass}
                                    >
                                        Machine Code
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    </label>

                                    <div className="relative">
                                        <FaBarcode className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

                                        <input
                                            id="machine_code"
                                            name="machine_code"
                                            type="text"
                                            placeholder="e.g. DIA-001"
                                            value={form.machine_code}
                                            onChange={handleChange}
                                            className={`${inputClass} pl-11`}
                                            required
                                            maxLength={100}
                                            autoComplete="off"
                                            disabled={saving}
                                        />
                                    </div>
                                </div>

                                {/* Brand */}
                                <div>
                                    <label
                                        htmlFor="brand"
                                        className={labelClass}
                                    >
                                        Brand
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    </label>

                                    <div className="relative">
                                        <FaTag className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

                                        <input
                                            id="brand"
                                            name="brand"
                                            type="text"
                                            placeholder="e.g. Fresenius"
                                            value={form.brand}
                                            onChange={handleChange}
                                            className={`${inputClass} pl-11`}
                                            required
                                            maxLength={100}
                                            autoComplete="off"
                                            disabled={saving}
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label
                                        htmlFor="location"
                                        className={labelClass}
                                    >
                                        Location
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    </label>

                                    <div className="relative">
                                        <FaMapMarkerAlt className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

                                        <input
                                            id="location"
                                            name="location"
                                            type="text"
                                            placeholder="e.g. Dialysis Room 1"
                                            value={form.location}
                                            onChange={handleChange}
                                            className={`${inputClass} pl-11`}
                                            required
                                            maxLength={150}
                                            autoComplete="off"
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                                Machine Status
                            </h3>

                            <div className="mt-4">
                                <label
                                    htmlFor="status"
                                    className={labelClass}
                                >
                                    Current Status
                                </label>

                                <div className="relative">
                                    <select
                                        id="status"
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={`${inputClass} appearance-none pr-10`}
                                    >
                                        <option value="Available">
                                            Available
                                        </option>

                                        <option value="In Use">
                                            In Use
                                        </option>

                                        <option value="Maintenance">
                                            Maintenance
                                        </option>
                                    </select>

                                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        ▾
                                    </span>
                                </div>

                                <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 p-3">
                                    <FaCheckCircle className="mt-0.5 shrink-0 text-blue-500" />

                                    <p className="text-xs leading-relaxed text-blue-700">
                                        Make sure the selected status reflects
                                        the machine's actual operational
                                        condition.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400">
                            Fields marked with{" "}
                            <span className="font-semibold text-red-500">
                                *
                            </span>{" "}
                            are required.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FaSave />
                                    {isEditing
                                        ? "Update Machine"
                                        : "Save Machine"}
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
