
import axios from "axios";

const API_BASE_URL =
    `${window.location.protocol}//${window.location.hostname}:8000/api/`;

const LOGIN_URL = "patients/login/";
const REFRESH_URL = "token/refresh/";
const PATIENT_LOGIN_PATH = "/patient/login";

const patientApi = axios.create({
    baseURL: API_BASE_URL,
});

const getPatientAccessToken = () =>
    localStorage.getItem("patientToken");

const getPatientRefreshToken = () =>
    localStorage.getItem("patientRefresh");

const clearPatientSession = () => {
    localStorage.removeItem("patientToken");
    localStorage.removeItem("patientRefresh");
    localStorage.removeItem("patient");
};

const redirectToPatientLogin = () => {
    clearPatientSession();

    // Avoid repeatedly redirecting if already on the login page.
    if (window.location.pathname !== PATIENT_LOGIN_PATH) {
        window.location.replace(PATIENT_LOGIN_PATH);
    }
};

// Share one refresh request if several API calls fail together.
let refreshPromise = null;

// Attach the patient token only to protected patient API requests.
patientApi.interceptors.request.use(
    (config) => {
        const url = (config.url || "").toLowerCase();

        const isLoginRequest = url.includes(LOGIN_URL);
        const isRefreshRequest = url.includes(REFRESH_URL);

        if (isLoginRequest || isRefreshRequest) {
            if (config.headers) {
                delete config.headers.Authorization;
                delete config.headers.authorization;
            }

            return config;
        }

        const token = getPatientAccessToken();

        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        } else if (config.headers) {
            delete config.headers.Authorization;
            delete config.headers.authorization;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Refresh expired access tokens when possible.
patientApi.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        if (!originalRequest) {
            return Promise.reject(error);
        }

        const url = (originalRequest.url || "").toLowerCase();

        const isLoginRequest = url.includes(LOGIN_URL);
        const isRefreshRequest = url.includes(REFRESH_URL);

        // Never refresh or redirect because a login attempt failed.
        if (isLoginRequest || isRefreshRequest) {
            return Promise.reject(error);
        }

        if (error.response?.status !== 401) {
            return Promise.reject(error);
        }

        // Do not retry the same request indefinitely.
        if (originalRequest._retry) {
            redirectToPatientLogin();
            return Promise.reject(error);
        }

        const refresh = getPatientRefreshToken();

        if (!refresh) {
            redirectToPatientLogin();
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            if (!refreshPromise) {
                refreshPromise = axios
                    .post(
                        `${API_BASE_URL}${REFRESH_URL}`,
                        { refresh }
                    )
                    .then((response) => {
                        const access = response.data?.access;

                        if (!access) {
                            throw new Error(
                                "Token refresh response did not contain an access token."
                            );
                        }

                        localStorage.setItem("patientToken", access);

                        // Save a rotated refresh token if the backend returns one.
                        if (response.data?.refresh) {
                            localStorage.setItem(
                                "patientRefresh",
                                response.data.refresh
                            );
                        }

                        return access;
                    })
                    .catch((refreshError) => {
                        redirectToPatientLogin();
                        throw refreshError;
                    })
                    .finally(() => {
                        refreshPromise = null;
                    });
            }

            const newAccessToken = await refreshPromise;

            originalRequest.headers =
                originalRequest.headers || {};

            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;

            return patientApi(originalRequest);
        } catch (refreshError) {
            return Promise.reject(refreshError);
        }
    }
);

export default patientApi;
