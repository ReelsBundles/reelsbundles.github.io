/* ==========================================================
   REELSBUNDLES — SITE-WIDE CONTENT PROTECTION MODULE
   PREVENTS SOURCE CODE THEFT & UNTHORIZED COPYING
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

function initContentProtection() {
    // 1. Right Click Protection
    document.addEventListener("contextmenu", (event) => {
        if (protectionConfig.protectionEnabled && protectionConfig.disableRightClick) {
            event.preventDefault();
            showProtectionToast("Right-click is disabled to protect content library.");
        }
    }, true);

    // 2. DevTools & Inspection Keyboard Shortcuts
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
    }, true);
}

async function fetchProtectionSettings() {
    try {
        const response = await fetch(`${API_BASE}/protection/status`, { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings) {
                protectionConfig = { ...protectionConfig, ...data.settings };
            }
        }
    } catch (e) {
        console.warn("[PROTECTION] Using default protection config:", e);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        fetchProtectionSettings();
        initContentProtection();
    });
} else {
    fetchProtectionSettings();
    initContentProtection();
}
