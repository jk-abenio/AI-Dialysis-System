import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    FaLock,
    FaKey,
    FaCheckCircle,
    FaExclamationCircle,
    FaEye,
    FaEyeSlash,
} from "react-icons/fa";
import {
    validatePatientPasswordResetToken,
    resetPatientPassword,
} from "../../admin/services/patientService";

export default function PatientPasswordReset() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const [loading, setLoading] = useState(true);
    const [valid, setValid] = useState(false);
    const [patientName, setPatientName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        let active = true;

        const validateLink = async () => {
            if (!token) {
                setMessage("The password reset link is missing its security token.");
                setValid(false);
                setLoading(false);
                return;
            }

            try {
                const result = await validatePatientPasswordResetToken(token);

                if (!active) return;

                setValid(Boolean(result.valid));
                setPatientName(result.patient_name || "");
            } catch (error) {
                if (!active) return;

                setValid(false);
                setMessage(
                    error.response?.data?.error ||
                    "This password reset link is invalid, expired, or already used."
                );
            } finally {
                if (active) setLoading(false);
            }
        };

        validateLink();

        return () => {
            active = false;
        };
    }, [token]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage("");

        if (password.length < 8) {
            setMessage("Your password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("The passwords do not match.");
            return;
        }

        setSubmitting(true);

        try {
            const result = await resetPatientPassword({
                token,
                password,
                confirm_password: confirmPassword,
            });

            setSuccess(true);
            setValid(false);
            setPassword("");
            setConfirmPassword("");
            setMessage(
                result.message ||
                "Your password has been changed successfully. You can now log in."
            );
        } catch (error) {
            setMessage(
                error.response?.data?.error ||
                error.response?.data?.detail ||
                "Unable to reset your password. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 px-4 py-10">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                <div className="bg-gradient-to-r from-blue-700 to-teal-600 px-6 py-8 text-center text-white">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                        {success ? (
                            <FaCheckCircle size={30} />
                        ) : (
                            <FaLock size={28} />
                        )}
                    </div>

                    <h1 className="mt-4 text-2xl font-bold">
                        Reset Your Password
                    </h1>

                    <p className="mt-2 text-sm text-blue-50">
                        AI Dialysis System · Patient Portal
                    </p>
                </div>

                <div className="p-6 sm:p-8">
                    {loading ? (
                        <div className="py-8 text-center">
                            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                            <p className="mt-4 text-sm text-gray-500">
                                Verifying your secure link...
                            </p>
                        </div>
                    ) : success ? (
                        <div className="text-center">
                            <FaCheckCircle className="mx-auto text-5xl text-green-500" />

                            <h2 className="mt-4 text-lg font-bold text-gray-800">
                                Password Updated
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                {message}
                            </p>

                            <p className="mt-4 text-xs leading-5 text-gray-500">
                                For your security, this reset link can no longer be used.
                            </p>
                        </div>
                    ) : !valid ? (
                        <div className="text-center">
                            <FaExclamationCircle className="mx-auto text-5xl text-red-500" />

                            <h2 className="mt-4 text-lg font-bold text-gray-800">
                                Link Unavailable
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-gray-600">
                                {message ||
                                    "This password reset link is invalid or expired."}
                            </p>

                            <p className="mt-4 text-xs leading-5 text-gray-500">
                                Please contact your dialysis clinic and ask the administrator for a new reset link.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm leading-6 text-gray-600">
                                {patientName
                                    ? `Hello, ${patientName}. `
                                    : ""}
                                Create a new password for your patient account.
                            </p>

                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                                <FaKey className="mt-0.5 shrink-0" />
                                Use at least 8 characters and choose a password you do not use elsewhere.
                            </div>

                            {message && (
                                <div
                                    role="alert"
                                    className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                                >
                                    {message}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                                <div>
                                    <label
                                        htmlFor="new-password"
                                        className="mb-2 block text-sm font-semibold text-gray-700"
                                    >
                                        New Password
                                    </label>

                                    <div className="relative">
                                        <input
                                            id="new-password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            minLength={8}
                                            autoComplete="new-password"
                                            required
                                            disabled={submitting}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                            placeholder="Enter your new password"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword((previous) => !previous)
                                            }
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600"
                                        >
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="confirm-password"
                                        className="mb-2 block text-sm font-semibold text-gray-700"
                                    >
                                        Confirm New Password
                                    </label>

                                    <div className="relative">
                                        <input
                                            id="confirm-password"
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={confirmPassword}
                                            onChange={(event) =>
                                                setConfirmPassword(event.target.value)
                                            }
                                            autoComplete="new-password"
                                            required
                                            disabled={submitting}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                            placeholder="Confirm your new password"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (previous) => !previous
                                                )
                                            }
                                            aria-label={
                                                showConfirmPassword
                                                    ? "Hide confirmation"
                                                    : "Show confirmation"
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600"
                                        >
                                            {showConfirmPassword ? (
                                                <FaEyeSlash />
                                            ) : (
                                                <FaEye />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <FaLock />
                                    {submitting
                                        ? "Updating Password..."
                                        : "Reset Password"}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center text-xs text-gray-500">
                    Keep your account credentials private.
                </div>
            </div>
        </div>
    );
}