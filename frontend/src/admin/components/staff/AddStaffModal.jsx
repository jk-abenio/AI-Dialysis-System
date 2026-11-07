
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {
    createStaff,
    updateStaff,
} from "../../services/staffService";
import {
    FaTimes,
    FaUserPlus,
    FaSave,
    FaCopy,
    FaCheckCircle,
    FaKey,
    FaExternalLinkAlt,
} from "react-icons/fa";

const initialForm = {
    employee_id: "",
    first_name: "",
    last_name: "",
    role: "Dialysis Nurse",
    contact_number: "",
    email: "",
    status: "Active",
};

export default function AddStaffModal({
    open,
    onClose,
    onSuccess,
    staff,
}) {
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [createPortalAccount, setCreatePortalAccount] = useState(false);
    const [accountResult, setAccountResult] = useState(null);
    const [copied, setCopied] = useState("");

    useEffect(() => {
        if (staff && open) {
            setForm({
                employee_id: staff.employee_id ?? "",
                first_name: staff.first_name ?? "",
                last_name: staff.last_name ?? "",
                role: staff.role || "Dialysis Nurse",
                contact_number: staff.contact_number ?? "",
                email: staff.email ?? "",
                status: staff.status || "Active",
            });
        } else if (open) {
            setForm({ ...initialForm });
        }

        setError("");
        setSaving(false);
        setCreatePortalAccount(false);
        setAccountResult(null);
        setCopied("");
    }, [staff, open]);

    if (!open) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (error) setError("");
    };

    const handleClose = () => {
        if (saving) return;

        setAccountResult(null);
        setCopied("");
        onClose();
    };

    const copyText = async (value, type) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(type);
        } catch (err) {
            console.error("Clipboard copy failed:", err);
            setError(
                "Unable to copy automatically. Please select and copy the text manually."
            );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (saving) return;

        const cleanedForm = {
            ...form,
            employee_id: form.employee_id.trim(),
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            contact_number: form.contact_number.trim(),
            email: form.email.trim(),
        };

        if (
            !cleanedForm.employee_id ||
            !cleanedForm.first_name ||
            !cleanedForm.last_name ||
            !cleanedForm.role ||
            !cleanedForm.contact_number
        ) {
            setError("Please fill in all required fields.");
            return;
        }

        if (
            cleanedForm.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedForm.email)
        ) {
            setError("Please enter a valid email address.");
            return;
        }

        if (createPortalAccount && !cleanedForm.email) {
            setError(
                "An email address is required when creating a Staff Portal account."
            );
            return;
        }

        if (createPortalAccount && cleanedForm.status !== "Active") {
            setError(
                "Only active staff members can receive a Staff Portal account."
            );
            return;
        }

        setSaving(true);
        setError("");
        setCopied("");

        try {
            if (staff) {
                await updateStaff(staff.id, cleanedForm);
                await onSuccess?.();
                onClose();
                return;
            }

            const payload = {
                ...cleanedForm,
                create_portal_account: createPortalAccount,
            };

            const result = await createStaff(payload);

            await onSuccess?.();

            const portal = result?.portal_account;
            const setupUrl =
                portal?.setup_url ||
                result?.setup_url ||
                result?.setup_link ||
                result?.setup_password_url;

            const username =
                portal?.username ||
                result?.username ||
                cleanedForm.employee_id;

            if (createPortalAccount && setupUrl) {
                setAccountResult({
                    name: `${cleanedForm.first_name} ${cleanedForm.last_name}`,
                    username,
                    setupUrl,
                    email: cleanedForm.email,
                });
                return;
            }

            if (createPortalAccount && !setupUrl) {
                setError(
                    "The staff member was created, but the server did not return a setup link. Check the backend response before creating another staff record."
                );
                return;
            }

            onClose();
        } catch (err) {
            console.error("Failed to save staff:", err);

            const data = err?.response?.data;
            const detail =
                typeof data === "string"
                    ? data
                    : data?.detail ||
                      data?.message ||
                      data?.error ||
                      (data && typeof data === "object"
                          ? Object.entries(data)
                                .map(([key, value]) => {
                                    const message = Array.isArray(value)
                                        ? value.join(" ")
                                        : typeof value === "string"
                                          ? value
                                          : JSON.stringify(value);

                                    return `${key}: ${message}`;
                                })
                                .join(" ")
                          : "");

            setError(
                detail ||
                    "Unable to save staff. Please check your information and try again."
            );
        } finally {
            setSaving(false);
        }
    };

    const setupMessage = accountResult
        ? [
              `Hello ${accountResult.name},`,
              "",
              "Your Staff Portal account has been created.",
              `Username: ${accountResult.username}`,
              "",
              "Please use the following link to set your password:",
              accountResult.setupUrl,
              "",
              "This link expires in 24 hours and can only be used once.",
              "If the link has expired, please contact the administrator for a new one.",
          ].join("\n")
        : "";

    const inputClass =
        "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100";

    const labelClass =
        "mb-1.5 block text-sm font-medium text-gray-700";

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !saving) {
                    handleClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="staff-modal-title"
                className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                            {accountResult ? (
                                <FaCheckCircle className="text-lg" />
                            ) : staff ? (
                                <FaSave className="text-lg" />
                            ) : (
                                <FaUserPlus className="text-lg" />
                            )}
                        </div>

                        <div>
                            <h2
                                id="staff-modal-title"
                                className="text-xl font-bold text-gray-800"
                            >
                                {accountResult
                                    ? "Staff Account Created"
                                    : staff
                                      ? "Edit Staff"
                                      : "Add Staff"}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                {accountResult
                                    ? "Copy the setup details and share them with the staff member."
                                    : staff
                                      ? "Update the staff member's information."
                                      : "Enter the details of the new staff member."}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={saving}
                        aria-label="Close modal"
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed"
                    >
                        <FaTimes />
                    </button>
                </div>

                {accountResult ? (
                    <div className="space-y-5 px-6 py-6 sm:px-8">
                        <div className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                            <FaCheckCircle className="mt-0.5 shrink-0 text-green-600" />
                            <div>
                                <p className="font-semibold text-green-800">
                                    Staff profile and portal account created
                                </p>
                                <p className="mt-1 text-sm text-green-700">
                                    The staff member must set their own password
                                    before signing in. The link expires in 24 hours.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Staff Member</label>
                            <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800">
                                {accountResult.name}
                            </p>
                        </div>

                        <div>
                            <label className={labelClass}>Login Username</label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={accountResult.username}
                                    className={inputClass}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        copyText(accountResult.username, "username")
                                    }
                                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    {copied === "username" ? (
                                        <FaCheckCircle className="text-green-600" />
                                    ) : (
                                        <FaCopy />
                                    )}
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>
                                Password Setup Link
                            </label>
                            <textarea
                                readOnly
                                rows={3}
                                value={accountResult.setupUrl}
                                className={`${inputClass} resize-y break-all`}
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        copyText(accountResult.setupUrl, "link")
                                    }
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                                >
                                    {copied === "link" ? (
                                        <FaCheckCircle />
                                    ) : (
                                        <FaCopy />
                                    )}
                                    {copied === "link" ? "Link Copied" : "Copy Setup Link"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        copyText(setupMessage, "message")
                                    }
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    {copied === "message" ? (
                                        <FaCheckCircle className="text-green-600" />
                                    ) : (
                                        <FaCopy />
                                    )}
                                    {copied === "message"
                                        ? "Message Copied"
                                        : "Copy Full Message"}
                                </button>

                                <a
                                    href={accountResult.setupUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    <FaExternalLinkAlt />
                                    Open Link
                                </a>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>
                                Ready-to-send Message
                            </label>
                            <textarea
                                readOnly
                                rows={7}
                                value={setupMessage}
                                className={`${inputClass} resize-y`}
                            />
                        </div>

                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            <FaKey className="mt-0.5 shrink-0" />
                            <p>
                                Share this setup link securely with the intended
                                staff member. Anyone with the unused link may be
                                able to set the account password.
                            </p>
                        </div>

                        <div className="flex justify-end border-t border-gray-100 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6 sm:px-8">
                            {error && (
                                <div
                                    role="alert"
                                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                                >
                                    {error}
                                </div>
                            )}

                            <div>
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                                    Personal Information
                                </h3>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="employee_id" className={labelClass}>
                                            Employee ID <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="employee_id"
                                            name="employee_id"
                                            placeholder="e.g. EMP-001"
                                            value={form.employee_id}
                                            onChange={handleChange}
                                            className={inputClass}
                                            required
                                            disabled={saving}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="role" className={labelClass}>
                                            Staff Role <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="role"
                                            name="role"
                                            value={form.role}
                                            onChange={handleChange}
                                            className={inputClass}
                                            required
                                            disabled={saving}
                                        >
                                            <option>Dialysis Nurse</option>
                                            <option>Head Nurse</option>
                                            <option>Technician</option>
                                            <option>Doctor</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="first_name" className={labelClass}>
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="first_name"
                                            name="first_name"
                                            placeholder="Enter first name"
                                            value={form.first_name}
                                            onChange={handleChange}
                                            className={inputClass}
                                            autoComplete="given-name"
                                            required
                                            disabled={saving}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="last_name" className={labelClass}>
                                            Last Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="last_name"
                                            name="last_name"
                                            placeholder="Enter last name"
                                            value={form.last_name}
                                            onChange={handleChange}
                                            className={inputClass}
                                            autoComplete="family-name"
                                            required
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-5">
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                                    Contact Information
                                </h3>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="contact_number" className={labelClass}>
                                            Contact Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="contact_number"
                                            name="contact_number"
                                            type="tel"
                                            placeholder="Enter contact number"
                                            value={form.contact_number}
                                            onChange={handleChange}
                                            className={inputClass}
                                            autoComplete="tel"
                                            required
                                            disabled={saving}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="email" className={labelClass}>
                                            Email Address
                                            {createPortalAccount && (
                                                <span className="text-red-500"> *</span>
                                            )}
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            value={form.email}
                                            onChange={handleChange}
                                            className={inputClass}
                                            autoComplete="email"
                                            required={createPortalAccount}
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-5">
                                <label htmlFor="status" className={labelClass}>
                                    Employment Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className={inputClass}
                                    required
                                    disabled={saving}
                                >
                                    <option>Active</option>
                                    <option>On Leave</option>
                                    <option>Inactive</option>
                                </select>
                                <p className="mt-1.5 text-xs text-gray-500">
                                    Only active staff can receive a portal account.
                                </p>
                            </div>

                            {!staff && (
                                <div className="border-t border-gray-100 pt-5">
                                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                                        <input
                                            type="checkbox"
                                            checked={createPortalAccount}
                                            onChange={(e) => {
                                                setCreatePortalAccount(e.target.checked);
                                                setError("");
                                            }}
                                            disabled={saving}
                                            className="mt-1 h-4 w-4 accent-blue-600"
                                        />
                                        <span>
                                            <span className="block font-semibold text-gray-800">
                                                Create Staff Portal Account
                                            </span>
                                            <span className="mt-1 block text-sm leading-5 text-gray-600">
                                                Create a login using the employee ID
                                                as the username and generate a secure
                                                password setup link that expires after
                                                24 hours.
                                            </span>
                                        </span>
                                    </label>

                                    {createPortalAccount && (
                                        <p className="mt-2 text-xs text-blue-700">
                                            The staff member will set their own password.
                                            No password will be sent or assigned by the admin.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={saving}
                                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FaSave />
                                        {staff ? "Update Staff" : "Save Staff"}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
