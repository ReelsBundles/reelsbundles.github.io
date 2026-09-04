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
    if (document.getElementById("createImportantAlertForm")) {
        initImportantAlertsUI();
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
    const activePinText = document.getElementById("activePinText");

    if (statusSelect) statusSelect.value = String(currentMaintenanceState.maintenance);
    if (msgInput) msgInput.value = currentMaintenanceState.message || "";
    
    if (passcodeInput) {
        const livePin = currentMaintenanceState.testerPasscode || "5045";
        passcodeInput.value = livePin;
        if (activePinText) activePinText.textContent = livePin;

        passcodeInput.addEventListener("input", () => {
            const val = passcodeInput.value.trim();
            currentMaintenanceState.testerPasscode = val || livePin;
            currentMaintenanceState.bypassKey = `RB_TESTER_KEY_${val || livePin}`;
            if (activePinText) activePinText.textContent = val || livePin;
            try { localStorage.setItem("rb_maint_pin", val || livePin); } catch (e) {}
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
    const currentPin = (formPin ? formPin.value.trim() : "") || currentMaintenanceState.testerPasscode || "5045";

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

/* ==========================================================
   IMPORTANT ALERTS CONTROLLER & PERSISTENT STORAGE
========================================================== */
const STORAGE_KEY_ALERTS = "rb_admin_persistent_important_alerts";
let cachedAlertsList = [];
let editingAlertId = null;

function getAdminAuthHeader() {
    const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getStoredImportantAlerts() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_ALERTS);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function setStoredImportantAlerts(list) {
    try {
        localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(list || []));
    } catch (e) {}
}

function initImportantAlertsUI() {
    // Immediately render cached alerts to prevent layout flicker
    cachedAlertsList = getStoredImportantAlerts();
    if (cachedAlertsList.length > 0) {
        renderImportantAlertsTable(cachedAlertsList);
    }

    // Fetch alerts from backend
    loadImportantAlerts();

    const form = document.getElementById("createImportantAlertForm");
    if (form) {
        form.addEventListener("submit", handleCreateImportantAlert);
    }
}

async function loadImportantAlerts() {
    try {
        const res = await fetch(`${MAINT_API_BASE}/admin/system/important-alerts`, {
            headers: getAdminAuthHeader(),
            cache: "no-store"
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        if (data.success && Array.isArray(data.alerts)) {
            // Auto-restore if backend storage was wiped on container reboot
            if (data.alerts.length === 0) {
                const local = getStoredImportantAlerts();
                if (local.length > 0) {
                    for (const item of local) {
                        try {
                            await fetch(`${MAINT_API_BASE}/admin/system/important-alerts`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    ...getAdminAuthHeader()
                                },
                                body: JSON.stringify(item)
                            });
                        } catch (e) {}
                    }
                    const refetch = await fetch(`${MAINT_API_BASE}/admin/system/important-alerts`, {
                        headers: getAdminAuthHeader(),
                        cache: "no-store"
                    });
                    if (refetch.ok) {
                        const reData = await refetch.json();
                        if (reData.success && Array.isArray(reData.alerts)) {
                            data.alerts = reData.alerts;
                        }
                    }
                }
            }

            cachedAlertsList = data.alerts;
            setStoredImportantAlerts(cachedAlertsList);
            renderImportantAlertsTable(cachedAlertsList);
        }
    } catch (e) {
        console.warn("Using offline/cached important alerts:", e);
        cachedAlertsList = getStoredImportantAlerts();
        renderImportantAlertsTable(cachedAlertsList);
    }
}

function renderImportantAlertsTable(list) {
    const tbody = document.getElementById("importantAlertsTableBody");
    const countEl = document.getElementById("importantAlertsCount");
    if (!tbody) return;

    if (countEl) countEl.textContent = `${list.length} total`;

    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">
                    No Important Alerts found. Create one using the form on the left.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(a => {
        let levelBadge = `<span style="background:rgba(245, 158, 11, 0.15); color:#fbbf24; border:1px solid rgba(245, 158, 11, 0.3); padding:4px 10px; border-radius:999px; font-weight:700; font-size:12px;">⚠️ NOTICE</span>`;
        if (a.level === "danger") {
            levelBadge = `<span style="background:rgba(239, 68, 68, 0.15); color:#f87171; border:1px solid rgba(239, 68, 68, 0.3); padding:4px 10px; border-radius:999px; font-weight:700; font-size:12px;">🚨 CRITICAL</span>`;
        } else if (a.level === "info") {
            levelBadge = `<span style="background:rgba(59, 130, 246, 0.15); color:#93c5fd; border:1px solid rgba(59, 130, 246, 0.3); padding:4px 10px; border-radius:999px; font-weight:700; font-size:12px;">ℹ️ INFO</span>`;
        }

        const statusBadge = a.active
            ? `<span style="background:rgba(34, 197, 94, 0.2); color:#4ade80; padding:4px 10px; border-radius:999px; font-weight:600; font-size:12px; border:1px solid rgba(34, 197, 94, 0.4);">🟢 ACTIVE</span>`
            : `<span style="background:rgba(100, 116, 139, 0.2); color:#94a3b8; padding:4px 10px; border-radius:999px; font-weight:600; font-size:12px; border:1px solid rgba(100, 116, 139, 0.4);">⚪ INACTIVE</span>`;

        const dateFormatted = a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : (a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "-");

        return `
            <tr>
                <td>
                    <strong style="color:#fff; display:block; font-size:14px; margin-bottom:4px;">${escapeHtml(a.title)}</strong>
                    <div style="color:#cbd5e1; font-size:12px; line-height:1.4;">${escapeHtml(a.message)}</div>
                </td>
                <td>${levelBadge}</td>
                <td>${statusBadge}</td>
                <td style="color:#94a3b8; font-size:12px; white-space:nowrap;">${dateFormatted}</td>
                <td style="white-space:nowrap;">
                    <button type="button" class="btn-action" style="background:rgba(59,130,246,0.2); border-color:rgba(59,130,246,0.4); color:#93c5fd; margin-right:4px;" onclick="editImportantAlertItem('${a.id}')">
                        ✏️ Edit
                    </button>
                    <button type="button" class="btn-action" style="background:rgba(255,255,255,0.08); margin-right:4px;" onclick="toggleImportantAlertStatus('${a.id}', ${!a.active})">
                        ${a.active ? "Disable" : "Enable"}
                    </button>
                    <button type="button" class="btn-action btn-danger" onclick="deleteImportantAlertItem('${a.id}')">
                        🗑️ Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

async function handleCreateImportantAlert(e) {
    e.preventDefault();
    const titleInput = document.getElementById("alertTitle");
    const messageInput = document.getElementById("alertMessage");
    const levelInput = document.getElementById("alertLevel");
    const activeInput = document.getElementById("alertActive");
    const submitBtn = document.getElementById("submitAlertBtn");

    const title = titleInput ? titleInput.value.trim() : "";
    const message = messageInput ? messageInput.value.trim() : "";
    const level = levelInput ? levelInput.value : "warning";
    const active = activeInput ? activeInput.value === "true" : true;

    if (!title || !message) {
        alert("Please enter both Alert Title and Message.");
        return;
    }

    if (submitBtn) submitBtn.disabled = true;

    const payload = { title, message, level, active };

    try {
        let res;
        if (editingAlertId) {
            res = await fetch(`${MAINT_API_BASE}/admin/system/important-alerts/${editingAlertId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...getAdminAuthHeader()
                },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${MAINT_API_BASE}/admin/system/important-alerts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAdminAuthHeader()
                },
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to save alert");
        }

        const data = await res.json();
        alert(data.message || (editingAlertId ? "Important Alert updated successfully!" : "Important Alert created successfully!"));
        cancelEditImportantAlert();
        await loadImportantAlerts();
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

function editImportantAlertItem(id) {
    const alertItem = cachedAlertsList.find(a => a.id === id);
    if (!alertItem) return;

    editingAlertId = id;

    const titleInput = document.getElementById("alertTitle");
    const messageInput = document.getElementById("alertMessage");
    const levelInput = document.getElementById("alertLevel");
    const activeInput = document.getElementById("alertActive");
    const submitBtn = document.getElementById("submitAlertBtn");
    const cancelBtn = document.getElementById("cancelAlertEditBtn");
    const formTitle = document.getElementById("alertFormTitle");

    if (titleInput) titleInput.value = alertItem.title || "";
    if (messageInput) messageInput.value = alertItem.message || "";
    if (levelInput) levelInput.value = alertItem.level || "warning";
    if (activeInput) activeInput.value = String(Boolean(alertItem.active));

    if (submitBtn) submitBtn.textContent = "💾 Update Important Alert";
    if (cancelBtn) cancelBtn.style.display = "inline-block";
    if (formTitle) formTitle.textContent = "✏️ Edit Important Alert";

    const formEl = document.getElementById("createImportantAlertForm");
    if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function cancelEditImportantAlert() {
    editingAlertId = null;
    const form = document.getElementById("createImportantAlertForm");
    if (form) form.reset();

    const submitBtn = document.getElementById("submitAlertBtn");
    const cancelBtn = document.getElementById("cancelAlertEditBtn");
    const formTitle = document.getElementById("alertFormTitle");

    if (submitBtn) submitBtn.textContent = "➕ Publish Important Alert";
    if (cancelBtn) cancelBtn.style.display = "none";
    if (formTitle) formTitle.textContent = "➕ Create Important Alert";
}

async function toggleImportantAlertStatus(id, newStatus) {
    try {
        const res = await fetch(`${MAINT_API_BASE}/admin/system/important-alerts/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAdminAuthHeader()
            },
            body: JSON.stringify({ active: newStatus })
        });
        if (!res.ok) throw new Error("Failed to update alert status");
        const data = await res.json();

        const idx = cachedAlertsList.findIndex(a => a.id === id);
        if (idx !== -1) {
            cachedAlertsList[idx] = data.alert || { ...cachedAlertsList[idx], active: newStatus };
            setStoredImportantAlerts(cachedAlertsList);
            renderImportantAlertsTable(cachedAlertsList);
        }
    } catch (err) {
        alert("Error: " + err.message);
    }
}

async function deleteImportantAlertItem(id) {
    if (!confirm("⚠️ Are you sure you want to permanently delete this Important Alert? This action cannot be undone.")) {
        return;
    }
    try {
        const res = await fetch(`${MAINT_API_BASE}/admin/system/important-alerts/${id}`, {
            method: "DELETE",
            headers: getAdminAuthHeader()
        });
        if (!res.ok) throw new Error("Failed to delete alert");

        cachedAlertsList = cachedAlertsList.filter(a => a.id !== id);
        setStoredImportantAlerts(cachedAlertsList);
        renderImportantAlertsTable(cachedAlertsList);
    } catch (err) {
        alert("Error: " + err.message);
    }
}

window.editImportantAlertItem = editImportantAlertItem;
window.cancelEditImportantAlert = cancelEditImportantAlert;
window.toggleImportantAlertStatus = toggleImportantAlertStatus;
window.deleteImportantAlertItem = deleteImportantAlertItem;
window.initImportantAlertsUI = initImportantAlertsUI;
window.loadImportantAlerts = loadImportantAlerts;
