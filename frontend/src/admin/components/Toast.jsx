import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FaCheckCircle, FaTimes } from "react-icons/fa";

export default function Toast({
    message,
    type = "success",
    onClose,
}) {
    useEffect(() => {
        if (!message) return;

        const timer = setTimeout(onClose, 10000);

        return () => clearTimeout(timer);
    }, [message, onClose]);

    if (!message) return null;

    const isSuccess = type === "success";

    return createPortal(
        <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm animate-[toast-in_0.3s_ease-out] sm:right-6 sm:top-6">
            <div
                role={isSuccess ? "status" : "alert"}
                className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-xl ${
                    isSuccess
                        ? "border-green-200"
                        : "border-red-200"
                }`}
            >
                <FaCheckCircle
                    className={`mt-0.5 shrink-0 text-xl ${
                        isSuccess ? "text-green-500" : "text-red-500"
                    }`}
                />

                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800">
                        {isSuccess ? "Success!" : "Something went wrong"}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                        {message}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Dismiss notification"
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                    <FaTimes />
                </button>
            </div>
        </div>,
        document.body
    );
}
