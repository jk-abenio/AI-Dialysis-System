
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    FaEye,
    FaEyeSlash,
    FaLock,
    FaCheckCircle,
    FaExclamationCircle,
    FaUserNurse,
    FaSpinner,
    FaLink,
} from "react-icons/fa";

const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000/api/`;

export default function StaffPasswordSetup() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [checkingToken, setCheckingToken] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [tokenError, setTokenError] = useState("");

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const validateToken = useCallback(async () => {
        setCheckingToken(true);
        setTokenValid(false);
        setTokenError("");
        setError("");

        if (!token) {
            setTokenError(
                "This setup link is missing its token. Please contact your administrator for a new link."
            );
            setCheckingToken(false);
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE}staff/validate-setup-token/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ token }),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.valid !== true) {
                setTokenError(
                    data.message ||
                    "This setup link is invalid or has expired. Please contact your administrator for a new link."
                );
                return;
            }

            setTokenValid(true);
        } catch {
            setTokenError(
                "We couldn't verify your setup link. Please check your connection and try again."
            );
        } finally {
            setCheckingToken(false);
        }
    }, [token]);

    useEffect(() => {
        validateToken();
    }, [validateToken]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!token || !tokenValid) {
            setError(
                "This setup link is no longer valid. Please contact your administrator for a new link."
            );
            return;
        }

        if (password !== confirmPassword) {
            setError("The passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError("Your password must contain at least 8 characters.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}staff/setup-password/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    password,
                    confirm_password: confirmPassword,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const messages = Object.values(data)
                    .flatMap((value) =>
                        Array.isArray(value) ? value : [value]
                    )
                    .filter((value) => typeof value === "string");

                const message =
                    messages.join(" ") ||
                    "Unable to set your password. Your setup link may have expired or already been used.";

                setPassword("");
                setConfirmPassword("");

                // The link may have expired or been used since page validation.
                setTokenValid(false);
                setTokenError(message);
                return;
            }

            setSuccess(true);
            setTokenValid(false);
            setPassword("");
            setConfirmPassword("");
        } catch {
            setError(
                "We couldn't connect to the server. Please check your connection and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const showUnavailable = !checkingToken && !tokenValid && !success;

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-teal-50 p-4">
            <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="bg-gradient-to-r from-teal-700 to-cyan-700 px-6 py-8 text-center text-white">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                        <FaUserNurse className="text-3xl" />
                    </div>

                    <h1 className="text-2xl font-bold">
                        Staff Account Setup
                    </h1>

                    <p className="mt-2 text-sm text-teal-50">
                        Create a secure password for your Staff Portal account.
                    </p>
                </div>

                <div className="p-6 sm:p-8">
                    {checkingToken ? (
                        <div
                            className="py-8 text-center"
                            role="status"
                            aria-live="polite"
                        >
                            <FaSpinner className="mx-auto animate-spin text-4xl text-teal-700" />

                            <h2 className="mt-5 text-lg font-bold text-slate-800">
                                Verifying Setup Link
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Please wait while we check whether your link
                                is valid and has not already been used.
                            </p>
                        </div>
                    ) : success ? (
                        <div className="text-center">
                            <FaCheckCircle className="mx-auto text-5xl text-emerald-500" />

                            <h2 className="mt-4 text-xl font-bold text-slate-800">
                                Password Set Successfully
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Your account is ready. You can now sign in to
                                the Staff Portal using your assigned username
                                and new password.
                            </p>

                            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left text-sm text-emerald-800">
                                For your security, this setup link can no
                                longer be used to set another password.
                            </div>

                            <Link
                                to="/staff/login"
                                replace
                                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800"
                            >
                                Go to Staff Login
                            </Link>
                        </div>
                    ) : showUnavailable ? (
                        <div className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                                <FaLink className="text-2xl text-amber-600" />
                            </div>

                            <h2 className="mt-4 text-xl font-bold text-slate-800">
                                Setup Link Unavailable
                            </h2>

                            <p
                                role="alert"
                                className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
                            >
                                {tokenError ||
                                    "This setup link is invalid or has expired."}
                            </p>

                            <p className="mt-4 text-sm leading-6 text-slate-600">
                                For security, a setup link can only be used
                                once and expires after 24 hours. If you have
                                not set your password yet, contact your
                                administrator to request a new link.
                            </p>

                            <Link
                                to="/staff/login"
                                replace
                                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800"
                            >
                                Go to Staff Login
                            </Link>

                            <button
                                type="button"
                                onClick={validateToken}
                                className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div
                                    role="alert"
                                    className="mb-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                                >
                                    <FaExclamationCircle className="mt-0.5 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="mb-5 rounded-lg border border-teal-100 bg-teal-50 p-3 text-sm leading-5 text-teal-900">
                                Your setup link is valid. Create a strong
                                password to activate your Staff Portal login.
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label
                                        htmlFor="staff-password"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        New Password
                                    </label>

                                    <div className="relative">
                                        <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                                        <input
                                            id="staff-password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
                                            disabled={loading}
                                            placeholder="Enter your new password"
                                            className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-12 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword((value) => !value)
                                            }
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                                        >
                                            {showPassword ? (
                                                <FaEyeSlash />
                                            ) : (
                                                <FaEye />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="staff-confirm-password"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Confirm Password
                                    </label>

                                    <div className="relative">
                                        <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                                        <input
                                            id="staff-confirm-password"
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
                                            minLength={8}
                                            disabled={loading}
                                            placeholder="Re-enter your password"
                                            className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-12 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (value) => !value
                                                )
                                            }
                                            aria-label={
                                                showConfirmPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                                        >
                                            {showConfirmPassword ? (
                                                <FaEyeSlash />
                                            ) : (
                                                <FaEye />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <p className="text-xs leading-5 text-slate-500">
                                    Use a strong password. Django will also
                                    check it against the configured password
                                    rules.
                                </p>

                                <button
                                    type="submit"
                                    disabled={loading || !tokenValid}
                                    className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading
                                        ? "Setting Password..."
                                        : "Set Password"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}
