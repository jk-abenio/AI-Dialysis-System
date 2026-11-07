
import { useEffect, useState, useCallback } from "react";
import PatientLayout from "../layouts/PatientLayout";
import { getPatientProfile } from "../services/profileService";
import PatientLoading from "../components/PatientLoading";
import {
    FaHeartbeat,
    FaUserCircle,
    FaIdCard,
    FaUser,
    FaBirthdayCake,
    FaVenusMars,
    FaTint,
    FaPhoneAlt,
    FaEnvelope,
    FaMapMarkerAlt,
    FaWeight,
    FaCalendarAlt,
    FaClock,
    FaStethoscope,
    FaNotesMedical,
    FaCheckCircle,
    FaExclamationCircle,
    FaShieldAlt,
    FaCalendarCheck,
} from "react-icons/fa";

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const handleFadeOutComplete = useCallback(() => {
        setLoading(false);
    }, []);

    const loadProfile = useCallback(async () => {
        const startTime = Date.now();

        try {
            setLoadError(false);

            const data = await getPatientProfile();
            setProfile(data);
        } catch (error) {
            console.error("Failed to load patient profile:", error);
            setLoadError(true);
        } finally {
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, 2000 - elapsed);

            if (remainingTime > 0) {
                await new Promise((resolve) =>
                    setTimeout(resolve, remainingTime)
                );
            }

            setFadeOut(true);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const personal = profile?.personal || {};
    const medical = profile?.medical || {};

    const fullName = [
        personal.first_name,
        personal.middle_name,
        personal.last_name,
    ]
        .filter((part) => part && part.trim())
        .join(" ");

    const displayValue = (value, suffix = "") => {
        if (value === null || value === undefined || value === "") {
            return "Not provided";
        }

        return `${value}${suffix}`;
    };

    const yesNo = (value) => {
        if (value === true || value === 1 || value === "true") {
            return "Yes";
        }

        if (value === false || value === 0 || value === "false") {
            return "No";
        }

        return "Not provided";
    };

    return (
        <PatientLayout>
            <div className="min-h-screen bg-slate-50/70 -m-4 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
                <div className="mx-auto max-w-7xl space-y-7">

                    {/* Page header */}
                    <header>
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-700">
                            <FaHeartbeat />
                            <span>PATIENT PORTAL</span>
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                            My Profile
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                            View your personal details and medical information in one place.
                        </p>
                    </header>

                    {/* Error state */}
                    {loadError && (
                        <div
                            role="alert"
                            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex items-start gap-3">
                                <FaExclamationCircle className="mt-1 text-red-600" />

                                <div>
                                    <p className="font-semibold text-red-800">
                                        Unable to load your profile
                                    </p>
                                    <p className="mt-1 text-sm text-red-700">
                                        Please check your connection and try again.
                                    </p>
                                    <p className="mt-1 text-sm text-red-700">
                                        It’s also possible that your medical profile hasn’t been created yet.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setLoading(true);
                                    setFadeOut(false);
                                    loadProfile();
                                }}
                                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Patient overview */}
                    {!loadError && profile && (
                        <>
                            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#28383f] via-[#30474d] to-[#176c70] p-6 text-white shadow-xl shadow-slate-300/30 sm:p-8">
                                <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/10" />
                                <div className="pointer-events-none absolute -right-4 -top-8 h-36 w-36 rounded-full border border-white/10" />

                                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-5xl text-teal-100">
                                        <FaUserCircle />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-teal-200">
                                            Patient Overview
                                        </p>

                                        <h2 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                                            {fullName || "Patient"}
                                        </h2>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-slate-100">
                                                <FaIdCard className="text-teal-200" />
                                                ID: {displayValue(personal.patient_id)}
                                            </span>

                                            {personal.blood_type && (
                                                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-slate-100">
                                                    <FaTint className="text-teal-200" />
                                                    {personal.blood_type}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-teal-100 sm:self-center">
                                        <FaShieldAlt />
                                        Personal Information
                                    </div>
                                </div>
                            </section>

                            {/* Information cards */}
                            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

                                {/* Personal information */}
                                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                                    <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-700">
                                            <FaUser />
                                        </div>

                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800">
                                                Personal Information
                                            </h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Your registered personal details
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-6">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <ProfileItem
                                                icon={<FaIdCard />}
                                                label="Patient ID"
                                                value={displayValue(personal.patient_id)}
                                            />

                                            <ProfileItem
                                                icon={<FaUser />}
                                                label="Full Name"
                                                value={fullName || "Not provided"}
                                            />

                                            <ProfileItem
                                                icon={<FaBirthdayCake />}
                                                label="Age"
                                                value={displayValue(personal.age, personal.age !== null && personal.age !== undefined && personal.age !== "" ? " years" : "")}
                                            />

                                            <ProfileItem
                                                icon={<FaVenusMars />}
                                                label="Gender"
                                                value={displayValue(personal.gender)}
                                            />

                                            <ProfileItem
                                                icon={<FaTint />}
                                                label="Blood Type"
                                                value={displayValue(personal.blood_type)}
                                            />

                                            <ProfileItem
                                                icon={<FaPhoneAlt />}
                                                label="Contact Number"
                                                value={displayValue(personal.contact_number)}
                                            />

                                            <ProfileItem
                                                icon={<FaEnvelope />}
                                                label="Email Address"
                                                value={displayValue(personal.email)}
                                            />

                                            <ProfileItem
                                                icon={<FaMapMarkerAlt />}
                                                label="Address"
                                                value={displayValue(personal.address)}
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Medical information */}
                                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                                    <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-700">
                                            <FaStethoscope />
                                        </div>

                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800">
                                                Medical Information
                                            </h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Your recorded treatment details
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-6">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <ProfileItem
                                                icon={<FaWeight />}
                                                label="Weight"
                                                value={displayValue(
                                                    medical.weight,
                                                    medical.weight !== null && medical.weight !== undefined && medical.weight !== "" ? " kg" : ""
                                                )}
                                            />

                                            <ProfileItem
                                                icon={<FaCalendarAlt />}
                                                label="Dialysis Frequency"
                                                value={displayValue(medical.dialysis_frequency)}
                                            />

                                            <ProfileItem
                                                icon={<FaClock />}
                                                label="Dialysis Duration"
                                                value={displayValue(
                                                    medical.dialysis_duration,
                                                    medical.dialysis_duration !== null && medical.dialysis_duration !== undefined && medical.dialysis_duration !== "" ? " hours" : ""
                                                )}
                                            />

                                            <ProfileItem
                                                icon={<FaCalendarCheck />}
                                                label="Preferred Shift"
                                                value={displayValue(medical.preferred_shift)}
                                            />

                                            <ProfileItem
                                                icon={<FaNotesMedical />}
                                                label="Diabetes"
                                                value={yesNo(medical.diabetes)}
                                                valueStyle={
                                                    medical.diabetes === true || medical.diabetes === 1 || medical.diabetes === "true"
                                                        ? "text-amber-700"
                                                        : ""
                                                }
                                            />

                                            <ProfileItem
                                                icon={<FaHeartbeat />}
                                                label="Hypertension"
                                                value={yesNo(medical.hypertension)}
                                                valueStyle={
                                                    medical.hypertension === true || medical.hypertension === 1 || medical.hypertension === "true"
                                                        ? "text-amber-700"
                                                        : ""
                                                }
                                            />

                                            <div className="sm:col-span-2">
                                                <ProfileItem
                                                    icon={<FaStethoscope />}
                                                    label="Vascular Access"
                                                    value={displayValue(medical.vascular_access)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Footer note */}
                            <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                                <p className="flex items-center gap-2">
                                    <FaHeartbeat className="text-teal-600" />
                                    Your health information, organized in one place.
                                </p>

                                <p>
                                    For corrections to your records, contact your dialysis center.
                                </p>
                            </footer>
                        </>
                    )}

                    {!loadError && !profile && !loading && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                            <FaUserCircle className="mx-auto text-4xl text-slate-300" />
                            <h2 className="mt-4 font-semibold text-slate-800">
                                Profile information unavailable
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Your profile could not be displayed. Please try again.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setLoading(true);
                                    setFadeOut(false);
                                    loadProfile();
                                }}
                                className="mt-5 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                            >
                                Reload profile
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading overlay */}
            {loading && (
                <PatientLoading
                    message="Loading your profile..."
                    fadeOut={fadeOut}
                    onFadeOutComplete={handleFadeOutComplete}
                />
            )}
        </PatientLayout>
    );
}

function ProfileItem({ icon, label, value, valueStyle = "" }) {
    return (
        <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-teal-100 hover:bg-teal-50/30">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm text-teal-700 shadow-sm ring-1 ring-slate-100">
                    {icon}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">
                        {label}
                    </p>

                    <p className={`mt-1 break-words text-sm font-semibold leading-6 text-slate-800 ${valueStyle}`}>
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}
