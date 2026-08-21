/* ==========================================================
   REELSBUNDLES — AUTOMATIC ACCOUNT SUSPENSION & ANTI-THEFT ENGINE
   PERMANENT BACKEND ACCOUNT SUSPENSION ON DEVTOOLS DETECTION
   ZERO TOAST POPUPS / ZERO DUPLICATE NOTIFICATIONS / ADMIN LIVE UNBAN
========================================================== */

const API_BASE = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
) + "/api";

let protectionConfig = {
    protectionEnabled: true,
    disableDevTools: true
};

function isAdminUser() {
    const isAdminPath = window.location.pathname.includes("/admin/");
    if (!isAdminPath) {
        return false;
    }
    const adminToken = localStorage.getItem("rb_admin_token") || sessionStorage.getItem("rb_admin_token") || localStorage.getItem("admin_token");
    if (adminToken) return true;
    return false;
}

let isReportingDevTools = false;

async function triggerDevToolsAutoLogout() {
    if (isAdminUser()) return;

    if (isReportingDevTools) return;
    isReportingDevTools = true;

    let userEmail = localStorage.getItem("rb_user_email") || "";
    let uid = "";

    try {
        const rawUser = localStorage.getItem("rb_user");
        if (rawUser) {
            const parsed = JSON.parse(rawUser);
            if (parsed.uid) uid = parsed.uid;
            if (parsed.email) userEmail = parsed.email;
        }
    } catch (e) {}

    const reasonMsg = "Account suspended due to Developer Tools inspection detection.";

    try {
        localStorage.setItem("rb_is_suspended", "true");
        localStorage.setItem("rb_suspended_reason", reasonMsg);
        if (userEmail) localStorage.setItem("rb_user_email", userEmail);

        await fetch(`${API_BASE}/user/report-devtools`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uid: uid,
                email: userEmail,
                reason: reasonMsg
            })
        }).catch((e) => console.warn("[SUSPENSION] DevTools report notice:", e));
    } catch (e) {
        console.warn("[SUSPENSION] DevTools report error:", e);
    } finally {
        const isDashboard = window.location.pathname.includes("dashboard");
        const isDownload = window.location.pathname.includes("download");
        const targetPage = isDashboard ? "dashboard.html" : (isDownload ? "download.html" : "dashboard.html");
        const redirectUrl = `${targetPage}?suspended=true&reason=${encodeURIComponent(reasonMsg)}`;

        if (!window.location.href.includes("suspended=true")) {
            window.location.href = redirectUrl;
        }
    }
}

function checkDevToolsDimensions() {
    if (isAdminUser() || !protectionConfig.protectionEnabled || !protectionConfig.disableDevTools) {
        return false;
    }

    if (localStorage.getItem("rb_is_suspended") === "true" || window.location.search.includes("suspended=true")) {
        return false;
    }

    const threshold = 120;
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;

    if (widthDiff || heightDiff) {
        triggerDevToolsAutoLogout();
        return true;
    }
    return false;
}

let antiDebugInterval = null;

function startAntiDebuggingLoop() {
    if (antiDebugInterval) clearInterval(antiDebugInterval);
    antiDebugInterval = setInterval(() => {
        if (isAdminUser()) return;
        if (protectionConfig.protectionEnabled && protectionConfig.disableDevTools) {
            checkDevToolsDimensions();
        }
    }, 1000);
}

window.addEventListener("resize", checkDevToolsDimensions);

let isProtectionInitialized = false;

function initContentProtection() {
    if (isProtectionInitialized) return;
    isProtectionInitialized = true;

    startAntiDebuggingLoop();

    // DevTools Keyboard Shortcuts -> Immediate Permanent Account Suspension
    document.addEventListener("keydown", (event) => {
        if (!protectionConfig.protectionEnabled || !protectionConfig.disableDevTools || isAdminUser()) {
            return;
        }

        const isCmdOrCtrl = event.ctrlKey || event.metaKey;
        const key = event.key ? event.key.toLowerCase() : "";
        const code = event.code ? event.code.toLowerCase() : "";

        // F12 key
        if (key === "f12" || code === "f12") {
            event.preventDefault();
            event.stopPropagation();
            triggerDevToolsAutoLogout();
            return false;
        }

        // Ctrl+Shift+I / Cmd+Option+I (Inspect Element)
        if (isCmdOrCtrl && (event.shiftKey || event.altKey) && (key === "i" || code === "keyi")) {
            event.preventDefault();
            event.stopPropagation();
            triggerDevToolsAutoLogout();
            return false;
        }

        // Ctrl+Shift+J / Cmd+Option+J (Console)
        if (isCmdOrCtrl && (event.shiftKey || event.altKey) && (key === "j" || code === "keyj")) {
            event.preventDefault();
            event.stopPropagation();
            triggerDevToolsAutoLogout();
            return false;
        }

        // Ctrl+Shift+C / Cmd+Option+C (Element Selector)
        if (isCmdOrCtrl && (event.shiftKey || event.altKey) && (key === "c" || code === "keyc")) {
            event.preventDefault();
            event.stopPropagation();
            triggerDevToolsAutoLogout();
            return false;
        }
    }, true);
}

// Live Backend Suspension Polling & Admin Live Unban Engine
async function checkBackendSuspensionStatus() {
    if (isAdminUser()) return;

    try {
        let identifier = localStorage.getItem("rb_user_email") || "";
        if (!identifier) {
            try {
                const rawUser = localStorage.getItem("rb_user");
                if (rawUser) {
                    const parsed = JSON.parse(rawUser);
                    if (parsed.email) identifier = parsed.email;
                    else if (parsed.uid) identifier = parsed.uid;
                }
            } catch (e) {}
        }

        if (!identifier) return;

        const response = await fetch(`${API_BASE}/user/suspension-status?email=${encodeURIComponent(identifier)}`, { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                if (data.suspended) {
                    // User IS suspended on backend
                    const reason = data.reason || "Account suspended due to Developer Tools inspection detection.";
                    localStorage.setItem("rb_is_suspended", "true");
                    localStorage.setItem("rb_suspended_reason", reason);

                    const isDashboard = window.location.pathname.includes("dashboard");
                    const isDownload = window.location.pathname.includes("download");
                    if (isDashboard || isDownload) {
                        const targetPage = isDashboard ? "dashboard.html" : "download.html";
                        const redirectUrl = `${targetPage}?suspended=true&reason=${encodeURIComponent(reason)}`;
                        if (!window.location.href.includes("suspended=true")) {
                            window.location.href = redirectUrl;
                        }
                    }
                } else if (localStorage.getItem("rb_is_suspended") === "true") {
                    // User was UNBANNED / REACTIVATED by Admin!
                    localStorage.removeItem("rb_is_suspended");
                    localStorage.removeItem("rb_suspended_reason");

                    if (window.location.search.includes("suspended=true")) {
                        const cleanUrl = window.location.pathname;
                        window.location.href = cleanUrl;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("[SUSPENSION] Backend status check notice:", e);
    }
}

async function fetchProtectionSettings() {
    try {
        const response = await fetch(`${API_BASE}/protection/status`, { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings) {
                protectionConfig = { ...protectionConfig, ...data.settings };
                checkDevToolsDimensions();
            }
        }
    } catch (e) {
        console.warn("[SUSPENSION] Using default protection config:", e);
    }
}

// Initialize
initContentProtection();
fetchProtectionSettings();
checkBackendSuspensionStatus();

// Polling intervals
setInterval(fetchProtectionSettings, 5000);
setInterval(checkBackendSuspensionStatus, 3000);

window.addEventListener("focus", () => {
    fetchProtectionSettings();
    checkBackendSuspensionStatus();
});
