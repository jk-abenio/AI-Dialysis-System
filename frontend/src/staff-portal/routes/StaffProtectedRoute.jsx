
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext";

export default function StaffProtectedRoute() {
    const { isAuthenticated, loading } = useStaffAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
                    <p className="mt-4 text-sm font-medium text-slate-600">
                        Verifying staff session...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/staff/login"
                replace
                state={{ from: location }}
            />
        );
    }

    return <Outlet />;
}
