
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaEnvelope,
    FaInbox,
    FaPaperPlane,
    FaPen,
    FaSearch,
    FaSyncAlt,
    FaTimes,
    FaArrowLeft,
    FaExclamationCircle,
    FaCheckCircle,
    FaExternalLinkAlt,
} from "react-icons/fa";

import DashboardLayout from "../layouts/DashboardLayout";
import ComposeEmailModal from "../components/email/ComposeEmailModal";
import AppointmentEmailReminders from "../components/email/AppointmentEmailReminders";
import api from "../services/api";
import { getPatients } from "../services/patientService";

const EMPTY_COMPOSE = {
    to: "",
    cc: "",
    subject: "",
    body: "",
};

const DEFAULT_EMAIL_SIGNATURE = `Best regards,
AI Dialysis System Team

---
This email was sent from the AI Dialysis Scheduling & Monitoring System.`;

const DEFAULT_EMAIL_BODY = `Good day,



${DEFAULT_EMAIL_SIGNATURE}`;

const SIGNATURE_MARKER =
    "This email was sent from the AI Dialysis Scheduling & Monitoring System.";

function getErrorMessage(error) {
    const data = error?.response?.data;

    if (typeof data === "string") return data;
    if (data?.detail) return data.detail;
    if (data?.error) return data.error;
    if (data?.message) return data.message;

    if (error?.response?.status === 401) {
        return "Your admin session may have expired. Please log in again.";
    }

    if (!error?.response) {
        return "Cannot reach the Django server. Check that the backend is running.";
    }

    return "Something went wrong. Please try again.";
}

function isValidEmailAddress(email = "") {
    return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(
        String(email).trim()
    );
}

function normalizeEmail(email = {}) {
    const headers = email.headers || {};

    const getHeader = (name) =>
        headers[name] || headers[name.toLowerCase()] || "";

    return {
        id: email.id || email.message_id || email.gmail_id,
        threadId: email.threadId || email.thread_id,
        from: email.from || email.sender || getHeader("From") || "",
        to: email.to || getHeader("To") || "",
        cc: email.cc || getHeader("Cc") || "",
        subject:
            email.subject ||
            getHeader("Subject") ||
            "(No subject)",
        body:
            email.body ||
            email.text ||
            email.snippet ||
            email.body_text ||
            "",
        snippet: email.snippet || "",
        date:
            email.date ||
            email.internalDate ||
            email.received_at ||
            email.sent_at ||
            "",
        unread: email.unread ?? email.is_unread ?? false,
    };
}

function normalizeEmailList(data) {
    const list = Array.isArray(data)
        ? data
        : data?.messages ||
          data?.emails ||
          data?.results ||
          [];

    return list.map(normalizeEmail);
}

function normalizePatientList(data) {
    const list = Array.isArray(data)
        ? data
        : data?.results ||
          data?.patients ||
          data?.data ||
          [];

    return list
        .map((patient) => {
            const firstName =
                patient.first_name ||
                patient.firstName ||
                patient.user?.first_name ||
                "";

            const lastName =
                patient.last_name ||
                patient.lastName ||
                patient.user?.last_name ||
                "";

            const id =
                patient.id ??
                patient.patient_id ??
                patient.patientId;

            const fullName =
                patient.full_name ||
                patient.fullName ||
                `${firstName} ${lastName}`.trim() ||
                patient.name ||
                patient.user?.username ||
                patient.patient_id ||
                "Unnamed patient";

            return {
                id,
                name: fullName,
                email: (
                    patient.email ||
                    patient.email_address ||
                    patient.user?.email ||
                    ""
                ).trim(),
                patientId:
                    patient.patient_id ||
                    patient.patientId ||
                    id,
            };
        })
        .filter((patient) => patient.id != null);
}

/**
 * Normalizes staff API records.
 * Supports common Django model and nested-user response shapes.
 */
function normalizeStaffList(data) {
    const list = Array.isArray(data)
        ? data
        : data?.results ||
          data?.staff ||
          data?.data ||
          [];

    return list
        .map((staff) => {
            const firstName =
                staff.first_name ||
                staff.firstName ||
                staff.user?.first_name ||
                "";

            const lastName =
                staff.last_name ||
                staff.lastName ||
                staff.user?.last_name ||
                "";

            const id =
                staff.id ??
                staff.staff_id ??
                staff.staffId;

            const fullName =
                staff.full_name ||
                staff.fullName ||
                staff.name ||
                staff.staff_name ||
                staff.staffName ||
                `${firstName} ${lastName}`.trim() ||
                staff.user?.username ||
                staff.employee_id ||
                staff.employeeId ||
                "Unnamed staff member";

            return {
                id,
                name: fullName,
                email: (
                    staff.email ||
                    staff.email_address ||
                    staff.user?.email ||
                    ""
                ).trim(),
                employeeId:
                    staff.employee_id ||
                    staff.employeeId ||
                    staff.staff_id ||
                    id,
            };
        })
        .filter((staff) => staff.id != null);
}

function formatEmailDate(value) {
    if (!value) return "";

    const date = /^\d+$/.test(String(value))
        ? new Date(Number(value))
        : new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function buildFinalEmailBody(body) {
    const trimmedBody = body.trim();

    if (trimmedBody.includes(SIGNATURE_MARKER)) {
        return trimmedBody;
    }

    return `${trimmedBody}\n\n${DEFAULT_EMAIL_SIGNATURE}`;
}

function hasActualMessage(body) {
    const withoutSignature = body
        .replace(DEFAULT_EMAIL_SIGNATURE, "")
        .replace(/^Good day,\s*/i, "")
        .trim();

    return withoutSignature.length > 0;
}

export default function EmailCenter() {
    // Recipient records
    const [patients, setPatients] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);

    // Compose modal
    const [showCompose, setShowCompose] = useState(false);
    const [compose, setCompose] = useState(EMPTY_COMPOSE);

    // Patient selection
    const [selectedPatientIds, setSelectedPatientIds] = useState([]);
    const [patientSearch, setPatientSearch] = useState("");

    // Staff selection
    const [selectedStaffIds, setSelectedStaffIds] = useState([]);
    const [staffSearch, setStaffSearch] = useState("");

    // Inbox and sent messages
    const [activeTab, setActiveTab] = useState("inbox");
    const [search, setSearch] = useState("");
    const [selectedEmail, setSelectedEmail] = useState(null);

    const [emails, setEmails] = useState({
        inbox: [],
        sent: [],
    });

    // Loading and connection states
    const [connectionState, setConnectionState] = useState("checking");
    const [loading, setLoading] = useState(false);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [sending, setSending] = useState(false);
    const [openingMessage, setOpeningMessage] = useState(false);

    // Feedback
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [sendResults, setSendResults] = useState(null);

    // --------------------------------------------------
    // Load patients
    // --------------------------------------------------

    const loadPatients = useCallback(async () => {
        setLoadingPatients(true);

        try {
            const response = await getPatients();
            setPatients(normalizePatientList(response));
        } catch (error) {
            setErrorMessage(
                `Could not load patients. ${getErrorMessage(error)}`
            );
        } finally {
            setLoadingPatients(false);
        }
    }, []);

    // --------------------------------------------------
    // Load staff
    // --------------------------------------------------

    const loadStaff = useCallback(async () => {
        setLoadingStaff(true);

        try {
            const response = await api.get("staff/");
            setStaffMembers(normalizeStaffList(response.data));
        } catch (error) {
            setErrorMessage(
                `Could not load staff. ${getErrorMessage(error)}`
            );
        } finally {
            setLoadingStaff(false);
        }
    }, []);

    // --------------------------------------------------
    // Load Gmail messages
    // --------------------------------------------------

    const loadEmails = useCallback(async (folder = "inbox") => {
        setLoading(true);
        setErrorMessage("");

        try {
            const endpoint =
                folder === "sent"
                    ? "email/sent/"
                    : "email/inbox/";

            const response = await api.get(endpoint);
            const messages = normalizeEmailList(response.data);

            setEmails((previous) => ({
                ...previous,
                [folder]: messages,
            }));

            window.dispatchEvent(
                new Event("email-read-status-changed")
            );

            setConnectionState("connected");
        } catch (error) {
            setConnectionState("disconnected");
            setErrorMessage(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEmails("inbox");
        loadPatients();
        loadStaff();
    }, [loadEmails, loadPatients, loadStaff]);

    // --------------------------------------------------
    // Filter selectable patients
    // --------------------------------------------------

    const selectablePatients = useMemo(() => {
        const query = patientSearch.trim().toLowerCase();

        return patients.filter((patient) => {
            if (!isValidEmailAddress(patient.email)) return false;

            if (!query) return true;

            return [
                patient.name,
                patient.email,
                patient.patientId,
            ].some((value) =>
                String(value ?? "").toLowerCase().includes(query)
            );
        });
    }, [patients, patientSearch]);

    const selectedPatients = useMemo(
        () =>
            patients.filter(
                (patient) =>
                    selectedPatientIds.includes(patient.id) &&
                    isValidEmailAddress(patient.email)
            ),
        [patients, selectedPatientIds]
    );

    const allVisibleSelected = useMemo(
        () =>
            selectablePatients.length > 0 &&
            selectablePatients.every((patient) =>
                selectedPatientIds.includes(patient.id)
            ),
        [selectablePatients, selectedPatientIds]
    );

    // --------------------------------------------------
    // Filter selectable staff
    // --------------------------------------------------

    const selectableStaff = useMemo(() => {
        const query = staffSearch.trim().toLowerCase();

        return staffMembers.filter((staff) => {
            if (!isValidEmailAddress(staff.email)) return false;

            if (!query) return true;

            return [
                staff.name,
                staff.email,
                staff.employeeId,
            ].some((value) =>
                String(value ?? "").toLowerCase().includes(query)
            );
        });
    }, [staffMembers, staffSearch]);

    const selectedStaff = useMemo(
        () =>
            staffMembers.filter(
                (staff) =>
                    selectedStaffIds.includes(staff.id) &&
                    isValidEmailAddress(staff.email)
            ),
        [staffMembers, selectedStaffIds]
    );

    const allVisibleStaffSelected = useMemo(
        () =>
            selectableStaff.length > 0 &&
            selectableStaff.every((staff) =>
                selectedStaffIds.includes(staff.id)
            ),
        [selectableStaff, selectedStaffIds]
    );

    // --------------------------------------------------
    // Patient selection handlers
    // --------------------------------------------------

    const togglePatient = useCallback((patientId) => {
        setSelectedPatientIds((previous) =>
            previous.includes(patientId)
                ? previous.filter((id) => id !== patientId)
                : [...previous, patientId]
        );
    }, []);

    const toggleAllPatients = useCallback(() => {
        setSelectedPatientIds((previous) => {
            const visibleIds = selectablePatients.map(
                (patient) => patient.id
            );

            if (allVisibleSelected) {
                return previous.filter(
                    (id) => !visibleIds.includes(id)
                );
            }

            return [...new Set([...previous, ...visibleIds])];
        });
    }, [selectablePatients, allVisibleSelected]);

    const removeSelectedPatient = useCallback((patientId) => {
        setSelectedPatientIds((previous) =>
            previous.filter((id) => id !== patientId)
        );
    }, []);

    // --------------------------------------------------
    // Staff selection handlers
    // --------------------------------------------------

    const toggleStaff = useCallback((staffId) => {
        setSelectedStaffIds((previous) =>
            previous.includes(staffId)
                ? previous.filter((id) => id !== staffId)
                : [...previous, staffId]
        );
    }, []);

    const toggleAllStaff = useCallback(() => {
        setSelectedStaffIds((previous) => {
            const visibleIds = selectableStaff.map(
                (staff) => staff.id
            );

            if (allVisibleStaffSelected) {
                return previous.filter(
                    (id) => !visibleIds.includes(id)
                );
            }

            return [...new Set([...previous, ...visibleIds])];
        });
    }, [selectableStaff, allVisibleStaffSelected]);

    const removeSelectedStaff = useCallback((staffId) => {
        setSelectedStaffIds((previous) =>
            previous.filter((id) => id !== staffId)
        );
    }, []);

    // --------------------------------------------------
    // Search inbox and sent messages
    // --------------------------------------------------

    const currentEmails = useMemo(() => {
        const items = emails[activeTab] || [];
        const query = search.trim().toLowerCase();

        if (!query) return items;

        return items.filter((email) =>
            [
                email.from,
                email.to,
                email.cc,
                email.subject,
                email.body,
                email.snippet,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(query)
                )
        );
    }, [emails, activeTab, search]);

    const handleTabChange = async (tab) => {
        setActiveTab(tab);
        setSelectedEmail(null);
        setSearch("");
        setSuccessMessage("");
        setSendResults(null);

        await loadEmails(tab);
    };

    // --------------------------------------------------
    // Compose modal handlers
    // --------------------------------------------------

    const openCompose = () => {
        setSelectedEmail(null);
        setErrorMessage("");
        setSuccessMessage("");
        setSendResults(null);

        setCompose({
            ...EMPTY_COMPOSE,
            body: DEFAULT_EMAIL_BODY,
        });

        setShowCompose(true);

        // Refresh recipient lists when composing a new email.
        loadPatients();
        loadStaff();
    };

    const closeCompose = () => {
        if (sending) return;

        setShowCompose(false);
        setCompose(EMPTY_COMPOSE);
    };

    const handleComposeChange = (event) => {
        const { name, value } = event.target;

        setCompose((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const restoreDefaultTemplate = () => {
        setCompose((previous) => ({
            ...previous,
            body: DEFAULT_EMAIL_BODY,
        }));
    };

    // --------------------------------------------------
    // Connect Gmail
    // --------------------------------------------------

    const handleConnectGmail = async () => {
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const response = await api.post("email/oauth/start/");

            const authorizationUrl =
                response.data?.authorization_url ||
                response.data?.authorizationUrl;

            if (!authorizationUrl) {
                throw new Error(
                    "The backend did not return a Google authorization URL."
                );
            }

            window.location.assign(authorizationUrl);
        } catch (error) {
            setErrorMessage(
                error.message?.includes("authorization URL")
                    ? error.message
                    : getErrorMessage(error)
            );
        }
    };

    // --------------------------------------------------
    // Send emails to selected patients and staff
    // --------------------------------------------------

    const handleSend = async (event) => {
        event.preventDefault();

        setErrorMessage("");
        setSuccessMessage("");
        setSendResults(null);

        if (!hasActualMessage(compose.body)) {
            setErrorMessage(
                "Please write your message before sending the email."
            );
            return;
        }

        if (!compose.subject.trim()) {
            setErrorMessage("Please enter an email subject.");
            return;
        }

        const manualEmail = compose.to.trim();

        if (manualEmail && !isValidEmailAddress(manualEmail)) {
            setErrorMessage(
                "Please enter a valid additional recipient email address."
            );
            return;
        }

        /*
         * Combine patients, staff, and the optional manual recipient.
         * Each recipient receives a separate email.
         */
        const recipients = [
            ...selectedPatients.map((patient) => ({
                email: patient.email.trim(),
                name: patient.name,
                recipientType: "Patient",
            })),

            ...selectedStaff.map((staff) => ({
                email: staff.email.trim(),
                name: staff.name,
                recipientType: "Staff",
            })),

            ...(manualEmail
                ? [
                      {
                          email: manualEmail,
                          name: manualEmail,
                          recipientType: "Additional recipient",
                      },
                  ]
                : []),
        ].filter(
            (recipient, index, list) =>
                list.findIndex(
                    (item) =>
                        item.email.toLowerCase() ===
                        recipient.email.toLowerCase()
                ) === index
        );

        if (recipients.length === 0) {
            setErrorMessage(
                "Select at least one patient or staff member with a valid email address, or enter an additional recipient."
            );
            return;
        }

        const ccAddresses = compose.cc
            .split(",")
            .map((address) => address.trim())
            .filter(Boolean);

        if (
            ccAddresses.some(
                (address) => !isValidEmailAddress(address)
            )
        ) {
            setErrorMessage(
                "One or more CC addresses are invalid. Separate addresses with commas."
            );
            return;
        }

        if (recipients.length > 1 && ccAddresses.length > 0) {
            setErrorMessage(
                "For recipient privacy, clear the CC field when sending to multiple recipients. Each recipient will receive an individual email."
            );
            return;
        }

        const finalBody = buildFinalEmailBody(compose.body);
        const subject = compose.subject.trim();

        setSending(true);

        let successful = 0;
        const results = [];

        try {
            for (const recipient of recipients) {
                try {
                    await api.post("email/send/", {
                        to: recipient.email,
                        cc: ccAddresses,
                        subject,
                        body: finalBody,
                    });

                    successful += 1;

                    results.push({
                        email: recipient.email,
                        name: recipient.name,
                        recipientType: recipient.recipientType,
                        status: "success",
                        message: "Email sent successfully.",
                    });
                } catch (error) {
                    results.push({
                        email: recipient.email,
                        name: recipient.name,
                        recipientType: recipient.recipientType,
                        status: "failed",
                        message: getErrorMessage(error),
                    });
                }
            }

            setSendResults(results);
            setShowCompose(false);
            setCompose(EMPTY_COMPOSE);

            const failed = results.length - successful;

            if (failed === 0) {
                setSuccessMessage(
                    `Successfully sent ${successful} individual email${successful === 1 ? "" : "s"}.`
                );
            } else {
                setErrorMessage(
                    `${successful} email(s) sent successfully. ${failed} failed. See the delivery results below.`
                );
            }

            setActiveTab("sent");
            setSelectedEmail(null);

            await loadEmails("sent");
        } finally {
            setSending(false);
        }
    };

    // --------------------------------------------------
    // Open an email
    // --------------------------------------------------

    const handleOpenEmail = async (email) => {
        setSelectedEmail(email);
        setErrorMessage("");

        if (!email.id) {
            setErrorMessage(
                "This email does not have a valid Gmail message ID."
            );
            return;
        }

        setOpeningMessage(true);

        try {
            const response = await api.get(
                `email/messages/${encodeURIComponent(email.id)}/`
            );

            const details = normalizeEmail(response.data);

            setSelectedEmail((previous) => ({
                ...previous,
                ...details,
                unread: false,
                body:
                    details.body ||
                    previous?.body ||
                    details.snippet ||
                    "",
            }));

            setEmails((previous) => ({
                ...previous,
                inbox: previous.inbox.map((item) =>
                    item.id === email.id
                        ? { ...item, unread: false }
                        : item
                ),
            }));
        } catch (error) {
            setErrorMessage(
                `Could not load the full email. ${getErrorMessage(error)}`
            );
        } finally {
            setOpeningMessage(false);
        }
    };

    // --------------------------------------------------
    // Display values
    // --------------------------------------------------

    const navItems = [
        { id: "inbox", label: "Inbox", icon: FaInbox },
        { id: "sent", label: "Sent", icon: FaPaperPlane },
    ];

    const inboxCount = emails.inbox.length;
    const unreadCount = emails.inbox.filter(
        (email) => email.unread
    ).length;
    const sentCount = emails.sent.length;
    const isConnected = connectionState === "connected";

    return (
        <DashboardLayout>
            <div className="mx-auto w-full max-w-7xl space-y-6">
                {/* Page heading */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
                            Email Center
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage Gmail messages and communicate with patients and staff.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCompose}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#323d42] px-5 py-3 font-medium text-white transition hover:bg-[#44545b]"
                    >
                        <FaPen />
                        Compose Email
                    </button>
                </div>

                {/* Error message */}
                {errorMessage && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        <FaExclamationCircle className="mt-0.5 shrink-0" />
                        <p className="min-w-0 flex-1 break-words">
                            {errorMessage}
                        </p>
                        <button
                            type="button"
                            onClick={() => setErrorMessage("")}
                            aria-label="Dismiss error"
                        >
                            <FaTimes />
                        </button>
                    </div>
                )}

                {/* Success message */}
                {successMessage && (
                    <div
                        role="status"
                        className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
                    >
                        <FaCheckCircle />
                        <span>{successMessage}</span>
                        <button
                            type="button"
                            onClick={() => setSuccessMessage("")}
                            className="ml-auto"
                            aria-label="Dismiss success message"
                        >
                            <FaTimes />
                        </button>
                    </div>
                )}

                {/* Per-recipient delivery results */}
                {sendResults && (
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 p-4">
                            <h2 className="font-semibold text-gray-800">
                                Email delivery results
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                {
                                    sendResults.filter(
                                        (result) => result.status === "success"
                                    ).length
                                }{" "}
                                sent ·{" "}
                                {
                                    sendResults.filter(
                                        (result) => result.status === "failed"
                                    ).length
                                }{" "}
                                failed
                            </p>
                        </div>

                        <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
                            {sendResults.map((result, index) => (
                                <div
                                    key={`${result.email}-${index}`}
                                    className="flex items-start gap-3 p-4"
                                >
                                    {result.status === "success" ? (
                                        <FaCheckCircle className="mt-1 shrink-0 text-green-600" />
                                    ) : (
                                        <FaExclamationCircle className="mt-1 shrink-0 text-red-600" />
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-medium text-gray-800">
                                            {result.name}
                                        </p>
                                        <p className="break-all text-sm text-gray-500">
                                            {result.email}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                            {result.recipientType}
                                        </p>
                                        {result.status === "failed" && (
                                            <p className="mt-1 break-words text-xs text-red-600">
                                                {result.message}
                                            </p>
                                        )}
                                    </div>

                                    <span
                                        className={`shrink-0 text-xs font-semibold ${
                                            result.status === "success"
                                                ? "text-green-700"
                                                : "text-red-700"
                                        }`}
                                    >
                                        {result.status === "success"
                                            ? "Sent"
                                            : "Failed"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gmail connection status */}
                <div
                    className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
                        isConnected
                            ? "border-green-200 bg-green-50"
                            : "border-amber-200 bg-amber-50"
                    }`}
                >
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-white p-3 text-amber-600 shadow-sm">
                            <FaEnvelope size={22} />
                        </div>

                        <div>
                            <h2 className="font-semibold text-gray-800">
                                {connectionState === "checking"
                                    ? "Checking Gmail connection..."
                                    : isConnected
                                      ? "Gmail is connected"
                                      : "Gmail needs authorization"}
                            </h2>

                            <p className="mt-1 text-sm text-gray-600">
                                {connectionState === "checking"
                                    ? "Checking whether your authorized Gmail account is available."
                                    : isConnected
                                      ? "Your Gmail messages can be accessed through the administration portal."
                                      : "Authorize your Google account to read received emails and send messages."}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleConnectGmail}
                        disabled={connectionState === "checking"}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#323d42] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#44545b] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FaExternalLinkAlt />
                        {isConnected ? "Reconnect Gmail" : "Connect Gmail"}
                    </button>
                </div>

                {/* Existing appointment email reminders */}
                <AppointmentEmailReminders />

                {/* Email statistics */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Inbox Messages
                                </p>
                                <p className="mt-2 text-3xl font-bold text-gray-800">
                                    {inboxCount}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Messages loaded
                                </p>
                            </div>
                            <div className="rounded-xl bg-blue-50 p-4 text-blue-600">
                                <FaInbox size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Unread Messages
                                </p>
                                <p className="mt-2 text-3xl font-bold text-blue-700">
                                    {unreadCount}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Unread messages loaded
                                </p>
                            </div>
                            <div className="rounded-xl bg-blue-50 p-4 text-blue-600">
                                <FaEnvelope size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Sent Messages
                                </p>
                                <p className="mt-2 text-3xl font-bold text-gray-800">
                                    {sentCount}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Messages loaded
                                </p>
                            </div>
                            <div className="rounded-xl bg-green-50 p-4 text-green-600">
                                <FaPaperPlane size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inbox and sent folders */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleTabChange(item.id)}
                                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                                            isActive
                                                ? "bg-[#323d42] text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        <Icon />
                                        {item.label}

                                        {item.id === "inbox" &&
                                            unreadCount > 0 && (
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs ${
                                                        isActive
                                                            ? "bg-white text-blue-700"
                                                            : "bg-blue-100 text-blue-700"
                                                    }`}
                                                >
                                                    {unreadCount}
                                                </span>
                                            )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex w-full gap-2 lg:max-w-sm">
                            <div className="relative min-w-0 flex-1">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search emails..."
                                    className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => loadEmails(activeTab)}
                                disabled={loading}
                                title="Refresh messages"
                                aria-label="Refresh messages"
                                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                                <FaSyncAlt
                                    className={
                                        loading ? "animate-spin" : ""
                                    }
                                />
                            </button>
                        </div>
                    </div>

                    {/* Selected email details */}
                    {selectedEmail ? (
                        <div className="p-5 sm:p-8">
                            <button
                                type="button"
                                onClick={() => setSelectedEmail(null)}
                                className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800"
                            >
                                <FaArrowLeft />
                                Back to {activeTab}
                            </button>

                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <h2 className="break-words text-2xl font-bold text-gray-800">
                                    {selectedEmail.subject || "(No subject)"}
                                </h2>

                                {activeTab === "inbox" && (
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            selectedEmail.unread
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                        {selectedEmail.unread
                                            ? "Unread"
                                            : "Read"}
                                    </span>
                                )}
                            </div>

                            <div className="mt-5 space-y-2 border-b border-gray-100 pb-5 text-sm">
                                <p className="break-words">
                                    <span className="text-gray-500">From: </span>
                                    {selectedEmail.from || "Unknown sender"}
                                </p>
                                <p className="break-words">
                                    <span className="text-gray-500">To: </span>
                                    {selectedEmail.to || "Unknown recipient"}
                                </p>
                                {selectedEmail.cc && (
                                    <p className="break-words">
                                        <span className="text-gray-500">CC: </span>
                                        {selectedEmail.cc}
                                    </p>
                                )}
                                <p className="text-gray-500">
                                    {formatEmailDate(selectedEmail.date)}
                                </p>
                            </div>

                            {openingMessage && (
                                <p className="py-4 text-sm text-gray-500">
                                    Loading full message...
                                </p>
                            )}

                            <div className="whitespace-pre-wrap break-words py-6 text-sm leading-7 text-gray-700">
                                {selectedEmail.body ||
                                    selectedEmail.snippet ||
                                    "This email has no plain-text content available."}
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-gray-500">
                            <FaSyncAlt className="animate-spin text-2xl" />
                            <p className="text-sm">
                                Loading {activeTab} messages...
                            </p>
                        </div>
                    ) : currentEmails.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {currentEmails.map((email, index) => {
                                const isUnread =
                                    activeTab === "inbox" && email.unread;

                                return (
                                    <button
                                        key={
                                            email.id ||
                                            `${email.subject}-${index}`
                                        }
                                        type="button"
                                        onClick={() => handleOpenEmail(email)}
                                        className={`flex w-full flex-col gap-2 border-l-4 px-5 py-4 text-left transition sm:flex-row sm:items-start sm:justify-between ${
                                            isUnread
                                                ? "border-l-blue-500 bg-blue-50/60 hover:bg-blue-50"
                                                : "border-l-transparent bg-white hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                            {activeTab === "inbox" && (
                                                <span className="mt-1.5 flex h-3 w-3 shrink-0 items-center justify-center">
                                                    {isUnread && (
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full bg-blue-600"
                                                            title="Unread email"
                                                            aria-label="Unread email"
                                                        />
                                                    )}
                                                </span>
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={`truncate text-sm ${
                                                        isUnread
                                                            ? "font-bold text-gray-900"
                                                            : "font-medium text-gray-700"
                                                    }`}
                                                >
                                                    {activeTab === "inbox"
                                                        ? email.from ||
                                                          "Unknown sender"
                                                        : email.to ||
                                                          "Unknown recipient"}
                                                </p>

                                                <p
                                                    className={`mt-1 truncate text-sm ${
                                                        isUnread
                                                            ? "font-bold text-gray-900"
                                                            : "font-medium text-gray-700"
                                                    }`}
                                                >
                                                    {email.subject ||
                                                        "(No subject)"}
                                                </p>

                                                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                                                    {email.snippet ||
                                                        email.body ||
                                                        "No preview available"}
                                                </p>

                                                {activeTab === "inbox" && (
                                                    <span
                                                        className={`mt-2 inline-block text-xs ${
                                                            isUnread
                                                                ? "font-semibold text-blue-700"
                                                                : "text-gray-400"
                                                        }`}
                                                    >
                                                        {isUnread
                                                            ? "Unread"
                                                            : "Read"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <span className="shrink-0 text-xs text-gray-400">
                                            {formatEmailDate(email.date)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
                            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                                {activeTab === "inbox" ? (
                                    <FaInbox size={28} />
                                ) : (
                                    <FaPaperPlane size={26} />
                                )}
                            </div>

                            <h3 className="text-lg font-semibold text-gray-800">
                                {search
                                    ? "No matching emails"
                                    : connectionState !== "connected"
                                      ? "Connect your Gmail account"
                                      : activeTab === "inbox"
                                        ? "Your inbox is empty"
                                        : "No sent messages found"}
                            </h3>

                            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                                {search
                                    ? "Try searching with a different sender, recipient, or subject."
                                    : connectionState !== "connected"
                                      ? "Authorize Gmail to load your messages here."
                                      : "No messages were returned for this folder."}
                            </p>

                            {connectionState !== "connected" && (
                                <button
                                    type="button"
                                    onClick={handleConnectGmail}
                                    className="mt-5 rounded-xl bg-[#323d42] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#44545b]"
                                >
                                    Connect Gmail
                                </button>
                            )}

                            {connectionState === "connected" &&
                                activeTab === "inbox" && (
                                    <button
                                        type="button"
                                        onClick={openCompose}
                                        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                    >
                                        <FaPen />
                                        Compose an email
                                    </button>
                                )}
                        </div>
                    )}
                </div>
            </div>

            {/* Compose modal: patients and staff */}
            <ComposeEmailModal
                open={showCompose}
                compose={compose}

                // Patient selection
                selectedPatientIds={selectedPatientIds}
                filteredPatients={selectablePatients}
                selectablePatients={selectablePatients}
                selectedPatients={selectedPatients}
                patientSearch={patientSearch}
                loadingPatients={loadingPatients}
                allVisibleSelected={allVisibleSelected}

                // Staff selection
                selectedStaffIds={selectedStaffIds}
                filteredStaff={selectableStaff}
                selectableStaff={selectableStaff}
                selectedStaff={selectedStaff}
                staffSearch={staffSearch}
                loadingStaff={loadingStaff}
                allVisibleStaffSelected={allVisibleStaffSelected}

                // Sending state
                sending={sending}

                // Shared handlers
                onClose={closeCompose}
                onSubmit={handleSend}
                onComposeChange={handleComposeChange}
                onRestoreTemplate={restoreDefaultTemplate}
                isValidEmailAddress={isValidEmailAddress}

                // Patient handlers
                onPatientSearchChange={setPatientSearch}
                onTogglePatient={togglePatient}
                onToggleAllPatients={toggleAllPatients}
                onRemoveSelectedPatient={removeSelectedPatient}
                onRefreshPatients={loadPatients}

                // Staff handlers
                onStaffSearchChange={setStaffSearch}
                onToggleStaff={toggleStaff}
                onToggleAllStaff={toggleAllStaff}
                onRemoveSelectedStaff={removeSelectedStaff}
                onRefreshStaff={loadStaff}
            />
        </DashboardLayout>
    );
}
