import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaPlus,
    FaEdit,
    FaTrashAlt,
    FaSearch,
    FaClipboardList,
    FaEye,
    FaSyncAlt,
    FaUsers,
    FaUserCheck,
    FaUserTimes,
    FaTimes,
    FaExclamationCircle,
} from "react-icons/fa";
import Toast from "../components/Toast";
import DashboardLayout from "../layouts/DashboardLayout";
import { getPatients } from "../services/patientService";
import AddPatientModal from "../components/patients/AddPatientModal";
import DeletePatientModal from "../components/patients/DeletePatientModal";
import AddMedicalProfileModal from "../components/patients/AddMedicalProfileModal";

export default function Patients() {
    const navigate = useNavigate();

    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    
    const [toast, setToast] = useState({
        message: "",
        type: "success",
    });

    const closeToast = useCallback(() => {
        setToast({
            message: "",
            type: "success",
        });
    }, []);
    const [openModal, setOpenModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [medicalModal, setMedicalModal] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const loadPatients = useCallback(async (showLoader = true) => {
        if (showLoader) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        setError("");

        try {
            const data = await getPatients();
            setPatients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load patients:", err);
            setError(
                "Unable to load patients. Please check your connection and try again."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadPatients();
    }, [loadPatients]);

    const activeCount = patients.filter(
        (patient) =>
            String(patient.status ?? "").toLowerCase() === "active"
    ).length;

    const inactiveCount = patients.length - activeCount;

    const filteredPatients = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return patients.filter((patient) => {
            const fullName =
                `${patient.first_name ?? ""} ${patient.last_name ?? ""}`
                    .trim()
                    .toLowerCase();

            const matchesSearch =
                !keyword ||
                fullName.includes(keyword) ||
                String(patient.id ?? "").toLowerCase().includes(keyword) ||
                String(patient.contact_number ?? "")
                    .toLowerCase()
                    .includes(keyword) ||
                String(patient.email ?? "").toLowerCase().includes(keyword) ||
                String(patient.blood_type ?? "").toLowerCase().includes(keyword);

            const status = String(patient.status ?? "").toLowerCase();

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && status === "active") ||
                (statusFilter === "inactive" && status !== "active");

            return matchesSearch && matchesStatus;
        });
    }, [patients, search, statusFilter]);

    const closePatientModal = () => {
        setOpenModal(false);
        setSelectedPatient(null);
    };

    const closeDeleteModal = () => {
        setDeleteModal(false);
        setSelectedPatient(null);
    };

    const closeMedicalModal = () => {
        setMedicalModal(false);
        setSelectedPatient(null);
    };

    const getStatusStyles = (status) => {
        const normalizedStatus = String(status ?? "").toLowerCase();

        if (normalizedStatus === "active") {
            return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
        }

        if (normalizedStatus === "inactive") {
            return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";
        }

        return "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200";
    };

    return (
        <DashboardLayout>
            {/* Success Toast */}
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={closeToast}
            />
            <div className="min-h-screen space-y-6 bg-slate-50/60 p-1 pb-8 sm:p-2">
                {/* Page heading */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-700">
                            <span className="h-2 w-2 rounded-full bg-cyan-500" />
                            Patient Administration
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                            Patient Management
                        </h1>

                        <p className="mt-2 text-sm text-slate-500 sm:text-base">
                            View, manage, and maintain dialysis patient records.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => loadPatients(false)}
                            disabled={loading || refreshing}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FaSyncAlt
                                className={refreshing ? "animate-spin" : ""}
                            />
                            {refreshing ? "Refreshing..." : "Refresh"}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setSelectedPatient(null);
                                setOpenModal(true);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                        >
                            <FaPlus />
                            Add Patient
                        </button>
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div
                        role="alert"
                        className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="flex items-start gap-3">
                            <FaExclamationCircle className="mt-0.5 shrink-0 text-red-600" />

                            <div>
                                <p className="font-semibold text-red-800">
                                    Something went wrong
                                </p>
                                <p className="mt-1 text-sm text-red-700">
                                    {error}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadPatients()}
                            className="self-start rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 sm:self-auto"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <SummaryCard
                        icon={<FaUsers />}
                        label="Total Patients"
                        value={patients.length}
                        description="All registered patient records"
                        iconStyle="bg-cyan-50 text-cyan-700"
                    />

                    <SummaryCard
                        icon={<FaUserCheck />}
                        label="Active Patients"
                        value={activeCount}
                        description="Currently marked as active"
                        iconStyle="bg-emerald-50 text-emerald-700"
                    />

                    <SummaryCard
                        icon={<FaUserTimes />}
                        label="Other Statuses"
                        value={inactiveCount}
                        description="Inactive or unclassified records"
                        iconStyle="bg-amber-50 text-amber-700"
                    />
                </div>

                {/* Patient records panel */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5 sm:p-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    Patient Records
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Search and manage registered patients.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                {/* Search input */}
                                <div className="relative sm:min-w-72">
                                    <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                                    <input
                                        type="text"
                                        aria-label="Search patients"
                                        placeholder="Search name, ID, contact..."
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-50"
                                    />

                                    {search && (
                                        <button
                                            type="button"
                                            aria-label="Clear search"
                                            onClick={() => setSearch("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                                        >
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>

                                {/* Status filter */}
                                <select
                                    aria-label="Filter by patient status"
                                    value={statusFilter}
                                    onChange={(event) =>
                                        setStatusFilter(event.target.value)
                                    }
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-50"
                                >
                                    <option value="all">All statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">
                                        Inactive / Other
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm text-slate-500">
                                Showing{" "}
                                <span className="font-semibold text-slate-700">
                                    {loading ? "—" : filteredPatients.length}
                                </span>{" "}
                                of{" "}
                                <span className="font-semibold text-slate-700">
                                    {loading ? "—" : patients.length}
                                </span>{" "}
                                patients
                            </p>

                            {(search || statusFilter !== "all") && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch("");
                                        setStatusFilter("all");
                                    }}
                                    className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Responsive table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-left">
                            <thead>
                                <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                    <th className="px-5 py-4 font-semibold">
                                        Patient ID
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                        Patient
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                        Gender
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                        Contact
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                        Status
                                    </th>
                                    <th className="px-5 py-4 text-center font-semibold">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={index}>
                                            {Array.from({ length: 6 }).map(
                                                (_, cellIndex) => (
                                                    <td
                                                        key={cellIndex}
                                                        className="px-5 py-5"
                                                    >
                                                        <div className="h-4 animate-pulse rounded-md bg-slate-100" />
                                                    </td>
                                                )
                                            )}
                                        </tr>
                                    ))
                                ) : filteredPatients.length > 0 ? (
                                    filteredPatients.map((patient) => {
                                        const fullName =
                                            `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim() ||
                                            "Unnamed Patient";

                                        const displayStatus =
                                            patient.status || "Unknown";

                                        return (
                                            <tr
                                                key={patient.id}
                                                className="transition-colors hover:bg-cyan-50/40"
                                            >
                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <span className="font-mono text-sm font-semibold text-slate-500">
                                                        #{patient.patient_id}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-sm font-bold text-cyan-700 ring-1 ring-cyan-100">
                                                            {(
                                                                patient.first_name?.[0] ||
                                                                patient.last_name?.[0] ||
                                                                "P"
                                                            ).toUpperCase()}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-800">
                                                                {fullName}
                                                            </p>
                                                            <p className="mt-0.5 max-w-56 truncate text-xs text-slate-400">
                                                                {patient.email ||
                                                                    "No email provided"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-slate-600">
                                                    {patient.gender || "—"}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                                    {patient.contact_number || "—"}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyles(
                                                            displayStatus
                                                        )}`}
                                                    >
                                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                        {displayStatus}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <ActionButton
                                                            label="View patient"
                                                            color="green"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/patients/${patient.id}`
                                                                )
                                                            }
                                                        >
                                                            <FaEye />
                                                        </ActionButton>

                                                        <ActionButton
                                                            label="Medical profile"
                                                            color="cyan"
                                                            onClick={() => {
                                                                setSelectedPatient(patient);
                                                                setMedicalModal(true);
                                                            }}
                                                        >
                                                            <FaClipboardList />
                                                        </ActionButton>

                                                        <ActionButton
                                                            label="Edit patient"
                                                            color="blue"
                                                            onClick={() => {
                                                                setSelectedPatient(patient);
                                                                setOpenModal(true);
                                                            }}
                                                        >
                                                            <FaEdit />
                                                        </ActionButton>

                                                        <ActionButton
                                                            label="Delete patient"
                                                            color="red"
                                                            onClick={() => {
                                                                setSelectedPatient(patient);
                                                                setDeleteModal(true);
                                                            }}
                                                        >
                                                            <FaTrashAlt />
                                                        </ActionButton>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-5 py-16 text-center"
                                        >
                                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                                <FaSearch className="text-xl" />
                                            </div>

                                            <h3 className="mt-4 font-semibold text-slate-700">
                                                {error
                                                    ? "Patient records unavailable"
                                                    : search || statusFilter !== "all"
                                                      ? "No matching patients"
                                                      : "No patients registered"}
                                            </h3>

                                            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                                                {error
                                                    ? "Try refreshing the records after checking your connection."
                                                    : search || statusFilter !== "all"
                                                      ? "Try another search term or clear your filters."
                                                      : "Add a patient to start building your patient records."}
                                            </p>

                                            {!error &&
                                                !search &&
                                                statusFilter === "all" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedPatient(null);
                                                            setOpenModal(true);
                                                        }}
                                                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
                                                    >
                                                        <FaPlus />
                                                        Add Patient
                                                    </button>
                                                )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                        <p className="text-xs text-slate-400">
                            Patient records are loaded from the connected system.
                        </p>
                    </div>
                </section>
            </div>

            {/* Add / Edit Patient Modal */}
            
            <AddPatientModal
                open={openModal}
                patient={selectedPatient}
                onClose={closePatientModal}
                onSuccess={async () => {
                    await loadPatients(false);

                    setToast({
                        message: selectedPatient
                            ? "Patient updated successfully."
                            : "Patient added successfully.",
                        type: "success",
                    });
                }}
            />
            
            {/* Delete Patient Modal */}
            <DeletePatientModal
                open={deleteModal}
                patient={selectedPatient}
                onClose={closeDeleteModal}
                onSuccess={async () => {
                    await loadPatients(false);

                    setToast({
                        message: "Patient deleted successfully.",
                        type: "success",
                    });
                }}
            />

            {/* Medical Profile Modal */}
            <AddMedicalProfileModal
                open={medicalModal}
                patient={selectedPatient}
                onClose={closeMedicalModal}
                onSuccess={async () => {
                    await loadPatients(false);

                    setToast({
                        message: "Medical profile saved successfully.",
                        type: "success",
                    });
                }}
            />

        </DashboardLayout>
    );
}

function SummaryCard({ icon, label, value, description, iconStyle }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {label}
                    </p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800">
                        {value}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                        {description}
                    </p>
                </div>

                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${iconStyle}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function ActionButton({ children, label, color, onClick }) {
    const colorStyles = {
        green: "text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-emerald-200",
        cyan: "text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 focus-visible:ring-cyan-200",
        blue: "text-blue-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-blue-200",
        red: "text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:ring-rose-200",
    };

    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className={`
                inline-flex h-9 w-9 items-center justify-center
                rounded-xl border border-transparent
                text-sm transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2
                active:scale-95
                ${colorStyles[color] || colorStyles.cyan}
            `}
        >
            {children}
        </button>
    );
}
