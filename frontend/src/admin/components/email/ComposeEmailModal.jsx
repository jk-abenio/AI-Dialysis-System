
import { createPortal } from "react-dom";
import {
    FaPaperPlane,
    FaSearch,
    FaSyncAlt,
    FaTimes,
    FaPaperclip,
    FaUserMd,
    FaUserInjured,
} from "react-icons/fa";

export default function ComposeEmailModal({
    open,
    compose,

    // Patient selection
    selectedPatientIds = [],
    filteredPatients = [],
    selectablePatients = [],
    selectedPatients = [],
    patientSearch = "",
    loadingPatients = false,
    allVisibleSelected = false,

    // Staff selection
    selectedStaffIds = [],
    filteredStaff = [],
    selectableStaff = [],
    selectedStaff = [],
    staffSearch = "",
    loadingStaff = false,
    allVisibleStaffSelected = false,

    // Sending state
    sending = false,

    // General handlers
    onClose,
    onSubmit,
    onComposeChange,
    onRestoreTemplate,
    isValidEmailAddress,

    // Patient handlers
    onPatientSearchChange,
    onTogglePatient,
    onToggleAllPatients,
    onRemoveSelectedPatient,
    onRefreshPatients,

    // Staff handlers
    onStaffSearchChange,
    onToggleStaff,
    onToggleAllStaff,
    onRemoveSelectedStaff,
    onRefreshStaff,
}) {
    if (!open) return null;

    const patientCount = selectedPatients.length;
    const staffCount = selectedStaff.length;
    const additionalRecipientCount = compose.to.trim() ? 1 : 0;

    const totalRecipients =
        patientCount + staffCount + additionalRecipientCount;

    const hasMultipleRecipients = totalRecipients > 1;

    const renderRecipientList = ({
        type,
        items,
        selectedIds,
        loading,
        searchValue,
        onSearchChange,
        onToggle,
        onToggleAll,
        onRefresh,
        allSelected,
        selectedCount,
        emptyMessage,
        searchPlaceholder,
    }) => {
        const isPatient = type === "patient";

        const searchId = `${type}-search`;
        const title = isPatient ? "Select Patients" : "Select Staff";

        return (
            <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label
                        htmlFor={searchId}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                        {isPatient ? (
                            <FaUserInjured className="text-blue-600" />
                        ) : (
                            <FaUserMd className="text-teal-600" />
                        )}
                        {title}
                    </label>

                    <span className="text-xs font-medium text-gray-500">
                        {selectedCount} selected
                    </span>
                </div>

                <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

                    <input
                        id={searchId}
                        type="search"
                        value={searchValue}
                        onChange={(event) =>
                            onSearchChange(event.target.value)
                        }
                        placeholder={searchPlaceholder}
                        disabled={sending}
                        className="mb-3 w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                    />
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={onToggleAll}
                                disabled={
                                    sending ||
                                    loading ||
                                    items.length === 0
                                }
                                className="h-4 w-4 rounded"
                            />

                            Select all visible
                        </label>

                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={loading || sending}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                            <FaSyncAlt
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>
                    </div>

                    <div className="max-h-52 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
                                <FaSyncAlt className="animate-spin" />
                                Loading {isPatient ? "patients" : "staff"}...
                            </div>
                        ) : items.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500">
                                {emptyMessage}
                            </p>
                        ) : (
                            items.map((person) => {
                                const validEmail = isValidEmailAddress(
                                    person.email
                                );

                                const displayName =
                                    person.name ||
                                    person.full_name ||
                                    person.fullName ||
                                    (isPatient ? "Unnamed patient" : "Unnamed staff");

                                const identifier = isPatient
                                    ? person.patientId || person.patient_id
                                    : person.employeeId ||
                                      person.employee_id;

                                return (
                                    <label
                                        key={person.id}
                                        className="flex items-start gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(
                                                person.id
                                            )}
                                            onChange={() =>
                                                onToggle(person.id)
                                            }
                                            disabled={
                                                sending || !validEmail
                                            }
                                            className="mt-1 h-4 w-4 rounded"
                                        />

                                        <span className="min-w-0 flex-1">
                                            <span className="block break-words text-sm font-medium text-gray-800">
                                                {displayName}
                                            </span>

                                            {identifier && (
                                                <span className="block text-xs text-gray-500">
                                                    {isPatient
                                                        ? "Patient ID"
                                                        : "Employee ID"}
                                                    : {identifier}
                                                </span>
                                            )}

                                            <span className="block break-all text-xs text-gray-500">
                                                {person.email ||
                                                    "No email address"}
                                            </span>

                                            {!validEmail && (
                                                <span className="text-xs text-red-600">
                                                    Cannot select: missing or
                                                    invalid email
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderSelectedChips = ({
        people,
        onRemove,
        colorClass,
        hoverClass,
        type,
    }) => {
        if (!people.length) return null;

        return (
            <div className="mt-3 flex flex-wrap gap-2">
                {people.map((person) => {
                    const name =
                        person.name ||
                        person.full_name ||
                        person.fullName ||
                        (type === "patient"
                            ? "Unnamed patient"
                            : "Unnamed staff");

                    return (
                        <span
                            key={person.id}
                            className={`inline-flex max-w-full items-center gap-2 rounded-full py-1 pl-3 pr-2 text-xs ${colorClass}`}
                        >
                            <span className="max-w-48 truncate">
                                {name}
                            </span>

                            <button
                                type="button"
                                onClick={() => onRemove(person.id)}
                                disabled={sending}
                                aria-label={`Remove ${name}`}
                                className={`shrink-0 rounded-full p-1 disabled:opacity-50 ${hoverClass}`}
                            >
                                <FaTimes />
                            </button>
                        </span>
                    );
                })}
            </div>
        );
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="compose-email-title"
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <div>
                        <h2
                            id="compose-email-title"
                            className="text-lg font-bold text-gray-800"
                        >
                            Compose Email
                        </h2>

                        <p className="text-xs text-gray-500">
                            Each selected patient and staff member receives an
                            individual email.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                        aria-label="Close compose window"
                    >
                        <FaTimes />
                    </button>
                </div>

                <form
                    onSubmit={onSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="space-y-5 overflow-y-auto p-5">
                        {/* Patient selector */}
                        <section>
                            {renderRecipientList({
                                type: "patient",
                                items: filteredPatients,
                                selectedIds: selectedPatientIds,
                                loading: loadingPatients,
                                searchValue: patientSearch,
                                onSearchChange: onPatientSearchChange,
                                onToggle: onTogglePatient,
                                onToggleAll: onToggleAllPatients,
                                onRefresh: onRefreshPatients,
                                allSelected: allVisibleSelected,
                                selectedCount: patientCount,
                                emptyMessage: "No matching patients found.",
                                searchPlaceholder:
                                    "Search by name, patient ID, or email...",
                            })}

                            {renderSelectedChips({
                                people: selectedPatients,
                                onRemove: onRemoveSelectedPatient,
                                colorClass: "bg-blue-50 text-blue-800",
                                hoverClass: "hover:bg-blue-100",
                                type: "patient",
                            })}
                        </section>

                        <div className="border-t border-gray-100" />

                        {/* Staff selector */}
                        <section>
                            {renderRecipientList({
                                type: "staff",
                                items: filteredStaff,
                                selectedIds: selectedStaffIds,
                                loading: loadingStaff,
                                searchValue: staffSearch,
                                onSearchChange: onStaffSearchChange,
                                onToggle: onToggleStaff,
                                onToggleAll: onToggleAllStaff,
                                onRefresh: onRefreshStaff,
                                allSelected: allVisibleStaffSelected,
                                selectedCount: staffCount,
                                emptyMessage: "No matching staff found.",
                                searchPlaceholder:
                                    "Search by name, employee ID, or email...",
                            })}

                            {renderSelectedChips({
                                people: selectedStaff,
                                onRemove: onRemoveSelectedStaff,
                                colorClass: "bg-teal-50 text-teal-800",
                                hoverClass: "hover:bg-teal-100",
                                type: "staff",
                            })}
                        </section>

                        {/* Recipient summary */}
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                            <p className="text-sm font-semibold text-gray-800">
                                Recipients: {totalRecipients}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-gray-600">
                                {patientCount} patient
                                {patientCount === 1 ? "" : "s"} ·{" "}
                                {staffCount} staff member
                                {staffCount === 1 ? "" : "s"}
                                {additionalRecipientCount
                                    ? " · 1 additional recipient"
                                    : ""}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-gray-500">
                                Each selected person receives a separate
                                email. Other recipients will not appear in
                                their recipient fields.
                            </p>
                        </div>

                        {/* Additional recipient */}
                        <div>
                            <label
                                htmlFor="email-to"
                                className="mb-1.5 block text-sm font-medium text-gray-700"
                            >
                                Additional Recipient (optional)
                            </label>

                            <input
                                id="email-to"
                                name="to"
                                type="email"
                                value={compose.to}
                                onChange={onComposeChange}
                                placeholder="recipient@example.com"
                                disabled={sending}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />

                            <p className="mt-1 text-xs text-gray-500">
                                This address will receive its own separate
                                email too.
                            </p>
                        </div>

                        {/* CC */}
                        <div>
                            <label
                                htmlFor="email-cc"
                                className="mb-1.5 block text-sm font-medium text-gray-700"
                            >
                                CC (optional)
                            </label>

                            <input
                                id="email-cc"
                                name="cc"
                                type="text"
                                value={compose.cc}
                                onChange={onComposeChange}
                                placeholder="Separate multiple addresses with commas"
                                disabled={sending}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />

                            <p className="mt-1 text-xs text-gray-500">
                                CC recipients are visible. CC must be empty
                                when sending to multiple recipients.
                            </p>
                        </div>

                        {/* Subject */}
                        <div>
                            <label
                                htmlFor="email-subject"
                                className="mb-1.5 block text-sm font-medium text-gray-700"
                            >
                                Subject
                            </label>

                            <input
                                id="email-subject"
                                name="subject"
                                value={compose.subject}
                                onChange={onComposeChange}
                                placeholder="Enter email subject"
                                required
                                disabled={sending}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                                <label
                                    htmlFor="email-body"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Message
                                </label>

                                <button
                                    type="button"
                                    onClick={onRestoreTemplate}
                                    disabled={sending}
                                    className="shrink-0 text-xs font-medium text-blue-600 transition hover:text-blue-800 disabled:opacity-50"
                                >
                                    Restore default template
                                </button>
                            </div>

                            <textarea
                                id="email-body"
                                name="body"
                                value={compose.body}
                                onChange={onComposeChange}
                                placeholder="Write your message..."
                                rows={10}
                                required
                                disabled={sending}
                                className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />

                            <p className="mt-2 text-xs leading-5 text-gray-500">
                                The standard AI Dialysis System signature is
                                included automatically when sending.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-gray-500">
                            <FaPaperclip className="mr-1 inline" />
                            Attachments are not supported yet.
                        </span>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={sending}
                                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    sending ||
                                    (loadingPatients && loadingStaff) ||
                                    totalRecipients === 0
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#323d42] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#44545b] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {sending ? (
                                    <>
                                        <FaSyncAlt className="animate-spin" />
                                        Sending emails...
                                    </>
                                ) : (
                                    <>
                                        <FaPaperPlane />
                                        {hasMultipleRecipients
                                            ? `Send ${totalRecipients} Emails`
                                            : "Send Email"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
