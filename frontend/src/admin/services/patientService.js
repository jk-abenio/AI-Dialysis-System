import api from "./api";

export const getPatients = async () => {

    const response = await api.get("patients/");

    return response.data;

};

export const createPatient = async (patient) => {

    const response = await api.post("patients/", patient);

    return response.data;

};

export const updatePatient = async (id, patient) => {

    const response = await api.put(`patients/${id}/`, patient);

    return response.data;

};

export const deletePatient = async (id) => {

    await api.delete(`patients/${id}/`);

};

export const updatePatientCredentials = async (id, credentials) => {
    const response = await api.patch(
        `patients/${id}/account-credentials/`,
        credentials
    );

    return response.data;
};

export const createPatientPasswordResetLink = async (patientId) => {
    const response = await api.post(
        `/patients/${patientId}/password-reset-link/`
    );
    return response.data;
};

export const validatePatientPasswordResetToken = async (token) => {
    const response = await api.get("/patients/password-reset/", {
        params: { token },
    });
    return response.data;
};

export const resetPatientPassword = async (payload) => {
    const response = await api.post("/patients/password-reset/", payload);
    return response.data;
};

export const requestPatientPasswordReset = async (patientId) => {
    const response = await api.post("/patients/forgot-password/", {
        patient_id: patientId,
    });

    return response.data;
};