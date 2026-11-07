
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    FaTimes,
    FaUserPlus,
    FaUserEdit,
    FaUser,
    FaIdCard,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaCheckCircle,
    FaExclamationCircle,
    FaCopy,
    FaSpinner,
    FaCalendarAlt,
    FaTint,
    FaVenusMars,
    FaUserShield,
    FaLink,
    FaInfoCircle,
} from "react-icons/fa";

import {
    createPatient,
    updatePatient,
} from "../../services/patientService";

const initialForm = {
    first_name: "",
    middle_name: "",
    last_name: "",
    birth_date: "",
    gender: "Male",
    blood_type: "O+",
    contact_number: "",
    email: "",
    address: "",
    emergency_contact: "",
    status: "Active",
};

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const labelClass =
    "mb-2 block text-sm font-medium text-slate-700";

function FormField({
    label,
    name,
    value,
    onChange,
    placeholder,
    type = "text",
    icon: Icon,
    required = false,
    disabled = false,
    children,
    className = "",
    autoComplete,
}) {
    return (
        <div className={className}>
            <label htmlFor={name} className={labelClass}>
                {label}
                {required && (
                    <span className="ml-1 text-rose-500">*</span>
                )}
            </label>

            <div className="relative">
                {Icon && (
                    <Icon
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        size={15}
                    />
                )}

                {children || (
                    <input
                        id={name}
                        name={name}
                        type={type}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        required={required}
                        disabled={disabled}
                        autoComplete={autoComplete}
                        className={`${inputClass} ${
                            Icon ? "pl-10" : ""
                        }`}
                    />
                )}
            </div>
        </div>
    );
}

function SectionHeading({ icon: Icon, title, description }) {
    return (
        <div className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                <Icon size={16} />
            </div>

            <div>
                <h3 className="text-sm font-semibold text-slate-800">
                    {title}
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}

function ErrorBanner({ message, onDismiss }) {
    if (!message) return null;

    return (
        <div
            role="alert"
            className="mb-5 flex items-start gap-3 whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
            <FaExclamationCircle className="mt-0.5 shrink-0" />

            <p className="min-w-0 flex-1 break-words">
                {message}
            </p>

            <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss error"
                className="shrink-0 rounded-lg p-1 hover:bg-rose-100"
            >
                <FaTimes size={12} />
            </button>
        </div>
    );
}

function getErrorMessage(err) {
    const data = err?.response?.data;

    if (data && typeof data === "object") {
        if (typeof data.error === "string") {
            return data.error;
        }

        if (typeof data.detail === "string") {
            return data.detail;
        }

        return Object.entries(data)
            .map(([field, value]) => {
                const details = Array.isArray(value)
                    ? value
                          .map((item) =>
                              typeof item === "string"
                                  ? item
                                  : JSON.stringify(item)
                          )
                          .join(", ")
                    : typeof value === "string"
                      ? value
                      : JSON.stringify(value);

                return `${field.replaceAll("_", " ")}: ${details}`;
            })
            .join("\n");
    }

    return (
        err?.message ||
        "Unable to save the patient. Please try again."
    );
}

export default function AddPatientModal({
    open,
    patient,
    onClose,
    onSuccess,
}) {
    const [form, setForm] = useState(initialForm);
    const [createdPatient, setCreatedPatient] = useState(null);
    const [createPortalAccount, setCreatePortalAccount] =
        useState(false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedMessage, setCopiedMessage] = useState(false);

    const isEditing = Boolean(patient);

    useEffect(() => {
        if (!open) return;

        setForm(
            patient
                ? {
                      ...initialForm,
                      first_name: patient.first_name || "",
                      middle_name: patient.middle_name || "",
                      last_name: patient.last_name || "",
                      birth_date: patient.birth_date || "",
                      gender: patient.gender || "Male",
                      blood_type: patient.blood_type || "O+",
                      contact_number: patient.contact_number || "",
                      email: patient.email || "",
                      address: patient.address || "",
                      emergency_contact:
                          patient.emergency_contact || "",
                      status: patient.status || "Active",
                  }
                : { ...initialForm }
        );

        setCreatedPatient(null);
        setCreatePortalAccount(false);
        setError("");
        setSaving(false);
        setCopied(false);
        setCopiedMessage(false);
    }, [patient, open]);

    if (!open) return null;

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
    };

    const handleClose = () => {
        if (saving) return;
        onClose?.();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving) return;

        setError("");

        const firstName = form.first_name.trim();
        const lastName = form.last_name.trim();
        const email = form.email.trim();

        if (!firstName || !lastName) {
            setError("First name and last name are required.");
            return;
        }

        if (!isEditing && createPortalAccount) {
            if (!email) {
                setError(
                    "An email address is required to create a Patient Portal account."
                );
                return;
            }

            if (form.status !== "Active") {
                setError(
                    "Only active patients can receive a Patient Portal account setup link. Change the account status to Active or leave portal access disabled."
                );
                return;
            }
        }

        setSaving(true);

        try {
            if (isEditing) {
                const payload = {
                    ...form,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                };

                // Patient editing must never overwrite the password.
                delete payload.password;
                delete payload.confirm_password;
                delete payload.create_portal_account;

                await updatePatient(patient.id, payload);

                await onSuccess?.();
                onClose?.();
            } else {
                const payload = {
                    ...form,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    create_portal_account: createPortalAccount,
                };

                // No temporary password is collected or sent.
                delete payload.password;
                delete payload.confirm_password;

                const created = await createPatient(payload);

                const portalAccount = created?.portal_account;
                const setupUrl = portalAccount?.setup_url || "";

                setCreatedPatient({
                    patient_id: created.patient_id,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    setupUrl,
                    expires_at: portalAccount?.expires_at || null,
                    portalAccountCreated:
                        portalAccount?.created === true &&
                        Boolean(setupUrl),
                });

                // Keep the success screen open even if the list refresh fails.
                try {
                    await onSuccess?.();
                } catch (refreshError) {
                    console.error(
                        "Patient created, but refreshing the patient list failed:",
                        refreshError
                    );
                }
            }
        } catch (err) {
            console.error("Unable to save patient:", err);
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const getSetupMessage = () => {
        if (!createdPatient) return "";

        const fullName = [
            createdPatient.first_name,
            createdPatient.last_name,
        ]
            .filter(Boolean)
            .join(" ");

        return (
            `Hello${fullName ? ` ${fullName}` : ""},\n\n` +
            "Your AI Dialysis Patient Portal account is ready for password setup.\n\n" +
            `Patient ID: ${createdPatient.patient_id}\n\n` +
            "Please open the secure link below to create your own password:\n" +
            `${createdPatient.setupUrl}\n\n` +
            "This link expires after 24 hours and can only be used once. " +
            "If the link expires before you use it, please contact the clinic for a new one.\n\n" +
            "For your security, do not share your password with anyone.\n\n" +
            "AI Dialysis System\n" +
            "Patient Portal"
        );
    };

    const copyText = async (text, type) => {
        if (!text) return;

        setError("");

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";

                document.body.appendChild(textarea);
                textarea.select();

                const successful = document.execCommand("copy");
                document.body.removeChild(textarea);

                if (!successful) {
                    throw new Error("Copy command was unsuccessful.");
                }
            }

            if (type === "message") {
                setCopiedMessage(true);
                window.setTimeout(() => setCopiedMessage(false), 2500);
            } else {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2500);
            }
        } catch (err) {
            console.error("Unable to copy text:", err);
            setError(
                "Unable to copy automatically. Please select and copy the text manually."
            );
        }
    };

    const handleCopyPatientId = () => {
        if (!createdPatient) return;
        copyText(createdPatient.patient_id, "credentials");
    };

    const handleCopySetupLink = () => {
        if (!createdPatient?.setupUrl) return;
        copyText(createdPatient.setupUrl, "credentials");
    };

    const handleCopyMessage = () => {
        if (!createdPatient?.setupUrl) return;
        copyText(getSetupMessage(), "message");
    };

    // Patient creation success screen.
    if (createdPatient) {
        const hasPortalAccount =
            createdPatient.portalAccountCreated;

        return createPortal(
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                        handleClose();
                    }
                }}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="patient-created-title"
                    className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
                >
                    <div className="bg-slate-800 px-6 py-7 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                            <FaCheckCircle size={32} />
                        </div>

                        <h2
                            id="patient-created-title"
                            className="text-xl font-bold text-white"
                        >
                            Patient Created Successfully
                        </h2>

                        <p className="mt-2 text-sm text-slate-300">
                            {hasPortalAccount
                                ? "The patient profile and Patient Portal account setup have been created."
                                : "The patient profile has been created without Patient Portal access."}
                        </p>
                    </div>

                    <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">
                        <div>
                            <label className={labelClass}>
                                Patient ID
                            </label>

                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-lg font-bold text-slate-800">
                                    {createdPatient.patient_id}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCopyPatientId}
                                    aria-label="Copy Patient ID"
                                    title="Copy Patient ID"
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                                >
                                    {copied ? (
                                        <FaCheckCircle className="text-emerald-600" />
                                    ) : (
                                        <FaCopy />
                                    )}
                                </button>
                            </div>
                        </div>

                        {hasPortalAccount ? (
                            <>
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />

                                        <div>
                                            <h3 className="text-sm font-semibold text-emerald-900">
                                                Portal setup link generated
                                            </h3>

                                            <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                                                The patient will choose their own password. No temporary password has been assigned.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="patient-setup-link"
                                        className={labelClass}
                                    >
                                        Password Setup Link
                                    </label>

                                    <textarea
                                        id="patient-setup-link"
                                        readOnly
                                        rows={3}
                                        value={createdPatient.setupUrl}
                                        className={`${inputClass} resize-y break-all font-mono text-xs`}
                                        onFocus={(event) =>
                                            event.target.select()
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={handleCopySetupLink}
                                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        {copied ? (
                                            <>
                                                <FaCheckCircle className="text-emerald-600" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <FaLink />
                                                Copy Setup Link
                                            </>
                                        )}
                                    </button>
                                </div>

                                {createdPatient.expires_at && (
                                    <p className="text-xs leading-relaxed text-slate-500">
                                        <FaInfoCircle className="mr-1 inline" />
                                        The link expires 24 hours after it was generated. Share it only with the intended patient.
                                    </p>
                                )}

                                <div>
                                    <label
                                        htmlFor="patient-setup-message"
                                        className={labelClass}
                                    >
                                        Ready-to-Send Message
                                    </label>

                                    <textarea
                                        id="patient-setup-message"
                                        readOnly
                                        rows={8}
                                        value={getSetupMessage()}
                                        className={`${inputClass} resize-y text-xs leading-relaxed`}
                                        onFocus={(event) =>
                                            event.target.select()
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={handleCopyMessage}
                                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-500/20"
                                    >
                                        {copiedMessage ? (
                                            <>
                                                <FaCheckCircle />
                                                Message Copied
                                            </>
                                        ) : (
                                            <>
                                                <FaCopy />
                                                Copy Ready-to-Send Message
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
                                    <FaExclamationCircle className="mt-0.5 shrink-0" />

                                    <p>
                                        The message is not sent automatically.
                                        Share the setup link with the correct
                                        patient through an appropriate private
                                        communication channel. Anyone who
                                        obtains an unused link may be able to
                                        set the account password.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                                <FaInfoCircle className="mt-0.5 shrink-0 text-cyan-700" />

                                <p>
                                    The patient profile was saved successfully.
                                    No Patient Portal setup link was generated.
                                    You can enable portal access through the
                                    appropriate account setup process later.
                                </p>
                            </div>
                        )}

                        {error && (
                            <p
                                role="alert"
                                className="whitespace-pre-line text-sm text-rose-600"
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-500/20"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !saving
                ) {
                    handleClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="patient-modal-title"
                className="my-auto flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                            {isEditing ? (
                                <FaUserEdit size={19} />
                            ) : (
                                <FaUserPlus size={19} />
                            )}
                        </div>

                        <div className="min-w-0">
                            <h2
                                id="patient-modal-title"
                                className="text-lg font-bold text-slate-800 sm:text-xl"
                            >
                                {isEditing
                                    ? "Edit Patient"
                                    : "Add New Patient"}
                            </h2>

                            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                {isEditing
                                    ? "Update the patient's information."
                                    : "Register a patient and optionally create their portal account."}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={saving}
                        aria-label="Close modal"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Scrollable form */}
                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                    <div className="overflow-y-auto px-5 py-6 sm:px-7">
                        <ErrorBanner
                            message={error}
                            onDismiss={() => setError("")}
                        />

                        {/* Personal information */}
                        <section>
                            <SectionHeading
                                icon={FaUser}
                                title="Personal Information"
                                description="Enter the patient's basic identification details."
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                    label="First Name"
                                    name="first_name"
                                    value={form.first_name}
                                    onChange={handleChange}
                                    placeholder="Enter first name"
                                    icon={FaUser}
                                    required
                                    disabled={saving}
                                    autoComplete="given-name"
                                />

                                <FormField
                                    label="Last Name"
                                    name="last_name"
                                    value={form.last_name}
                                    onChange={handleChange}
                                    placeholder="Enter last name"
                                    icon={FaUser}
                                    required
                                    disabled={saving}
                                    autoComplete="family-name"
                                />

                                <FormField
                                    label="Middle Name"
                                    name="middle_name"
                                    value={form.middle_name}
                                    onChange={handleChange}
                                    placeholder="Enter middle name"
                                    icon={FaIdCard}
                                    disabled={saving}
                                    autoComplete="additional-name"
                                />

                                <FormField
                                    label="Date of Birth"
                                    name="birth_date"
                                    type="date"
                                    value={form.birth_date}
                                    onChange={handleChange}
                                    icon={FaCalendarAlt}
                                    disabled={saving}
                                />

                                <FormField
                                    label="Gender"
                                    name="gender"
                                    value={form.gender}
                                    onChange={handleChange}
                                    icon={FaVenusMars}
                                    disabled={saving}
                                >
                                    <select
                                        id="gender"
                                        name="gender"
                                        value={form.gender}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={`${inputClass} pl-10`}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </FormField>

                                <FormField
                                    label="Blood Type"
                                    name="blood_type"
                                    value={form.blood_type}
                                    onChange={handleChange}
                                    icon={FaTint}
                                    disabled={saving}
                                >
                                    <select
                                        id="blood_type"
                                        name="blood_type"
                                        value={form.blood_type}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={`${inputClass} pl-10`}
                                    >
                                        {[
                                            "O+",
                                            "O-",
                                            "A+",
                                            "A-",
                                            "B+",
                                            "B-",
                                            "AB+",
                                            "AB-",
                                        ].map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            </div>
                        </section>

                        <div className="my-7 border-t border-slate-100" />

                        {/* Contact information */}
                        <section>
                            <SectionHeading
                                icon={FaPhone}
                                title="Contact Information"
                                description="Provide contact details for communication and emergencies."
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                    label="Contact Number"
                                    name="contact_number"
                                    type="tel"
                                    value={form.contact_number}
                                    onChange={handleChange}
                                    placeholder="Enter contact number"
                                    icon={FaPhone}
                                    disabled={saving}
                                    autoComplete="tel"
                                />

                                <FormField
                                    label="Email Address"
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="patient@example.com"
                                    icon={FaEnvelope}
                                    disabled={saving}
                                    autoComplete="email"
                                    required={
                                        !isEditing && createPortalAccount
                                    }
                                />

                                <FormField
                                    label="Emergency Contact"
                                    name="emergency_contact"
                                    value={form.emergency_contact}
                                    onChange={handleChange}
                                    placeholder="Emergency contact number"
                                    icon={FaUserShield}
                                    disabled={saving}
                                />

                                <FormField
                                    label="Address"
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    placeholder="Enter residential address"
                                    icon={FaMapMarkerAlt}
                                    disabled={saving}
                                    className="sm:col-span-2"
                                    autoComplete="street-address"
                                />
                            </div>
                        </section>

                        <div className="my-7 border-t border-slate-100" />

                        {/* Account settings */}
                        <section>
                            <SectionHeading
                                icon={FaIdCard}
                                title="Account Settings"
                                description="Manage the patient's record status and optional Patient Portal access."
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                    label="Account Status"
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    disabled={saving}
                                >
                                    <select
                                        id="status"
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        disabled={saving}
                                        className={inputClass}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </FormField>

                                {!isEditing && (
                                    <div className="sm:col-span-2">
                                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 transition hover:border-cyan-300">
                                            <input
                                                type="checkbox"
                                                checked={createPortalAccount}
                                                onChange={(event) => {
                                                    setCreatePortalAccount(
                                                        event.target.checked
                                                    );
                                                    setError("");
                                                }}
                                                disabled={saving}
                                                className="mt-1 h-4 w-4 shrink-0 accent-cyan-600"
                                            />

                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-slate-800">
                                                    Create Patient Portal Account
                                                </span>

                                                <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                                                    Allow the patient to sign
                                                    in using their Patient ID.
                                                    A secure setup link will
                                                    let them choose their own
                                                    password.
                                                </span>

                                                <span className="mt-2 block text-xs font-medium text-cyan-800">
                                                    The link expires after 24
                                                    hours and can only be used
                                                    once.
                                                </span>
                                            </span>
                                        </label>

                                        {createPortalAccount && (
                                            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                                                <FaInfoCircle className="mt-0.5 shrink-0" />

                                                <p>
                                                    An email address is
                                                    required. The setup link
                                                    will be shown after
                                                    creation so you can copy
                                                    and share it manually.
                                                    This form does not send
                                                    the message automatically.
                                                </p>
                                            </div>
                                        )}

                                        {!createPortalAccount && (
                                            <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                                Leave unchecked to create
                                                the patient profile without
                                                generating a portal setup link.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={saving}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <FaSpinner className="animate-spin" />
                                    {isEditing
                                        ? "Updating Patient..."
                                        : "Creating Patient..."}
                                </>
                            ) : (
                                <>
                                    {isEditing ? (
                                        <FaUserEdit />
                                    ) : (
                                        <FaUserPlus />
                                    )}

                                    {isEditing
                                        ? "Update Patient"
                                        : "Create Patient"}
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
