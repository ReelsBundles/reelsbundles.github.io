/* ==========================================================
   REELSBUNDLES — SITE-WIDE CONTENT PROTECTION MODULE
   PREVENTS SOURCE CODE THEFT & UNAUTHORIZED COPYING
   DYNAMICALLY CONTROLLED BY ADMIN PANEL CONTROL SYSTEM
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

function showProtectionToast(message) {
    if (activeToast) {
        activeToast.remove();
        if (toastTimeout) clearTimeout(toastTimeout);
    }

    const toast = document.createElement("div");
    toast.className = "protection-warning-toast";
    toast.innerHTML = `<span style="margin-right:8px; font-size:14px;">⚠️</span> ${message}`;

    Object.assign(toast.style, {
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%) translateY(20px)",
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        color: "#f87171",
        border: "1px solid rgba(248, 113, 113, 0.3)",
        borderRadius: "8px",
        padding: "10px 20px",
        fontSize: "13px",
        fontWeight: "600",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
        zIndex: "999999",
        pointerEvents: "none",
        opacity: "0",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
        maxWidth: "90vw"
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
    }, 2500);
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

let devToolsModalElement = null;

function showDevToolsWarningModal() {
    if (devToolsModalElement || !document.body) return;

    devToolsModalElement = document.createElement("div");
    devToolsModalElement.id = "devtools-warning-overlay";
    devToolsModalElement.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(10, 15, 30, 0.98);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            z-index: 99999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            padding: 20px;
            box-sizing: border-box;
        ">
            <div style="
                background: rgba(30, 41, 59, 0.9);
                border: 1px solid rgba(239, 68, 68, 0.4);
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.2);
                border-radius: 16px;
                padding: 36px 28px;
                max-width: 480px;
                width: 90%;
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">🛡️</div>
                <h2 style="font-size: 22px; font-weight: 700; color: #f87171; margin: 0 0 12px 0;">
                    Developer Tools Restricted
                </h2>
                <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0;">
                    Developer Tools & Console Inspection have been disabled on <strong>ReelsBundles</strong> to protect content security and system integrity.
                </p>
                <div style="
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px dashed rgba(248, 113, 113, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    font-size: 12px;
                    color: #cbd5e1;
                ">
                    Please close Developer Tools / Console to return to your session.
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(devToolsModalElement);
}

function hideDevToolsWarningModal() {
    if (devToolsModalElement) {
        devToolsModalElement.remove();
        devToolsModalElement = null;
    }
}

let isReportingDevTools = false;

async function triggerDevToolsAutoLogout() {
    showDevToolsWarningModal();
    if (isReportingDevTools) return;
    isReportingDevTools = true;

    try {
        let idToken = null;
        if (typeof window.getAuthToken === "function") {
            idToken = await window.getAuthToken();
        }

        if (idToken) {
            await fetch(`${API_BASE}/user/report-devtools`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({ reason: "Developer tools inspection detected" })
            }).catch(() => {});
        }
    } catch (e) {
        console.warn("[PROTECTION] DevTools report failed:", e);
    } finally {
        setTimeout(() => {
            localStorage.clear();
            sessionStorage.clear();
            const reasonMsg = "Account suspended due to Developer Tools inspection detection.";
            const isDashboard = window.location.pathname.includes("dashboard");
            const targetPage = isDashboard ? "dashboard.html" : "download.html";
            const redirectUrl = `${targetPage}?suspended=true&reason=${encodeURIComponent(reasonMsg)}`;
            if (!window.location.href.includes("suspended=true")) {
                window.location.href = redirectUrl;
            }
        }, 1000);
    }
}

function checkDevToolsDimensions() {
    if (!protectionConfig.protectionEnabled || !protectionConfig.disableDevTools) {
        hideDevToolsWarningModal();
        return false;
    }

    if (window.location.search.includes("suspended=true")) {
        hideDevToolsWarningModal();
        return false;
    }

    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;

    if (widthDiff || heightDiff) {
        triggerDevToolsAutoLogout();
        return true;
    } else {
        hideDevToolsWarningModal();
        return false;
    }
}

let antiDebugInterval = null;

function startAntiDebuggingLoop() {
    if (antiDebugInterval) clearInterval(antiDebugInterval);

    antiDebugInterval = setInterval(() => {
        if (protectionConfig.protectionEnabled && protectionConfig.disableDevTools) {
            if (window.location.search.includes("suspended=true")) {
                hideDevToolsWarningModal();
                return;
            }

            const isDocked = checkDevToolsDimensions();

            if (!isDocked) {
                // Timing trap for undocked DevTools / Console
                const start = performance.now();
                (function () {}).constructor("debugger")();
                const end = performance.now();

                if (end - start > 100) {
                    triggerDevToolsAutoLogout();
                }
            }
        } else {
            hideDevToolsWarningModal();
        }
    }, 800);
}

window.addEventListener("resize", checkDevToolsDimensions);

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
            showProtectionToast("Right-click is disabled to protect content library.");
        }
    }, true);

    // 2. Image and Element Dragging Protection
    document.addEventListener("dragstart", (event) => {
        if (protectionConfig.protectionEnabled) {
            event.preventDefault();
        }
    }, true);

    // 3. DevTools & Inspection Keyboard Shortcuts
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
            showProtectionToast("Developer tools access is restricted.");
            return false;
        }

        // Ctrl+Shift+I / Cmd+Option+I (Inspect Element)
        if (isCmdOrCtrl && (event.shiftKey || event.altKey) && (key === "i" || code === "keyi")) {
            event.preventDefault();
            event.stopPropagation();
            showProtectionToast("Developer tools access is restricted.");
            return false;
        }

        // Ctrl+Shift+J / Cmd+Option+J (Console)
        if (isCmdOrCtrl && (event.shiftKey || event.altKey) && (key === "j" || code === "keyj")) {
            event.preventDefault();
            event.stopPropagation();
            showProtectionToast("Developer tools access is restricted.");
            return false;
        }

        // Ctrl+Shift+C / Cmd+Option+C (Element Selector)
        if (isCmdOrCtrl && (event.shiftKey || event.altKey) && (key === "c" || code === "keyc")) {
            event.preventDefault();
            event.stopPropagation();
            showProtectionToast("Developer tools access is restricted.");
            return false;
        }

        // Ctrl+U / Cmd+U (View Source)
        if (isCmdOrCtrl && (key === "u" || code === "keyu")) {
            event.preventDefault();
            event.stopPropagation();
            showProtectionToast("Source code viewing is disabled.");
            return false;
        }

        // Ctrl+S / Cmd+S (Save Page)
        if (isCmdOrCtrl && (key === "s" || code === "keys")) {
            event.preventDefault();
            event.stopPropagation();
            showProtectionToast("Saving web page is disabled.");
            return false;
        }

        // Ctrl+P / Cmd+P (Print Page)
        if (isCmdOrCtrl && (key === "p" || code === "keyp")) {
            event.preventDefault();
            event.stopPropagation();
            showProtectionToast("Printing page source is disabled.");
            return false;
        }
    }, true);
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

// 1. Initialize protection & fetch initial settings
initContentProtection();
fetchProtectionSettings();

// 2. Periodic Auto-Refresh Polling (Every 5 seconds)
setInterval(fetchProtectionSettings, 5000);

// 3. Tab Focus Auto-Refresh
window.addEventListener("focus", fetchProtectionSettings);

// 4. Cross-Tab Live Broadcast Sync
try {
    const protectionChannel = new BroadcastChannel("reelsbundles_protection_sync");
    protectionChannel.onmessage = (event) => {
        if (event.data && (event.data.type === "PROTECTION_UPDATED" || event.data.type === "PROTECTION_CHANGED")) {
            fetchProtectionSettings();
        }
    };
} catch (err) {}

// 5. LocalStorage Fallback Storage Event Sync
window.addEventListener("storage", (event) => {
    if (event.key === "reelsbundles_protection_sync_time") {
        fetchProtectionSettings();
    }
});
