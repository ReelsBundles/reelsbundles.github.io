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
    // Keep .html extensions intact on GitHub Pages to ensure query parameters and 200 OK static page routing work reliably
    if (window.location.hostname.includes("github.io") || window.location.search.includes("suspended=true")) {
        return;
    }
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
    if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
    }

    const user = await new Promise((resolve) => {
        let finished = false;
        const timeout = setTimeout(() => {
            if (finished) return;
            finished = true;
            resolve(null);
        }, 8000);

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            unsubscribe();
            resolve(currentUser);
        });
    });

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
        const idToken = await user.getIdToken(true);
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
    } catch (error) {
        console.warn("[AUTH] Non-fatal backend session sync warning:", error);
        return null;
    }
};

export const getCurrentUserFromBackend = async () => {
    const idToken = await getFirebaseIdToken();
    if (!idToken) {
        return null;
    }

    const response = await robustFetch(
        `${API_BASE}/auth/user/me`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${idToken}`
            }
        }
    );

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            return null;
        }
        throw new Error("Unable to fetch user profile.");
    }

    return await response.json();
};

export const logoutUser = async () => {
    try {
        if (auth) {
            await signOut(auth);
        }
    } catch (err) {
        console.warn("[Auth] Firebase signOut error:", err);
    }
    try {
        const isSuspended = localStorage.getItem("rb_is_suspended");
        const suspendedReason = localStorage.getItem("rb_suspended_reason");
        const userEmail = localStorage.getItem("rb_user_email");

        localStorage.clear();
        sessionStorage.clear();

        if (isSuspended === "true") {
            localStorage.setItem("rb_is_suspended", "true");
            if (suspendedReason) localStorage.setItem("rb_suspended_reason", suspendedReason);
            if (userEmail) localStorage.setItem("rb_user_email", userEmail);
        }
    } catch (err) {}
};

let isStatusSyncStarted = false;

export function handleAccountSuspendedAlert(reason) {
    const reasonMsg = reason || "Account suspended due to Developer Tools inspection detection.";
    try {
        localStorage.setItem("rb_is_suspended", "true");
        localStorage.setItem("rb_suspended_reason", reasonMsg);
    } catch (e) {}

    const isDashboard = window.location.pathname.includes("dashboard");
    const targetPage = isDashboard ? "dashboard.html" : "download.html";
    const redirectUrl = `${targetPage}?suspended=true&reason=${encodeURIComponent(reasonMsg)}`;

    if (!window.location.href.includes("suspended=true")) {
        window.location.replace(redirectUrl);
    }
}

function handleAccountDisabledAlert() {
    alert("⛔ Access Denied!\n\nYour account has been disabled by the admin.");
    logoutUser().then(() => {
        const target = window.location.pathname.includes("admin") ? "../login.html?disabled=1" : "login.html?disabled=1";
        window.location.replace(target);
    });
}

export const syncUserToBackend = async (user) => {
    if (!user) return { disabled: false };
    try {
        const providerId = user.providerData?.[0]?.providerId || (user.email ? "password" : "google.com");
        if (user.email) localStorage.setItem("rb_user_email", user.email);
        try {
            localStorage.setItem("rb_user", JSON.stringify({ uid: user.uid, email: user.email }));
        } catch (e) {}

        const res = await fetch(`${API_BASE}/auth/sync-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split("@")[0] || "User",
                photoURL: user.photoURL || null,
                providerId: providerId
            })
        });

        const data = await res.json();
        if (res.status === 403 || data.disabled === true || data.status === "disabled" || data.status === "SUSPENDED") {
            handleAccountSuspendedAlert(data.message);
            return { disabled: true };
        } else if (res.ok && (data.status === "active" || data.status === "ACTIVE")) {
            if (localStorage.getItem("rb_is_suspended") === "true") {
                localStorage.removeItem("rb_is_suspended");
                localStorage.removeItem("rb_suspended_reason");
                window.location.href = window.location.pathname;
            }
        }
        return data;
    } catch (e) {
        console.warn("[AUTH] User sync notice:", e);
        return { disabled: false };
    }
};

export const checkUserLiveStatus = async (user) => {
    const savedEmail = user?.email || localStorage.getItem("rb_user_email") || "";
    const uid = user?.uid ? encodeURIComponent(user.uid) : "";
    const email = savedEmail ? encodeURIComponent(savedEmail) : "";

    if (!uid && !email) return;

    try {
        if (savedEmail) localStorage.setItem("rb_user_email", savedEmail);
        const headers = {};
        try {
            const token = await getFirebaseIdToken();
            if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch (e) {}

        const queryStr = uid ? `uid=${uid}&email=${email}` : `email=${email}`;
        const res = await robustFetch(`${API_BASE}/user/status?${queryStr}`, { headers });
        if (!res) return;
        const data = await res.json().catch(() => ({}));

        if (res.status === 403 || data.disabled === true || data.status === "disabled" || data.status === "SUSPENDED") {
            handleAccountSuspendedAlert(data.message);
        } else if (res.ok && (data.status === "active" || data.status === "ACTIVE")) {
            if (localStorage.getItem("rb_is_suspended") === "true") {
                localStorage.removeItem("rb_is_suspended");
                localStorage.removeItem("rb_suspended_reason");
                window.location.href = window.location.pathname;
            }
        }
    } catch (e) {}
};

export const startUserStatusSync = (user) => {
    if (!user || isStatusSyncStarted) return;
    isStatusSyncStarted = true;

    checkUserLiveStatus(user);
    setInterval(() => checkUserLiveStatus(user), 3000);

    try {
        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel("rb_user_status_sync");
            bc.onmessage = (event) => {
                if (event.data?.type === "user_status_changed") {
                    checkUserLiveStatus(user);
                }
            };
        }
    } catch (e) {}

    window.addEventListener("storage", (e) => {
        if (e.key === "rb_user_status_event") {
            checkUserLiveStatus(user);
        }
    });

    window.addEventListener("focus", () => checkUserLiveStatus(user));
};

// Global observer: Automatically start status sync for any active user session on any page
onAuthStateChanged(auth, (user) => {
    if (user) {
        startUserStatusSync(user);
    }
});

export const redirectIfAuthenticated = () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const res = await syncUserToBackend(user);
            if (res && res.disabled) return;
            startUserStatusSync(user);

            const params = new URLSearchParams(window.location.search);
            const redirect = params.get("redirect");
            if (redirect) {
                try {
                    window.location.replace(decodeURIComponent(redirect));
                    return;
                } catch (e) {}
            }
            window.location.replace("download.html");
        }
    });
};

export const protectUserPage = () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login.html";
        } else {
            const res = await syncUserToBackend(user);
            if (res && res.disabled) return;
            startUserStatusSync(user);
        }
    });
};

/* ==========================================================
   GET USER ENTITLEMENT
========================================================== */

export const getCurrentUserEntitlement = async () => {
    try {
        const idToken = await getFirebaseIdToken();
        if (!idToken) {
            return null;
        }

        const response = await robustFetch(
            `${API_BASE}/user/entitlement`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    Accept: "application/json"
                },
                cache: "no-store"
            }
        );

        if (!response.ok) {
            console.warn("[AUTH] Entitlement status non-200:", response.status);
            return { plan: "free", status: "inactive" };
        }

        const result = await response.json();
        return result?.entitlement || { plan: "free", status: "inactive" };
    } catch (err) {
        console.warn("[AUTH] Entitlement fetch fallback warning:", err);
        return { plan: "free", status: "inactive" };
    }
};

async function robustFetch(url, options = {}, retries = 2, delayMs = 1500) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await window.fetch(url, options);
            return response;
        } catch (err) {
            console.warn(`[ROBUST FETCH] Attempt ${i + 1} failed for ${url}:`, err);
            if (i === retries) throw err;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
