/* ==========================================================
   REELSBUNDLES — ADMIN MAINTENANCE CONTROLLER & TOPBAR TOGGLE
========================================================== */

const MAINT_API_BASE = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
) + "/api";

let currentMaintenanceState = {
    maintenance: false,
    message: "",
    expectedBack: null,
    showTimer: true,
    testerPasscode: "5796",
    bypassKey: "RB_TESTER_KEY_5796"
};

function syncDateModeUI() {
    const modeSelect = document.getElementById("pageMaintDateMode");
    const groupEl = document.getElementById("datePickerGroup");
    const inputEl = document.getElementById("pageMaintDate");

    const mode = modeSelect ? modeSelect.value : "none";
    if (mode === "set") {
        if (groupEl) groupEl.style.display = "block";
        if (inputEl && !inputEl.value) {
            // Auto-suggest +2 hours if empty when opening set mode
            const target = new Date(Date.now() + 2 * 3600 * 1000);
            inputEl.value = new Date(target.getTime() - (target.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        }
    } else {
        if (groupEl) groupEl.style.display = "none";
        if (inputEl) inputEl.value = "";
    }
    if (typeof updatePagePreviewUI === "function") {
        updatePagePreviewUI();
    }
}
window.syncDateModeUI = syncDateModeUI;

document.addEventListener("DOMContentLoaded", () => {
    initAdminMaintenanceUI();
});

async function initAdminMaintenanceUI() {
    injectTopbarMaintenanceControls();
    await fetchMaintenanceState();
    if (document.getElementById("pageMaintForm")) {
        loadPageMaintData();
    }
}

function openMaintenanceConfigModal() {
    window.location.href = "maintenance.html";
}
window.openMaintenanceConfigModal = openMaintenanceConfigModal;

function injectTopbarMaintenanceControls() {
    const topbar = document.querySelector(".admin-topbar");
    if (!topbar) return;

    let container = topbar.querySelector(".topbar-actions, div:last-child");
    if (!container) {
        container = document.createElement("div");
        container.style.display = "flex";
        container.style.gap = "12px";
        container.style.alignItems = "center";
        topbar.appendChild(container);
    }

    // Add Maintenance Status Pill & Config Button
    const maintBadgeBtn = document.createElement("button");
    maintBadgeBtn.type = "button";
    maintBadgeBtn.id = "adminMaintToggleBtn";
    maintBadgeBtn.style.cssText = "font-size:12px; border-radius:999px; font-weight:700; padding:6px 14px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s; outline:none;";
    maintBadgeBtn.innerHTML = `<span>⚙️</span> Checking Maintenance Status...`;
    maintBadgeBtn.onclick = openMaintenanceConfigModal;

    container.insertBefore(maintBadgeBtn, container.firstChild);
}

async function fetchMaintenanceState() {
    try {
        const res = await fetch(`${MAINT_API_BASE}/system/maintenance`, { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (data.success) {
            currentMaintenanceState = {
                maintenance: Boolean(data.maintenance),
                message: data.message || "",
                expectedBack: data.expectedBack || null,
                showTimer: data.showTimer !== false,
                testerPasscode: data.testerPasscode || "5796",
                bypassKey: data.bypassKey || "RB_TESTER_KEY_5796"
            };
            updateAdminTopbarBadge();
            updatePagePreviewUI();
        }
    } catch (e) {
        console.warn("Failed to fetch maintenance telemetry:", e);
    }
}

function updateAdminTopbarBadge() {
    const btn = document.getElementById("adminMaintToggleBtn");
    if (!btn) return;

    if (currentMaintenanceState.maintenance) {
        btn.style.background = "rgba(239, 68, 68, 0.2)";
        btn.style.border = "1px solid rgba(239, 68, 68, 0.5)";
        btn.style.color = "#f87171";
        btn.innerHTML = `<span style="width:8px; height:8px; background:#ef4444; border-radius:50%; display:inline-block; box-shadow:0 0 8px #ef4444;"></span> 🛠️ MAINTENANCE: ON`;
    } else {
        btn.style.background = "rgba(34, 197, 94, 0.1)";
        btn.style.border = "1px solid rgba(34, 197, 94, 0.25)";
        btn.style.color = "#4ade80";
        btn.innerHTML = `<span style="width:8px; height:8px; background:#4ade80; border-radius:50%; display:inline-block; box-shadow:0 0 8px #4ade80;"></span> 🟢 System Active`;
    }
}

function loadPageMaintData() {
    const statusSelect = document.getElementById("pageMaintStatus");
    const msgInput = document.getElementById("pageMaintMessage") || document.getElementById("pageMaintMsg");
    const dateModeSelect = document.getElementById("pageMaintDateMode");
    const dateInput = document.getElementById("pageMaintDate");
    const dateGroup = document.getElementById("datePickerGroup");
    const passcodeInput = document.getElementById("pageTesterPasscode");

    if (statusSelect) statusSelect.value = String(currentMaintenanceState.maintenance);
    if (msgInput) msgInput.value = currentMaintenanceState.message || "";
    
    if (passcodeInput) {
        const savedPin = localStorage.getItem("rb_maint_pin");
        if (savedPin) {
            currentMaintenanceState.testerPasscode = savedPin;
            currentMaintenanceState.bypassKey = `RB_TESTER_KEY_${savedPin}`;
        }
        passcodeInput.value = savedPin || currentMaintenanceState.testerPasscode || "4050";
        passcodeInput.addEventListener("input", () => {
            const val = passcodeInput.value.trim();
            if (val) {
                currentMaintenanceState.testerPasscode = val;
                currentMaintenanceState.bypassKey = `RB_TESTER_KEY_${val}`;
                try { localStorage.setItem("rb_maint_pin", val); } catch (e) {}
            }
            updatePagePreviewUI();
        });
    }

    if (dateModeSelect) {
        if (currentMaintenanceState.expectedBack) {
            const d = new Date(currentMaintenanceState.expectedBack);
            if (!isNaN(d.getTime())) {
                dateModeSelect.value = "set";
                if (dateInput) {
                    dateInput.value = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                }
            } else {
                dateModeSelect.value = "none";
            }
        } else {
            dateModeSelect.value = "none";
        }

        syncDateModeUI();
        dateModeSelect.addEventListener("change", syncDateModeUI);
    }

    const form = document.getElementById("pageMaintForm");
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            // Clear previous error styles
            const allInputs = [statusSelect, msgInput, dateModeSelect, dateInput, passcodeInput].filter(Boolean);
            allInputs.forEach(el => el.style.border = "");

            const maintenanceVal = statusSelect?.value === "true";
            const messageVal = msgInput?.value.trim() || "";
            const dateModeVal = dateModeSelect?.value || "none";
            const dateVal = dateInput?.value || "";
            const passcodeVal = passcodeInput?.value.trim() || currentMaintenanceState.testerPasscode || "5796";

            // MANDATORY FORM VALIDATION
            let errors = [];
            if (!messageVal) {
                errors.push("User Announcement Message is mandatory.");
                if (msgInput) msgInput.style.border = "2px solid #ef4444";
            }
            if (dateModeVal === "set" && !dateVal) {
                errors.push("Completion Date & Time is mandatory when Live Countdown Mode is selected.");
                if (dateInput) dateInput.style.border = "2px solid #ef4444";
            }

            if (errors.length > 0) {
                alert("⚠️ All fields marked with * are mandatory!\n\n" + errors.join("\n"));
                return;
            }

            const btn = document.getElementById("pageMaintSubmitBtn");
            if (btn) btn.disabled = true;

            try { localStorage.setItem("rb_maint_pin", passcodeVal); } catch (e) {}

            let parsedDate = null;
            if (dateModeVal === "set" && dateVal) {
                const d = new Date(dateVal);
                if (!isNaN(d.getTime())) {
                    parsedDate = d.toISOString();
                }
            }

            const payload = {
                maintenance: maintenanceVal,
                message: messageVal,
                expectedBack: parsedDate,
                showTimer: dateModeVal === "set" && Boolean(parsedDate),
                testerPasscode: passcodeVal,
                bypassKey: `RB_TESTER_KEY_${passcodeVal}`
            };

            try {
                const res = await fetch(`${MAINT_API_BASE}/admin/system/maintenance`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error("Failed to update maintenance settings");

                const data = await res.json();
                currentMaintenanceState = {
                    maintenance: Boolean(data.settings.maintenance),
                    message: data.settings.message,
                    expectedBack: data.settings.expectedBack,
                    showTimer: data.settings.showTimer !== false,
                    testerPasscode: data.settings.testerPasscode || passcodeVal,
                    bypassKey: data.settings.bypassKey || `RB_TESTER_KEY_${passcodeVal}`
                };

                updateAdminTopbarBadge();
                updatePagePreviewUI();
                alert(data.message || "✅ Maintenance Mode settings updated successfully!");
            } catch (err) {
                alert("❌ Error: " + err.message);
            } finally {
                if (btn) btn.disabled = false;
            }
        };
    }

    updatePagePreviewUI();
}

function updatePagePreviewUI() {
    const statusEl = document.getElementById("prevMaintStatus");
    const msgEl = document.getElementById("prevMaintMsg");
    const dateEl = document.getElementById("prevMaintDate");
    const pinEl = document.getElementById("prevMaintPin");
    const activePinTextEl = document.getElementById("activePinText");

    const formStatus = document.getElementById("pageMaintStatus");
    const formMsg = document.getElementById("pageMaintMessage") || document.getElementById("pageMaintMsg");
    const formDateMode = document.getElementById("pageMaintDateMode");
    const formDate = document.getElementById("pageMaintDate");
    const formPin = document.getElementById("pageTesterPasscode");

    const isMaintOn = formStatus ? formStatus.value === "true" : currentMaintenanceState.maintenance;
    const currentMsg = formMsg ? formMsg.value.trim() : currentMaintenanceState.message;
    const isDateSetMode = formDateMode ? formDateMode.value === "set" : Boolean(currentMaintenanceState.expectedBack);
    const currentDateVal = formDate ? formDate.value : "";
    const currentPin = (formPin ? formPin.value.trim() : "") || currentMaintenanceState.testerPasscode || "4050";

    if (statusEl) {
        if (isMaintOn) {
            statusEl.textContent = "🛠️ MAINTENANCE MODE IS ACTIVE (ON)";
            statusEl.style.color = "#f87171";
        } else {
            statusEl.textContent = "🟢 SYSTEM IS LIVE (OFF)";
            statusEl.style.color = "#4ade80";
        }
    }

    if (msgEl) {
        msgEl.textContent = currentMsg || "Standard maintenance notice.";
    }

    if (dateEl) {
        if (isDateSetMode && currentDateVal) {
            const d = new Date(currentDateVal);
            if (!isNaN(d.getTime())) {
                dateEl.textContent = d.toLocaleString() + " (Live Countdown Active)";
            } else {
                dateEl.textContent = "No Completion Date Set (Notice Only Mode Active)";
            }
        } else {
            dateEl.textContent = "No Completion Date Set (Notice Only Mode Active)";
        }
    }

    if (pinEl) {
        pinEl.textContent = `🔑 ${currentPin} (Live Synced)`;
    }

    if (activePinTextEl) {
        activePinTextEl.textContent = currentPin;
    }
}

function copyTesterBypassLink() {
    const passcode = document.getElementById("pageTesterPasscode")?.value.trim() || currentMaintenanceState.testerPasscode || "5796";
    const testerKey = `RB_TESTER_KEY_${passcode}`;
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/admin\/.*/, "");
    const bypassUrl = `${baseUrl}/?tester_key=${encodeURIComponent(testerKey)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(bypassUrl).then(() => {
            alert("📋 Secret Tester Bypass Link copied to clipboard!\n\nOpen this link on any phone or laptop to bypass Maintenance Mode for testing:\n\n" + bypassUrl);
        }).catch(() => {
            prompt("Copy Secret Tester Link below:", bypassUrl);
        });
    } else {
        prompt("Copy Secret Tester Link below:", bypassUrl);
    }
}

function setQuickMaintDate(inputId, hours) {
    const target = new Date(Date.now() + hours * 3600 * 1000);
    const formatted = new Date(target.getTime() - (target.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    const input = document.getElementById(inputId);
    if (input) input.value = formatted;
    updatePagePreviewUI();
}

function clearMaintDate(inputId) {
    const input = document.getElementById(inputId);
    if (input) input.value = "";
    updatePagePreviewUI();
}

function testPublicVisitorView() {
    try {
        sessionStorage.removeItem("rb_maint_tester_session");
        localStorage.removeItem("rb_maint_tester_unlocked");
        localStorage.setItem("rb_maint_active", "true");
    } catch (e) {}

    const homepageUrl = window.location.origin + window.location.pathname.replace(/\/admin\/.*/, "") + "/";
    alert("🔒 Tester Bypass Session cleared!\n\nRedirecting to homepage to test the Public Visitor Under Maintenance Screen...");
    window.location.href = homepageUrl;
}

window.setQuickMaintDate = setQuickMaintDate;
window.clearMaintDate = clearMaintDate;
window.copyTesterBypassLink = copyTesterBypassLink;
window.testPublicVisitorView = testPublicVisitorView;
window.loadPageMaintData = loadPageMaintData;
window.updatePagePreviewUI = updatePagePreviewUI;
window.syncDateModeUI = syncDateModeUI;
