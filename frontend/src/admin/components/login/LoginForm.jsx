
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AdminLoading from "../AdminLoading";

import {
    MdOutlineLock,
    MdOutlineHealthAndSafety,
    MdVisibility,
    MdVisibilityOff,
    MdAdminPanelSettings,
    MdDashboard,
    MdPeople,
    MdCalendarMonth,
    MdSecurity,
    MdArrowForward,
    MdVerifiedUser,
    MdMonitorHeart,
    MdAutoAwesome,
    MdMedicalServices,
    MdMonitor,
} from "react-icons/md";

export default function LoginForm() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const MIN_LOGIN_LOADING_TIME = 6000;

    const handleLogin = async (e) => {
        const startedAt = Date.now();
        e.preventDefault();

        if (isLoading) return;

        setError("");
        setIsLoading(true);

        try {
            const response = await api.post("/login/", {
                username: username.trim(),
                password,
            });

            const elapsed = Date.now() - startedAt;
            const remaining = Math.max(
                0,
                MIN_LOGIN_LOADING_TIME - elapsed
            );

            if (remaining > 0) {
                await new Promise((resolve) =>
                    setTimeout(resolve, remaining)
                );
            }

            login(
                response.data.user,
                response.data.access,
                response.data.refresh,
                rememberMe
            );

            navigate("/dashboard", { replace: true });
        } catch (err) {
            if (err.response) {
                setError(
                    err.response.data.message ||
                    err.response.data.detail ||
                    "Invalid username or password."
                );
            } else {
                setError(
                    "Unable to connect to the server. Please try again."
                );
            }

            setIsLoading(false);
        }
    };

    const features = [
        {
            icon: MdDashboard,
            title: "Centralized Dashboard",
            description: "Access system management tools",
            color: "cyan",
        },
        {
            icon: MdPeople,
            title: "Patient Management",
            description: "Maintain patient records securely",
            color: "blue",
        },
        {
            icon: MdCalendarMonth,
            title: "Treatment Scheduling",
            description: "Coordinate dialysis appointments",
            color: "indigo",
        },
    ];

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#eaf1f7] text-slate-800">

            {/* Loading overlay */}
            {isLoading && (
                <AdminLoading
                    message="Verifying administrator credentials..."
                    title="AI Dialysis"
                    subtitle="Secure Administration Portal"
                />
            )}

            {/* Background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-300/30 blur-[100px]" />
                <div className="absolute -bottom-40 -right-40 h-[550px] w-[550px] rounded-full bg-blue-400/20 blur-[110px]" />
                <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-[100px]" />

                {/* Subtle grid */}
                <div
                    className="absolute inset-0 opacity-[0.12]"
                    style={{
                        backgroundImage:
                            "linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)",
                        backgroundSize: "45px 45px",
                    }}
                />
            </div>

            <div className="relative mx-auto flex min-h-screen max-w-[1500px] items-center justify-center p-4 sm:p-8 lg:p-12">

                {/* Main 3D container */}
                <div
                    className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 shadow-[0_35px_100px_-25px_rgba(15,23,42,0.30)] backdrop-blur-xl lg:min-h-[700px] lg:grid-cols-2"
                    style={{ perspective: "1600px" }}
                >

                    {/* LEFT PANEL */}
                    <section className="relative hidden overflow-hidden bg-[#172d39] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">

                        {/* Background glow */}
                        <div className="absolute -right-32 -top-32 h-[450px] w-[450px] rounded-full bg-cyan-400/20 blur-[100px]" />
                        <div className="absolute -bottom-40 -left-20 h-[450px] w-[450px] rounded-full bg-blue-600/20 blur-[100px]" />

                        {/* Decorative 3D circles */}
                        <div className="pointer-events-none absolute right-[-120px] top-[100px] h-[420px] w-[420px] rounded-full border border-cyan-200/10" />
                        <div className="pointer-events-none absolute right-[-70px] top-[150px] h-[320px] w-[320px] rounded-full border border-cyan-200/10" />
                        <div className="pointer-events-none absolute right-[-20px] top-[200px] h-[220px] w-[220px] rounded-full border border-cyan-200/10" />

                        {/* Branding */}
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-cyan-300 to-blue-600 shadow-[0_10px_30px_rgba(34,211,238,0.35)]">
                                <MdMonitorHeart className="text-3xl text-white" />
                            </div>

                            <div>
                                <h1 className="text-xl font-bold tracking-wide">
                                    AI Dialysis
                                </h1>
                                <p className="mt-1 text-[10px] font-semibold tracking-[0.3em] text-cyan-300">
                                    ADMINISTRATION
                                </p>
                            </div>
                        </div>

                        {/* Main content */}
                        <div className="relative z-10 my-10">

                            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-200 backdrop-blur-md">
                                <MdAutoAwesome className="text-base" />
                                Intelligent Healthcare Management
                            </div>

                            <h2 className="max-w-lg text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
                                Manage care.
                                <br />
                                <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                                    Empower patients.
                                </span>
                            </h2>

                            <p className="mt-6 max-w-md text-sm leading-7 text-slate-300">
                                Access your administrative workspace to
                                coordinate dialysis schedules, manage
                                patient information, and support efficient
                                treatment operations.
                            </p>

                            {/* 3D medical visual */}
                            <div className="relative mx-auto my-12 flex h-[230px] max-w-[390px] items-center justify-center">

                                {/* Outer ring */}
                                <div
                                    className="absolute h-[220px] w-[220px] rounded-full border border-cyan-300/20"
                                    style={{
                                        transform: "rotateX(65deg) rotateZ(-20deg)",
                                        boxShadow: "0 0 45px rgba(34,211,238,0.10)",
                                    }}
                                />

                                {/* Middle ring */}
                                <div
                                    className="absolute h-[175px] w-[175px] rounded-full border-2 border-dashed border-cyan-300/30"
                                    style={{
                                        transform: "rotateX(65deg) rotateZ(35deg)",
                                    }}
                                />

                                {/* Inner glow */}
                                <div className="absolute h-36 w-36 rounded-full bg-cyan-400/20 blur-2xl" />

                                {/* Main 3D medical icon */}
                                <div
                                    className="relative z-10 flex h-32 w-32 items-center justify-center rounded-[2.5rem] border border-white/30 bg-gradient-to-br from-cyan-300 via-blue-500 to-[#164a75] shadow-[0_25px_50px_rgba(0,0,0,0.4),inset_0_2px_8px_rgba(255,255,255,0.5)] transition-transform duration-700 hover:rotate-6 hover:scale-110"
                                    style={{
                                        transform: "rotateY(-12deg) rotateX(8deg)",
                                    }}
                                >
                                    <MdMonitorHeart className="text-7xl text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.35)]" />

                                    <div className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-gradient-to-br from-white to-cyan-100 text-blue-700 shadow-lg">
                                        <MdMedicalServices className="text-xl" />
                                    </div>
                                </div>

                                {/* Floating card left */}
                                <div className="absolute left-0 top-7 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 shadow-xl backdrop-blur-xl">
                                    <MdMonitor className="text-xl text-cyan-300" />
                                    <span className="text-[10px] font-semibold text-white">
                                        Monitoring
                                    </span>
                                </div>

                                {/* Floating card right */}
                                <div className="absolute bottom-5 right-0 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 shadow-xl backdrop-blur-xl">
                                    <MdVerifiedUser className="text-xl text-emerald-300" />
                                    <span className="text-[10px] font-semibold text-white">
                                        Secure Access
                                    </span>
                                </div>

                                {/* Small floating orb */}
                                <div className="absolute right-16 top-0 h-5 w-5 rounded-full border border-cyan-200/50 bg-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.8)]" />
                                <div className="absolute bottom-8 left-16 h-3 w-3 rounded-full bg-blue-300 shadow-[0_0_20px_rgba(96,165,250,0.9)]" />
                            </div>

                            {/* Feature cards */}
                            <div className="space-y-3">
                                {features.map((feature, index) => {
                                    const Icon = feature.icon;

                                    return (
                                        <div
                                            key={feature.title}
                                            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5 shadow-lg backdrop-blur-md transition-all duration-300 hover:translate-x-2 hover:border-cyan-300/30 hover:bg-white/[0.09]"
                                            style={{
                                                transform: `translateZ(${index * 8}px)`,
                                            }}
                                        >
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 shadow-inner">
                                                <Icon className="text-2xl text-cyan-300" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    {feature.title}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    {feature.description}
                                                </p>
                                            </div>

                                            <MdArrowForward className="ml-auto text-xl text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-cyan-300" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
                            <MdVerifiedUser className="text-lg text-cyan-400" />
                            Designed for authorized healthcare personnel.
                        </div>
                    </section>

                    {/* RIGHT PANEL */}
                    <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-[#f8fbff] to-[#edf5fc] px-6 py-12 sm:px-10 lg:px-12 xl:px-16">

                        {/* Decorative background elements */}
                        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[35px] border-blue-100/50" />
                        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full border-[30px] border-cyan-100/50" />

                        <div className="relative z-10 w-full max-w-md">

                            {/* Mobile branding */}
                            <div className="mb-10 flex items-center gap-3 lg:hidden">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-500/30">
                                    <MdMonitorHeart className="text-3xl text-white" />
                                </div>

                                <div>
                                    <h1 className="text-xl font-bold text-[#28363d]">
                                        AI Dialysis
                                    </h1>
                                    <p className="text-[10px] font-semibold tracking-[0.25em] text-blue-600">
                                        ADMINISTRATION
                                    </p>
                                </div>
                            </div>

                            {/* Login card */}
                            <div
                                className="rounded-[2rem] border border-white bg-white/85 p-6 shadow-[0_25px_70px_-20px_rgba(37,99,235,0.20)] backdrop-blur-xl sm:p-9"
                                style={{
                                    boxShadow:
                                        "0 30px 70px -25px rgba(30,64,175,0.20), inset 0 1px 0 rgba(255,255,255,1)",
                                }}
                            >

                                {/* Heading */}
                                <div className="mb-8">
                                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-100 text-blue-600 shadow-[0_8px_18px_rgba(37,99,235,0.12)]">
                                        <MdAdminPanelSettings className="text-3xl" />
                                    </div>

                                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
                                        Admin Workspace
                                    </p>

                                    <h2 className="text-3xl font-extrabold tracking-tight text-[#243746] sm:text-4xl">
                                        Welcome back
                                    </h2>

                                    <p className="mt-3 text-sm leading-6 text-slate-500">
                                        Sign in with your administrator
                                        credentials to access the management
                                        dashboard.
                                    </p>
                                </div>

                                {/* Login form */}
                                <form onSubmit={handleLogin} className="space-y-5">

                                    {/* Username */}
                                    <div>
                                        <label
                                            htmlFor="adminUsername"
                                            className="mb-2 block text-sm font-bold text-slate-700"
                                        >
                                            Username
                                        </label>

                                        <div className="group relative">
                                            <MdAdminPanelSettings className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400 transition-colors group-focus-within:text-blue-600" />

                                            <input
                                                id="adminUsername"
                                                name="username"
                                                type="text"
                                                placeholder="Enter your username"
                                                value={username}
                                                onChange={(e) => {
                                                    setUsername(e.target.value);
                                                    setError("");
                                                }}
                                                autoComplete="username"
                                                autoCapitalize="none"
                                                spellCheck={false}
                                                required
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-4 pl-12 pr-4 text-sm text-slate-800 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-blue-200 hover:bg-white focus:-translate-y-0.5 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label
                                            htmlFor="adminPassword"
                                            className="mb-2 block text-sm font-bold text-slate-700"
                                        >
                                            Password
                                        </label>

                                        <div className="group relative">
                                            <MdOutlineLock className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-xl text-slate-400 transition-colors group-focus-within:text-blue-600" />

                                            <input
                                                id="adminPassword"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter your password"
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    setError("");
                                                }}
                                                autoComplete="current-password"
                                                required
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-4 pl-12 pr-12 text-sm text-slate-800 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-blue-200 hover:bg-white focus:-translate-y-0.5 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPassword((prev) => !prev)
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                aria-label={
                                                    showPassword
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                            >
                                                {showPassword ? (
                                                    <MdVisibilityOff className="text-xl" />
                                                ) : (
                                                    <MdVisibility className="text-xl" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remember me and forgot password */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                        <label className="flex cursor-pointer items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) =>
                                                    setRememberMe(e.target.checked)
                                                }
                                                className="h-4 w-4 rounded border-slate-300 accent-blue-600 focus:ring-blue-500"
                                            />

                                            <span className="text-sm text-slate-600">
                                                Remember me
                                            </span>
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setError(
                                                    "Please contact your system administrator to reset your password."
                                                )
                                            }
                                            className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>

                                    {/* Error */}
                                    {error && (
                                        <div
                                            role="alert"
                                            aria-live="polite"
                                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                                        >
                                            {error}
                                        </div>
                                    )}

                                    {/* Submit button */}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#243746] via-[#31566b] to-[#16718b] py-4 text-sm font-bold text-white shadow-[0_12px_25px_-8px_rgba(15,73,110,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_35px_-8px_rgba(15,73,110,0.55)] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                                        {isLoading ? (
                                            <>
                                                <span className="relative h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                <span className="relative">
                                                    Authenticating...
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="relative">
                                                    Sign in to Admin
                                                </span>
                                                <MdArrowForward className="relative text-xl transition-transform duration-300 group-hover:translate-x-1" />
                                            </>
                                        )}
                                    </button>

                                    {/* Security notice */}
                                    <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-cyan-50/80 p-4 shadow-inner">
                                        <MdOutlineHealthAndSafety className="mt-0.5 shrink-0 text-2xl text-emerald-600" />

                                        <div>
                                            <p className="text-xs font-bold text-slate-700">
                                                Protected administrative access
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                This system is for authorized
                                                personnel only. Access and activity
                                                may be monitored and recorded.
                                            </p>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Footer */}
                            <div className="mt-7 text-center">
                                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                                    <MdSecurity className="text-base" />
                                    <span>
                                        AI Dialysis Scheduling &amp; Monitoring
                                        System
                                    </span>
                                </div>

                                <p className="mt-2 text-xs text-slate-400">
                                    © 2026 All rights reserved.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
