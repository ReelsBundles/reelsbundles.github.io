/* ==========================================================
   REELSBUNDLES CENTRAL FRONTEND CONFIGURATION
   Supports local development & GitHub Pages production
   ========================================================== */

export const FRONTEND_URL = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
)
    ? window.location.origin
    : "https://reelsbundles.github.io";

export const API_BASE_URL = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
)
    ? "http://localhost:3000"
    : (window.REELSBUNDLES_CONFIG?.API_BASE_URL || "https://reelsbundles.github.io"); // or production backend URL

export function getApiUrl(endpoint) {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${cleanEndpoint}`;
}

(function cleanAddressBarUrl() {
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
    } catch (e) {
        // Safe execution
    }
})();
