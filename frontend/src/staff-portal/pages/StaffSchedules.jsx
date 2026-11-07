
import { useCallback, useEffect, useMemo, useState } from "react";
import StaffLayout from "../layouts/StaffLayout";
import {
    FaCalendarAlt,
    FaCalendarCheck,
    FaClock,
    FaSearch,
    FaSyncAlt,
    FaUser,
    FaProcedures,
    FaStethoscope,
    FaTimes,
    FaExclamationCircle,
    FaCheckCircle,
    FaClipboardList,
    FaChevronRight,
    FaEdit,
    FaSave,
    FaNotesMedical,
    FaWeight,
    FaHeartbeat,
    FaLock,
} from "react-icons/fa";
import { useStaffAuth } from "../context/StaffAuthContext";

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const API_BASE = (
    configuredApiUrl ||
    `${window.location.protocol}//${window.location.hostname}:8000/api/`
).replace(/\/?$/, "/");

const STATUS_OPTIONS = [
    "All Statuses",
    "Scheduled",
    "Completed",
    "Missed",
    "Cancelled",
];

const SHIFTS = ["Morning", "Afternoon", "Evening"];

const EMPTY_TREATMENT = {
    pre_weight: "",
    post_weight: "",
    blood_pressure_before: "",
    blood_pressure_after: "",
    pulse_before: "",
    pulse_after: "",
    notes: "",
};

function getLocalDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value) {
    if (!value) return "Date not available";

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
          });
}

function formatTime(value) {
    if (!value) return "Time not available";

    const parts = String(value).split(":");

    if (parts.length < 2) return value;

    const date = new Date();

    date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);

    return date.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
    });
}

function getStatusStyle(status) {
    switch (status) {
        case "Completed":
            return "bg-emerald-50 text-emerald-700 ring-emerald-200";
        case "Missed":
            return "bg-rose-50 text-rose-700 ring-rose-200";
        case "Cancelled":
            return "bg-slate-100 text-slate-600 ring-slate-200";
        default:
            return "bg-teal-50 text-teal-700 ring-teal-200";
    }
}

function getPatientName(schedule) {
    if (schedule?.patient_name) return schedule.patient_name;

    if (schedule?.patient && typeof schedule.patient === "object") {
        return (
            schedule.patient.full_name ||
            `${schedule.patient.first_name || ""} ${
                schedule.patient.last_name || ""
            }`.trim() ||
            `Patient #${schedule.patient.id || "N/A"}`
        );
    }

    return schedule?.patient
        ? `Patient #${schedule.patient}`
        : "Patient not specified";
}

function getMachineName(schedule) {
    if (schedule?.machine_name) return schedule.machine_name;

    if (schedule?.machine && typeof schedule.machine === "object") {
        return (
            schedule.machine.machine_name ||
            schedule.machine.name ||
            schedule.machine.machine_number ||
            `Machine #${schedule.machine.id || "N/A"}`
        );
    }

    return schedule?.machine
        ? `Machine #${schedule.machine}`
        : "Not assigned";
}

function getStaffName(schedule) {
    if (schedule?.staff_name) return schedule.staff_name;

    if (schedule?.staff && typeof schedule.staff === "object") {
        return (
            `${schedule.staff.first_name || ""} ${
                schedule.staff.last_name || ""
            }`.trim() || "Staff member"
        );
    }

    return schedule?.staff
        ? `Staff #${schedule.staff}`
        : "Not assigned";
}

function getErrorMessage(data, fallback) {
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;

    if (data && typeof data === "object") {
        for (const value of Object.values(data)) {
            if (typeof value === "string") return value;

            if (Array.isArray(value) && value.length) {
                return String(value[0]);
            }
        }
    }

    return fallback;
}

function normalizeRows(data, keys = []) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;

    for (const key of keys) {
        if (Array.isArray(data?.[key])) return data[key];
    }

    return null;
}

function roleName(user) {
    return String(user?.role || user?.staff_role || "")
        .trim()
        .toLowerCase();
}

function isAdmin(user) {
    return Boolean(
        user?.is_superuser ||
            user?.is_staff ||
            String(user?.role || "").toLowerCase() === "administrator"
    );
}

/**
 * Schedule editing permissions:
 *
 * Administrator:
 * - May edit existing scheduled appointments.
 *
 * Head Nurse:
 * - May edit existing scheduled appointments.
 * - May change the assigned staff member.
 *
 * Dialysis Nurse:
 * - Cannot edit appointment scheduling details.
 * - Must contact a Head Nurse or Administrator if a schedule needs changing.
 *
 * IMPORTANT:
 * The backend must enforce the same restrictions.
 */
function canEditSchedule(user, schedule, today) {
    const role = roleName(user);

    if (isAdmin(user)) {
        return schedule?.status === "Scheduled";
    }

    if (role.includes("head nurse")) {
        return schedule?.status === "Scheduled";
    }

    // Dialysis Nurses cannot modify appointment scheduling details.
    return false;
}

function isAssignedToUser(user, schedule) {
    const userStaffId =
        user?.staff_id ??
        user?.staff?.id ??
        user?.profile?.id ??
        user?.id;

    const scheduleStaffId =
        typeof schedule?.staff === "object"
            ? schedule.staff?.id
            : schedule?.staff;

    if (
        userStaffId != null &&
        scheduleStaffId != null &&
        String(userStaffId) === String(scheduleStaffId)
    ) {
        return true;
    }

    const currentName = `${user?.first_name || ""} ${
        user?.last_name || ""
    }`
        .trim()
        .toLowerCase();

    return Boolean(
        currentName &&
            getStaffName(schedule).toLowerCase() === currentName
    );
}

function canManageTreatment(user, schedule) {
    const role = roleName(user);

    if (isAdmin(user)) return true;

    if (role.includes("head nurse")) {
        return !["Cancelled", "Missed"].includes(schedule?.status);
    }

    if (role.includes("dialysis nurse")) {
        return (
            isAssignedToUser(user, schedule) &&
            !["Cancelled", "Missed"].includes(schedule?.status)
        );
    }

    return false;
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    description,
    iconClass,
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
                        {value}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        {description}
                    </p>
                </div>

                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
                >
                    <Icon className="text-lg" />
                </div>
            </div>
        </div>
    );
}

function ModalShell({
    title,
    subtitle,
    onClose,
    children,
    maxWidth = "max-w-2xl",
}) {
    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                className={`my-auto w-full ${maxWidth} overflow-hidden rounded-3xl bg-white shadow-2xl`}
            >
                <div className="bg-gradient-to-r from-[#28383f] to-[#176c70] px-6 py-5 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">
                                Staff Portal
                            </p>
                            <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="mt-1 text-sm text-teal-50/90">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close dialog"
                            className="rounded-xl p-2 text-white transition hover:bg-white/15"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

function Field({ label, children, hint }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                {label}
            </span>
            {children}
            {hint && (
                <span className="mt-1 block text-xs text-slate-500">
                    {hint}
                </span>
            )}
        </label>
    );
}

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 disabled:bg-slate-100 disabled:text-slate-500";

function ScheduleDetailsModal({
    schedule,
    onClose,
    onEdit,
    onTreatment,
    user,
    today,
}) {
    if (!schedule) return null;

    const details = [
        {
            label: "Patient",
            value: getPatientName(schedule),
            icon: FaUser,
        },
        {
            label: "Dialysis date",
            value: formatDate(schedule.dialysis_date),
            icon: FaCalendarAlt,
        },
        {
            label: "Dialysis time",
            value: formatTime(schedule.dialysis_time),
            icon: FaClock,
        },
        {
            label: "Shift",
            value: schedule.shift || "Not specified",
            icon: FaCalendarCheck,
        },
        {
            label: "Dialysis machine",
            value: getMachineName(schedule),
            icon: FaProcedures,
        },
        {
            label: "Assigned staff",
            value: getStaffName(schedule),
            icon: FaStethoscope,
        },
    ];

    const editAllowed = canEditSchedule(user, schedule, today);
    const treatmentAllowed = canManageTreatment(user, schedule);

    return (
        <ModalShell
            title="Session Details"
            subtitle={`Schedule reference #${schedule.id}`}
            onClose={onClose}
        >
            <div className="grid gap-3 sm:grid-cols-2">
                {details.map(({ label, value, icon: Icon }) => (
                    <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <Icon className="text-teal-700" />
                            {label}
                        </div>

                        <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                            {value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">
                    Appointment status
                </p>

                <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(
                        schedule.status
                    )}`}
                >
                    {schedule.status || "Scheduled"}
                </span>

                {schedule.notes && (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                        <p className="text-xs font-medium text-slate-500">
                            Notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {schedule.notes}
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {editAllowed && (
                    <button
                        type="button"
                        onClick={() => onEdit(schedule)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                    >
                        <FaEdit />
                        Edit schedule
                    </button>
                )}

                {treatmentAllowed && (
                    <button
                        type="button"
                        onClick={() => onTreatment(schedule)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-100"
                    >
                        <FaNotesMedical />
                        Treatment record
                    </button>
                )}
            </div>

            {!editAllowed && !treatmentAllowed && (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    <FaLock />
                    This account has view-only access to this session.
                </p>
            )}

            <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
                Close details
            </button>
        </ModalShell>
    );
}

function ScheduleEditModal({
    schedule,
    user,
    machines,
    staffOptions,
    token,
    onClose,
    onSaved,
}) {
    const headNurse = roleName(user).includes("head nurse");

    const [form, setForm] = useState({
        dialysis_date: schedule.dialysis_date || "",
        dialysis_time: String(schedule.dialysis_time || "").slice(0, 5),
        shift: schedule.shift || "Morning",
        machine:
            typeof schedule.machine === "object"
                ? schedule.machine?.id
                : schedule.machine || "",
        notes: schedule.notes || "",
        ...(headNurse
            ? {
                  staff:
                      typeof schedule.staff === "object"
                          ? schedule.staff?.id
                          : schedule.staff || "",
              }
            : {}),
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const change = (key, value) =>
        setForm((old) => ({ ...old, [key]: value }));

    async function submit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.dialysis_date || !form.dialysis_time || !form.machine) {
            setError("Date, time, and machine are required.");
            return;
        }

        const payload = {
            dialysis_date: form.dialysis_date,
            dialysis_time:
                form.dialysis_time.length === 5
                    ? `${form.dialysis_time}:00`
                    : form.dialysis_time,
            shift: form.shift,
            machine: Number(form.machine),
            notes: form.notes,
        };

        if (headNurse && form.staff !== "") {
            payload.staff = Number(form.staff);
        }

        setSaving(true);

        try {
            const response = await fetch(
                `${API_BASE}schedules/${schedule.id}/`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        `Unable to update schedule (HTTP ${response.status}).`
                    )
                );
            }

            setSuccess("Schedule updated successfully.");
            onSaved(data);
        } catch (err) {
            setError(err.message || "Unable to update this schedule.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <ModalShell
            title="Edit Schedule"
            subtitle={`Update session #${schedule.id}`}
            onClose={onClose}
        >
            <form onSubmit={submit} className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    Only permitted schedule fields are sent to the server.
                    The backend must validate availability, conflicts, shift
                    duration, and role permissions before saving changes.
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Dialysis date">
                        <input
                            type="date"
                            required
                            min={getLocalDateString()}
                            value={form.dialysis_date}
                            onChange={(event) =>
                                change("dialysis_date", event.target.value)
                            }
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Dialysis time">
                        <input
                            type="time"
                            required
                            value={form.dialysis_time}
                            onChange={(event) =>
                                change("dialysis_time", event.target.value)
                            }
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Shift">
                        <select
                            required
                            value={form.shift}
                            onChange={(event) =>
                                change("shift", event.target.value)
                            }
                            className={inputClass}
                        >
                            {SHIFTS.map((shift) => (
                                <option key={shift} value={shift}>
                                    {shift}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field
                        label="Machine"
                        hint={
                            machines.length
                                ? "Choose an available machine."
                                : "Machine choices could not be loaded; enter the machine ID shown in your system."
                        }
                    >
                        <select
                            required
                            value={form.machine}
                            onChange={(event) =>
                                change("machine", event.target.value)
                            }
                            className={inputClass}
                        >
                            <option value="">Select machine</option>

                            {machines.map((machine) => (
                                <option key={machine.id} value={machine.id}>
                                    {machine.machine_number ||
                                        machine.machine_code ||
                                        machine.name ||
                                        `Machine #${machine.id}`}
                                    {machine.status
                                        ? ` — ${machine.status}`
                                        : ""}
                                </option>
                            ))}

                            {form.machine &&
                                !machines.some(
                                    (machine) =>
                                        String(machine.id) ===
                                        String(form.machine)
                                ) && (
                                    <option value={form.machine}>
                                        Current machine ID #{form.machine}
                                    </option>
                                )}
                        </select>
                    </Field>

                    {headNurse && (
                        <Field
                            label="Assigned staff"
                            hint="Assignment changes must pass backend permission and availability checks."
                        >
                            <select
                                value={form.staff}
                                onChange={(event) =>
                                    change("staff", event.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="">
                                    Keep current assignment
                                </option>

                                {staffOptions.map((person) => (
                                    <option key={person.id} value={person.id}>
                                        {person.full_name ||
                                            `${person.first_name || ""} ${
                                                person.last_name || ""
                                            }`.trim() ||
                                            person.name ||
                                            `Staff #${person.id}`}
                                    </option>
                                ))}

                                {form.staff &&
                                    !staffOptions.some(
                                        (person) =>
                                            String(person.id) ===
                                            String(form.staff)
                                    ) && (
                                        <option value={form.staff}>
                                            Current staff ID #{form.staff}
                                        </option>
                                    )}
                            </select>
                        </Field>
                    )}
                </div>

                <Field label="Notes">
                    <textarea
                        rows={3}
                        value={form.notes}
                        onChange={(event) =>
                            change("notes", event.target.value)
                        }
                        className={inputClass}
                        placeholder="Add relevant session notes"
                    />
                </Field>

                {error && (
                    <p
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                    >
                        <FaExclamationCircle className="mr-2 inline" />
                        {error}
                    </p>
                )}

                {success && (
                    <p
                        role="status"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                    >
                        <FaCheckCircle className="mr-2 inline" />
                        {success}
                    </p>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>

                    <button
                        disabled={saving}
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                    >
                        <FaSave />
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

function TreatmentModal({
    schedule,
    user,
    token,
    existingRecord,
    onClose,
    onSaved,
}) {
    const headNurse = roleName(user).includes("head nurse");

    const [form, setForm] = useState({
        ...EMPTY_TREATMENT,
        ...(existingRecord || {}),
    });

    const [overrideReason, setOverrideReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [completeNow, setCompleteNow] = useState(
        schedule.status !== "Completed"
    );

    const change = (key, value) =>
        setForm((old) => ({ ...old, [key]: value }));

    const assignedToCurrent = isAssignedToUser(user, schedule);

    const needsOverride =
        headNurse && !assignedToCurrent && completeNow;

    async function submit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        const required = [
            "pre_weight",
            "post_weight",
            "blood_pressure_before",
            "blood_pressure_after",
            "pulse_before",
            "pulse_after",
        ];

        const missing = required.find(
            (key) => form[key] === "" || form[key] == null
        );

        if (missing) {
            setError("Complete all required measurements before saving.");
            return;
        }

        if (
            Number(form.pre_weight) <= 0 ||
            Number(form.post_weight) <= 0 ||
            Number(form.pulse_before) <= 0 ||
            Number(form.pulse_after) <= 0
        ) {
            setError(
                "Weights and pulse measurements must be greater than zero."
            );
            return;
        }

        if (needsOverride && !overrideReason.trim()) {
            setError(
                "Enter an override reason before completing another nurse's session."
            );
            return;
        }

        const payload = {
            pre_weight: Number(form.pre_weight),
            post_weight: Number(form.post_weight),
            blood_pressure_before: form.blood_pressure_before.trim(),
            blood_pressure_after: form.blood_pressure_after.trim(),
            pulse_before: Number(form.pulse_before),
            pulse_after: Number(form.pulse_after),
            notes: form.notes || "",
        };

        if (needsOverride) {
            payload.override_reason = overrideReason.trim();
        }

        setSaving(true);

        try {
            let response;
            let data;

            if (completeNow && schedule.status !== "Completed") {
                response = await fetch(
                    `${API_BASE}schedules/${schedule.id}/complete-treatment/`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify(payload),
                    }
                );

                data = await response.json().catch(() => null);
            } else if (existingRecord?.id) {
                response = await fetch(
                    `${API_BASE}treatment-records/${existingRecord.id}/`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify(payload),
                    }
                );

                data = await response.json().catch(() => null);
            } else {
                response = await fetch(
                    `${API_BASE}treatment-records/`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify({
                            schedule: schedule.id,
                            ...payload,
                        }),
                    }
                );

                data = await response.json().catch(() => null);
            }

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        `Unable to save treatment record (HTTP ${response.status}).`
                    )
                );
            }

            setSuccess(
                completeNow && schedule.status !== "Completed"
                    ? "Treatment record saved and session marked completed."
                    : "Treatment record saved successfully."
            );

            onSaved(
                data,
                completeNow && schedule.status !== "Completed"
            );
        } catch (err) {
            setError(err.message || "Unable to save treatment record.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <ModalShell
            title="Treatment Record"
            subtitle={`${getPatientName(schedule)} · Session #${schedule.id}`}
            onClose={onClose}
            maxWidth="max-w-3xl"
        >
            <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Session date</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatDate(schedule.dialysis_date)}
                        </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Machine</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                            {getMachineName(schedule)}
                        </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Status</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                            {schedule.status || "Scheduled"}
                        </p>
                    </div>
                </div>

                <div>
                    <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                        <FaWeight className="text-teal-700" />
                        Weight measurements (kg)
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Pre-dialysis weight">
                            <input
                                required
                                type="number"
                                min="0.1"
                                step="0.01"
                                value={form.pre_weight ?? ""}
                                onChange={(event) =>
                                    change("pre_weight", event.target.value)
                                }
                                className={inputClass}
                                placeholder="e.g. 65.5"
                            />
                        </Field>

                        <Field label="Post-dialysis weight">
                            <input
                                required
                                type="number"
                                min="0.1"
                                step="0.01"
                                value={form.post_weight ?? ""}
                                onChange={(event) =>
                                    change("post_weight", event.target.value)
                                }
                                className={inputClass}
                                placeholder="e.g. 63.8"
                            />
                        </Field>
                    </div>
                </div>

                <div>
                    <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
                        <FaHeartbeat className="text-rose-600" />
                        Vital signs
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Blood pressure before"
                            hint="Format: systolic/diastolic, e.g. 120/80"
                        >
                            <input
                                required
                                value={form.blood_pressure_before ?? ""}
                                onChange={(event) =>
                                    change(
                                        "blood_pressure_before",
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                                placeholder="120/80"
                                pattern="[0-9]{2,3}\s*/\s*[0-9]{2,3}"
                                title="Enter blood pressure as systolic/diastolic, e.g. 120/80"
                            />
                        </Field>

                        <Field
                            label="Blood pressure after"
                            hint="Format: systolic/diastolic, e.g. 110/75"
                        >
                            <input
                                required
                                value={form.blood_pressure_after ?? ""}
                                onChange={(event) =>
                                    change(
                                        "blood_pressure_after",
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                                placeholder="110/75"
                                pattern="[0-9]{2,3}\s*/\s*[0-9]{2,3}"
                                title="Enter blood pressure as systolic/diastolic, e.g. 110/75"
                            />
                        </Field>

                        <Field label="Pulse before (bpm)">
                            <input
                                required
                                type="number"
                                min="1"
                                max="300"
                                value={form.pulse_before ?? ""}
                                onChange={(event) =>
                                    change("pulse_before", event.target.value)
                                }
                                className={inputClass}
                                placeholder="72"
                            />
                        </Field>

                        <Field label="Pulse after (bpm)">
                            <input
                                required
                                type="number"
                                min="1"
                                max="300"
                                value={form.pulse_after ?? ""}
                                onChange={(event) =>
                                    change("pulse_after", event.target.value)
                                }
                                className={inputClass}
                                placeholder="76"
                            />
                        </Field>
                    </div>
                </div>

                <Field label="Treatment notes">
                    <textarea
                        rows={3}
                        value={form.notes ?? ""}
                        onChange={(event) =>
                            change("notes", event.target.value)
                        }
                        className={inputClass}
                        placeholder="Record observations or relevant treatment notes"
                    />
                </Field>

                {schedule.status !== "Completed" && (
                    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                checked={completeNow}
                                onChange={(event) =>
                                    setCompleteNow(event.target.checked)
                                }
                                className="mt-1 h-4 w-4 accent-teal-700"
                            />

                            <span>
                                <span className="block text-sm font-semibold text-teal-900">
                                    Mark session as completed after saving
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-teal-800">
                                    All required measurements will be submitted
                                    together with the completion request.
                                </span>
                            </span>
                        </label>

                        {needsOverride && (
                            <div className="mt-4">
                                <Field
                                    label="Head Nurse override reason"
                                    hint="Required when completing a session assigned to another nurse."
                                >
                                    <textarea
                                        required
                                        rows={2}
                                        value={overrideReason}
                                        onChange={(event) =>
                                            setOverrideReason(event.target.value)
                                        }
                                        className={inputClass}
                                        placeholder="Explain why the Head Nurse is completing another nurse's session"
                                    />
                                </Field>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <p
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                    >
                        <FaExclamationCircle className="mr-2 inline" />
                        {error}
                    </p>
                )}

                {success && (
                    <p
                        role="status"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                    >
                        <FaCheckCircle className="mr-2 inline" />
                        {success}
                    </p>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                    >
                        <FaSave />
                        {saving
                            ? "Saving..."
                            : completeNow && schedule.status !== "Completed"
                              ? "Save and complete session"
                              : "Save treatment record"}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

export default function StaffSchedules() {
    const { user, accessToken, logout } = useStaffAuth();

    const [schedules, setSchedules] = useState([]);
    const [treatmentRecords, setTreatmentRecords] = useState([]);
    const [machines, setMachines] = useState([]);
    const [staffOptions, setStaffOptions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Statuses");
    const [dateFilter, setDateFilter] = useState("");

    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [treatmentSchedule, setTreatmentSchedule] = useState(null);

    const today = getLocalDateString();

    const apiFetch = useCallback(
        async (path, options = {}) => {
            const response = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/json",
                    ...(options.body
                        ? { "Content-Type": "application/json" }
                        : {}),
                    ...(options.headers || {}),
                },
            });

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                logout();
                window.location.assign("/staff/login");
                throw new Error(
                    "Your session expired. Please sign in again."
                );
            }

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        `Request failed (HTTP ${response.status}).`
                    )
                );
            }

            return data;
        },
        [accessToken, logout]
    );

    const loadSchedules = useCallback(
        async (isRefresh = false) => {
            if (!accessToken) {
                setError(
                    "Your staff session could not be verified. Please sign in again."
                );
                setLoading(false);
                return;
            }

            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");
            setNotice("");

            try {
                const [scheduleData, treatmentData] = await Promise.all([
                    apiFetch("schedules/"),
                    apiFetch("treatment-records/").catch(() => []),
                ]);

                const rows = normalizeRows(scheduleData, ["schedules"]);

                if (!rows) {
                    throw new Error(
                        "The schedules API returned an unexpected response."
                    );
                }

                setSchedules(rows);

                setTreatmentRecords(
                    normalizeRows(treatmentData, [
                        "records",
                        "treatment_records",
                    ]) || []
                );
            } catch (err) {
                setError(
                    err.message ||
                        "Something went wrong while loading schedules."
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [accessToken, apiFetch]
    );

    useEffect(() => {
        loadSchedules();
    }, [loadSchedules]);

    useEffect(() => {
        if (!accessToken) return;

        let active = true;

        Promise.all([
            apiFetch("machines/")
                .then((data) => normalizeRows(data, ["machines"]) || [])
                .catch(() => []),

            apiFetch("staff/")
                .then(
                    (data) =>
                        normalizeRows(data, ["staff", "employees"]) || []
                )
                .catch(() => []),
        ]).then(([machineRows, staffRows]) => {
            if (active) {
                setMachines(machineRows);
                setStaffOptions(staffRows);
            }
        });

        return () => {
            active = false;
        };
    }, [accessToken, apiFetch]);

    const stats = useMemo(
        () => ({
            today: schedules.filter(
                (item) => item.dialysis_date === today
            ).length,

            upcoming: schedules.filter(
                (item) =>
                    item.dialysis_date > today &&
                    !["Completed", "Cancelled", "Missed"].includes(
                        item.status
                    )
            ).length,

            completed: schedules.filter(
                (item) => item.status === "Completed"
            ).length,

            missed: schedules.filter(
                (item) =>
                    item.status === "Missed" &&
                    item.dialysis_date <= today
            ).length,
        }),
        [schedules, today]
    );

    const filteredSchedules = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return schedules
            .filter((schedule) => {
                const matchesSearch =
                    !normalizedSearch ||
                    [
                        getPatientName(schedule),
                        getMachineName(schedule),
                        getStaffName(schedule),
                        schedule.shift,
                        String(schedule.id ?? ""),
                    ]
                        .filter(Boolean)
                        .some((value) =>
                            String(value)
                                .toLowerCase()
                                .includes(normalizedSearch)
                        );

                return (
                    matchesSearch &&
                    (statusFilter === "All Statuses" ||
                        schedule.status === statusFilter) &&
                    (!dateFilter ||
                        schedule.dialysis_date === dateFilter)
                );
            })
            .sort((a, b) =>
                `${a.dialysis_date || ""} ${a.dialysis_time || ""}`.localeCompare(
                    `${b.dialysis_date || ""} ${b.dialysis_time || ""}`
                )
            );
    }, [schedules, search, statusFilter, dateFilter]);

    function findTreatmentRecord(schedule) {
        return (
            treatmentRecords.find(
                (record) =>
                    String(
                        typeof record.schedule === "object"
                            ? record.schedule?.id
                            : record.schedule
                    ) === String(schedule.id)
            ) || null
        );
    }

    function handleScheduleSaved(updated) {
        setSchedules((current) =>
            current.map((item) =>
                String(item.id) === String(updated.id)
                    ? { ...item, ...updated }
                    : item
            )
        );

        setSelectedSchedule(null);
        setEditingSchedule(null);
        setNotice("Schedule updated successfully.");

        loadSchedules(true);
    }

    function handleTreatmentSaved(_data, completed) {
        setTreatmentSchedule(null);
        setSelectedSchedule(null);

        setNotice(
            completed
                ? "Treatment record saved and session marked completed."
                : "Treatment record saved successfully."
        );

        loadSchedules(true);
    }

    const staffName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
        : "";

    const hour = new Date().getHours();

    const greeting =
        hour < 12
            ? "Good morning"
            : hour < 18
              ? "Good afternoon"
              : "Good evening";

    const treatmentRole =
        roleName(user).includes("dialysis nurse") ||
        roleName(user).includes("head nurse") ||
        isAdmin(user);

    const todaySchedules = schedules
        .filter((item) => item.dialysis_date === today)
        .sort((a, b) =>
            String(a.dialysis_time || "").localeCompare(
                String(b.dialysis_time || "")
            )
        );

    return (
        <StaffLayout>
            <div className="mx-auto min-h-screen max-w-7xl space-y-8 bg-slate-50/80 pb-8">
                <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-sm font-semibold text-teal-700">
                            YOUR SCHEDULE OVERVIEW
                        </p>

                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            {greeting}
                            {staffName ? `, ${staffName}` : ""}
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                            Review dialysis assignments, check appointment
                            details, and manage treatment records according to
                            your role.
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            {user?.employee_id && (
                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                                    Employee ID: {user.employee_id}
                                </span>
                            )}

                            {user?.role && (
                                <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
                                    {user.role}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                <FaCalendarCheck />
                            </div>

                            <div>
                                <p className="text-xs text-slate-500">
                                    Today's date
                                </p>
                                <p className="text-sm font-bold text-slate-800">
                                    {formatDate(today)}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadSchedules(true)}
                            disabled={loading || refreshing}
                            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FaSyncAlt
                                className={refreshing ? "animate-spin" : ""}
                            />
                            {refreshing ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </section>

                {notice && (
                    <div
                        role="status"
                        className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                    >
                        <FaCheckCircle className="mt-0.5 shrink-0" />
                        <span>{notice}</span>
                        <button
                            type="button"
                            onClick={() => setNotice("")}
                            className="ml-auto text-emerald-700"
                            aria-label="Dismiss notification"
                        >
                            <FaTimes />
                        </button>
                    </div>
                )}

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        icon={FaCalendarAlt}
                        label="Today's sessions"
                        value={stats.today}
                        description="Scheduled for today"
                        iconClass="bg-teal-50 text-teal-700"
                    />

                    <SummaryCard
                        icon={FaClock}
                        label="Upcoming sessions"
                        value={stats.upcoming}
                        description="Future active appointments"
                        iconClass="bg-sky-50 text-sky-700"
                    />

                    <SummaryCard
                        icon={FaCheckCircle}
                        label="Completed sessions"
                        value={stats.completed}
                        description="Completed in available records"
                        iconClass="bg-emerald-50 text-emerald-700"
                    />

                    <SummaryCard
                        icon={FaExclamationCircle}
                        label="Missed sessions"
                        value={stats.missed}
                        description="Missed today or earlier"
                        iconClass="bg-rose-50 text-rose-700"
                    />
                </section>

                {error && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <FaExclamationCircle className="mt-0.5 shrink-0 text-rose-600" />

                            <div>
                                <p className="text-sm font-semibold text-rose-800">
                                    Unable to load schedules
                                </p>
                                <p className="mt-1 text-sm text-rose-700">
                                    {error}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadSchedules(true)}
                            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
                        >
                            Try again
                        </button>
                    </div>
                )}

                <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#28383f] via-[#30474d] to-[#176c70] shadow-lg">
                    <div className="relative p-6 sm:p-8">
                        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
                        <div className="pointer-events-none absolute -right-1 -top-8 h-44 w-44 rounded-full border border-white/10" />

                        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100 ring-1 ring-white/10">
                                    <FaCalendarCheck />
                                    DAILY OVERVIEW
                                </div>

                                <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                                    Today's Dialysis Sessions
                                </h2>

                                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">
                                    Review today's appointments and their
                                    current status before each scheduled
                                    session.
                                </p>
                            </div>

                            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white">
                                <span className="text-3xl font-bold">
                                    {stats.today}
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-100">
                                    Sessions
                                </span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
                                Loading today's assignments...
                            </div>
                        ) : (
                            <div className="relative mt-6 space-y-3">
                                {todaySchedules.map((schedule) => (
                                    <button
                                        key={schedule.id}
                                        type="button"
                                        onClick={() =>
                                            setSelectedSchedule(schedule)
                                        }
                                        className="flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 text-left transition hover:bg-white/15 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-100">
                                                <FaUser />
                                            </div>

                                            <div>
                                                <p className="font-semibold text-white">
                                                    {getPatientName(schedule)}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-200">
                                                    {formatTime(
                                                        schedule.dialysis_time
                                                    )}{" "}
                                                    ·{" "}
                                                    {schedule.shift ||
                                                        "Shift not specified"}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-300">
                                                    {getMachineName(schedule)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800">
                                                {schedule.status || "Scheduled"}
                                            </span>
                                            <FaChevronRight className="text-sm text-teal-100" />
                                        </div>
                                    </button>
                                ))}

                                {todaySchedules.length === 0 && (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-8 text-center">
                                        <FaCalendarCheck className="mx-auto text-2xl text-teal-200" />
                                        <p className="mt-3 font-semibold text-white">
                                            No sessions scheduled for today
                                        </p>
                                        <p className="mt-1 text-sm text-slate-200">
                                            Your upcoming appointments will
                                            appear in the schedule list below.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-5 sm:p-6">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    All Dialysis Schedules
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Search and filter the appointments available
                                    to your staff account.
                                </p>
                            </div>

                            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                <FaClipboardList />
                                {filteredSchedules.length} result
                                {filteredSchedules.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                            <div className="relative">
                                <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search patient, machine, ID..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                                className={inputClass}
                            >
                                {STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>

                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(event) =>
                                        setDateFilter(event.target.value)
                                    }
                                    aria-label="Filter schedules by date"
                                    className={`${inputClass} min-w-0 flex-1`}
                                />

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch("");
                                        setStatusFilter("All Statuses");
                                        setDateFilter("");
                                    }}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
                            <p className="mt-4 text-sm font-semibold text-slate-700">
                                Loading your schedules...
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Retrieving appointments from the database
                            </p>
                        </div>
                    ) : !error && filteredSchedules.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                <FaCalendarAlt className="text-xl" />
                            </div>

                            <h3 className="mt-4 font-semibold text-slate-800">
                                No schedules found
                            </h3>

                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                Try changing your search or filters. If there
                                are no matching appointments, they will appear
                                here once available to your account.
                            </p>
                        </div>
                    ) : !error ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[980px] text-left">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                        <th className="px-6 py-4 font-semibold">
                                            Patient
                                        </th>
                                        <th className="px-6 py-4 font-semibold">
                                            Date &amp; time
                                        </th>
                                        <th className="px-6 py-4 font-semibold">
                                            Shift
                                        </th>
                                        <th className="px-6 py-4 font-semibold">
                                            Machine
                                        </th>
                                        <th className="px-6 py-4 font-semibold">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 font-semibold">
                                            Treatment
                                        </th>
                                        <th className="px-6 py-4 text-right font-semibold">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {filteredSchedules.map((schedule) => {
                                        const record =
                                            findTreatmentRecord(schedule);

                                        const editAllowed = canEditSchedule(
                                            user,
                                            schedule,
                                            today
                                        );

                                        const treatmentAllowed =
                                            canManageTreatment(
                                                user,
                                                schedule
                                            ) && treatmentRole;

                                        return (
                                            <tr
                                                key={schedule.id}
                                                className="transition hover:bg-teal-50/40"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                                            <FaUser />
                                                        </div>

                                                        <div>
                                                            <p className="font-semibold text-slate-800">
                                                                {getPatientName(
                                                                    schedule
                                                                )}
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Schedule #
                                                                {schedule.id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-medium text-slate-800">
                                                        {formatDate(
                                                            schedule.dialysis_date
                                                        )}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {formatTime(
                                                            schedule.dialysis_time
                                                        )}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {schedule.shift || "—"}
                                                </td>

                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    {getMachineName(schedule)}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(
                                                            schedule.status
                                                        )}`}
                                                    >
                                                        {schedule.status ||
                                                            "Scheduled"}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    {record ? (
                                                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                            Record saved
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                                            No record
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedSchedule(
                                                                    schedule
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                                                        >
                                                            View
                                                            <FaChevronRight />
                                                        </button>

                                                        {editAllowed && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditingSchedule(
                                                                        schedule
                                                                    )
                                                                }
                                                                title="Edit schedule"
                                                                aria-label={`Edit schedule ${schedule.id}`}
                                                                className="inline-flex items-center justify-center rounded-lg border border-teal-200 px-3 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-50"
                                                            >
                                                                <FaEdit />
                                                            </button>
                                                        )}

                                                        {treatmentAllowed && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setTreatmentSchedule(
                                                                        schedule
                                                                    )
                                                                }
                                                                title="Treatment record"
                                                                aria-label={`Manage treatment record for schedule ${schedule.id}`}
                                                                className="inline-flex items-center justify-center rounded-lg border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-50"
                                                            >
                                                                <FaNotesMedical />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : null}

                    {!loading &&
                        !error &&
                        filteredSchedules.length > 0 && (
                            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                                <p className="text-xs text-slate-500">
                                    Showing {filteredSchedules.length} schedule
                                    {filteredSchedules.length !== 1 ? "s" : ""}.
                                    Available actions depend on your staff role
                                    and backend permission checks.
                                </p>
                            </div>
                        )}
                </section>

                <footer className="pb-4 pt-2 text-center text-xs text-slate-400">
                    AI-Dialysis-System · Staff Portal
                </footer>
            </div>

            <ScheduleDetailsModal
                schedule={selectedSchedule}
                user={user}
                today={today}
                onClose={() => setSelectedSchedule(null)}
                onEdit={(schedule) => {
                    setSelectedSchedule(null);
                    setEditingSchedule(schedule);
                }}
                onTreatment={(schedule) => {
                    setSelectedSchedule(null);
                    setTreatmentSchedule(schedule);
                }}
            />

            {editingSchedule && (
                <ScheduleEditModal
                    schedule={editingSchedule}
                    user={user}
                    machines={machines}
                    staffOptions={staffOptions}
                    token={accessToken}
                    onClose={() => setEditingSchedule(null)}
                    onSaved={handleScheduleSaved}
                />
            )}

            {treatmentSchedule && (
                <TreatmentModal
                    schedule={treatmentSchedule}
                    user={user}
                    token={accessToken}
                    existingRecord={findTreatmentRecord(treatmentSchedule)}
                    onClose={() => setTreatmentSchedule(null)}
                    onSaved={handleTreatmentSaved}
                />
            )}
        </StaffLayout>
    );
}
