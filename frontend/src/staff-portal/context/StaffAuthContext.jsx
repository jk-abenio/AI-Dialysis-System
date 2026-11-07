
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

const StaffAuthContext = createContext(null);

const ACCESS_KEY = "staff_access_token";
const REFRESH_KEY = "staff_refresh_token";
const USER_KEY = "staff_user";

// Staff authentication uses sessionStorage so the staff session
// is separate from the Admin and Patient portal sessions.
function readStoredUser() {
    try {
        const raw = sessionStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function readStoredToken() {
    return sessionStorage.getItem(ACCESS_KEY) || "";
}

export function StaffAuthProvider({ children }) {
    const [user, setUser] = useState(readStoredUser);
    const [accessToken, setAccessToken] = useState(readStoredToken);

    // Save a successful staff login and immediately update React state.
    const login = useCallback((data) => {
        if (
            !data?.access ||
            !data?.refresh ||
            !data?.staff
        ) {
            throw new Error(
                "Invalid staff login response. Please try signing in again."
            );
        }

        sessionStorage.setItem(ACCESS_KEY, data.access);
        sessionStorage.setItem(REFRESH_KEY, data.refresh);
        sessionStorage.setItem(
            USER_KEY,
            JSON.stringify(data.staff)
        );

        setAccessToken(data.access);
        setUser(data.staff);
    }, []);

    // Clear only staff-specific credentials.
    const logout = useCallback(() => {
        sessionStorage.removeItem(ACCESS_KEY);
        sessionStorage.removeItem(REFRESH_KEY);
        sessionStorage.removeItem(USER_KEY);

        // Also clear any older staff keys if a previous version
        // of the application stored them in localStorage.
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);

        setUser(null);
        setAccessToken("");
    }, []);

    // Synchronize if staff session storage changes in another tab.
    useEffect(() => {
        const handleStorage = (event) => {
            if (
                event.key === ACCESS_KEY ||
                event.key === USER_KEY ||
                event.key === null
            ) {
                setUser(readStoredUser());
                setAccessToken(readStoredToken());
            }
        };

        window.addEventListener("storage", handleStorage);

        return () => {
            window.removeEventListener("storage", handleStorage);
        };
    }, []);

    const value = {
        user,
        accessToken,
        isAuthenticated: Boolean(user && accessToken),
        loading: false,
        login,
        logout,
    };

    return (
        <StaffAuthContext.Provider value={value}>
            {children}
        </StaffAuthContext.Provider>
    );
}

export function useStaffAuth() {
    const context = useContext(StaffAuthContext);

    if (!context) {
        throw new Error(
            "useStaffAuth must be used within StaffAuthProvider."
        );
    }

    return context;
}
