
import api from "./api";

export const getStaff = async () => {
    const response = await api.get("staff/");
    return response.data;
};

export const createStaff = async (staff) => {
    const response = await api.post("staff/", staff);
    return response.data;
};

export const updateStaff = async (id, staff) => {
    const response = await api.put(`staff/${id}/`, staff);
    return response.data;
};

export const deleteStaff = async (id) => {
    await api.delete(`staff/${id}/`);
};

/**
 * Create or prepare a Staff Portal account and generate
 * a password-setup link for the selected staff profile.
 *
 * The backend must enforce administrator-only access.
 */
export const createStaffAccount = async (staffId) => {
    const response = await api.post(
        `staff/${staffId}/create-account/`
    );

    return response.data;
};


/**
 * Generate a 24-hour password-reset link for an activated staff account.
 */
export const createStaffPasswordResetLink = async (staffId) => {
    const response = await api.post(
        `staff/${staffId}/reset-password-link/`
    );

    return response.data;
};

/**
 * Validate a staff password-reset token.
 */
export const validateStaffResetToken = async (token) => {
    const response = await api.post(
        "staff/validate-reset-token/",
        { token }
    );

    return response.data;
};

/**
 * Set a new password using a staff password-reset token.
 */
export const resetStaffPassword = async ({
    token,
    password,
    confirm_password,
}) => {
    const response = await api.post(
        "staff/reset-password/",
        {
            token,
            password,
            confirm_password,
        }
    );

    return response.data;
};