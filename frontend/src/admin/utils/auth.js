let logoutFunction = null;

export const setLogoutFunction = (fn) => {
    logoutFunction = fn;
};

export const logoutUser = (expired = false) => {

    if (logoutFunction) {
        logoutFunction(expired);
    }

};