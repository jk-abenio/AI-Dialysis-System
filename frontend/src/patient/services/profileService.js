import patientApi from "./patientApi";

export const getPatientProfile = async () => {

    const response = await patientApi.get(
        "/patients/profile/"
    );

    return response.data;

};