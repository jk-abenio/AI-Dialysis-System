
import api from "./api";

/**
 * Request ranked machine and staff recommendations.
 * The existing API client attaches the administrator's JWT.
 *
 * This only requests recommendations; it does not book a schedule.
 */
export async function getScheduleRecommendations({
    patient_id,
    requested_date,
    requested_time,
}) {
    const response = await api.post("ai/recommendations/", {
        patient_id: Number(patient_id),
        requested_date,
        requested_time,
    });

    return response.data;
}

export async function bookRecommendedSchedule({
    patient_id,
    requested_date,
    requested_time,
    machine_id,
    staff_id,
    notes = "",
}) {
    const response = await api.post("ai/book/", {
        patient_id: Number(patient_id),
        requested_date,
        requested_time,
        machine_id: Number(machine_id),
        staff_id: Number(staff_id),
        notes,
    });

    return response.data;
}
