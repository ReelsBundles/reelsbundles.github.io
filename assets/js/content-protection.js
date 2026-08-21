/* ==========================================================
   REELSBUNDLES — SITE-WIDE CONTENT PROTECTION MODULE
   3-STRIKE SECURITY WARNING SYSTEM & ADMIN UNBAN ENGINE
========================================================== */

const API_BASE = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
) + "/api";

let protectionConfig = {
    protectionEnabled: true,
    disableRightClick: true,
    disableDevTools: true
};

let activeToast = null;
let toastTimeout = null;
let styleElement = null;

function showProtectionToast(message, isCritical = false) {
    if (activeToast) {
        activeToast.remove();
        if (toastTimeout) clearTimeout(toastTimeout);
    }

    const toast = document.createElement("div");
    toast.className = "protection-warning-toast";
    toast.innerHTML = `<span style="margin-right:8px; font-size:14px;">${isCritical ? '🚨' : '⚠️'}</span> ${message}`;

    Object.assign(toast.style, {
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%) translateY(20px)",
        backgroundColor: isCritical ? "rgba(153, 27, 27, 0.98)" : "rgba(15, 23, 42, 0.95)",
        color: isCritical ? "#fecaca" : "#f87171",
        border: isCritical ? "1px solid rgba(239, 68, 68, 0.6)" : "1px solid rgba(248, 113, 113, 0.3)",
        borderRadius: "10px",
        padding: "12px 24px",
        fontSize: "13px",
        fontWeight: "700",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
        zIndex: "999999",
        pointerEvents: "none",
        opacity: "0",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
        maxWidth: "92vw"
    });

    document.body.appendChild(toast);
    activeToast = toast;

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateX(-50%) translateY(0)";
    });

    toastTimeout = setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-50%) translateY(10px)";
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

function applyCssRestrictions() {
    if (protectionConfig.protectionEnabled) {
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.id = "protection-user-select-style";
            styleElement.innerHTML = `
                body, p, h1, h2, h3, h4, h5, h6, span, div, img, a, button, card {
                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
                }
                input, textarea, select {
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    user-select: text !important;
                }
            `;
            document.head.appendChild(styleElement);
        }
    } else if (styleElement) {
        styleElement.remove();
        styleElement = null;
    }
}

function isAdminUser() {
    const isAdminPath = window.location.pathname.includes("/admin/");
    if (!isAdminPath) {
        return false;
    }
    const adminToken = localStorage.getItem("rb_admin_token") || sessionStorage.getItem("rb_admin_token") || localStorage.getItem("admin_token");
    if (adminToken) return true;
    return false;
}

// -----------------------------------------------------------
// 3 WARNING STRIKE SYSTEM
// -----------------------------------------------------------

function getWarningCount() {
    try {
        const localVal = parseInt(localStorage.getItem("rb_warning_count") || "0", 10);
        return isNaN(localVal) ? 0 : localVal;
    } catch (e) {
        return 0;
    }
}

let isBanningUser = false;

async function triggerAccountBan(reason) {
    if (isAdminUser() || isBanningUser) return;
    isBanningUser = true;

    const actualReason = reason || "Account banned due to repeated security inspection attempts (3/3 Warnings Exceeded).";
    
    try {
        localStorage.setItem("rb_is_suspended", "true");
        localStorage.setItem("rb_warning_count", "3");
        localStorage.setItem("rb_suspended_reason", actualReason);
    } catch (e) {}

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

    try {
        await fetch(`${API_BASE}/user/report-devtools`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                uid: uid,
                email: userEmail,
                reason: actualReason
            })
        });
    } catch (e) {
        console.warn("[PROTECTION] Report ban notice:", e);
    }

    const isDashboard = window.location.pathname.includes("dashboard");
    const isDownload = window.location.pathname.includes("download");
    
    if (isDashboard || isDownload) {
        const targetPage = isDashboard ? "dashboard.html" : "download.html";
        const redirectUrl = `${targetPage}?suspended=true&reason=${encodeURIComponent(actualReason)}`;
        if (!window.location.href.includes("suspended=true")) {
            window.location.href = redirectUrl;
        }
    } else {
        showProtectionToast("🚨 ACCOUNT BANNED: Security policy violated (3/3 Warnings Exceeded).", true);
    }
}

function recordSecurityViolation(violationType) {
    if (isAdminUser() || !protectionConfig.protectionEnabled) return;
    if (localStorage.getItem("rb_is_suspended") === "true") return;

    let currentWarnings = getWarningCount() + 1;
    localStorage.setItem("rb_warning_count", String(currentWarnings));

    if (currentWarnings === 1) {
        showProtectionToast(`Security Warning (1/3): ${violationType} is restricted on ReelsBundles.`, false);
    } else if (currentWarnings === 2) {
        showProtectionToast(`Final Warning (2/3)! One more inspection attempt will ban your account.`, true);
    } else if (currentWarnings >= 3) {
        triggerAccountBan(`Account banned due to repeated security inspection attempts (3/3 Warnings Exceeded).`);
    }
}

// -----------------------------------------------------------
// DEVTOOLS DIMENSION POLLING
// -----------------------------------------------------------

let lastDevToolsCheckTime = 0;

function checkDevToolsDimensions() {
    if (isAdminUser() || !protectionConfig.protectionEnabled || !protectionConfig.disableDevTools) {
        return false;
    }
    if (localStorage.getItem("rb_is_suspended") === "true") {
        return false;
    }

    const threshold = 120;
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;

    if (widthDiff || heightDiff) {
        const now = Date.now();
        if (now - lastDevToolsCheckTime > 4000) {
            lastDevToolsCheckTime = now;
            recordSecurityViolation("Developer Tools Inspection");
        }
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

// -----------------------------------------------------------
// EVENT LISTENERS & SHORTCUT SUPPRESSION
// -----------------------------------------------------------

let isProtectionInitialized = false;

function initContentProtection() {
    applyCssRestrictions();
    if (isProtectionInitialized) return;
    isProtectionInitialized = true;

    startAntiDebuggingLoop();

    // 1. Right Click Protection
    document.addEventListener("contextmenu", (event) => {
        if (protectionConfig.protectionEnabled && protectionConfig.disableRightClick) {
            event.preventDefault();
            recordSecurityViolation("Right-Click Context Menu");
        }
    }, true);

    // 2. Drag & Drop Protection
    document.addEventListener("dragstart", (event) => {
        if (protectionConfig.protectionEnabled) {
            event.preventDefault();
        }
    }, true);

    // 3. Shortcuts Protection
    document.addEventListener("keydown", (event) => {
        if (!protectionConfig.protectionEnabled || !protectionConfig.disableDevTools) {
            return;
        }

        const isCmdOrCtrl = event.ctrlKey || event.metaKey;
        const key = event.key ? event.key.toLowerCase() : "";
        const code = event.code ? event.code.toLowerCase() : "";

        // F12 key
        if (key === "f12" || code === "f12") {
            event.preventDefault();
            event.stopPropagation();
            recordSecurityViolation("F12 Developer Tools Shortcut");
            return false;
        }

        // Ctrl+Shift+I / Cmd+Option+I (Inspect Element)
        if (isCmdOrCtrl && (event.shiftKey || event.altKey) && (key === "i" || code === "keyi")) {
            event.preventDefault();
            event.stopPropagation();
            recordSecurityViolation("Inspect Element Shortcut");
            return false;
        }

        // Ctrl+Shift+J / Cmd+Option+J (Console)
        if (isCmdOrCtrl && (event.shiftKey || event.altKey) && (key === "j" || code === "keyj")) {
            event.preventDefault();
            event.stopPropagation();
            recordSecurityViolation("Developer Console Shortcut");
            return false;
        }

        // Ctrl+Shift+C / Cmd+Option+C (Element Selector)
        if (isCmdOrCtrl && (event.shiftKey || event.altKey) && (key === "c" || code === "keyc")) {
            event.preventDefault();
            event.stopPropagation();
            recordSecurityViolation("Element Selector Shortcut");
            return false;
        }

        // Ctrl+U / Cmd+U (View Source)
        if (isCmdOrCtrl && (key === "u" || code === "keyu")) {
            event.preventDefault();
            event.stopPropagation();
            recordSecurityViolation("View Source Shortcut");
            return false;
        }

        // Ctrl+S / Cmd+S (Save Page)
        if (isCmdOrCtrl && (key === "s" || code === "keys")) {
            event.preventDefault();
            event.stopPropagation();
            showProtectionToast("Saving web page is disabled.", false);
            return false;
        }

        // Ctrl+P / Cmd+P (Print Page)
        if (isCmdOrCtrl && (key === "p" || code === "keyp")) {
            event.preventDefault();
            event.stopPropagation();
            showProtectionToast("Printing page source is disabled.", false);
            return false;
        }
    }, true);
}

// -----------------------------------------------------------
// LIVE BACKEND SUSPENSION & ADMIN UNBAN SYNC
// -----------------------------------------------------------

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
                    const reason = data.reason || "Account suspended by security policy.";
                    localStorage.setItem("rb_is_suspended", "true");
                    localStorage.setItem("rb_warning_count", "3");
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
                    localStorage.setItem("rb_warning_count", "0");

                    if (window.location.search.includes("suspended=true")) {
                        const cleanUrl = window.location.pathname;
                        window.location.href = cleanUrl;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("[PROTECTION] Backend status check notice:", e);
    }
}

async function fetchProtectionSettings() {
    try {
        const response = await fetch(`${API_BASE}/protection/status`, { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings) {
                protectionConfig = { ...protectionConfig, ...data.settings };
                applyCssRestrictions();
                checkDevToolsDimensions();
            }
        }
    } catch (e) {
        console.warn("[PROTECTION] Using default protection config:", e);
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
