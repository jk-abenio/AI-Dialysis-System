import api from "./api";

export const getMachines = async () => {
    const response = await api.get("machines/");
    return response.data;
};

export const createMachine = async (machine) => {
    const response = await api.post("machines/", machine);
    return response.data;
};

export const updateMachine = async (id, machine) => {
    const response = await api.put(`machines/${id}/`, machine);
    return response.data;
};

export const deleteMachine = async (id) => {
    await api.delete(`machines/${id}/`);
};