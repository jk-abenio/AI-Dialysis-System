import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { getMachines } from "../services/machineService";
import AddMachineModal from "../components/machines/AddMachineModal";
import DeleteMachineModal from "../components/machines/DeleteMachineModal";
import Toast from "../components/Toast";
import {
    FaPlus,
    FaEdit,
    FaTrash,
    FaSearch,
    FaSyncAlt,
    FaDesktop,
    FaCheckCircle,
    FaTools,
    FaExclamationCircle,
    FaTimes,
} from "react-icons/fa";

export default function Machines() {
    const [machines, setMachines] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [search, setSearch] = useState("");
    const [deleteModal, setDeleteModal] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [toast, setToast] = useState({
        message: "",
        type: "success",
    });

    const closeToast = useCallback(() => {
        setToast({ message: "", type: "success" });
    }, []);

    const loadMachines = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getMachines();
            setMachines(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load machines:", err);
            setError("Unable to load machines. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMachines();
    }, [loadMachines]);

    // Safely handle null, undefined, and non-string field values.
    const getText = (value) => String(value ?? "").trim();

    const filteredMachines = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) return machines;

        return machines.filter((machine) =>
            [
                machine.machine_number,
                machine.machine_code,
                machine.brand,
                machine.location,
                machine.status,
            ].some((value) =>
                getText(value).toLowerCase().includes(keyword)
            )
        );
    }, [machines, search]);

    const availableCount = machines.filter(
        (machine) => getText(machine.status).toLowerCase() === "available"
    ).length;

    const inUseCount = machines.filter(
        (machine) => getText(machine.status).toLowerCase() === "in use"
    ).length;

    const otherCount = machines.length - availableCount - inUseCount;

    const getStatusStyle = (status) => {
        switch (getText(status).toLowerCase()) {
            case "available":
                return "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200";

            case "in use":
                return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";

            case "maintenance":
                return "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200";

            case "unavailable":
            case "out of service":
                return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";

            default:
                return "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200";
        }
    };

    const closeAddModal = () => {
        setOpenModal(false);
        setSelectedMachine(null);
    };

    const closeDeleteModal = () => {
        setDeleteModal(false);
        setSelectedMachine(null);
    };

    const summaryCards = [
        {
            label: "Total Machines",
            count: machines.length,
            icon: FaDesktop,
            iconStyle: "bg-blue-50 text-blue-600",
            description: "Registered machines",
        },
        {
            label: "Available",
            count: availableCount,
            icon: FaCheckCircle,
            iconStyle: "bg-green-50 text-green-600",
            description: "Ready for use",
        },
        {
            label: "In Use",
            count: inUseCount,
            icon: FaDesktop,
            iconStyle: "bg-amber-50 text-amber-600",
            description: "Currently in operation",
        },
        {
            label: "Other Status",
            count: otherCount,
            icon: FaTools,
            iconStyle: "bg-orange-50 text-orange-600",
            description: "Maintenance or unavailable",
        },
    ];

    return (
        <DashboardLayout>
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={closeToast}
            />
            <div className="space-y-6 pb-8">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                            <FaDesktop className="text-blue-600" />
                            <span>Equipment Management</span>
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl">
                            Machine Management
                        </h1>

                        <p className="mt-2 text-sm text-gray-500 sm:text-base">
                            Monitor, manage, and maintain your dialysis machines.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={loadMachines}
                            disabled={loading}
                            aria-label="Refresh machine list"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FaSyncAlt
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setSelectedMachine(null);
                                setOpenModal(true);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                        >
                            <FaPlus />
                            Add Machine
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <div
                                key={card.label}
                                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">
                                            {card.label}
                                        </p>

                                        <p className="mt-3 text-3xl font-bold tracking-tight text-gray-800">
                                            {loading ? "—" : card.count}
                                        </p>

                                        <p className="mt-2 text-xs text-gray-400">
                                            {card.description}
                                        </p>
                                    </div>

                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconStyle}`}
                                    >
                                        <Icon className="text-lg" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Machine List */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                Dialysis Machines
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                View and manage registered equipment.
                            </p>
                        </div>

                        <div className="relative w-full sm:max-w-sm">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

                            <input
                                type="search"
                                placeholder="Search by name, code, brand..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search machines"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-10 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    aria-label="Clear search"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                                >
                                    <FaTimes />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div
                            role="alert"
                            className="m-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex items-start gap-3">
                                <FaExclamationCircle className="mt-0.5 shrink-0 text-red-500" />

                                <div>
                                    <p className="text-sm font-semibold text-red-700">
                                        Something went wrong
                                    </p>
                                    <p className="mt-1 text-sm text-red-600">
                                        {error}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={loadMachines}
                                className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 sm:self-center"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-left">
                            <thead className="bg-gray-50">
                                <tr className="border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Machine
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Machine Code
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Brand
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Location
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-16 text-center"
                                        >
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

                                                <p className="mt-4 text-sm font-medium text-gray-600">
                                                    Loading machines...
                                                </p>

                                                <p className="mt-1 text-xs text-gray-400">
                                                    Please wait a moment.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-8 text-center text-sm text-gray-500"
                                        >
                                            Machine data could not be displayed.
                                        </td>
                                    </tr>
                                ) : filteredMachines.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-16 text-center"
                                        >
                                            <div className="mx-auto flex max-w-sm flex-col items-center">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                                                    <FaDesktop className="text-2xl" />
                                                </div>

                                                <h3 className="mt-4 text-base font-semibold text-gray-700">
                                                    {search
                                                        ? "No matching machines"
                                                        : "No machines yet"}
                                                </h3>

                                                <p className="mt-2 text-sm text-gray-500">
                                                    {search
                                                        ? "Try another keyword or clear your search."
                                                        : "Add a dialysis machine to start managing your equipment."}
                                                </p>

                                                {search ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSearch("")}
                                                        className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800"
                                                    >
                                                        Clear search
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedMachine(null);
                                                            setOpenModal(true);
                                                        }}
                                                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                                                    >
                                                        <FaPlus />
                                                        Add Machine
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMachines.map((machine) => (
                                        <tr
                                            key={machine.id}
                                            className="transition-colors duration-150 hover:bg-blue-50/40"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                                        <FaDesktop />
                                                    </div>

                                                    <div>
                                                        <p className="font-semibold text-gray-800">
                                                            {getText(machine.machine_number) || "Unnamed machine"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-400">
                                                            Machine ID: {machine.id ?? "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="rounded-md bg-gray-100 px-2.5 py-1 font-mono text-xs font-medium text-gray-600">
                                                    {getText(machine.machine_code) || "—"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {getText(machine.brand) || "—"}
                                            </td>

                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {getText(machine.location) || "—"}
                                            </td>

                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyle(machine.status)}`}
                                                >
                                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                    {getText(machine.status) || "Unknown"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedMachine(machine);
                                                            setOpenModal(true);
                                                        }}
                                                        title="Edit machine"
                                                        aria-label={`Edit ${getText(machine.machine_number) || "machine"}`}
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition hover:border-blue-200 hover:bg-blue-100 active:scale-95"
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedMachine(machine);
                                                            setDeleteModal(true);
                                                        }}
                                                        title="Delete machine"
                                                        aria-label={`Delete ${getText(machine.machine_number) || "machine"}`}
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:border-red-200 hover:bg-red-100 active:scale-95"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    {!loading && !error && (
                        <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50/70 px-5 py-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                Showing{" "}
                                <span className="font-semibold text-gray-700">
                                    {filteredMachines.length}
                                </span>{" "}
                                of{" "}
                                <span className="font-semibold text-gray-700">
                                    {machines.length}
                                </span>{" "}
                                machines
                            </p>

                            {search && (
                                <p>
                                    Filtered by:{" "}
                                    <span className="font-medium text-gray-700">
                                        "{search}"
                                    </span>
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Add / Edit Modal */}
                <AddMachineModal
                    open={openModal}
                    machine={selectedMachine}
                    onClose={closeAddModal}
                    onSuccess={async () => {
                        await loadMachines();

                        setToast({
                            message: selectedMachine
                                ? "Machine updated successfully."
                                : "Machine added successfully.",
                            type: "success",
                        });
                    }}
                />
                {/* Delete Confirmation Modal */}
                
                <DeleteMachineModal
                    open={deleteModal}
                    machine={selectedMachine}
                    onClose={closeDeleteModal}
                    onSuccess={async () => {
                        await loadMachines();

                        setToast({
                            message: "Machine deleted successfully.",
                            type: "success",
                        });
                    }}
                />

            </div>
        </DashboardLayout>
    );
}
