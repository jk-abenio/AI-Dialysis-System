import { setLogoutFunction } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import {
    createContext,
    useContext,
    useState,
    useEffect,
} from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {

    const navigate = useNavigate();

    const [user, setUser] = useState(() => {

        const localUser = localStorage.getItem("user");

        if (localUser) {
            return JSON.parse(localUser);
        }

        const sessionUser = sessionStorage.getItem("user");

        if (sessionUser) {
            return JSON.parse(sessionUser);
        }

        return null;

    });


    const login = (
        userData,
        accessToken,
        refreshToken,
        rememberMe = false
    ) => {

        // Clear any previous authentication
        localStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        sessionStorage.removeItem("user");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");


        // ========================================
        // REMEMBER ME
        // ========================================

        const storage = rememberMe
            ? localStorage
            : sessionStorage;


        storage.setItem(
            "user",
            JSON.stringify(userData)
        );

        storage.setItem(
            "access_token",
            accessToken
        );

        storage.setItem(
            "refresh_token",
            refreshToken
        );


        setUser(userData);

    };


    const logout = (expired = false) => {

        localStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        sessionStorage.removeItem("user");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");

        setUser(null);

        if (expired) {

            alert(
                "Your session has expired. Please log in again."
            );

        }

        navigate("/", {
            replace: true
        });

    };


    useEffect(() => {

        setLogoutFunction(logout);

    }, [logout]);


    return (

        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
            }}
        >

            {children}

        </AuthContext.Provider>

    );

}


export function useAuth() {

    return useContext(AuthContext);

}