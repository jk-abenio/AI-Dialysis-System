import patientApi from "./patientApi";

export async function getSchedules() {

    const { data } = await patientApi.get(
        "patients/schedule/"
    );

    return data;

}