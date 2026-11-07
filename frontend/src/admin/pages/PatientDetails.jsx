import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    FaArrowLeft,
    FaCalendarAlt,
    FaHeartbeat,
    FaIdCard,
    FaNotesMedical,
    FaPencilAlt,
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
    FaUser,
    FaTint,
    FaWeight,
    FaClock,
    FaSyncAlt,
    FaExclamationCircle,
    FaCheckCircle,
    FaTimesCircle,
    FaEye,
    FaProcedures,
    FaBirthdayCake,
} from "react-icons/fa";

import AddPatientModal from "../components/patients/AddPatientModal";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import { getMedicalProfile } from "../services/medicalProfileService";
import AddMedicalProfileModal from "../components/patients/AddMedicalProfileModal";
import TreatmentDetailsModal from "../components/treatments/TreatmentDetailsModal";
import {
    getPatientTreatmentHistory,
    getPatientChart,
} from "../services/treatmentService";
import WeightChart from "../components/patients/WeightChart";

export default function PatientDetails() {
    const { id } = useParams();

    const [patient, setPatient] = useState(null);
    const [medicalProfile, setMedicalProfile] = useState(null);
    const [treatmentHistory, setTreatmentHistory] = useState([]);
    const [chartData, setChartData] = useState([]);

    const [editMedicalModal, setEditMedicalModal] = useState(false);
    const [editPatientModal, setEditPatientModal] = useState(false);
    const [selectedTreatment, setSelectedTreatment] = useState(null);
    const [openTreatmentModal, setOpenTreatmentModal] = useState(false);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const loadPatient = useCallback(
        async (showLoader = true) => {
            if (showLoader) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            setError("");

            try {
                // Load each section independently. An unavailable medical
                // profile or chart should not prevent patient details loading.
                const results = await Promise.allSettled([
                    api.get(`patients/${id}/`),
                    getMedicalProfile(id),
                    getPatientTreatmentHistory(id),
                    getPatientChart(id),
                ]);

                const [
                    patientResult,
                    profileResult,
                    historyResult,
                    chartResult,
                ] = results;

                if (patientResult.status === "rejected") {
                    throw patientResult.reason;
                }

                setPatient(patientResult.value.data);

                setMedicalProfile(
                    profileResult.status === "fulfilled"
                        ? profileResult.value
                        : null
                );

                setTreatmentHistory(
                    historyResult.status === "fulfilled" &&
                        Array.isArray(historyResult.value)
                        ? historyResult.value
                        : []
                );

                setChartData(
                    chartResult.status === "fulfilled" &&
                        Array.isArray(chartResult.value)
                        ? chartResult.value
                        : []
                );

                if (
                    profileResult.status === "rejected" ||
                    historyResult.status === "rejected" ||
                    chartResult.status === "rejected"
                ) {
                    console.warn(
                        "Some patient detail sections could not be loaded.",
                        {
                            profile: profileResult.status,
                            history: historyResult.status,
                            chart: chartResult.status,
                        }
                    );
                }
            } catch (err) {
                console.error("Failed to load patient details:", err);
                setError(
                    "Unable to load this patient's details. Please check your connection and try again."
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [id]
    );

    useEffect(() => {
        loadPatient();
    }, [loadPatient]);

    const refreshAfterPatientEdit = async () => {
        await loadPatient(false);
        setEditPatientModal(false);
    };

    const refreshAfterMedicalEdit = async () => {
        await loadPatient(false);
        setEditMedicalModal(false);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="space-y-6 p-1 sm:p-2">
                    <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
                    <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
                        <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm lg:col-span-2" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-28 animate-pulse rounded-2xl bg-white shadow-sm"
                            />
                        ))}
                    </div>

                    <p className="text-sm text-slate-500">
                        Loading patient records...
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !patient) {
        return (
            <DashboardLayout>
                <div className="mx-auto max-w-2xl py-16 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">
                        <FaExclamationCircle />
                    </div>

                    <h1 className="mt-5 text-2xl font-bold text-slate-800">
                        Unable to display patient
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        {error || "The requested patient record was not found."}
                    </p>

                    <button
                        type="button"
                        onClick={() => loadPatient()}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
                    >
                        <FaSyncAlt />
                        Try again
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const fullName = [
        patient.first_name,
        patient.middle_name,
        patient.last_name,
    ]
        .filter(Boolean)
        .join(" ");

    const initials = [
        patient.first_name?.[0],
        patient.last_name?.[0],
    ]
        .filter(Boolean)
        .join("")
        .toUpperCase() || "P";

    const isActive =
        String(patient.status ?? "").toLowerCase() === "active";

    return (
        <DashboardLayout>
            <div className="space-y-6 bg-slate-50/60 p-1 pb-8 sm:space-y-8 sm:p-2">
                {/* Page header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-700">
                            <FaIdCard />
                            Patient Administration
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                            Patient Overview
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Review personal information, medical details, weight
                            progress, and treatment history.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => loadPatient(false)}
                        disabled={refreshing}
                        className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                    >
                        <FaSyncAlt
                            className={refreshing ? "animate-spin" : ""}
                        />
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {/* Refresh error banner */}
                {error && (
                    <div
                        role="alert"
                        className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <p className="text-sm text-red-700">{error}</p>
                        <button
                            type="button"
                            onClick={() => loadPatient()}
                            className="self-start rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 sm:self-auto"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Patient hero and personal information */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Patient identity card */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="h-24 bg-gradient-to-r from-slate-800 via-slate-700 to-cyan-800" />

                        <div className="-mt-12 px-5 pb-6 sm:px-6">
                            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-cyan-50 text-3xl font-bold text-cyan-700 shadow-sm">
                                {initials}
                            </div>

                            <h2 className="mt-4 break-words text-2xl font-bold text-slate-800">
                                {fullName || "Unnamed Patient"}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Patient ID{" "}
                                <span className="font-mono font-semibold text-slate-700">
                                    #{patient.id}
                                </span>
                            </p>

                            <div className="mt-4">
                                <span
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                        isActive
                                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                                            : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
                                    }`}
                                >
                                    <span
                                        className={`h-2 w-2 rounded-full ${
                                            isActive
                                                ? "bg-emerald-500"
                                                : "bg-slate-400"
                                        }`}
                                    />
                                    {patient.status || "Unknown status"}
                                </span>
                            </div>

                            <div className="mt-6 space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setEditPatientModal(true)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                                >
                                    <FaPencilAlt />
                                    Edit Patient
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEditMedicalModal(true)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-4 focus:ring-cyan-50"
                                >
                                    <FaNotesMedical />
                                    {medicalProfile
                                        ? "Edit Medical Profile"
                                        : "Add Medical Profile"}
                                </button>
                            </div>

                            <div className="mt-6 border-t border-slate-100 pt-5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Quick information
                                </p>

                                <div className="mt-4 space-y-4">
                                    <QuickInfo
                                        icon={<FaPhone />}
                                        label="Contact"
                                        value={patient.contact_number}
                                    />
                                    <QuickInfo
                                        icon={<FaEnvelope />}
                                        label="Email"
                                        value={patient.email}
                                    />
                                    <QuickInfo
                                        icon={<FaTint />}
                                        label="Blood type"
                                        value={patient.blood_type}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Personal information */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:col-span-2">
                        <SectionHeading
                            icon={<FaUser />}
                            title="Personal Information"
                            subtitle="Patient identity and contact details"
                        />

                        <div className="mt-7 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                            <InfoField
                                label="First Name"
                                value={patient.first_name}
                            />
                            <InfoField
                                label="Middle Name"
                                value={patient.middle_name}
                            />
                            <InfoField
                                label="Last Name"
                                value={patient.last_name}
                            />
                            <InfoField
                                label="Age"
                                value={
                                    patient.age != null
                                        ? `${patient.age} years`
                                        : null
                                }
                            />
                            <InfoField
                                label="Gender"
                                value={patient.gender}
                            />
                            <InfoField
                                label="Blood Type"
                                value={patient.blood_type}
                            />
                            <InfoField
                                label="Birth Date"
                                value={formatDate(patient.birth_date)}
                            />
                            <InfoField
                                label="Contact Number"
                                value={patient.contact_number}
                            />
                            <InfoField
                                label="Email Address"
                                value={patient.email}
                            />

                            <InfoField
                                label="Emergency Contact"
                                value={patient.emergency_contact}
                            />

                            <div className="sm:col-span-2">
                                <InfoField
                                    label="Home Address"
                                    value={patient.address}
                                    icon={<FaMapMarkerAlt />}
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Medical summary cards */}
                <div>
                    <SectionHeading
                        icon={<FaHeartbeat />}
                        title="Medical Summary"
                        subtitle="Key details from the patient's medical profile"
                    />

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard
                            icon={<FaBirthdayCake />}
                            label="Age"
                            value={
                                patient.age != null
                                    ? `${patient.age} years`
                                    : "—"
                            }
                            accent="cyan"
                        />

                        <SummaryCard
                            icon={<FaWeight />}
                            label="Current Weight"
                            value={
                                medicalProfile?.weight != null
                                    ? `${medicalProfile.weight} kg`
                                    : "—"
                            }
                            accent="blue"
                        />

                        <SummaryCard
                            icon={<FaCalendarAlt />}
                            label="Dialysis Frequency"
                            value={
                                medicalProfile?.dialysis_frequency ?? "—"
                            }
                            accent="violet"
                        />

                        <SummaryCard
                            icon={<FaClock />}
                            label="Preferred Shift"
                            value={medicalProfile?.preferred_shift ?? "—"}
                            accent="amber"
                        />
                    </div>
                </div>

                {/* Medical profile */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <SectionHeading
                        icon={<FaNotesMedical />}
                        title="Medical Profile"
                        subtitle="Dialysis requirements and recorded medical conditions"
                        action={
                            <button
                                type="button"
                                onClick={() => setEditMedicalModal(true)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
                            >
                                <FaPencilAlt />
                                Edit
                            </button>
                        }
                    />

                    {medicalProfile ? (
                        <>
                            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <DetailTile
                                    label="Weight"
                                    value={
                                        medicalProfile.weight != null
                                            ? `${medicalProfile.weight} kg`
                                            : "—"
                                    }
                                />
                                <DetailTile
                                    label="Dialysis Frequency"
                                    value={
                                        medicalProfile.dialysis_frequency
                                    }
                                />
                                <DetailTile
                                    label="Dialysis Duration"
                                    value={
                                        medicalProfile.dialysis_duration != null
                                            ? `${medicalProfile.dialysis_duration} hours`
                                            : "—"
                                    }
                                />
                                <DetailTile
                                    label="Preferred Shift"
                                    value={medicalProfile.preferred_shift}
                                />
                            </div>

                            <div className="mt-7">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Recorded conditions
                                </p>

                                <div className="mt-3 flex flex-wrap gap-3">
                                    <ConditionBadge
                                        label="Diabetes"
                                        present={medicalProfile.diabetes}
                                    />
                                    <ConditionBadge
                                        label="Hypertension"
                                        present={medicalProfile.hypertension}
                                    />
                                </div>
                            </div>

                            <div className="mt-7 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Vascular Access
                                </p>
                                <p className="mt-2 whitespace-pre-wrap font-semibold text-slate-700">
                                    {medicalProfile.vascular_access || "—"}
                                </p>
                            </div>

                            <p className="mt-5 text-xs leading-5 text-slate-400">
                                This section displays recorded information.
                                Confirm clinical details with the patient's
                                healthcare team before making treatment decisions.
                            </p>
                        </>
                    ) : (
                        <EmptyState
                            icon={<FaNotesMedical />}
                            title="No Medical Profile"
                            description="A medical profile has not been loaded for this patient. You can add or update one here."
                            action={
                                <button
                                    type="button"
                                    onClick={() => setEditMedicalModal(true)}
                                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
                                >
                                    <FaNotesMedical />
                                    Add Medical Profile
                                </button>
                            }
                        />
                    )}
                </section>

                {/* Weight progress */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <SectionHeading
                        icon={<FaWeight />}
                        title="Weight Progress"
                        subtitle="Weight measurements recorded over time"
                    />

                    <div className="mt-6">
                        {chartData.length > 0 ? (
                            <WeightChart data={chartData} />
                        ) : (
                            <EmptyState
                                icon={<FaWeight />}
                                title="No Weight Data"
                                description="Weight progress will appear here when measurements are available."
                            />
                        )}
                    </div>
                </section>

                {/* Treatment history */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="p-5 sm:p-7">
                        <SectionHeading
                            icon={<FaProcedures />}
                            title="Treatment History"
                            subtitle={`${treatmentHistory.length} recorded treatment${
                                treatmentHistory.length === 1 ? "" : "s"
                            }`}
                        />
                    </div>

                    {treatmentHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[950px] text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                        <th className="px-5 py-4 font-semibold">
                                            Date
                                        </th>
                                        <th className="px-5 py-4 font-semibold">
                                            Machine
                                        </th>
                                        <th className="px-5 py-4 font-semibold">
                                            Pre Weight
                                        </th>
                                        <th className="px-5 py-4 font-semibold">
                                            Post Weight
                                        </th>
                                        <th className="px-5 py-4 font-semibold">
                                            BP Before
                                        </th>
                                        <th className="px-5 py-4 font-semibold">
                                            BP After
                                        </th>
                                        <th className="px-5 py-4 text-center font-semibold">
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {treatmentHistory.map((record) => (
                                        <tr
                                            key={record.id}
                                            className="transition-colors hover:bg-cyan-50/40"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                                                {formatDate(
                                                    record.dialysis_date
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {record.machine_name || "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                                {record.pre_weight != null
                                                    ? `${record.pre_weight} kg`
                                                    : "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                                {record.post_weight != null
                                                    ? `${record.post_weight} kg`
                                                    : "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                                {record.blood_pressure_before ||
                                                    "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                                {record.blood_pressure_after ||
                                                    "—"}
                                            </td>

                                            <td className="px-5 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedTreatment(
                                                            record
                                                        );
                                                        setOpenTreatmentModal(
                                                            true
                                                        );
                                                    }}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                                                >
                                                    <FaEye />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="px-5 pb-7 sm:px-7">
                            <EmptyState
                                icon={<FaProcedures />}
                                title="No Treatment History"
                                description="There are no treatment records available for this patient yet."
                            />
                        </div>
                    )}

                    {treatmentHistory.length > 0 && (
                        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                            <p className="text-xs text-slate-400">
                                Select View to inspect a treatment record.
                            </p>
                        </div>
                    )}
                </section>
            </div>

            {/* Edit patient modal */}
            <AddPatientModal
                open={editPatientModal}
                patient={patient}
                onClose={() => setEditPatientModal(false)}
                onSuccess={refreshAfterPatientEdit}
            />

            {/* Add / edit medical profile modal */}
            <AddMedicalProfileModal
                open={editMedicalModal}
                patient={patient}
                onClose={() => setEditMedicalModal(false)}
                onSuccess={refreshAfterMedicalEdit}
            />

            {/* Treatment details modal */}
            <TreatmentDetailsModal
                open={openTreatmentModal}
                treatment={selectedTreatment}
                onClose={() => {
                    setOpenTreatmentModal(false);
                    setSelectedTreatment(null);
                }}
            />
        </DashboardLayout>
    );
}

function SectionHeading({ icon, title, subtitle, action }) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                    {icon}
                </div>

                <div>
                    <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-500">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {action}
        </div>
    );
}

function InfoField({ label, value, icon }) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {label}
            </p>

            <div className="mt-2 flex items-start gap-2">
                {icon && (
                    <span className="mt-0.5 shrink-0 text-cyan-700">
                        {icon}
                    </span>
                )}
                <p className="break-words text-sm font-semibold leading-6 text-slate-700">
                    {value != null && value !== "" ? value : "—"}
                </p>
            </div>
        </div>
    );
}

function QuickInfo({ icon, label, value }) {
    return (
        <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-1 break-words text-sm font-medium text-slate-700">
                    {value || "Not provided"}
                </p>
            </div>
        </div>
    );
}

function SummaryCard({ icon, label, value, accent }) {
    const accentStyles = {
        cyan: "bg-cyan-50 text-cyan-700",
        blue: "bg-blue-50 text-blue-700",
        violet: "bg-violet-50 text-violet-700",
        amber: "bg-amber-50 text-amber-700",
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                        {label}
                    </p>
                    <p className="mt-3 break-words text-xl font-bold text-slate-800 sm:text-2xl">
                        {value || "—"}
                    </p>
                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${accentStyles[accent]}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function DetailTile({ label, value }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {label}
            </p>
            <p className="mt-2 break-words text-sm font-bold text-slate-700">
                {value != null && value !== "" ? value : "—"}
            </p>
        </div>
    );
}

function ConditionBadge({ label, present }) {
    const isPresent = Boolean(present);

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ring-1 ring-inset ${
                isPresent
                    ? "bg-amber-50 text-amber-800 ring-amber-200"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
        >
            {isPresent ? <FaExclamationCircle /> : <FaCheckCircle />}
            {label}: {isPresent ? "Yes" : "No"}
        </span>
    );
}

function EmptyState({ icon, title, description, action }) {
    return (
        <div className="py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-400">
                {icon}
            </div>

            <h3 className="mt-4 font-semibold text-slate-700">{title}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {description}
            </p>

            {action}
        </div>
    );
}

function formatDate(value) {
    if (!value) return "—";

    // Avoid timezone shifts for API date-only strings such as YYYY-MM-DD.
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value));

    const date = dateOnly
        ? new Date(`${value}T12:00:00`)
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}