
import { useState } from "react";
import { deleteStaff } from "../../services/staffService";
import {
    FaTrash,
    FaTimes,
    FaExclamationTriangle,
} from "react-icons/fa";

export default function DeleteStaffModal({
    open,
    staff,
    onClose,
    onSuccess,
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    if (!open || !staff) return null;

    const handleClose = () => {
        if (deleting) return;

        setError("");
        onClose();
    };

    const handleDelete = async () => {
        if (deleting) return;

        setDeleting(true);
        setError("");

        try {
            await deleteStaff(staff.id);

            // Refresh the list and trigger the success toast.
            await onSuccess?.();

            onClose();
        } catch (err) {
            console.error("Failed to delete staff:", err);

            setError(
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                "Unable to delete this staff member. Please try again."
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !deleting) {
                    handleClose();
                }
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-staff-title"
                aria-describedby="delete-staff-description"
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                    <h2
                        id="delete-staff-title"
                        className="text-xl font-bold text-gray-800"
                    >
                        Delete Staff
                    </h2>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={deleting}
                        aria-label="Close confirmation"
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Confirmation content */}
                <div className="px-6 py-6">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <FaExclamationTriangle className="text-2xl" />
                    </div>

                    <p className="text-center text-lg font-semibold text-gray-800">
                        Are you sure?
                    </p>

                    <p
                        id="delete-staff-description"
                        className="mt-2 text-center text-sm leading-6 text-gray-500"
                    >
                        You are about to delete{" "}
                        <span className="font-semibold text-gray-800">
                            {staff.first_name} {staff.last_name}
                        </span>
                        {staff.employee_id && (
                            <>
                                {" "}({staff.employee_id})
                            </>
                        )}
                        . This action may not be reversible.
                    </p>

                    {error && (
                        <div
                            role="alert"
                            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={deleting}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {deleting ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <FaTrash />
                                Delete Staff
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
