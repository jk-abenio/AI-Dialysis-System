import axios from "axios";
import { logoutUser } from "../utils/auth";

// ========================================
// API BASE URL
// ========================================

// Automatically determine the host from the current website URL.
// Computer: http://localhost:5173
// Phone:    http://192.168.1.6:5173

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:8000/api/`;

const api = axios.create({
    baseURL: API_BASE_URL,
});

// ========================================
// GET STORED ACCESS TOKEN
// ========================================

const getAccessToken = () => {
    return (
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token")
    );
};

// ========================================
// GET STORED REFRESH TOKEN
// ========================================

const getRefreshToken = () => {
    return (
        localStorage.getItem("refresh_token") ||
        sessionStorage.getItem("refresh_token")
    );
};

// ========================================
// REQUEST INTERCEPTOR
// ========================================

api.interceptors.request.use((config) => {
    const requestUrl = config.url || "";

    // Do not attach an old access token to a login request.
    const isLoginRequest = /\/login\/?$/.test(requestUrl);

    if (isLoginRequest) {
        if (config.headers) {
            delete config.headers.Authorization;
        }

        return config;
    }

    const token = getAccessToken();

    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// ========================================
// RESPONSE INTERCEPTOR
// ========================================

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        // If there is no original request, reject the error.
        if (!originalRequest) {
            return Promise.reject(error);
        }

        const requestUrl = originalRequest.url || "";

        // Identify authentication endpoints.
        const isLoginRequest = /\/login\/?$/.test(requestUrl);
        const isRefreshRequest = /\/token\/refresh\/?$/.test(requestUrl);

        // ========================================
        // HANDLE EXPIRED ACCESS TOKEN
        // ========================================

        // Do not refresh tokens for failed login or refresh requests.
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isLoginRequest &&
            !isRefreshRequest
        ) {
            originalRequest._retry = true;

            try {
                const refresh = getRefreshToken();

                // No refresh token available.
                if (!refresh) {
                    logoutUser(true);
                    return Promise.reject(error);
                }

                // Request a new access token.
                // Use plain axios to avoid running this through
                // the api instance's response interceptor.
                const response = await axios.post(
                    `${API_BASE_URL}token/refresh/`,
                    { refresh }
                );

                const newAccess = response.data.access;

                if (!newAccess) {
                    throw new Error(
                        "The refresh response did not contain an access token."
                    );
                }

                // ========================================
                // SAVE NEW ACCESS TOKEN
                // ========================================

                if (localStorage.getItem("refresh_token")) {
                    localStorage.setItem("access_token", newAccess);
                } else {
                    sessionStorage.setItem("access_token", newAccess);
                }

                // ========================================
                // RETRY ORIGINAL REQUEST
                // ========================================

                originalRequest.headers =
                    originalRequest.headers || {};

                originalRequest.headers.Authorization =
                    `Bearer ${newAccess}`;

                return api(originalRequest);

            } catch (refreshError) {
                // The refresh token may have expired or become invalid.
                logoutUser(true);

                return Promise.reject(refreshError);
            }
        }

        // Pass the original error back to the calling component.
        // LoginForm can now display "Invalid username or password."
        return Promise.reject(error);
    }
);

export default api;
