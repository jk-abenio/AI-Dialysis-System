import patientApi from "./patientApi";

export async function getHistory() {

    const { data } = await patientApi.get(
        "patients/history/"
    );

    return data;

}