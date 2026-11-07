import patientApi from "./patientApi";

export const getPatientDashboard = async () => {

    const response = await patientApi.get(
        "/patients/dashboard/"
    );

    return response.data;
};