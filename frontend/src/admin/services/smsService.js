import api from "./api";

// Retrieve SMS message history.
// Optional filters: status, type, search, limit.
export const getSMSHistory = async (filters = {}) => {
    const response = await api.get("sms/history/", {
        params: filters,
    });

    return response.data;
};

// Simulate sending a test SMS.
export const sendTestSMS = async ({ phone_number, message }) => {
    const response = await api.post("sms/test/", {
        phone_number,
        message,
    });

    return response.data;
};

// Retrieve active patients and their contact numbers.
export const getSMSPatients = async () => {
    const response = await api.get("sms/patients/");
    return response.data;
};

// Retrieve upcoming appointments eligible for reminders.
export const getSMSReminders = async () => {
    const response = await api.get("sms/reminders/");
    return response.data;
};

// Process appointment reminders for selected schedule IDs.
export const sendSMSReminders = async (schedule_ids) => {
    const response = await api.post("sms/reminders/", {
        schedule_ids,
    });

    return response.data;
};

// Process a bulk SMS for selected patients.
export const sendBulkSMS = async ({ patient_ids, message }) => {
    const response = await api.post("sms/bulk/", {
        patient_ids,
        message,
    });
    return response.data;
};
