
import {
    createContext,
    useContext,
    useState,
    useCallback,
} from "react";

import { patientLogin } from "../services/patientAuthService";

const PatientAuthContext = createContext(null);

// Safely read the saved patient session.
const getSavedPatient = () => {
    try {
        const savedPatient = localStorage.getItem("patient");
        const accessToken = localStorage.getItem("patientToken");

        if (!savedPatient || !accessToken) {
            return null;
        }

        const parsedPatient = JSON.parse(savedPatient);

        if (
            !parsedPatient ||
            typeof parsedPatient !== "object" ||
            Array.isArray(parsedPatient)
        ) {
            return null;
        }

        return parsedPatient;
    } catch (error) {
        console.error("Unable to restore patient session:", error);
        return null;
    }
};

// Remove only patient-specific session data.
const clearPatientSession = () => {
    localStorage.removeItem("patientToken");
    localStorage.removeItem("patientRefresh");
    localStorage.removeItem("patient");
};

export const PatientAuthProvider = ({ children }) => {
    const [patient, setPatient] = useState(getSavedPatient);

    const login = useCallback(async (credentials) => {
        // Prevent stale credentials from interfering with a new login.
        clearPatientSession();

        try {
            const data = await patientLogin(credentials);

            if (!data?.access || !data?.patient) {
                throw new Error(
                    "Login response is missing the patient or access token."
                );
            }

            localStorage.setItem("patientToken", data.access);

            if (data.refresh) {
                localStorage.setItem("patientRefresh", data.refresh);
            } else {
                localStorage.removeItem("patientRefresh");
            }

            localStorage.setItem(
                "patient",
                JSON.stringify(data.patient)
            );

            setPatient(data.patient);

            return data;
        } catch (error) {
            // Do not leave a partial or stale session after login fails.
            clearPatientSession();
            setPatient(null);

            throw error;
        }
    }, []);

    const logout = useCallback(
        ({ deferPatientState = false } = {}) => {
            clearPatientSession();

            if (!deferPatientState) {
                setPatient(null);
            }
        },
        []
    );

    const value = {
        patient,
        login,
        logout,
        isAuthenticated: Boolean(
            patient && localStorage.getItem("patientToken")
        ),
    };

    return (
        <PatientAuthContext.Provider value={value}>
            {children}
        </PatientAuthContext.Provider>
    );
};

export const usePatientAuth = () =>
    useContext(PatientAuthContext);
