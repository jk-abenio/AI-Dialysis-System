import api from "./api";

export const createTreatmentRecord = async (data) => {
    const response = await api.post("/treatment-records/", data);
    return response.data;
};

export const updateTreatmentRecord = async (id, data) => {
    const response = await api.put(`/treatment-records/${id}/`, data);
    return response.data;
};

export const getPatientTreatmentHistory = async (patientId) => {
    const response = await api.get(
        `/treatment-records/patient/${patientId}/`
    );

    return response.data;
};

export const getPatientChart = async (patientId) => {
    const response = await api.get(
        `/treatment-records/patient/${patientId}/chart/`
    );

    return response.data;
};