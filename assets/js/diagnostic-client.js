/* ==========================================================
   REELSBUNDLES — UNIVERSAL CLIENT OBSERVABILITY & DIAGNOSTICS
   Zero-disruption browser telemetry for JS exceptions,
   network failures, timeouts, and request tracing.
========================================================== */

(function initDiagnosticClient() {
    if (window.__RB_DIAGNOSTIC_INITIALIZED__) return;
    window.__RB_DIAGNOSTIC_INITIALIZED__ = true;

    const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
            ? "http://localhost:3000/api"
            : "https://reelsbundles-backend.onrender.com/api"
    );
    const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "") + "/api";

    // Deduplication cache
    const reportedSignatures = new Map();
    const MAX_CLIENT_REPORTS_PER_SESSION = 50;
    let totalReportsSent = 0;

    /* Deduce current page name safely */
    function getPageName() {
        const title = (document.title || "").split("|")[0].trim();
        if (title && title.length < 40) return title;

        const path = window.location.pathname.toLowerCase();
        if (path.includes("admin/orders")) return "Admin Orders";
        if (path.includes("admin/users")) return "Admin Users";
        if (path.includes("admin/bundles")) return "Admin Bundles";
        if (path.includes("admin/coupons")) return "Admin Coupons";
        if (path.includes("admin/reviews")) return "Admin Feedback";
        if (path.includes("admin/notifications")) return "Admin Notifications";
        if (path.includes("admin/maintenance")) return "Admin Maintenance";
        if (path.includes("admin/demo-videos")) return "Admin Demo Videos";
        if (path.includes("admin/download")) return "Admin Downloads";
        if (path.includes("admin/storage")) return "Admin Storage";
        if (path.includes("admin/dashboard")) return "Admin Dashboard";
        if (path.includes("admin/monitor")) return "Admin Monitor";
        if (path.includes("admin")) return "Admin Panel";

        if (path.includes("payment")) return "Payment";
        if (path.includes("success")) return "Success";
        if (path.includes("failed")) return "Failed";
        if (path.includes("download")) return "Download";
        if (path.includes("dashboard")) return "Dashboard";
        if (path.includes("login")) return "Login";
        if (path.includes("signup")) return "Signup";
        if (path.includes("contact")) return "Contact";
        if (path.includes("demo")) return "Demo";
        return "Landing";
    }

    function isCurrentPageAdmin() {
        return window.location.pathname.includes("/admin");
    }

    /* Helper: Generate client request ID */
    function generateClientId() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `RB-${yyyy}${mm}${dd}-${hh}${min}${ss}-${rand}`;
    }

    /* Safe Reporter (SendBeacon or raw Fetch) */
    function sendErrorReport(data) {
        if (totalReportsSent >= MAX_CLIENT_REPORTS_PER_SESSION) return;

        const signature = `${data.message || ""}::${data.file || ""}::${data.line || ""}`;
        const now = Date.now();
        const lastSent = reportedSignatures.get(signature) || 0;

        // Debounce: 10s cooldown per identical error
        if (now - lastSent < 10000) return;
        reportedSignatures.set(signature, now);
        totalReportsSent++;

        const payload = {
            page: getPageName(),
            source: isCurrentPageAdmin() ? "ADMIN" : "USER",
            url: window.location.href,
            timestamp: new Date().toISOString(),
            ...data
        };

        const targetUrl = `${API_BASE}/monitor/client-error`;
        const jsonStr = JSON.stringify(payload);

        try {
            if (navigator.sendBeacon) {
                const blob = new Blob([jsonStr], { type: "application/json" });
                navigator.sendBeacon(targetUrl, blob);
            } else {
                originalFetch(targetUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: jsonStr,
                    keepalive: true
                }).catch(() => {});
            }
        } catch (e) {}
    }

    /* 1. Global JS Runtime Error Handler */
    window.addEventListener("error", (event) => {
        try {
            // Ignore script error from third-party CDN without CORS
            if (event.message === "Script error." && !event.filename) return;

            sendErrorReport({
                isFrontendError: true,
                message: event.message || "Unknown JavaScript Error",
                file: (event.filename || "").split("/").pop() || "inline",
                line: event.lineno || 0,
                column: event.colno || 0,
                stack: event.error?.stack ? String(event.error.stack).slice(0, 1000) : null,
                isNetworkError: false
            });
        } catch (e) {}
    });

    /* 2. Unhandled Promise Rejection Handler */
    window.addEventListener("unhandledrejection", (event) => {
        try {
            const reason = event.reason;
            let msg = "Unhandled Promise Rejection";
            let stack = null;

            if (typeof reason === "string") {
                msg = reason;
            } else if (reason && typeof reason === "object") {
                msg = reason.message || reason.statusText || JSON.stringify(reason).slice(0, 150);
                stack = reason.stack ? String(reason.stack).slice(0, 1000) : null;
            }

            sendErrorReport({
                isFrontendError: true,
                message: msg,
                file: "unhandled-promise",
                line: 0,
                column: 0,
                stack,
                isNetworkError: false
            });
        } catch (e) {}
    });

    /* 3. Instrument window.fetch for request correlation and network failures */
    const originalFetch = window.fetch;
    window.fetch = async function(input, init = {}) {
        const urlStr = typeof input === "string" ? input : (input?.url || "");

        // Don't instrument monitoring reporting itself or third-party assets
        if (
            urlStr.includes("/api/monitor/client-error") ||
            urlStr.includes("/api/admin/monitor") ||
            (!urlStr.startsWith("/api") && !urlStr.includes("/api/"))
        ) {
            return originalFetch.apply(this, arguments);
        }

        const options = { ...init };
        const headers = new Headers(options.headers || (typeof input === "object" && input.headers ? input.headers : {}));

        const reqId = headers.get("X-Request-Id") || generateClientId();
        headers.set("X-Request-Id", reqId);
        headers.set("X-RB-Page", getPageName());
        headers.set("X-RB-Source", isCurrentPageAdmin() ? "ADMIN" : "USER");

        options.headers = headers;

        const startTime = performance.now();
        try {
            const response = await originalFetch.apply(this, [input, options]);
            return response;
        } catch (networkError) {
            const durationMs = Math.round(performance.now() - startTime);

            // Report network failure
            sendErrorReport({
                isFrontendError: false,
                isNetworkError: true,
                requestId: reqId,
                endpoint: urlStr.split("?")[0],
                networkStatus: 0,
                durationMs,
                message: networkError.message || "Network request failed",
                stack: networkError.stack ? String(networkError.stack).slice(0, 500) : null
            });

            throw networkError;
        }
    };

    console.log(`[Diagnostic Telemetry] Initialized on ${getPageName()} (${isCurrentPageAdmin() ? 'ADMIN' : 'USER'} mode).`);
})();
