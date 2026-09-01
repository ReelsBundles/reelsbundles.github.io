/* ==========================================================
   REELSBUNDLES — INSTANT ZERO-FLASH MAINTENANCE GUARD,
   REAL-TIME AUTO-LOCK & SESSION-ONLY TESTER BYPASS
========================================================== */

(function () {
    // Skip maintenance check on Admin routes completely
    if (window.location.pathname.includes("/admin/") || window.location.href.includes("/admin/")) {
        return;
    }

    const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000/api"
        : "https://reelsbundles-backend.onrender.com/api"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
// Clear legacy permanent localStorage bypass keys to enforce session-only expiry
    try {
        localStorage.removeItem("rb_maint_tester_unlocked");
    } catch (e) {}

    // 1. CHECK SESSION-ONLY TESTER UNLOCK VIA URL KEY OR SESSION STORAGE
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const testerKey = urlParams.get("tester_key") || urlParams.get("bypass_token") || urlParams.get("tester");

        if (testerKey && testerKey.startsWith("RB_TESTER_")) {
            sessionStorage.setItem("rb_maint_tester_session", "true");
            // Clean URL query param without refreshing
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
        }

        const isTesterSessionActive = sessionStorage.getItem("rb_maint_tester_session") === "true";
        if (isTesterSessionActive) {
            console.log("[MAINTENANCE GUARD] 🔓 Session Tester Bypass Active. Showing Live Site.");
            // Still run polling in case maintenance turns off or session changes
            startRealtimeTelemetryPolling();
            return;
        }
    } catch (e) {}

    // 2. FAST SYNC PRE-BLOCK: Prevent 2-3s flash of index page on refresh
    try {
        const isCachedActive = localStorage.getItem("rb_maint_active") === "true";
        if (isCachedActive) {
            const preStyle = document.createElement("style");
            preStyle.id = "maintPreBlockStyle";
            preStyle.textContent = `
                body > *:not(#maintOverlay):not(#testerPassModal) { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
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
    let telemetryPollTimer = null;
    let lastMaintenanceState = null;

    async function checkMaintenanceStatus(isBackgroundPoll = false) {
        try {
            const res = await fetch(`${API_BASE}/system/maintenance`, { cache: "no-store" });
            if (!res.ok) return;

            const data = await res.json();
            if (data.success) {
                const isTesterSessionActive = sessionStorage.getItem("rb_maint_tester_session") === "true";

                if (data.maintenance) {
                    try {
                        localStorage.setItem("rb_maint_active", "true");
                        localStorage.setItem("rb_maint_data", JSON.stringify(data));
                    } catch (e) {}

                    if (isTesterSessionActive) {
                        removeMaintenanceOverlay();
                        return;
                    }

                    renderMaintenanceOverlay(data);
                } else {
                    // Maintenance is OFF -> Clear cache & unblock instantly
                    const hadOverlay = Boolean(document.getElementById("maintOverlay"));
                    try {
                        localStorage.setItem("rb_maint_active", "false");
                        localStorage.removeItem("rb_maint_data");
                    } catch (e) {}
                    removeMaintenanceOverlay();

                    // Auto-reload live site if overlay was active previously or maintenance ended live
                    if (hadOverlay || lastMaintenanceState === true) {
                        console.log("[MAINTENANCE GUARD] 🔓 Maintenance Mode ended live! Auto-reloading site...");
                        location.reload();
                    }
                }

                lastMaintenanceState = Boolean(data.maintenance);
            }
        } catch (err) {
            console.warn("[MAINTENANCE GUARD] Telemetry check warning:", err);
        }
    }

    function startRealtimeTelemetryPolling() {
        if (telemetryPollTimer) return;
        // Poll backend telemetry every 5 seconds for real-time auto-lock / auto-unlock / message sync
        telemetryPollTimer = setInterval(() => {
            checkMaintenanceStatus(true);
        }, 5000);

        // Also check instantly when tab regains focus / visibility
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                checkMaintenanceStatus(true);
            }
        });
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

        let middleSectionHtml = "";
        if (targetDate) {
            middleSectionHtml = `
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
        } else {
            middleSectionHtml = `
                <div style="margin:22px 0; padding:18px 22px; background:rgba(124, 58, 237, 0.14); border:1px solid rgba(167, 139, 250, 0.35); border-radius:18px; color:#c4b5fd; font-size:14px; font-weight:600; text-align:center; line-height:1.6; box-shadow:0 8px 24px rgba(0,0,0,0.3);">
                    ✨ ${escapeHtml(message)}
                </div>
            `;
        }

        const innerContent = `
            <div class="maint-card" style="position: relative;">
                <button type="button" class="notification-bell-btn maint-bell-btn" id="maintBellBtn" title="View Live System Alerts" style="position: absolute; top: 18px; right: 18px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; font-size: 20px; transition: background 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    🔔
                    <span class="bell-badge" id="maintBellBadge" style="position: absolute; top: -2px; right: -2px; background: #ef4444; color: #fff; font-size: 10px; font-weight: 800; border-radius: 10px; padding: 2px 6px; display: none;"></span>
                </button>
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
                ${middleSectionHtml}
                <div class="maint-actions">
                    <a href="contact.html" class="maint-btn maint-btn-primary">
                        📩 Contact Support
                    </a>
                    <button type="button" onclick="location.reload()" class="maint-btn maint-btn-secondary">
                        🔄 Refresh Page
                    </button>
                </div>
                <div>
                    <button type="button" id="openTesterModalBtn" class="maint-tester-link">
                        🔐 Admin / Tester Access (Session Only)
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

        // Attach listener for Tester Passcode Modal
        setTimeout(() => {
            const btn = document.getElementById("openTesterModalBtn");
            if (btn) {
                btn.onclick = () => openTesterPasscodeModal(data);
            }
        }, 100);

        if (targetDate) {
            startCountdownTimer(targetDate);
        } else if (countdownInterval) {
            clearInterval(countdownInterval);
        }
    }

    function openTesterPasscodeModal(data) {
        let modal = document.getElementById("testerPassModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "testerPassModal";
            modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); backdrop-filter:blur(16px); z-index:9999999; display:flex; align-items:center; justify-content:center; padding:20px; font-family:'Inter',sans-serif;";
            
            modal.innerHTML = `
                <div style="background:#1e293b; border:1px solid rgba(124,58,237,0.5); border-radius:24px; padding:32px; width:100%; max-width:420px; color:#fff; text-align:center; box-shadow:0 25px 60px rgba(0,0,0,0.9);">
                    <div style="font-size:42px; margin-bottom:12px;">🔐</div>
                    <h3 style="margin:0 0 8px; font-size:20px; font-weight:800; color:#fff;">Tester Session Access</h3>
                    <p style="font-size:13px; color:#cbd5e1; margin-bottom:20px;">Enter Admin / Tester PIN Passcode to unlock live site testing for this browser session.</p>
                    
                    <form id="testerPassForm">
                        <div style="position:relative; width:100%; margin-bottom:16px;">
                            <input type="password" id="testerPinInput" placeholder="Enter Tester PIN Passcode" style="width:100%; padding:12px 44px 12px 16px; background:#0f172a; border:1px solid rgba(167,139,250,0.4); border-radius:12px; color:#fff; font-size:16px; text-align:center; letter-spacing:2px; outline:none;" required autofocus>
                            <button type="button" id="togglePinVisBtn" title="Toggle PIN Visibility" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#a78bfa; font-size:18px; cursor:pointer; padding:4px;">👁️</button>
                        </div>
                        <div id="testerPinError" style="color:#f87171; font-size:12px; font-weight:600; margin-bottom:12px; display:none;"></div>
                        <div style="display:flex; gap:10px;">
                            <button type="button" id="closeTesterModalBtn" style="flex:1; padding:12px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:12px; color:#cbd5e1; font-weight:600; cursor:pointer;">Cancel</button>
                            <button type="submit" id="unlockSessionBtn" style="flex:1; padding:12px; background:linear-gradient(135deg, #7c3aed, #6366f1); border:none; border-radius:12px; color:#fff; font-weight:700; cursor:pointer;">🔓 Unlock Session</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById("closeTesterModalBtn").onclick = () => {
                modal.style.display = "none";
            };

            const pinInput = document.getElementById("testerPinInput");
            const toggleBtn = document.getElementById("togglePinVisBtn");
            if (toggleBtn && pinInput) {
                toggleBtn.onclick = () => {
                    if (pinInput.type === "password") {
                        pinInput.type = "text";
                        toggleBtn.textContent = "🙈";
                    } else {
                        pinInput.type = "password";
                        toggleBtn.textContent = "👁️";
                    }
                };
            }

            document.getElementById("testerPassForm").onsubmit = async (e) => {
                e.preventDefault();
                const pin = document.getElementById("testerPinInput").value.trim();
                const errEl = document.getElementById("testerPinError");
                const submitBtn = document.getElementById("unlockSessionBtn");

                if (errEl) errEl.style.display = "none";
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "⌛ Verifying...";
                }

                let validPins = new Set();
                if (data && data.testerPasscode) validPins.add(String(data.testerPasscode).trim());
                try {
                    const savedPin = localStorage.getItem("rb_maint_pin");
                    if (savedPin) validPins.add(String(savedPin).trim());
                    const cachedRaw = localStorage.getItem("rb_maint_data");
                    if (cachedRaw) {
                        const cachedObj = JSON.parse(cachedRaw);
                        if (cachedObj && cachedObj.testerPasscode) {
                            validPins.add(String(cachedObj.testerPasscode).trim());
                        }
                    }
                } catch (err) {}

                let isPinValid = false;

                // Direct API pin verification endpoint
                try {
                    const resVerify = await fetch(`${API_BASE}/system/verify-pin`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pin })
                    });
                    if (resVerify.ok) {
                        const verifyData = await resVerify.json();
                        if (verifyData.success && verifyData.valid) {
                            isPinValid = true;
                            if (verifyData.passcode) {
                                validPins.add(String(verifyData.passcode).trim());
                            }
                        }
                    }
                } catch (err) {}

                // Fallback telemetry check
                if (!isPinValid) {
                    try {
                        const res = await fetch(`${API_BASE}/system/maintenance`, { cache: "no-store" });
                        if (res.ok) {
                            const telemetry = await res.json();
                            if (telemetry.success && telemetry.testerPasscode) {
                                validPins.add(String(telemetry.testerPasscode).trim());
                                try {
                                    localStorage.setItem("rb_maint_data", JSON.stringify(telemetry));
                                    localStorage.setItem("rb_maint_pin", String(telemetry.testerPasscode).trim());
                                } catch (e) {}
                            }
                        }
                    } catch (err) {}
                }

                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "🔓 Unlock Session";
                }

                if (isPinValid || (pin && validPins.has(String(pin).trim()))) {
                    sessionStorage.setItem("rb_maint_tester_session", "true");
                    try { localStorage.setItem("rb_maint_pin", String(pin).trim()); } catch (e) {}
                    modal.style.display = "none";
                    removeMaintenanceOverlay();
                    alert("✨ Live site unlocked for testing in this browser session!\n\nNote: Closing this tab or browser will automatically expire the tester session.");
                } else {
                    if (errEl) {
                        errEl.textContent = `❌ Incorrect Passcode (${pin}). Please try again.`;
                        errEl.style.display = "block";
                    }
                }
            };
        } else {
            modal.style.display = "flex";
        }
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

    // Execute telemetry check & start real-time background polling
    startRealtimeTelemetryPolling();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => checkMaintenanceStatus());
    } else {
        checkMaintenanceStatus();
    }
})();
