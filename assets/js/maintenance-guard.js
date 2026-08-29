/* ==========================================================
   REELSBUNDLES — INSTANT ZERO-FLASH MAINTENANCE GUARD & TIMER
========================================================== */

(function () {
    // Skip maintenance check on Admin routes completely
    if (window.location.pathname.includes("/admin/") || window.location.href.includes("/admin/")) {
        return;
    }

    const API_BASE = (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:3000"
            : "https://reelsbundles-backend.onrender.com"
    ) + "/api";

    // 1. FAST SYNC PRE-BLOCK: Prevent 2-3s flash of index page on refresh
    try {
        const isCachedActive = localStorage.getItem("rb_maint_active") === "true";
        if (isCachedActive) {
            const preStyle = document.createElement("style");
            preStyle.id = "maintPreBlockStyle";
            preStyle.textContent = `
                body > *:not(#maintOverlay) { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
                html { background: #030712 !important; }
            `;
            (document.head || document.documentElement).appendChild(preStyle);

            const cachedData = localStorage.getItem("rb_maint_data");
            if (cachedData) {
                renderMaintenanceOverlay(JSON.parse(cachedData));
            }
        }
    } catch (e) {}

    let countdownInterval = null;

    async function checkMaintenanceStatus() {
        try {
            const res = await fetch(`${API_BASE}/system/maintenance`, { cache: "no-store" });
            if (!res.ok) return;

            const data = await res.json();
            if (data.success) {
                if (data.maintenance) {
                    try {
                        localStorage.setItem("rb_maint_active", "true");
                        localStorage.setItem("rb_maint_data", JSON.stringify(data));
                    } catch (e) {}
                    renderMaintenanceOverlay(data);
                } else {
                    // Maintenance is OFF -> Clear cache & unblock instantly
                    try {
                        localStorage.setItem("rb_maint_active", "false");
                        localStorage.removeItem("rb_maint_data");
                    } catch (e) {}
                    removeMaintenanceOverlay();
                }
            }
        } catch (err) {
            console.warn("[MAINTENANCE GUARD] Telemetry check warning:", err);
        }
    }

    function removeMaintenanceOverlay() {
        const style = document.getElementById("maintPreBlockStyle");
        if (style) style.remove();

        const overlay = document.getElementById("maintOverlay");
        if (overlay) overlay.remove();

        if (countdownInterval) clearInterval(countdownInterval);
    }

    function renderMaintenanceOverlay(data) {
        let overlay = document.getElementById("maintOverlay");
        const message = data.message || "🛠️ ReelsBundles is undergoing scheduled maintenance. We will be back online shortly!";
        
        let targetDate = null;
        if (data.expectedBack) {
            const d = new Date(data.expectedBack);
            if (!isNaN(d.getTime()) && d > new Date()) {
                targetDate = d;
            }
        }

        // If no date or date passed, set fallback target to 2 hours from now so timer boxes ALWAYS display
        if (!targetDate) {
            targetDate = new Date(Date.now() + 2 * 3600 * 1000);
        }

        const timerGridHtml = `
            <div class="maint-timer-title">⌛ Estimated Completion In</div>
            <div class="maint-timer-grid">
                <div class="maint-timer-card">
                    <div class="maint-timer-num" id="maintDays">00</div>
                    <div class="maint-timer-lbl">Days</div>
                </div>
                <div class="maint-timer-card">
                    <div class="maint-timer-num" id="maintHours">00</div>
                    <div class="maint-timer-lbl">Hours</div>
                </div>
                <div class="maint-timer-card">
                    <div class="maint-timer-num" id="maintMins">00</div>
                    <div class="maint-timer-lbl">Mins</div>
                </div>
                <div class="maint-timer-card">
                    <div class="maint-timer-num" id="maintSecs">00</div>
                    <div class="maint-timer-lbl">Secs</div>
                </div>
            </div>
        `;

        const innerContent = `
            <div class="maint-card">
                <div class="maint-gear-box">
                    <span class="maint-gear-main">⚙️</span>
                    <span class="maint-gear-sub">🔧</span>
                </div>
                <div class="maint-badge">
                    <span style="width:8px; height:8px; background:#ef4444; border-radius:50%; display:inline-block; box-shadow:0 0 8px #ef4444;"></span>
                    Scheduled Maintenance
                </div>
                <h1 class="maint-title">We'll Be Back Soon!</h1>
                <div class="maint-message">${escapeHtml(message)}</div>
                ${timerGridHtml}
                <div class="maint-actions">
                    <a href="https://t.me/reelsbundles" target="_blank" class="maint-btn maint-btn-primary">
                        💬 Telegram Support
                    </a>
                    <button type="button" onclick="location.reload()" class="maint-btn maint-btn-secondary">
                        🔄 Refresh Page
                    </button>
                </div>
            </div>
        `;

        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "maintOverlay";
            overlay.className = "maint-overlay";
            overlay.innerHTML = innerContent;

            if (document.body) {
                document.body.appendChild(overlay);
            } else {
                document.addEventListener("DOMContentLoaded", () => {
                    document.body.appendChild(overlay);
                });
            }
        } else {
            overlay.innerHTML = innerContent;
        }

        startCountdownTimer(targetDate);
    }

    function startCountdownTimer(targetDate) {
        if (countdownInterval) clearInterval(countdownInterval);

        function updateClock() {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;

            if (distance <= 0) {
                if (countdownInterval) clearInterval(countdownInterval);
                const grid = document.querySelector(".maint-timer-grid");
                if (grid) grid.innerHTML = `<div style="grid-column: 1 / -1; color: #a78bfa; font-weight:700; font-size:15px; background:rgba(124, 58, 237, 0.15); border:1px solid rgba(124, 58, 237, 0.3); padding:12px 16px; border-radius:12px;">✨ Finalizing system upgrades... We will be back online shortly!</div>`;
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((distance % (1000 * 60)) / 1000);

            const dEl = document.getElementById("maintDays");
            const hEl = document.getElementById("maintHours");
            const mEl = document.getElementById("maintMins");
            const sEl = document.getElementById("maintSecs");

            if (dEl) dEl.textContent = String(days).padStart(2, "0");
            if (hEl) hEl.textContent = String(hours).padStart(2, "0");
            if (mEl) mEl.textContent = String(mins).padStart(2, "0");
            if (sEl) sEl.textContent = String(secs).padStart(2, "0");
        }

        updateClock();
        countdownInterval = setInterval(updateClock, 1000);
    }

    function escapeHtml(str) {
        return String(str || "").replace(/[&<>"']/g, match => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[match]));
    }

    // Execute telemetry check
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", checkMaintenanceStatus);
    } else {
        checkMaintenanceStatus();
    }
})();
