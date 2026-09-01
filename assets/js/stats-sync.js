/* ==========================================================
   REELSBUNDLES — LIVE SYSTEM STATS SYNC MODULE
   Fetches real-time database stats from GET /api/system/stats
   and updates hero cards, counter elements, and stat cards.
========================================================== */

import { robustFetch } from "./auth-common.js";
import { loadPublicCustomerReviews } from "./feedback.js";

const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "");
export async function fetchAndSyncStats() {
    try {
        const response = await robustFetch(`${API_BASE}/system/stats`, {
            method: "GET",
            headers: { "Accept": "application/json" },
            cache: "no-store"
        });

        if (!response || !response.ok) return;
        const data = await response.json().catch(() => null);
        if (!data || !data.success || !data.stats) return;

        const stats = data.stats;

        // 1. Update text elements with data-stat attributes
        document.querySelectorAll("[data-stat='happy-customers']").forEach(el => {
            el.textContent = stats.happyCustomers;
        });

        document.querySelectorAll("[data-stat='ready-reels']").forEach(el => {
            el.textContent = stats.readyReels;
        });

        document.querySelectorAll("[data-stat='satisfaction']").forEach(el => {
            el.textContent = stats.satisfaction;
        });

        document.querySelectorAll("[data-stat='support']").forEach(el => {
            el.textContent = stats.support;
        });

        // 2. Update data-counter & data-stat-counter elements
        document.querySelectorAll("[data-stat-counter='happy-customers'], [data-counter='10000']").forEach(el => {
            if (stats.happyCustomersCount) {
                el.setAttribute("data-counter", stats.happyCustomersCount);
                if (!el.getAttribute("data-animated")) {
                    el.textContent = (stats.happyCustomersCount / 1000).toFixed(1) + "K+";
                }
            }
        });

        document.querySelectorAll("[data-stat-counter='satisfaction'], [data-counter='99']").forEach(el => {
            if (stats.satisfaction) {
                el.setAttribute("data-counter", stats.satisfactionPercentage || 99);
                if (!el.getAttribute("data-animated")) {
                    el.textContent = stats.satisfaction;
                }
            }
        });

        console.log("[Stats Sync] Live system stats synchronized from backend:", stats);
    } catch (err) {
        console.warn("[Stats Sync] Unable to sync live stats:", err?.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fetchAndSyncStats();
    try {
        loadPublicCustomerReviews("liveReviewsContainer");
    } catch (e) {}

    // Auto-refresh live stats & public customer reviews every 3 seconds
    setInterval(() => {
        fetchAndSyncStats();
        try {
            loadPublicCustomerReviews("liveReviewsContainer");
        } catch (e) {}
    }, 3000);
});
