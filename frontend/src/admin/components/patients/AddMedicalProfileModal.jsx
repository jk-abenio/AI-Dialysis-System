import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    FaTimes,
    FaNotesMedical,
    FaWeight,
    FaClock,
    FaCalendarAlt,
    FaHeartbeat,
    FaExclamationCircle,
    FaCheckCircle,
    FaSpinner,
} from "react-icons/fa";

import {
    getMedicalProfile,
    createMedicalProfile,
    updateMedicalProfile,
} from "../../services/medicalProfileService";

const INITIAL_FORM = {
    weight: "",
    dialysis_frequency: "3x/week",
    dialysis_duration: "",
    preferred_shift: "Morning",
    diabetes: false,
    hypertension: false,
    vascular_access: "AV Fistula",
};

export default function AddMedicalProfileModal({
    open,
    patient,
    onClose,
    onSuccess,
}) {
    const [profileId, setProfileId] = useState(null);
    const [form, setForm] = useState({ ...INITIAL_FORM });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [loadError, setLoadError] = useState(false);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        if (!open || !patient?.id) return;

        let cancelled = false;

        const loadProfile = async () => {
            setLoading(true);
            setSaving(false);
            setError("");
            setNotice("");
            setLoadError(false);
            setProfileId(null);
            setForm({ ...INITIAL_FORM });

            try {
                const profile = await getMedicalProfile(patient.id);

                if (cancelled) return;

                setProfileId(profile.id);
                setForm({
                    weight: profile.weight ?? "",
                    dialysis_frequency:
                        profile.dialysis_frequency ?? "3x/week",
                    dialysis_duration: profile.dialysis_duration ?? "",
                    preferred_shift: profile.preferred_shift ?? "Morning",
                    diabetes: Boolean(profile.diabetes),
                    hypertension: Boolean(profile.hypertension),
                    vascular_access:
                        profile.vascular_access ?? "AV Fistula",
                });
            } catch (err) {
                if (cancelled) return;

                const status = err?.response?.status;

                // A 404 means there is no existing profile to edit.
                // Other errors may indicate a network or server failure.
                if (status === 404) {
                    setProfileId(null);
                    setForm({ ...INITIAL_FORM });
                } else {
                    console.error(
                        "Failed to load medical profile:",
                        err
                    );
                    setLoadError(true);
                    setError(
                        "Unable to load the medical profile. Please try again before saving."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
            cancelled = true;
        };
    }, [open, patient?.id]);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));

        setError("");
        setNotice("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!patient?.id || loading || saving || loadError) return;

        const weight = Number(form.weight);
        const duration = Number(form.dialysis_duration);

        if (!form.weight || !Number.isFinite(weight) || weight <= 0) {
            setError("Please enter a valid weight greater than zero.");
            return;
        }

        if (
            !form.dialysis_duration ||
            !Number.isFinite(duration) ||
            duration <= 0
        ) {
            setError(
                "Please enter a valid dialysis duration greater than zero."
            );
            return;
        }

        setSaving(true);
        setError("");
        setNotice("");

        try {
            const payload = {
                ...form,
                weight: form.weight,
                dialysis_duration: form.dialysis_duration,
                patient: patient.id,
            };

            if (profileId) {
                await updateMedicalProfile(profileId, payload);
            } else {
                await createMedicalProfile(payload);
            }

            // Refresh the parent page/list before closing.
            if (onSuccess) {
                await onSuccess();
            }

            if (onClose) {
                onClose();
            }
       
        } catch (err) {
            console.error(
                "Failed to save medical profile:",
                err?.response?.data || err
            );

            const data = err?.response?.data;

            if (data && typeof data === "object") {
                const messages = Object.entries(data).map(
                    ([field, errors]) => {
                        const message = Array.isArray(errors)
                            ? errors.join(" ")
                            : typeof errors === "string"
                              ? errors
                              : JSON.stringify(errors);

                        return `${field}: ${message}`;
                    }
                );

                setError(
                    messages.length
                        ? messages.join(" | ")
                        : "The server rejected the medical profile."
                );
            } else {
                setError(
                    "Unable to save the medical profile. Please try again."
                );
            }
        } finally {
            setSaving(false);
        }

    };

    if (!open) return null;

    const inputClass =
        "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-50 disabled:cursor-not-allowed disabled:bg-slate-100";

    const labelClass =
        "mb-2 block text-sm font-semibold text-slate-700";

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="medical-profile-title"
                className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-xl text-cyan-700">
                            <FaNotesMedical />
                        </div>

                        <div>
                            <h2
                                id="medical-profile-title"
                                className="text-xl font-bold text-slate-800 sm:text-2xl"
                            >
                                Medical Profile
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {patient
                                    ? `Patient: ${[
                                          patient.first_name,
                                          patient.last_name,
                                      ]
                                          .filter(Boolean)
                                          .join(" ") || `#${patient.id}`}`
                                    : "Manage dialysis requirements"}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close medical profile"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto px-5 py-6 sm:px-7">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <FaSpinner className="animate-spin text-3xl text-cyan-600" />

                            <p className="mt-4 font-semibold text-slate-700">
                                Loading medical profile...
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Retrieving the patient's recorded information.
                            </p>
                        </div>
                    ) : loadError ? (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 p-5 text-center"
                        >
                            <FaExclamationCircle className="mx-auto text-2xl text-red-600" />

                            <h3 className="mt-3 font-semibold text-red-800">
                                Unable to load profile
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-red-700">
                                {error}
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    // Re-run the loading effect by remounting
                                    // the modal's data state for this patient.
                                    setLoadError(false);
                                    setLoading(true);
                                    setError("");
                                    setNotice("");
                                    setForm({ ...INITIAL_FORM });
                                    setProfileId(null);

                                    getMedicalProfile(patient.id)
                                        .then((profile) => {
                                            setProfileId(profile.id);
                                            setForm({
                                                weight: profile.weight ?? "",
                                                dialysis_frequency:
                                                    profile.dialysis_frequency ??
                                                    "3x/week",
                                                dialysis_duration:
                                                    profile.dialysis_duration ??
                                                    "",
                                                preferred_shift:
                                                    profile.preferred_shift ??
                                                    "Morning",
                                                diabetes: Boolean(
                                                    profile.diabetes
                                                ),
                                                hypertension: Boolean(
                                                    profile.hypertension
                                                ),
                                                vascular_access:
                                                    profile.vascular_access ??
                                                    "AV Fistula",
                                            });
                                        })
                                        .catch((err) => {
                                            if (
                                                err?.response?.status === 404
                                            ) {
                                                setProfileId(null);
                                                setForm({ ...INITIAL_FORM });
                                            } else {
                                                setLoadError(true);
                                                setError(
                                                    "The medical profile could not be retrieved. Please check your connection."
                                                );
                                            }
                                        })
                                        .finally(() => setLoading(false));
                                }}
                                className="mt-4 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                Try again
                            </button>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div
                                    role="alert"
                                    className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                                >
                                    <FaExclamationCircle className="mt-0.5 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            {notice && (
                                <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                                    <FaCheckCircle className="mt-0.5 shrink-0" />
                                    <p>{notice}</p>
                                </div>
                            )}

                            <form
                                id="medical-profile-form"
                                onSubmit={handleSubmit}
                                className="space-y-7"
                            >
                                {/* Dialysis details */}
                                <div>
                                    <div className="mb-4">
                                        <h3 className="font-bold text-slate-800">
                                            Dialysis Requirements
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Enter the patient's recorded
                                            dialysis information.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor="medical-weight"
                                                className={labelClass}
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <FaWeight className="text-cyan-700" />
                                                    Weight (kg)
                                                </span>
                                            </label>

                                            <input
                                                id="medical-weight"
                                                type="number"
                                                name="weight"
                                                value={form.weight}
                                                onChange={handleChange}
                                                min="0.1"
                                                step="0.1"
                                                placeholder="e.g. 65.5"
                                                className={inputClass}
                                                required
                                                disabled={saving}
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="medical-duration"
                                                className={labelClass}
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <FaClock className="text-cyan-700" />
                                                    Duration (hours)
                                                </span>
                                            </label>

                                            <input
                                                id="medical-duration"
                                                type="number"
                                                name="dialysis_duration"
                                                value={form.dialysis_duration}
                                                onChange={handleChange}
                                                min="0.1"
                                                step="0.1"
                                                placeholder="e.g. 4"
                                                className={inputClass}
                                                required
                                                disabled={saving}
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="medical-frequency"
                                                className={labelClass}
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <FaCalendarAlt className="text-cyan-700" />
                                                    Dialysis Frequency
                                                </span>
                                            </label>

                                            <select
                                                id="medical-frequency"
                                                name="dialysis_frequency"
                                                value={form.dialysis_frequency}
                                                onChange={handleChange}
                                                className={inputClass}
                                                disabled={saving}
                                            >
                                                <option value="2x/week">
                                                    2 times per week
                                                </option>
                                                <option value="3x/week">
                                                    3 times per week
                                                </option>
                                                <option value="4x/week">
                                                    4 times per week
                                                </option>
                                            </select>
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="medical-shift"
                                                className={labelClass}
                                            >
                                                Preferred Shift
                                            </label>

                                            <select
                                                id="medical-shift"
                                                name="preferred_shift"
                                                value={form.preferred_shift}
                                                onChange={handleChange}
                                                className={inputClass}
                                                disabled={saving}
                                            >
                                                <option value="Morning">
                                                    Morning
                                                </option>
                                                <option value="Afternoon">
                                                    Afternoon
                                                </option>
                                                <option value="Evening">
                                                    Evening
                                                </option>
                                            </select>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label
                                                htmlFor="medical-access"
                                                className={labelClass}
                                            >
                                                Vascular Access
                                            </label>

                                            <select
                                                id="medical-access"
                                                name="vascular_access"
                                                value={form.vascular_access}
                                                onChange={handleChange}
                                                className={inputClass}
                                                disabled={saving}
                                            >
                                                <option value="AV Fistula">
                                                    AV Fistula
                                                </option>
                                                <option value="AV Graft">
                                                    AV Graft
                                                </option>
                                                <option value="Catheter">
                                                    Catheter
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Medical conditions */}
                                <div className="border-t border-slate-100 pt-6">
                                    <div className="mb-4">
                                        <h3 className="flex items-center gap-2 font-bold text-slate-800">
                                            <FaHeartbeat className="text-cyan-700" />
                                            Recorded Medical Conditions
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Mark the conditions documented in
                                            the patient's medical record.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <label
                                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                                                form.diabetes
                                                    ? "border-amber-300 bg-amber-50"
                                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                name="diabetes"
                                                checked={form.diabetes}
                                                onChange={handleChange}
                                                disabled={saving}
                                                className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500"
                                            />

                                            <span>
                                                <span className="block text-sm font-semibold text-slate-800">
                                                    Diabetes
                                                </span>
                                                <span className="mt-0.5 block text-xs text-slate-500">
                                                    Documented condition
                                                </span>
                                            </span>
                                        </label>

                                        <label
                                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                                                form.hypertension
                                                    ? "border-amber-300 bg-amber-50"
                                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                name="hypertension"
                                                checked={form.hypertension}
                                                onChange={handleChange}
                                                disabled={saving}
                                                className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500"
                                            />

                                            <span>
                                                <span className="block text-sm font-semibold text-slate-800">
                                                    Hypertension
                                                </span>
                                                <span className="mt-0.5 block text-xs text-slate-500">
                                                    Documented condition
                                                </span>
                                            </span>
                                        </label>
                                    </div>

                                    <p className="mt-3 text-xs leading-5 text-slate-400">
                                        Ensure these entries reflect verified
                                        clinical records.
                                    </p>
                                </div>
                            </form>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        form="medical-profile-form"
                        disabled={loading || saving || loadError}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? (
                            <>
                                <FaSpinner className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <FaCheckCircle />
                                {profileId
                                    ? "Update Medical Profile"
                                    : "Save Medical Profile"}
                            </>
                        )}
                    </button>
                </div>
            </section>
        </div>,
    document.body
    );
}