import patientApi from "./patientApi";

export const patientLogin = async (credentials) => {
    const response = await patientApi.post(
        "patients/login/",
        credentials
    );

    return response.data;
};