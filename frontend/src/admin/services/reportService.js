
import api from "./api";

const buildReportParams = (filters = {}) => {
    const params = {
        scope: filters.scope || "all",
        status: filters.status || "All",
    };

    if (filters.scope === "patient" && filters.patientId) {
        params.patient_id = filters.patientId;
    }

    if (filters.date) {
        params.date_mode = "single";
        params.date = filters.date;
    } else if (filters.startDate && filters.endDate) {
        params.date_mode = "range";
        params.start_date = filters.startDate;
        params.end_date = filters.endDate;
    } else {
        // Do not restrict the report to dates up to today.
        // The backend will return all available dates, including future ones.
        params.date_mode = "all";
    }

    return params;
};

export const getDailyReport = async (filters = {}) => {
    const response = await api.get("/reports/daily/", {
        params: buildReportParams(filters),
    });

    return response.data;
};

export const downloadDailyPdf = async (filters = {}) => {
    const response = await api.get("/reports/daily/pdf/", {
        params: buildReportParams(filters),
        responseType: "blob",
    });

    return response.data;
};

export const downloadDailyExcel = async (filters = {}) => {
    const response = await api.get("/reports/daily/excel/", {
        params: buildReportParams(filters),
        responseType: "blob",
    });

    return response.data;
};
