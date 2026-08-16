import {
    auth
} from "./firebase-client.js";

import {
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const API_BASE =
    (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:3000"
            : "https://reelsbundles-backend.onrender.com"
    ) + "/api";

export const getCurrentFirebaseUser = () => {

    return auth.currentUser;

};

/* ==========================================================
   GET FIREBASE ID TOKEN
   Wait for Firebase auth state restoration.
========================================================== */

export const getFirebaseIdToken = async () => {

    /*
     * Firebase may need a moment to restore
     * the existing login session after a page load.
     */

    if (auth.currentUser) {

        return await auth.currentUser
            .getIdToken();

    }


    /*
     * Wait until Firebase tells us whether
     * a user session exists.
     */

    const user =
        await new Promise(
            (resolve) => {

                let finished =
                    false;


                const timeout =
                    setTimeout(
                        () => {

                            if (
                                finished
                            ) {
                                return;
                            }


                            finished =
                                true;

                            resolve(
                                null
                            );

                        },
                        8000
                    );


                const unsubscribe =
                    onAuthStateChanged(
                        auth,

                        (currentUser) => {

                            if (
                                finished
                            ) {
                                return;
                            }


                            finished =
                                true;


                            clearTimeout(
                                timeout
                            );


                            unsubscribe();


                            resolve(
                                currentUser
                            );

                        }
                    );

            }
        );


    if (!user) {

        return null;

    }


    return await user.getIdToken();

};
export const createUserSession = async () => {

    const user = auth.currentUser;

    if (!user) {

        throw new Error(
            "Firebase user session not found."
        );

    }

    const idToken =
        await user.getIdToken(true);

    const response = await fetch(
        `${API_BASE}/auth/user/session`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                idToken
            })
        }
    );

    const result =
        await response.json();

    if (!response.ok) {

        throw new Error(
            result.message ||
            "Unable to create user session."
        );

    }

    return result;

};

export const getCurrentUserFromBackend = async () => {

    const idToken =
        await getFirebaseIdToken();

    if (!idToken) {
        return null;
    }

    const response = await fetch(
        `${API_BASE}/auth/user/me`,
        {
            method: "GET",

            headers: {
                Authorization:
                    `Bearer ${idToken}`
            }
        }
    );

    if (!response.ok) {

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            return null;

        }

        throw new Error(
            "Unable to fetch user profile."
        );

    }

    return await response.json();

};

export const logoutUser = async () => {

    await signOut(auth);

};

export const redirectIfAuthenticated = () => {

    onAuthStateChanged(
        auth,
        (user) => {

            if (user) {

                window.location.href =
                    "user/dashboard.html";

            }

        }
    );

};

export const protectUserPage = () => {

    onAuthStateChanged(
        auth,
        (user) => {

            if (!user) {

                window.location.href =
                    "../login.html";

            }

        }
    );

};
/* ==========================================================
   GET USER ENTITLEMENT
   ========================================================== */

export const getCurrentUserEntitlement =
    async () => {

        const idToken =
            await getFirebaseIdToken();

        if (!idToken) {
            return null;
        }

        const response =
            await fetch(
                `${API_BASE}/user/entitlement`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${idToken}`,

                        Accept:
                            "application/json"
                    },

                    cache: "no-store"
                }
            );

        if (!response.ok) {

            if (
                response.status === 401 ||
                response.status === 403
            ) {
                return null;
            }

            throw new Error(
                "Unable to fetch user entitlement."
            );
        }

        const result =
            await response.json();

        if (
            !result ||
            result.success !== true
        ) {
            throw new Error(
                result?.message ||
                "Invalid entitlement response."
            );
        }

        return (
            result.entitlement ||
            null
        );
    };