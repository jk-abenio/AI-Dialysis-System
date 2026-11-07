
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaHeartbeat,
    FaLock,
    FaUser,
    FaShieldAlt,
    FaArrowRight,
    FaMapMarkerAlt,
    FaPhoneAlt,
    FaEnvelope,
    FaClock,
    FaChevronDown,
    FaQuestionCircle,
    FaSignInAlt,
    FaArrowLeft,
    FaPaperPlane,
    FaCheckCircle,
    FaExclamationCircle,
    FaEye,
    FaEyeSlash,
    FaCalendarAlt,
    FaProcedures,
    FaUserMd,
} from "react-icons/fa";

import { usePatientAuth } from "../context/PatientAuthContext";
import PatientLoading from "../components/PatientLoading";
import { requestPatientPasswordReset } from "../../admin/services/patientService";

const faqs = [
    {
        question: "Where can I find my Patient ID?",
        answer:
            "Use the Patient ID provided by your clinic. If you cannot find it, contact the clinic staff for assistance.",
    },
    {
        question: "What if I forget my password?",
        answer:
            "Click Forgot Password on the sign-in form and enter your Patient ID. If your active account has a registered email address, a password reset link will be sent to that address. The link expires after 24 hours.",
    },
    {
        question: "Where can I view my dialysis schedule?",
        answer:
            "After signing in, your patient dashboard displays your dialysis schedule and available session details.",
    },
    {
        question: "Why can't I sign in?",
        answer:
            "Double-check your Patient ID and password. If the issue continues, use the Forgot Password option or contact your clinic for assistance.",
    },
];

export default function PatientLogin() {
    const [patientId, setPatientId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [openFaq, setOpenFaq] = useState(null);

    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [resetMessage, setResetMessage] = useState("");
    const [resetError, setResetError] = useState("");

    const navigate = useNavigate();
    const { login } = usePatientAuth();

    const handleLogin = async (e) => {
        e.preventDefault();

        if (isLoading) return;

        setIsLoading(true);
        setErrorMessage("");

        const startTime = Date.now();

        try {
            await login({
                patient_id: patientId.trim(),
                password,
            });

            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, 2000 - elapsed);

            if (remainingTime > 0) {
                await new Promise((resolve) =>
                    setTimeout(resolve, remainingTime)
                );
            }

            navigate("/patient", { replace: true });
        } catch (error) {
            console.error("Patient login failed:", error);

            setErrorMessage(
                error.response?.data?.error ||
                    error.response?.data?.detail ||
                    "Unable to sign in. Please check your credentials and try again."
            );

            setIsLoading(false);
        }
    };

    const openForgotPassword = () => {
        setShowForgotPassword(true);
        setResetMessage("");
        setResetError("");
        setErrorMessage("");
    };

    const returnToLogin = () => {
        setShowForgotPassword(false);
        setResetMessage("");
        setResetError("");
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        if (isSendingReset) return;

        const trimmedPatientId = patientId.trim();

        if (!trimmedPatientId) {
            setResetError("Please enter your Patient ID.");
            return;
        }

        setIsSendingReset(true);
        setResetMessage("");
        setResetError("");

        try {
            const response =
                await requestPatientPasswordReset(trimmedPatientId);

            setResetMessage(
                response.message ||
                    "If an active patient account matches that Patient ID and has a registered email address, a password reset email will be sent shortly. Please check your inbox."
            );
        } catch (error) {
            console.error("Password reset request failed:", error);

            setResetError(
                "We couldn't process your request right now. Please try again later or contact your clinic."
            );
        } finally {
            setIsSendingReset(false);
        }
    };

    if (isLoading) {
        return (
            <PatientLoading message="Please wait while we verify your account..." />
        );
    }

    return (
        <div className="min-h-screen overflow-hidden bg-[#edf4f5] text-slate-700">
            {/* 3D Background */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="absolute -right-40 top-40 h-[32rem] w-[32rem] rounded-full bg-teal-300/20 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-300/10 blur-3xl" />

                <div className="absolute right-[8%] top-[18%] h-40 w-40 rounded-full border border-teal-500/10" />
                <div className="absolute right-[10%] top-[20%] h-28 w-28 rounded-full border border-cyan-500/10" />
                <div className="absolute bottom-[12%] left-[5%] h-52 w-52 rounded-full border border-teal-500/10" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/10 bg-[#203c43] text-white shadow-xl shadow-slate-900/10">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -right-20 -top-40 h-96 w-96 rounded-full border border-white/10" />
                    <div className="absolute -right-5 -top-28 h-72 w-72 rounded-full border border-white/10" />
                    <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
                </div>

                <div className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 shadow-lg shadow-cyan-950/40 ring-1 ring-white/20">
                            <FaHeartbeat className="text-2xl text-white" />
                        </div>

                        <div>
                            <h1 className="text-lg font-extrabold tracking-wide sm:text-xl">
                                AI Dialysis
                            </h1>
                            <p className="text-[10px] font-bold tracking-[0.24em] text-teal-200 sm:text-xs">
                                PATIENT PORTAL
                            </p>
                        </div>
                    </div>

                    <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-medium text-teal-100 shadow-inner sm:flex">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                        Your care, connected
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="relative z-10 mx-auto grid min-h-[650px] max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-16">
                {/* Left: Hero section */}
                <section className="relative mx-auto w-full max-w-xl lg:mx-0">
                    <div className="relative">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-800 shadow-sm backdrop-blur">
                            <FaShieldAlt className="text-teal-600" />
                            Welcome to your patient portal
                        </div>

                        <h2 className="text-4xl font-black leading-[1.12] tracking-tight text-[#203c43] sm:text-5xl lg:text-6xl">
                            Your dialysis care,
                            <span className="mt-2 block bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                                all in one place.
                            </span>
                        </h2>

                        <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">
                            Sign in securely to view your dialysis schedule,
                            stay informed about your treatments, and remain
                            connected with your healthcare team.
                        </p>

                        {/* Feature cards */}
                        <div className="mt-9 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="group rounded-2xl border border-white bg-white/75 p-4 shadow-lg shadow-teal-900/5 backdrop-blur transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 transition group-hover:scale-110">
                                    <FaCalendarAlt className="text-lg" />
                                </div>
                                <p className="text-sm font-bold text-[#203c43]">
                                    My Schedule
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    View dialysis sessions
                                </p>
                            </div>

                            <div className="group rounded-2xl border border-white bg-white/75 p-4 shadow-lg shadow-teal-900/5 backdrop-blur transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 transition group-hover:scale-110">
                                    <FaProcedures className="text-lg" />
                                </div>
                                <p className="text-sm font-bold text-[#203c43]">
                                    Treatment
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Access care details
                                </p>
                            </div>

                            <div className="group rounded-2xl border border-white bg-white/75 p-4 shadow-lg shadow-teal-900/5 backdrop-blur transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition group-hover:scale-110">
                                    <FaUserMd className="text-lg" />
                                </div>
                                <p className="text-sm font-bold text-[#203c43]">
                                    Care Team
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Stay connected
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Floating medical illustration */}
                    <div className="pointer-events-none absolute -right-3 top-0 hidden h-28 w-28 items-center justify-center rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/90 to-cyan-100/70 shadow-2xl shadow-teal-900/10 backdrop-blur sm:flex lg:-right-10 lg:top-8">
                        <div className="absolute inset-2 rounded-[1.5rem] border border-teal-200/60" />
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-900/30">
                            <FaHeartbeat className="text-3xl" />
                        </div>
                    </div>

                    <div className="pointer-events-none absolute -bottom-8 right-10 hidden h-16 w-16 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-teal-600 shadow-xl backdrop-blur sm:flex">
                        <FaShieldAlt className="text-2xl" />
                    </div>
                </section>

                {/* Right: Login card */}
                <section className="relative mx-auto w-full max-w-md [perspective:1200px]">
                    {/* Decorative card layers */}
                    <div className="absolute -inset-3 rotate-3 rounded-[2rem] bg-gradient-to-br from-cyan-300/50 to-teal-400/30 blur-[1px]" />
                    <div className="absolute -inset-1 -rotate-2 rounded-[2rem] bg-gradient-to-br from-white/80 to-teal-100/70 shadow-xl" />

                    <div className="relative rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_-20px_rgba(15,65,70,0.30)] backdrop-blur-xl transition duration-500 hover:shadow-[0_30px_90px_-20px_rgba(15,65,70,0.38)] sm:rounded-[2rem] sm:p-9">
                        {/* Card accent */}
                        <div className="absolute left-8 right-8 top-0 h-1 rounded-b-full bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500" />

                        {/* Card heading */}
                        <div className="mb-8 text-center">
                            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-xl shadow-teal-700/25 ring-4 ring-teal-50">
                                <div className="absolute inset-1 rounded-xl border border-white/20" />
                                {showForgotPassword ? (
                                    <FaLock className="relative text-2xl" />
                                ) : (
                                    <FaSignInAlt className="relative text-2xl" />
                                )}
                            </div>

                            <h2 className="text-2xl font-black tracking-tight text-[#203c43] sm:text-3xl">
                                {showForgotPassword
                                    ? "Forgot Password?"
                                    : "Welcome back"}
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {showForgotPassword
                                    ? "Enter your Patient ID to request a secure password reset link."
                                    : "Sign in to access your patient account."}
                            </p>
                        </div>

                        {!showForgotPassword ? (
                            <form onSubmit={handleLogin} className="space-y-5">
                                {/* Patient ID */}
                                <div>
                                    <label
                                        htmlFor="patientId"
                                        className="mb-2 block text-sm font-bold text-slate-700"
                                    >
                                        Patient ID
                                    </label>

                                    <div className="group relative">
                                        <FaUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-teal-600" />

                                        <input
                                            id="patientId"
                                            type="text"
                                            value={patientId}
                                            onChange={(e) => {
                                                setPatientId(e.target.value);
                                                setErrorMessage("");
                                            }}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-teal-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                                            placeholder="Enter your Patient ID"
                                            autoComplete="username"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <label
                                            htmlFor="password"
                                            className="block text-sm font-bold text-slate-700"
                                        >
                                            Password
                                        </label>

                                        <button
                                            type="button"
                                            onClick={openForgotPassword}
                                            className="rounded text-xs font-bold text-teal-700 transition hover:text-teal-900 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-600/30"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>

                                    <div className="group relative">
                                        <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-teal-600" />

                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setErrorMessage("");
                                            }}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3.5 pl-11 pr-12 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-teal-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            required
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword((current) => !current)
                                            }
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/30"
                                        >
                                            {showPassword ? (
                                                <FaEyeSlash />
                                            ) : (
                                                <FaEye />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Login error */}
                                {errorMessage && (
                                    <div
                                        role="alert"
                                        className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                                    >
                                        <FaExclamationCircle className="mt-0.5 shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#287b80] to-[#21676c] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/20 transition duration-300 hover:-translate-y-1 hover:from-[#21676c] hover:to-[#174f55] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <span>Sign in to your account</span>
                                    <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                                </button>
                            </form>
                        ) : (
                            <form
                                onSubmit={handleForgotPassword}
                                className="space-y-5"
                            >
                                {/* Reset Patient ID */}
                                <div>
                                    <label
                                        htmlFor="resetPatientId"
                                        className="mb-2 block text-sm font-bold text-slate-700"
                                    >
                                        Patient ID
                                    </label>

                                    <div className="group relative">
                                        <FaUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-teal-600" />

                                        <input
                                            id="resetPatientId"
                                            type="text"
                                            value={patientId}
                                            onChange={(e) => {
                                                setPatientId(e.target.value);
                                                setResetMessage("");
                                                setResetError("");
                                            }}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-teal-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                                            placeholder="Enter your Patient ID"
                                            autoComplete="username"
                                            autoFocus
                                            required
                                        />
                                    </div>

                                    <p className="mt-2 text-xs leading-5 text-slate-500">
                                        We'll use the email address registered
                                        to your patient account, if available.
                                    </p>
                                </div>

                                {/* Reset error */}
                                {resetError && (
                                    <div
                                        role="alert"
                                        className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                                    >
                                        <FaExclamationCircle className="mt-0.5 shrink-0" />
                                        <span>{resetError}</span>
                                    </div>
                                )}

                                {/* Reset confirmation */}
                                {resetMessage && (
                                    <div
                                        role="status"
                                        aria-live="polite"
                                        className="rounded-xl border border-teal-200 bg-teal-50 p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <FaCheckCircle className="mt-0.5 shrink-0 text-teal-700" />

                                            <div>
                                                <p className="text-sm font-bold text-[#203c43]">
                                                    Request received
                                                </p>

                                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                                    {resetMessage}
                                                </p>

                                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                                    If you don't receive an
                                                    email, check your spam
                                                    folder or contact your
                                                    clinic.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Request reset */}
                                <button
                                    type="submit"
                                    disabled={isSendingReset}
                                    className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#287b80] to-[#21676c] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/20 transition duration-300 hover:-translate-y-1 hover:from-[#21676c] hover:to-[#174f55] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSendingReset ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                            <span>Sending request...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaPaperPlane />
                                            <span>Send Reset Link</span>
                                        </>
                                    )}
                                </button>

                                {/* Back to login */}
                                <button
                                    type="button"
                                    onClick={returnToLogin}
                                    disabled={isSendingReset}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition duration-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-600/10 disabled:opacity-50"
                                >
                                    <FaArrowLeft />
                                    Back to Sign In
                                </button>
                            </form>
                        )}

                        {/* Security information */}
                        <div className="mt-6 flex items-start gap-3 rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50 p-4">
                            <FaShieldAlt className="mt-0.5 shrink-0 text-teal-700" />

                            <div>
                                <p className="text-xs font-extrabold text-[#203c43]">
                                    Secure patient access
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                    {showForgotPassword
                                        ? "For your privacy, this page does not reveal whether a Patient ID or registered email address exists."
                                        : "Keep your login credentials private. Your account is intended for authorized patient access only."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="relative mt-6 text-center text-xs leading-5 text-slate-500">
                        Need help accessing your account? Review the FAQs
                        below or contact your clinic.
                    </p>
                </section>
            </main>
            {/* 3D Footer */}
            <footer className="relative z-10 overflow-hidden bg-gradient-to-br from-[#142f36] via-[#203c43] to-[#102a32] text-slate-300">

                {/* Background decorations */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full border border-cyan-300/10" />
                    <div className="absolute -right-20 -top-28 h-96 w-96 rounded-full border border-teal-300/10" />
                    <div className="absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
                    <div className="absolute bottom-0 right-1/3 h-72 w-72 rounded-full bg-cyan-400/5 blur-3xl" />

                    {/* Decorative grid */}
                    <div
                        className="absolute inset-0 opacity-[0.035]"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                            backgroundSize: "40px 40px",
                        }}
                    />
                </div>

                <div className="relative mx-auto max-w-7xl px-5 pb-8 pt-14 sm:px-8 sm:pt-16 lg:px-12">

                    {/* Footer heading */}
                    <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">
                                <FaHeartbeat />
                                AI Dialysis System
                            </div>

                            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                                Your care, <span className="text-teal-300">connected.</span>
                            </h2>

                            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                                Stay informed, manage your dialysis schedule, and remain
                                connected with your healthcare team.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 self-start rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 shadow-lg shadow-black/10 sm:self-auto">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                            <span className="text-xs font-semibold text-emerald-200">
                                Patient Portal
                            </span>
                        </div>
                    </div>

                    {/* 3D information panels */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 [perspective:1200px]">

                        {/* Brand panel */}
                        <section className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.12] to-white/[0.035] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.20)] backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:rotate-[0.5deg] hover:border-teal-300/30 hover:shadow-[0_25px_45px_rgba(0,0,0,0.30)]">
                            <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />

                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-600 text-white shadow-[0_10px_25px_rgba(20,184,166,0.25)] ring-1 ring-white/20 transition duration-500 group-hover:scale-110 group-hover:rotate-6">
                                <FaHeartbeat className="text-2xl" />
                            </div>

                            <h3 className="text-lg font-extrabold text-white">
                                AI Dialysis
                            </h3>

                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
                                Patient Portal
                            </p>

                            <p className="mt-5 text-sm leading-7 text-slate-400">
                                A convenient way to access your dialysis schedule and stay
                                informed about your care.
                            </p>

                            <div className="mt-6 h-1 w-12 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-500 group-hover:w-24" />
                        </section>

                        {/* Clinic information */}
                        <section className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.12] to-white/[0.035] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.20)] backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:-rotate-[0.5deg] hover:border-cyan-300/30 hover:shadow-[0_25px_45px_rgba(0,0,0,0.30)]">
                            <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/30 to-cyan-600/20 text-cyan-200 shadow-lg shadow-black/10 ring-1 ring-cyan-200/20 transition duration-500 group-hover:scale-110">
                                    <FaMapMarkerAlt className="text-lg" />
                                </div>

                                <h3 className="text-sm font-extrabold text-white">
                                    Clinic Information
                                </h3>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                                        Clinic Address
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        Add your clinic name and address.
                                    </p>
                                </div>

                                <div className="h-px bg-gradient-to-r from-white/10 to-transparent" />

                                <div>
                                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-200">
                                        <FaClock />
                                        Operating Hours
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        Please contact the clinic to confirm.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Contact panel */}
                        <section className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.12] to-white/[0.035] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.20)] backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:rotate-[0.5deg] hover:border-teal-300/30 hover:shadow-[0_25px_45px_rgba(0,0,0,0.30)]">
                            <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />

                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/30 to-teal-600/20 text-teal-200 shadow-lg shadow-black/10 ring-1 ring-teal-200/20 transition duration-500 group-hover:scale-110">
                                    <FaEnvelope className="text-lg" />
                                </div>

                                <h3 className="text-sm font-extrabold text-white">
                                    Contact Us
                                </h3>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-200">
                                        <FaPhoneAlt />
                                        Phone Number
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        Add the clinic phone number.
                                    </p>
                                </div>

                                <div className="h-px bg-gradient-to-r from-white/10 to-transparent" />

                                <div>
                                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-200">
                                        <FaEnvelope />
                                        Email Address
                                    </p>
                                    <p className="mt-2 break-words text-sm leading-6 text-slate-400">
                                        Add the clinic email address.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* FAQ panel */}
                        <section
                            id="patient-faq"
                            className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.12] to-white/[0.035] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.20)] backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:-rotate-[0.5deg] hover:border-blue-300/30 hover:shadow-[0_25px_45px_rgba(0,0,0,0.30)]"
                        >
                            <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" />

                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400/30 to-blue-600/20 text-blue-200 shadow-lg shadow-black/10 ring-1 ring-blue-200/20 transition duration-500 group-hover:scale-110">
                                    <FaQuestionCircle className="text-lg" />
                                </div>

                                <h3 className="text-sm font-extrabold text-white">
                                    Frequently Asked Questions
                                </h3>
                            </div>

                            <div className="space-y-2">
                                {faqs.map((faq, index) => (
                                    <div
                                        key={faq.question}
                                        className={`overflow-hidden rounded-xl border transition duration-300 ${
                                            openFaq === index
                                                ? "border-teal-300/30 bg-teal-300/10 shadow-lg shadow-black/10"
                                                : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.07]"
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setOpenFaq(
                                                    openFaq === index ? null : index
                                                )
                                            }
                                            aria-expanded={openFaq === index}
                                            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-xs font-semibold text-slate-200 transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-400"
                                        >
                                            <span>{faq.question}</span>

                                            <FaChevronDown
                                                aria-hidden="true"
                                                className={`shrink-0 text-teal-300 transition-transform duration-300 ${
                                                    openFaq === index ? "rotate-180" : ""
                                                }`}
                                            />
                                        </button>

                                        {openFaq === index && (
                                            <div className="border-t border-white/10 px-3 py-3 text-xs leading-5 text-slate-400">
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Footer bottom */}
                    <div className="relative mt-10 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.09] via-white/[0.045] to-white/[0.09] px-5 py-5 shadow-[0_15px_35px_rgba(0,0,0,0.20)] backdrop-blur-xl sm:px-7">
                        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-teal-300/40 to-transparent" />

                        <div className="relative flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                            <p className="text-xs leading-5 text-slate-400">
                                © {new Date().getFullYear()} AI Dialysis Patient Portal.
                                All rights reserved.
                            </p>

                            <div className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-teal-300/15 bg-teal-300/10 px-4 py-2 text-xs font-semibold text-teal-200 sm:self-auto">
                                <FaShieldAlt className="text-teal-300" />
                                Your privacy and security matter.
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    );
}
