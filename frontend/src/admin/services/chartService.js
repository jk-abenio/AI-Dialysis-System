import api from "./api";

export const getPatientChart = async (patientId) => {

    const response = await api.get(
        `/treatment-records/patient/${patientId}/chart/`
    );

    return response.data;

};