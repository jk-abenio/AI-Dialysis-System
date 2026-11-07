import { Navigate, Outlet } from "react-router-dom";
import { usePatientAuth } from "../context/PatientAuthContext";

export default function PatientProtectedRoute() {

    const { patient } = usePatientAuth();

    const token = localStorage.getItem("patientToken");

    if (!patient || !token) {
        return <Navigate to="/patient/login" replace />;
    }

    return <Outlet />;
}