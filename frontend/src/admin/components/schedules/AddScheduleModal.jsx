
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    FaTimes,
    FaCalendarAlt,
    FaClock,
    FaProcedures,
    FaStickyNote,
    FaSave,
    FaExclamationCircle,
    FaSpinner,
} from "react-icons/fa";

import {
    createSchedule,
    updateSchedule,
} from "../../services/scheduleService";

import { getPatients } from "../../services/patientService";
import { getMachines } from "../../services/machineService";
import { getStaff } from "../../services/staffService";

const initialForm = {
    patient: "",
    machine: "",
    staff: "",
    dialysis_date: "",
    dialysis_time: "",
    shift: "Morning",
    status: "Scheduled",
    notes: "",
};

const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100";

const labelClass =
    "mb-2 block text-sm font-medium text-gray-700";

// Extract readable messages from Django REST Framework errors.
function getScheduleErrorMessage(error) {
    const data = error?.response?.data;

    if (!data) {
        return "Unable to save the schedule. Please check your connection and try again.";
    }

    if (typeof data === "string") {
        return data;
    }

    if (typeof data === "object") {
        const messages = [];

        const collectMessages = (value) => {
            if (typeof value === "string") {
                messages.push(value);
                return;
            }

            if (Array.isArray(value)) {
                value.forEach(collectMessages);
                return;
            }

            if (value && typeof value === "object") {
                Object.values(value).forEach(collectMessages);
            }
        };

        collectMessages(data);

        if (messages.length > 0) {
            return [...new Set(messages)].join(" ");
        }
    }

    return "Unable to save the schedule. Please check your entries and try again.";
}

export default function AddScheduleModal({
    open,
    onClose,
    onSuccess,
    schedule,
}) {
    const [patients, setPatients] = useState([]);
    const [machines, setMachines] = useState([]);
    const [staff, setStaff] = useState([]);

    const [form, setForm] = useState(initialForm);
    const [loadingData, setLoadingData] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [formError, setFormError] = useState("");

    const isEditing = Boolean(schedule);

    // Load dropdown options whenever the modal opens.
    useEffect(() => {
        if (!open) return;

        let active = true;

        const loadData = async () => {
            setLoadingData(true);
            setLoadError("");

            try {
                const [patientData, machineData, staffData] =
                    await Promise.all([
                        getPatients(),
                        getMachines(),
                        getStaff(),
                    ]);

                if (!active) return;

                setPatients(
                    Array.isArray(patientData) ? patientData : []
                );
                setMachines(
                    Array.isArray(machineData) ? machineData : []
                );
                setStaff(
                    Array.isArray(staffData) ? staffData : []
                );
            } catch (error) {
                console.error(
                    "Failed to load schedule options:",
                    error
                );

                if (active) {
                    setLoadError(
                        "Unable to load patients, machines, or staff. Please try again."
                    );
                }
            } finally {
                if (active) {
                    setLoadingData(false);
                }
            }
        };

        loadData();

        return () => {
            active = false;
        };
    }, [open]);

    // Populate the form for editing or reset it for a new schedule.
    useEffect(() => {
        if (!open) return;

        if (schedule) {
            setForm({
                patient: String(schedule.patient ?? ""),
                machine: String(schedule.machine ?? ""),
                staff: String(schedule.staff ?? ""),
                dialysis_date: String(
                    schedule.dialysis_date ?? ""
                ).slice(0, 10),
                dialysis_time: String(
                    schedule.dialysis_time ?? ""
                ).slice(0, 5),
                shift: schedule.shift || "Morning",
                status: schedule.status || "Scheduled",
                notes: schedule.notes || "",
            });
        } else {
            setForm({ ...initialForm });
        }

        setFormError("");
    }, [schedule, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setFormError("");
    };

    const handleClose = () => {
        if (saving) return;

        setFormError("");
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (saving) return;

        const requiredFields = [
            ["patient", "Please select a patient."],
            ["machine", "Please select a dialysis machine."],
            ["staff", "Please select an assigned staff member."],
            ["dialysis_date", "Please select a dialysis date."],
            ["dialysis_time", "Please select a dialysis time."],
            ["shift", "Please select a shift."],
        ];

        const missingField = requiredFields.find(
            ([field]) => !String(form[field] ?? "").trim()
        );

        if (missingField) {
            setFormError(missingField[1]);
            return;
        }

        setSaving(true);
        setFormError("");

        try {
            if (isEditing) {
                await updateSchedule(schedule.id, form);
            } else {
                await createSchedule(form);
            }

            await onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Failed to save schedule:", error);

            setFormError(getScheduleErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const dropdownsDisabled = loadingData || saving;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="schedule-modal-title"
                className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-5 sm:px-7">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            {isEditing ? (
                                <FaCalendarAlt className="text-lg" />
                            ) : (
                                <FaProcedures className="text-lg" />
                            )}
                        </div>

                        <div>
                            <h2
                                id="schedule-modal-title"
                                className="text-xl font-bold text-gray-800"
                            >
                                {isEditing
                                    ? "Edit Schedule"
                                    : "Add New Schedule"}
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                {isEditing
                                    ? "Update appointment and assignment details."
                                    : "Create a dialysis appointment and assign resources."}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={saving}
                        aria-label="Close schedule form"
                        title="Close"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="overflow-y-auto px-5 py-6 sm:px-7">
                        {/* General Error */}
                        {formError && (
                            <div
                                role="alert"
                                aria-live="assertive"
                                className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                            >
                                <FaExclamationCircle className="mt-0.5 shrink-0" />

                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold">
                                        Unable to save schedule
                                    </p>
                                    <p className="mt-1 break-words">
                                        {formError}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setFormError("")}
                                    aria-label="Dismiss error message"
                                    className="shrink-0 rounded p-1 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        )}

                        {/* Dropdown Loading Error */}
                        {loadError && (
                            <div
                                role="alert"
                                className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4"
                            >
                                <p className="text-sm text-amber-800">
                                    {loadError}
                                </p>

                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-2 text-sm font-semibold text-amber-800 underline hover:text-amber-900"
                                >
                                    Close and reopen the form
                                </button>
                            </div>
                        )}

                        {/* Appointment Details */}
                        <div className="mb-6">
                            <div className="mb-4 flex items-center gap-2">
                                <FaCalendarAlt className="text-blue-600" />
                                <h3 className="font-semibold text-gray-800">
                                    Appointment Details
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                {/* Patient */}
                                <div>
                                    <label
                                        htmlFor="schedule-patient"
                                        className={labelClass}
                                    >
                                        Patient{" "}
                                        <span className="text-red-500">*</span>
                                    </label>

                                    <select
                                        id="schedule-patient"
                                        name="patient"
                                        value={form.patient}
                                        onChange={handleChange}
                                        disabled={
                                            dropdownsDisabled || !!loadError
                                        }
                                        required
                                        className={inputClass}
                                    >
                                        <option value="">
                                            {loadingData
                                                ? "Loading patients..."
                                                : "Select patient"}
                                        </option>

                                        {patients.map((patient) => (
                                            <option
                                                key={patient.id}
                                                value={patient.id}
                                            >
                                                {patient.first_name}{" "}
                                                {patient.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Machine */}
                                <div>
                                    <label
                                        htmlFor="schedule-machine"
                                        className={labelClass}
                                    >
                                        Dialysis Machine{" "}
                                        <span className="text-red-500">*</span>
                                    </label>

                                    <select
                                        id="schedule-machine"
                                        name="machine"
                                        value={form.machine}
                                        onChange={handleChange}
                                        disabled={
                                            dropdownsDisabled || !!loadError
                                        }
                                        required
                                        className={inputClass}
                                    >
                                        <option value="">
                                            {loadingData
                                                ? "Loading machines..."
                                                : "Select machine"}
                                        </option>

                                        {machines.map((machine) => (
                                            <option
                                                key={machine.id}
                                                value={machine.id}
                                            >
                                                {machine.machine_number}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Staff */}
                                <div>
                                    <label
                                        htmlFor="schedule-staff"
                                        className={labelClass}
                                    >
                                        Assigned Staff{" "}
                                        <span className="text-red-500">*</span>
                                    </label>

                                    <select
                                        id="schedule-staff"
                                        name="staff"
                                        value={form.staff}
                                        onChange={handleChange}
                                        disabled={
                                            dropdownsDisabled || !!loadError
                                        }
                                        required
                                        className={inputClass}
                                    >
                                        <option value="">
                                            {loadingData
                                                ? "Loading staff..."
                                                : "Select staff"}
                                        </option>

                                        {staff.map((person) => (
                                            <option
                                                key={person.id}
                                                value={person.id}
                                            >
                                                {person.first_name}{" "}
                                                {person.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date */}
                                <div>
                                    <label
                                        htmlFor="schedule-date"
                                        className={labelClass}
                                    >
                                        Dialysis Date{" "}
                                        <span className="text-red-500">*</span>
                                    </label>

                                    <div className="relative">
                                        <FaCalendarAlt className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                                        <input
                                            id="schedule-date"
                                            type="date"
                                            name="dialysis_date"
                                            value={form.dialysis_date}
                                            onChange={handleChange}
                                            required
                                            disabled={saving}
                                            className={`${inputClass} pl-10`}
                                        />
                                    </div>
                                </div>

                                {/* Time */}
                                <div>
                                    <label
                                        htmlFor="schedule-time"
                                        className={labelClass}
                                    >
                                        Dialysis Time{" "}
                                        <span className="text-red-500">*</span>
                                    </label>

                                    <div className="relative">
                                        <FaClock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />

                                        <input
                                            id="schedule-time"
                                            type="time"
                                            name="dialysis_time"
                                            value={form.dialysis_time}
                                            onChange={handleChange}
                                            required
                                            disabled={saving}
                                            className={`${inputClass} pl-10`}
                                        />
                                    </div>
                                </div>

                                {/* Shift */}
                                <div>
                                    <label
                                        htmlFor="schedule-shift"
                                        className={labelClass}
                                    >
                                        Shift{" "}
                                        <span className="text-red-500">*</span>
                                    </label>

                                    <select
                                        id="schedule-shift"
                                        name="shift"
                                        value={form.shift}
                                        onChange={handleChange}
                                        disabled={saving}
                                        required
                                        className={inputClass}
                                    >
                                        <option value="Morning">Morning</option>
                                        <option value="Afternoon">
                                            Afternoon
                                        </option>
                                        <option value="Evening">Evening</option>
                                    </select>
                                </div>

                                {/* Status */}
                                <div>
                                    <label
                                        htmlFor="schedule-status"
                                        className={labelClass}
                                    >
                                        Status
                                    </label>

                                    <select
                                        id="schedule-status"
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={inputClass}
                                    >
                                        <option value="Scheduled">
                                            Scheduled
                                        </option>
                                        <option value="Completed">
                                            Completed
                                        </option>
                                        <option value="Cancelled">
                                            Cancelled
                                        </option>
                                        <option value="Missed">Missed</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Additional Notes */}
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <FaStickyNote className="text-blue-600" />
                                <h3 className="font-semibold text-gray-800">
                                    Additional Notes
                                </h3>
                                <span className="text-xs font-normal text-gray-400">
                                    Optional
                                </span>
                            </div>

                            <textarea
                                id="schedule-notes"
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                                placeholder="Enter relevant appointment notes..."
                                rows={4}
                                disabled={saving}
                                className={`${inputClass} resize-y`}
                            />
                        </div>

                        <p className="mt-5 text-xs text-gray-500">
                            Fields marked with{" "}
                            <span className="font-semibold text-red-500">
                                *
                            </span>{" "}
                            are required.
                        </p>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={saving}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving || loadingData || !!loadError}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <FaSpinner className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FaSave />
                                    {isEditing
                                        ? "Update Schedule"
                                        : "Save Schedule"}
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
