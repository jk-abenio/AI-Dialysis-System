import api from "./api";

export const getMedicalProfile = async (patientId) => {
    const response = await api.get(
        `patients/${patientId}/medical_profile/`
    );

    return response.data;
};

export const createMedicalProfile = async (data) => {
    const response = await api.post(
        "medical-profiles/",
        data
    );

    return response.data;
};

export const updateMedicalProfile = async (id, data) => {
    const response = await api.put(
        `medical-profiles/${id}/`,
        data
    );

    return response.data;
};