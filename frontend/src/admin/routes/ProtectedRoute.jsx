import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {

    const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

    if (!token) {

        return (
            <Navigate
                to="/"
                replace
            />
        );

    }

    return <Outlet />;

}