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
