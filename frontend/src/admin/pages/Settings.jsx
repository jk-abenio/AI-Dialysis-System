
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import {
    getPatients,
    createPatientPasswordResetLink,
} from "../services/patientService";
import {
    getStaff,
    createStaffAccount,
    createStaffPasswordResetLink,
} from "../services/staffService";
import {
    FaCog,
    FaUserShield,
    FaUserCircle,
    FaBell,
    FaLock,
    FaBrain,
    FaInfoCircle,
    FaEdit,
    FaKey,
    FaCalendarAlt,
    FaTools,
    FaCheckCircle,
    FaExclamationCircle,
    FaTimes,
    FaSave,
    FaSearch,
    FaUsers,
    FaCopy,
    FaLink,
    FaEnvelope,
} from "react-icons/fa";

const getErrorMessage = (error, fallback) => {
    const data = error?.response?.data;

    if (typeof data === "string") return data;
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.message === "string") return data.message;

    if (data && typeof data === "object") {
        const messages = Object.values(data)
            .flatMap((value) => Array.isArray(value) ? value : [value])
            .filter((value) => typeof value === "string");

        if (messages.length) return messages.join(" ");
    }

    return error?.message || fallback;
};

const getResponseList = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.data)) return response.data;
    return [];
};

const getPatientName = (patient) =>
    [
        patient?.first_name,
        patient?.middle_name,
        patient?.last_name,
    ]
        .filter(Boolean)
        .join(" ")
        .trim();

const getStaffName = (staff) =>
    `${staff?.first_name || ""} ${staff?.last_name || ""}`.trim();

const isAlreadyActivatedError = (error) => {
    const message = getErrorMessage(error, "").toLowerCase();

    return (
        message.includes("already been activated") ||
        message.includes("already activated")
    );
};

export default function Settings() {
    // General settings
    const [notifications, setNotifications] = useState({
        appointments: true,
        scheduleChanges: true,
        machineMaintenance: true,
        missedSessions: true,
    });

    const [aiEnabled, setAiEnabled] = useState(true);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("info");

    // Patient account management
    const patientSearchRef = useRef(null);
    const [searchId, setSearchId] = useState("");
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [searching, setSearching] = useState(false);
    const [patientMessage, setPatientMessage] = useState("");
    const [patientMessageType, setPatientMessageType] = useState("info");
    const [patientOptions, setPatientOptions] = useState([]);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [loadingPatientOptions, setLoadingPatientOptions] = useState(false);
    const [generatingResetLink, setGeneratingResetLink] = useState(false);
    const [resetLink, setResetLink] = useState("");
    const [resetEmailBody, setResetEmailBody] = useState("");
    const [resetExpiresAt, setResetExpiresAt] = useState("");
    const [copyingEmail, setCopyingEmail] = useState(false);

    // Staff account management
    const staffSearchRef = useRef(null);
    const [staffSearchQuery, setStaffSearchQuery] = useState("");
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [staffOptions, setStaffOptions] = useState([]);
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);
    const [loadingStaffOptions, setLoadingStaffOptions] = useState(false);
    const [searchingStaff, setSearchingStaff] = useState(false);
    const [generatingStaffLink, setGeneratingStaffLink] = useState(false);
    const [staffSetupLink, setStaffSetupLink] = useState("");
    const [staffLinkType, setStaffLinkType] = useState("");
    const [staffEmailBody, setStaffEmailBody] = useState("");
    const [staffUsername, setStaffUsername] = useState("");
    const [staffMessage, setStaffMessage] = useState("");
    const [staffMessageType, setStaffMessageType] = useState("info");
    const [copyingStaffEmail, setCopyingStaffEmail] = useState(false);

    // Close search dropdowns when clicking outside.
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                patientSearchRef.current &&
                !patientSearchRef.current.contains(event.target)
            ) {
                setShowPatientDropdown(false);
            }

            if (
                staffSearchRef.current &&
                !staffSearchRef.current.contains(event.target)
            ) {
                setShowStaffDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    // General settings handlers
    const showNotice = (text) => {
        setMessage(text);
        setMessageType("info");
    };

    const toggleNotification = (key) => {
        setNotifications((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
        setMessage("");
    };

    const handleSave = () => {
        setMessageType("info");
        setMessage(
            "Notification and AI preferences are currently session-only and are not saved to the database."
        );
    };

    // Patient handlers
    const loadPatientOptions = async () => {
        if (loadingPatientOptions) return patientOptions;

        setLoadingPatientOptions(true);

        try {
            const response = await getPatients();
            const list = getResponseList(response);

            setPatientOptions(list);
            return list;
        } catch (error) {
            setPatientMessage(
                getErrorMessage(
                    error,
                    "Unable to load patients. Please try again."
                )
            );
            setPatientMessageType("error");
            return [];
        } finally {
            setLoadingPatientOptions(false);
        }
    };

    const selectPatient = (patient) => {
        setSelectedPatient(patient);
        setSearchId(getPatientName(patient));
        setShowPatientDropdown(false);

        setResetLink("");
        setResetEmailBody("");
        setResetExpiresAt("");

        setPatientMessage(
            `Selected ${getPatientName(patient) || "patient"}.`
        );
        setPatientMessageType("success");
    };

    const searchPatient = async (event) => {
        event.preventDefault();

        const query = searchId.trim().toLowerCase();

        if (!query) {
            setPatientMessage("Enter a Patient ID or patient name.");
            setPatientMessageType("error");
            setShowPatientDropdown(false);
            return;
        }

        setSearching(true);
        setSelectedPatient(null);
        setResetLink("");
        setResetEmailBody("");
        setResetExpiresAt("");
        setPatientMessage("");

        try {
            let list = patientOptions;

            if (!list.length) {
                list = await loadPatientOptions();
            }

            const matches = list.filter((patient) => {
                const fullName = getPatientName(patient).toLowerCase();
                const patientId = String(
                    patient.patient_id || ""
                ).toLowerCase();

                return (
                    patientId.includes(query) ||
                    fullName.includes(query)
                );
            });

            if (!matches.length) {
                setPatientMessage("No matching patients were found.");
                setPatientMessageType("error");
                setShowPatientDropdown(false);
                return;
            }

            setShowPatientDropdown(true);
            setPatientMessage(
                `${matches.length} matching patient${
                    matches.length === 1 ? "" : "s"
                } found. Select a patient below.`
            );
            setPatientMessageType("success");
        } finally {
            setSearching(false);
        }
    };

    const filteredPatientOptions = patientOptions
        .filter((patient) => {
            const query = searchId.trim().toLowerCase();

            if (!query) return true;

            return (
                String(patient.patient_id || "")
                    .toLowerCase()
                    .includes(query) ||
                getPatientName(patient).toLowerCase().includes(query)
            );
        })
        .slice(0, 8);

    const handleGenerateResetLink = async () => {
        if (!selectedPatient) {
            setPatientMessage("Please select a patient first.");
            setPatientMessageType("error");
            return;
        }

        setGeneratingResetLink(true);
        setPatientMessage("");
        setResetLink("");
        setResetEmailBody("");
        setResetExpiresAt("");

        try {
            const result = await createPatientPasswordResetLink(
                selectedPatient.id
            );

            if (!result?.reset_url) {
                console.error(
                    "Patient password-reset response fields:",
                    result ? Object.keys(result) : []
                );

                throw new Error(
                    "The server did not return a password reset link. Check the backend response."
                );
            }

            const patientName =
                result.patient?.name || getPatientName(selectedPatient);

            const emailBody = [
                `Dear ${patientName || "Patient"},`,
                "",
                "We received a request to help you reset your AI Dialysis System account password.",
                "",
                "To create a new password, please open the secure link below:",
                result.reset_url,
                "",
                "Important security information:",
                "- This link expires 24 hours after it was generated.",
                "- Use the link only for your own account.",
                "- If you did not expect this message, please contact the dialysis clinic.",
                "- Do not share this link with anyone.",
                "",
                "If you have any questions, please contact the clinic.",
                "",
                "Regards,",
                "AI Dialysis System Administration",
            ].join("\n");

            setResetLink(result.reset_url);
            setResetEmailBody(emailBody);
            setResetExpiresAt(result.expires_at || "");

            setPatientMessage(
                "Password reset link generated. Copy the prepared email and send it to the patient manually."
            );
            setPatientMessageType("success");
        } catch (error) {
            setPatientMessage(
                getErrorMessage(
                    error,
                    "Unable to generate the password reset link."
                )
            );
            setPatientMessageType("error");
        } finally {
            setGeneratingResetLink(false);
        }
    };

    const handleCopyResetEmail = async () => {
        if (!resetEmailBody) return;

        setCopyingEmail(true);

        try {
            await navigator.clipboard.writeText(resetEmailBody);
            setPatientMessage(
                "Email message copied. You can now paste it into your email application."
            );
            setPatientMessageType("success");
        } catch {
            setPatientMessage(
                "Unable to copy automatically. Select and copy the email text manually."
            );
            setPatientMessageType("error");
        } finally {
            setCopyingEmail(false);
        }
    };

    // Staff handlers
    const loadStaffOptions = async () => {
        if (loadingStaffOptions) return staffOptions;

        setLoadingStaffOptions(true);

        try {
            const response = await getStaff();
            const list = getResponseList(response);

            setStaffOptions(list);
            return list;
        } catch (error) {
            setStaffMessage(
                getErrorMessage(
                    error,
                    "Unable to load staff members. Please try again."
                )
            );
            setStaffMessageType("error");
            return [];
        } finally {
            setLoadingStaffOptions(false);
        }
    };

    const clearStaffLink = () => {
        setStaffSetupLink("");
        setStaffLinkType("");
        setStaffEmailBody("");
        setStaffUsername("");
    };

    const selectStaff = (staff) => {
        setSelectedStaff(staff);
        setStaffSearchQuery(getStaffName(staff));
        setShowStaffDropdown(false);
        clearStaffLink();

        setStaffMessage(
            `Selected ${getStaffName(staff) || "staff member"}.`
        );
        setStaffMessageType("success");
    };

    const searchStaff = async (event) => {
        event.preventDefault();

        const query = staffSearchQuery.trim().toLowerCase();

        if (!query) {
            setStaffMessage(
                "Enter an employee ID, staff name, or email address."
            );
            setStaffMessageType("error");
            setShowStaffDropdown(false);
            return;
        }

        setSearchingStaff(true);
        setSelectedStaff(null);
        clearStaffLink();
        setStaffMessage("");

        try {
            let list = staffOptions;

            if (!list.length) {
                list = await loadStaffOptions();
            }

            const matches = list.filter((staff) => {
                const fullName = getStaffName(staff).toLowerCase();
                const employeeId = String(
                    staff.employee_id || ""
                ).toLowerCase();
                const email = String(staff.email || "").toLowerCase();

                return (
                    fullName.includes(query) ||
                    employeeId.includes(query) ||
                    email.includes(query)
                );
            });

            if (!matches.length) {
                setStaffMessage("No matching staff members were found.");
                setStaffMessageType("error");
                setShowStaffDropdown(false);
                return;
            }

            setShowStaffDropdown(true);
            setStaffMessage(
                `${matches.length} matching staff member${
                    matches.length === 1 ? "" : "s"
                } found. Select the correct person below.`
            );
            setStaffMessageType("success");
        } finally {
            setSearchingStaff(false);
        }
    };

    const filteredStaffOptions = staffOptions
        .filter((staff) => {
            const query = staffSearchQuery.trim().toLowerCase();

            if (!query) return true;

            return (
                getStaffName(staff).toLowerCase().includes(query) ||
                String(staff.employee_id || "")
                    .toLowerCase()
                    .includes(query) ||
                String(staff.email || "").toLowerCase().includes(query)
            );
        })
        .slice(0, 8);

    const handleGenerateStaffSetupLink = async () => {
        if (!selectedStaff) {
            setStaffMessage("Please select a staff member first.");
            setStaffMessageType("error");
            return;
        }

        if (
            String(selectedStaff.status || "").toLowerCase() !== "active"
        ) {
            setStaffMessage(
                "Only active staff members can receive portal accounts."
            );
            setStaffMessageType("error");
            return;
        }

        setGeneratingStaffLink(true);
        setStaffMessage("");
        clearStaffLink();

        try {
            let result;
            let linkType = "setup";

            /*
             * Try the initial account setup endpoint first.
             * If the account has already been activated, use the reset endpoint.
             */
            try {
                result = await createStaffAccount(selectedStaff.id);
            } catch (error) {
                if (!isAlreadyActivatedError(error)) {
                    throw error;
                }

                result = await createStaffPasswordResetLink(
                    selectedStaff.id
                );
                linkType = "reset";
            }

            // The setup endpoint and reset endpoint return different URL fields.
            const accountLink =
                linkType === "reset"
                    ? result?.reset_url
                    : result?.setup_url;

            if (!accountLink) {
                console.error("Staff account-link response:", {
                    linkType,
                    responseFields: result
                        ? Object.keys(result)
                        : [],
                });

                throw new Error(
                    `The server did not return a password ${
                        linkType === "reset" ? "reset" : "setup"
                    } link. Check the backend response field.`
                );
            }

            const staffName =
                getStaffName(selectedStaff) || "Staff Member";

            const username =
                result.username || selectedStaff.employee_id || "";

            const emailBody =
                linkType === "reset"
                    ? [
                        `Dear ${staffName},`,
                        "",
                        "You can use the secure link below to reset your AI Dialysis System Staff Portal password:",
                        accountLink,
                        "",
                        "Important security information:",
                        "- This link expires 24 hours after it was generated.",
                        "- Keep this link confidential.",
                        "- If you did not request a password reset, contact the system administrator.",
                        "",
                        "Regards,",
                        "AI Dialysis System Administration",
                    ].join("\n")
                    : [
                        `Dear ${staffName},`,
                        "",
                        "Your AI Dialysis System Staff Portal account is ready for password setup.",
                        "",
                        "To create your password, open the secure link below:",
                        accountLink,
                        "",
                        "Your login username:",
                        username,
                        "",
                        "Important security information:",
                        "- This link expires 24 hours after it was generated.",
                        "- Keep this link confidential.",
                        "- If the link expires, contact the system administrator to request a new one.",
                        "",
                        "After setting your password, you can sign in through the Staff Portal.",
                        "",
                        "Regards,",
                        "AI Dialysis System Administration",
                    ].join("\n");

            setStaffSetupLink(accountLink);
            setStaffLinkType(linkType);
            setStaffEmailBody(emailBody);
            setStaffUsername(username);

            setStaffMessage(
                linkType === "reset"
                    ? "Password reset link generated. Copy the prepared email and send it to the staff member manually."
                    : result.message ||
                      "Password setup link generated. Copy the prepared email and send it to the staff member manually."
            );
            setStaffMessageType("success");

            // Refresh the list without clearing the selected staff member.
            try {
                const refreshed = await getStaff();
                setStaffOptions(getResponseList(refreshed));
            } catch (refreshError) {
                console.warn(
                    "The link was generated, but the staff list could not be refreshed.",
                    refreshError
                );
            }
        } catch (error) {
            setStaffMessage(
                getErrorMessage(
                    error,
                    "Unable to generate the staff account link."
                )
            );
            setStaffMessageType("error");
        } finally {
            setGeneratingStaffLink(false);
        }
    };

    const handleCopyStaffEmail = async () => {
        if (!staffEmailBody) return;

        setCopyingStaffEmail(true);

        try {
            await navigator.clipboard.writeText(staffEmailBody);
            setStaffMessage(
                "Staff email copied. You can now paste it into your email application."
            );
            setStaffMessageType("success");
        } catch {
            setStaffMessage(
                "Unable to copy automatically. Select and copy the email text manually."
            );
            setStaffMessageType("error");
        } finally {
            setCopyingStaffEmail(false);
        }
    };

    // Shared UI components
    const Switch = ({ checked, onChange, label }) => (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={onChange}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                checked ? "bg-blue-600" : "bg-gray-300"
            }`}
        >
            <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    checked ? "translate-x-5" : "translate-x-0.5"
                }`}
            />
        </button>
    );

    const SectionTitle = ({ icon: Icon, title, description }) => (
        <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon size={18} />
            </div>
            <div>
                <h2 className="text-base font-bold text-gray-800">
                    {title}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    {description}
                </p>
            </div>
        </div>
    );

    const PreferenceRow = ({
        title,
        description,
        checked,
        onChange,
        label,
    }) => (
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 py-4 first:border-t-0">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-700">
                    {title}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                    {description}
                </p>
            </div>
            <Switch
                checked={checked}
                onChange={onChange}
                label={label || title}
            />
        </div>
    );

    const Feedback = ({ text, type = "info", onDismiss }) => {
        if (!text) return null;

        const styles = {
            info: "border-blue-100 bg-blue-50 text-blue-800",
            success: "border-green-100 bg-green-50 text-green-800",
            error: "border-red-100 bg-red-50 text-red-800",
        };

        return (
            <div
                role={type === "error" ? "alert" : "status"}
                className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                    styles[type] || styles.info
                }`}
            >
                <div className="flex items-start gap-2">
                    {type === "success" ? (
                        <FaCheckCircle className="mt-0.5 shrink-0" />
                    ) : type === "error" ? (
                        <FaExclamationCircle className="mt-0.5 shrink-0" />
                    ) : (
                        <FaInfoCircle className="mt-0.5 shrink-0" />
                    )}
                    <span className="whitespace-pre-line">{text}</span>
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss message"
                    className="rounded p-1 hover:bg-black/5"
                >
                    <FaTimes />
                </button>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-8">
                {/* Page heading */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                            <FaCog className="text-blue-600" />
                            <span>Administration</span>
                            <span>/</span>
                            <span className="font-medium text-blue-600">
                                Settings
                            </span>
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl">
                            System Settings
                        </h1>

                        <p className="mt-1 text-sm text-gray-500">
                            Manage patient and staff accounts, notifications,
                            security, and AI preferences.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        <FaSave />
                        Save Preferences
                    </button>
                </div>

                <Feedback
                    text={message}
                    type={messageType}
                    onDismiss={() => setMessage("")}
                />

                {/* Administrator Account */}
                <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
                        <SectionTitle
                            icon={FaUserShield}
                            title="Administrator Account"
                            description="Overview of the account used to manage the dialysis system."
                        />
                    </div>

                    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <FaUserCircle size={42} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">
                                    Administrator
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Manage system access and account recovery from this page.
                                </p>
                                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                    <FaCheckCircle /> Admin access
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                showNotice(
                                    "Administrator profile editing is not connected yet."
                                )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                            <FaEdit /> Edit Profile
                        </button>
                    </div>
                </section>

                {/* Patient Account Management */}
                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <SectionTitle
                        icon={FaUsers}
                        title="Patient Account Management"
                        description="Find a patient and generate a secure password reset link."
                    />

                    <form
                        onSubmit={searchPatient}
                        className="flex flex-col gap-3 sm:flex-row"
                    >
                        <div ref={patientSearchRef} className="relative flex-1">
                            <FaSearch className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400" />

                            <input
                                value={searchId}
                                onChange={(event) => {
                                    setSearchId(event.target.value);
                                    setShowPatientDropdown(true);
                                    setSelectedPatient(null);
                                    setResetLink("");
                                    setResetEmailBody("");
                                    setResetExpiresAt("");
                                    setPatientMessage("");
                                    setPatientMessageType("info");
                                }}
                                onFocus={() => {
                                    setShowPatientDropdown(true);
                                    if (!patientOptions.length) {
                                        loadPatientOptions();
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                        setShowPatientDropdown(false);
                                    }
                                }}
                                placeholder="Search by Patient ID or patient name"
                                autoComplete="off"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                required
                            />

                            {showPatientDropdown && (
                                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Matching Patients
                                        </p>
                                    </div>

                                    {loadingPatientOptions ? (
                                        <div className="px-4 py-5 text-center text-sm text-gray-500">
                                            Loading patients...
                                        </div>
                                    ) : filteredPatientOptions.length > 0 ? (
                                        <div className="max-h-72 overflow-y-auto">
                                            {filteredPatientOptions.map((patient) => (
                                                <button
                                                    key={patient.id}
                                                    type="button"
                                                    onClick={() => selectPatient(patient)}
                                                    className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-blue-50"
                                                >
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                        <FaUserCircle size={24} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-gray-800">
                                                            {getPatientName(patient)}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Patient ID:{" "}
                                                            <span className="font-semibold text-blue-700">
                                                                {patient.patient_id}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <FaEdit className="shrink-0 text-gray-400" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-5 text-center text-sm text-gray-500">
                                            No matching patients found.
                                        </div>
                                    )}

                                    {filteredPatientOptions.length > 0 && (
                                        <div className="border-t border-gray-100 px-4 py-2">
                                            <p className="text-xs text-gray-400">
                                                Showing up to 8 matches. Type more to narrow your search.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={searching || loadingPatientOptions}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                            <FaSearch />
                            {searching ? "Searching..." : "Search Patient"}
                        </button>
                    </form>

                    <div className="mt-4">
                        <Feedback
                            text={patientMessage}
                            type={patientMessageType}
                            onDismiss={() => setPatientMessage("")}
                        />
                    </div>

                    {selectedPatient && (
                        <div className="mt-5 space-y-5">
                            <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                                    <FaUserCircle size={30} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-800">
                                        {getPatientName(selectedPatient)}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Patient ID: {selectedPatient.patient_id}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        The patient will set their own password using a secure link.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-blue-100 bg-white p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <FaLink size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800">
                                            Password Reset Link
                                        </h3>
                                        <p className="mt-1 text-sm leading-6 text-gray-500">
                                            Generate a secure link that expires after 24 hours.
                                            The patient will use it to create a new password.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGenerateResetLink}
                                    disabled={generatingResetLink}
                                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                    <FaLink />
                                    {generatingResetLink
                                        ? "Generating Link..."
                                        : "Generate Password Reset Link"}
                                </button>

                                {resetLink && (
                                    <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                            <p className="text-sm font-semibold text-amber-800">
                                                Security reminder
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                                Treat this link as a secret. Anyone who has the link may be able to reset the patient's password before it expires.
                                            </p>
                                            {resetExpiresAt && (
                                                <p className="mt-2 text-xs text-amber-800">
                                                    Expires:{" "}
                                                    {new Date(resetExpiresAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                Generated Reset Link
                                            </label>
                                            <textarea
                                                readOnly
                                                value={resetLink}
                                                rows={3}
                                                className="w-full break-all rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                <FaEnvelope className="text-blue-600" />
                                                Prepared Email Message
                                            </label>
                                            <textarea
                                                readOnly
                                                value={resetEmailBody}
                                                rows={12}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 outline-none focus:border-blue-500"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleCopyResetEmail}
                                            disabled={copyingEmail}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 sm:w-auto"
                                        >
                                            <FaCopy />
                                            {copyingEmail
                                                ? "Copying..."
                                                : "Copy Email Message"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedPatient(null);
                                    setSearchId("");
                                    setResetLink("");
                                    setResetEmailBody("");
                                    setResetExpiresAt("");
                                    setPatientMessage("");
                                    setShowPatientDropdown(false);
                                }}
                                disabled={generatingResetLink}
                                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                            >
                                Clear Selection
                            </button>
                        </div>
                    )}
                </section>

                {/* Staff Account Management */}
                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <SectionTitle
                        icon={FaUsers}
                        title="Staff Account Management"
                        description="Generate an initial password setup link or a password-reset link for staff members."
                    />

                    <form
                        onSubmit={searchStaff}
                        className="flex flex-col gap-3 sm:flex-row"
                    >
                        <div ref={staffSearchRef} className="relative flex-1">
                            <FaSearch className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400" />

                            <input
                                value={staffSearchQuery}
                                onChange={(event) => {
                                    setStaffSearchQuery(event.target.value);
                                    setSelectedStaff(null);
                                    clearStaffLink();
                                    setStaffMessage("");
                                    setStaffMessageType("info");
                                    setShowStaffDropdown(true);
                                }}
                                onFocus={() => {
                                    setShowStaffDropdown(true);
                                    if (!staffOptions.length) {
                                        loadStaffOptions();
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                        setShowStaffDropdown(false);
                                    }
                                }}
                                placeholder="Search by employee ID, staff name, or email"
                                autoComplete="off"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                required
                            />

                            {showStaffDropdown && (
                                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Matching Staff Members
                                        </p>
                                    </div>

                                    {loadingStaffOptions ? (
                                        <div className="px-4 py-5 text-center text-sm text-gray-500">
                                            Loading staff members...
                                        </div>
                                    ) : filteredStaffOptions.length > 0 ? (
                                        <div className="max-h-72 overflow-y-auto">
                                            {filteredStaffOptions.map((staff) => (
                                                <button
                                                    key={staff.id}
                                                    type="button"
                                                    onClick={() => selectStaff(staff)}
                                                    className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-blue-50"
                                                >
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                        <FaUserCircle size={24} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-gray-800">
                                                            {getStaffName(staff)}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Employee ID:{" "}
                                                            <span className="font-semibold text-blue-700">
                                                                {staff.employee_id}
                                                            </span>
                                                        </p>
                                                        <p className="mt-1 truncate text-xs text-gray-500">
                                                            {staff.email}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Role: {staff.role} · Status: {staff.status}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-5 text-center text-sm text-gray-500">
                                            No matching staff members found.
                                        </div>
                                    )}

                                    {filteredStaffOptions.length > 0 && (
                                        <div className="border-t border-gray-100 px-4 py-2">
                                            <p className="text-xs text-gray-400">
                                                Showing up to 8 matches. Type more to narrow your search.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={searchingStaff || loadingStaffOptions}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                            <FaSearch />
                            {searchingStaff ? "Searching..." : "Search Staff"}
                        </button>
                    </form>

                    <div className="mt-4">
                        <Feedback
                            text={staffMessage}
                            type={staffMessageType}
                            onDismiss={() => setStaffMessage("")}
                        />
                    </div>

                    {selectedStaff && (
                        <div className="mt-5 space-y-5">
                            <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                                    <FaUserCircle size={30} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-gray-800">
                                        {getStaffName(selectedStaff)}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Employee ID: {selectedStaff.employee_id}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {selectedStaff.email}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {selectedStaff.role} · {selectedStaff.status}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-blue-100 bg-white p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <FaLink size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800">
                                            Staff Account Password Link
                                        </h3>
                                        <p className="mt-1 text-sm leading-6 text-gray-500">
                                            Generate an initial setup link for a new account. If the staff account has already been activated, a password-reset link will be generated instead.
                                        </p>
                                    </div>
                                </div>

                                {String(selectedStaff.status || "").toLowerCase() !== "active" && (
                                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                        This staff member is not active. Only active staff members can receive portal account links.
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleGenerateStaffSetupLink}
                                    disabled={
                                        generatingStaffLink ||
                                        String(selectedStaff.status || "").toLowerCase() !== "active"
                                    }
                                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                    <FaLink />
                                    {generatingStaffLink
                                        ? "Generating Link..."
                                        : "Generate Account Link"}
                                </button>

                                {staffSetupLink && (
                                    <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                            <p className="text-sm font-semibold text-amber-800">
                                                Security reminder
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                                Keep this link confidential. It expires after 24 hours. A setup link is intended for initial password creation; a reset link is intended for an activated account.
                                            </p>
                                        </div>

                                        {staffLinkType === "setup" && (
                                            <div>
                                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                    Login Username
                                                </label>
                                                <input
                                                    readOnly
                                                    value={staffUsername}
                                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                Generated {staffLinkType === "reset" ? "Password Reset Link" : "Password Setup Link"}
                                            </label>
                                            <textarea
                                                readOnly
                                                value={staffSetupLink}
                                                rows={3}
                                                className="w-full break-all rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                <FaEnvelope className="text-blue-600" />
                                                Prepared Email Message
                                            </label>
                                            <textarea
                                                readOnly
                                                value={staffEmailBody}
                                                rows={13}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 outline-none focus:border-blue-500"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleCopyStaffEmail}
                                            disabled={copyingStaffEmail}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 sm:w-auto"
                                        >
                                            <FaCopy />
                                            {copyingStaffEmail
                                                ? "Copying..."
                                                : "Copy Email Message"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStaff(null);
                                    setStaffSearchQuery("");
                                    clearStaffLink();
                                    setStaffMessage("");
                                    setShowStaffDropdown(false);
                                }}
                                disabled={generatingStaffLink}
                                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                            >
                                Clear Selection
                            </button>
                        </div>
                    )}
                </section>

                {/* Notification Preferences */}
                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <SectionTitle
                        icon={FaBell}
                        title="Notification Preferences"
                        description="Choose which events you want the system to notify you about."
                    />

                    <div className="sm:pl-1">
                        <PreferenceRow
                            title="Appointment Notifications"
                            description="Receive notifications about new dialysis appointments."
                            checked={notifications.appointments}
                            onChange={() => toggleNotification("appointments")}
                        />
                        <PreferenceRow
                            title="Schedule Changes"
                            description="Receive notifications when dialysis schedules are changed."
                            checked={notifications.scheduleChanges}
                            onChange={() => toggleNotification("scheduleChanges")}
                        />
                        <PreferenceRow
                            title="Machine Maintenance"
                            description="Receive alerts about machines requiring maintenance."
                            checked={notifications.machineMaintenance}
                            onChange={() => toggleNotification("machineMaintenance")}
                        />
                        <PreferenceRow
                            title="Missed Dialysis Sessions"
                            description="Highlight sessions marked as missed."
                            checked={notifications.missedSessions}
                            onChange={() => toggleNotification("missedSessions")}
                        />
                    </div>
                </section>

                {/* Security */}
                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <SectionTitle
                        icon={FaLock}
                        title="Security"
                        description="Account protection and password management."
                    />

                    <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-gray-500">
                                <FaKey size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">
                                    Account Password
                                </p>
                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                    Change your password to help keep your administrator account secure.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                showNotice(
                                    "Administrator password changes are not connected yet."
                                )
                            }
                            className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                        >
                            Change Password
                        </button>
                    </div>

                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                        <FaExclamationCircle className="mt-0.5 shrink-0 text-amber-600" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">
                                Security reminder
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                Do not share your password. Always log out when using a shared or public computer.
                            </p>
                        </div>
                    </div>
                </section>

                {/* AI Preferences */}
                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <SectionTitle
                        icon={FaBrain}
                        title="AI System Preferences"
                        description="Review the AI-assisted features used by the dialysis management system."
                    />

                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                                    <FaBrain size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">
                                        Rule-Based AI Recommendations
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-gray-600">
                                        Display preference for AI-assisted analysis and recommendations.
                                    </p>
                                </div>
                            </div>

                            <Switch
                                checked={aiEnabled}
                                onChange={() => {
                                    setAiEnabled((previous) => !previous);
                                    setMessage("");
                                }}
                                label="AI recommendations preference"
                            />
                        </div>

                        <div className="mt-4 flex items-start gap-2 rounded-lg bg-white p-3 text-xs leading-5 text-gray-600">
                            <FaInfoCircle className="mt-0.5 shrink-0 text-blue-600" />
                            AI recommendations should support qualified staff, not replace clinical judgment. This switch is currently a design preference and does not control the backend AI engine.
                        </div>
                    </div>
                </section>

                {/* System Information */}
                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                    <SectionTitle
                        icon={FaInfoCircle}
                        title="System Information"
                        description="Basic information about the application."
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-100 p-4">
                            <div className="flex items-center gap-2 text-gray-500">
                                <FaCog />
                                <span className="text-xs font-medium uppercase tracking-wide">
                                    Application
                                </span>
                            </div>
                            <p className="mt-2 font-bold text-gray-800">
                                AI Dialysis System
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Dialysis management and decision support
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 p-4">
                            <div className="flex items-center gap-2 text-gray-500">
                                <FaCalendarAlt />
                                <span className="text-xs font-medium uppercase tracking-wide">
                                    Version
                                </span>
                            </div>
                            <p className="mt-2 font-bold text-gray-800">
                                Initial Release
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Replace with the actual release version later.
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 p-4 sm:col-span-2">
                            <div className="flex items-center gap-2 text-gray-500">
                                <FaTools />
                                <span className="text-xs font-medium uppercase tracking-wide">
                                    Current Scope
                                </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                Patient management, dialysis schedules, staff management, machine management, and rule-based AI-assisted analysis.
                            </p>
                        </div>
                    </div>
                </section>

                <p className="text-center text-xs text-gray-400">
                    AI Dialysis System · Administrator Settings
                </p>
            </div>
        </DashboardLayout>
    );
}
