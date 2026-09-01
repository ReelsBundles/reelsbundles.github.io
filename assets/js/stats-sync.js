/* ==========================================================
   REELSBUNDLES — LIVE SYSTEM STATS SYNC MODULE
   Fetches real-time database stats from GET /api/system/stats
   and updates hero cards, counter elements, and stat cards.
========================================================== */

import { robustFetch } from "./auth-common.js";

const API_BASE =
    window.REELS_BUNDLES_API_BASE ||
    (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:3000/api"
            : "https://reelsbundles-backend.onrender.com/api"
    );

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

        // 1. Update elements with data-stat attributes or matching IDs
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

        // 2. Update data-counter elements (e.g. <h2 data-counter="10000">)
        const counterEl = document.querySelector("h2[data-counter]");
        if (counterEl && stats.happyCustomersCount) {
            counterEl.setAttribute("data-counter", stats.happyCustomersCount);
        }

        console.log("[Stats Sync] Live system stats synchronized from backend:", stats);
    } catch (err) {
        console.warn("[Stats Sync] Unable to sync live stats:", err?.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fetchAndSyncStats();
});
