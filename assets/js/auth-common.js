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

(function sanitizeAllLinksAndAddressBar() {
    function cleanUrlPath(hrefStr) {
        if (!hrefStr) return hrefStr;
        if (hrefStr.startsWith("#") || hrefStr.startsWith("javascript:") || hrefStr.startsWith("mailto:") || hrefStr.startsWith("tel:")) {
            return hrefStr;
        }
        if (hrefStr.startsWith("http://") || hrefStr.startsWith("https://")) {
            if (!hrefStr.includes(window.location.hostname)) return hrefStr;
        }
        return hrefStr.replace(/([a-zA-Z0-9_-]+)\.html(\?|#|$)/g, function(match, pageName, suffix) {
            if (pageName === "index") return "/" + suffix;
            return pageName + suffix;
        });
    }

    try {
        var path = window.location.pathname;
        if (path.endsWith(".html")) {
            var cleanPath = path.replace(/\.html$/, "");
            if (cleanPath.endsWith("/index")) {
                cleanPath = cleanPath.substring(0, cleanPath.length - 5);
            }
            if (!cleanPath) cleanPath = "/";
            var newUrl = cleanPath + window.location.search + window.location.hash;
            window.history.replaceState(null, "", newUrl);
        }
    } catch (e) {}

    function rewriteAnchors() {
        var links = document.querySelectorAll("a[href*='.html']");
        links.forEach(function(a) {
            var oldHref = a.getAttribute("href");
            if (oldHref && oldHref.includes(".html")) {
                a.setAttribute("href", cleanUrlPath(oldHref));
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", rewriteAnchors);
    } else {
        rewriteAnchors();
    }

    document.addEventListener("mouseover", function(e) {
        var a = e.target.closest("a");
        if (a && a.getAttribute("href") && a.getAttribute("href").includes(".html")) {
            a.setAttribute("href", cleanUrlPath(a.getAttribute("href")));
        }
    }, true);

    document.addEventListener("click", function(e) {
        var a = e.target.closest("a");
        if (a && a.getAttribute("href") && a.getAttribute("href").includes(".html")) {
            a.setAttribute("href", cleanUrlPath(a.getAttribute("href")));
        }
    }, true);
})();

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

        return null;

    }

    try {

        const idToken =
            await user.getIdToken(true);

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 8000) : null;

        const response = await robustFetch(
            `${API_BASE}/auth/user/session`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    idToken
                }),

                signal: controller ? controller.signal : undefined
            }
        );

        if (timeoutId) clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn("[AUTH] Backend session sync returned non-200 status.");
            return null;
        }

        const result = await response.json();
        return result;

    }
    catch (error) {

        console.warn("[AUTH] Non-fatal backend session sync warning:", error);
        return null;

    }

};

export const getCurrentUserFromBackend = async () => {

    const idToken =
        await getFirebaseIdToken();

    if (!idToken) {
        return null;
    }

    const response = await robustFetch(
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
            await robustFetch(
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


async function robustFetch(url, options = {}, retries = 2, delayMs = 1500) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await robustFetch(url, options);
            return response;
        } catch (err) {
            console.warn(`[ROBUST FETCH] Attempt ${i + 1} failed for ${url}:`, err);
            if (i === retries) throw err;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
