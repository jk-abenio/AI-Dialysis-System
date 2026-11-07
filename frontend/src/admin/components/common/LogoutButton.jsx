import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LogoutButton() {

    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {

        logout();

        navigate("/", { replace: true });

    };

    return (

        <button
            onClick={handleLogout}
            className="
                bg-red-600
                hover:bg-red-700
                text-white
                px-5
                py-2
                rounded-lg
                duration-300
            "
        >
            Logout
        </button>

    );

}