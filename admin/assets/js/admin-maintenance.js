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
    showTimer: true
};

document.addEventListener("DOMContentLoaded", () => {
    initAdminMaintenanceUI();
});

async function initAdminMaintenanceUI() {
    injectTopbarMaintenanceControls();
    await fetchMaintenanceState();
}

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
                showTimer: data.showTimer !== false
            };
            updateAdminTopbarBadge();
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

function openMaintenanceConfigModal() {
    let modal = document.getElementById("adminMaintModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "adminMaintModal";
        modal.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(10px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;";
        
        // Format ISO date for datetime-local input
        let dateVal = "";
        if (currentMaintenanceState.expectedBack) {
            const d = new Date(currentMaintenanceState.expectedBack);
            dateVal = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        }

        modal.innerHTML = `
            <div style="background:#1e293b; border:1px solid rgba(124,58,237,0.4); border-radius:20px; padding:28px; width:100%; max-width:480px; color:#fff; box-shadow:0 20px 50px rgba(0,0,0,0.8);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 style="margin:0; font-size:18px; font-weight:800; color:#fff;">⚙️ Maintenance Mode Settings</h3>
                    <button type="button" onclick="document.getElementById('adminMaintModal').style.display='none'" style="background:none; border:none; color:#94a3b8; font-size:24px; cursor:pointer;">&times;</button>
                </div>
                <form id="maintConfigForm">
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:13px; font-weight:600; color:#cbd5e1; margin-bottom:6px;">Maintenance Status</label>
                        <select id="maintStatusSelect" style="width:100%; padding:10px 14px; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:14px; outline:none;">
                            <option value="false" ${!currentMaintenanceState.maintenance ? 'selected' : ''}>🟢 Normal Operations (OFF)</option>
                            <option value="true" ${currentMaintenanceState.maintenance ? 'selected' : ''}>🔴 Under Maintenance (ON)</option>
                        </select>
                    </div>
                    <div style="margin-bottom:16px;">
                        <label style="display:block; font-size:13px; font-weight:600; color:#cbd5e1; margin-bottom:6px;">User Announcement Message</label>
                        <textarea id="maintMessageInput" rows="3" style="width:100%; padding:10px 14px; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:14px; outline:none;" placeholder="Enter message to display to users...">${escapeHtml(currentMaintenanceState.message)}</textarea>
                    </div>
                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:13px; font-weight:600; color:#cbd5e1; margin-bottom:6px;">Estimated Completion Date & Time (Optional for Countdown Timer)</label>
                        <input type="datetime-local" id="maintDateInput" value="${dateVal}" style="width:100%; padding:10px 14px; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#fff; font-size:14px; outline:none;">
                        <small style="color:#94a3b8; font-size:11px; margin-top:4px; display:block;">Sets live ⏳ Days : Hours : Mins : Secs countdown timer for users.</small>
                    </div>
                    <div style="display:flex; gap:12px; justify-content:flex-end;">
                        <button type="button" onclick="document.getElementById('adminMaintModal').style.display='none'" style="padding:10px 18px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#cbd5e1; font-weight:600; cursor:pointer;">Cancel</button>
                        <button type="submit" id="saveMaintBtn" style="padding:10px 20px; background:linear-gradient(135deg, #7c3aed, #6366f1); border:none; border-radius:10px; color:#fff; font-weight:700; cursor:pointer;">💾 Save Settings</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById("maintConfigForm").addEventListener("submit", saveMaintenanceConfig);
    } else {
        modal.style.display = "flex";
    }
}

async function saveMaintenanceConfig(e) {
    e.preventDefault();
    const btn = document.getElementById("saveMaintBtn");
    if (btn) btn.disabled = true;

    const maintenanceVal = document.getElementById("maintStatusSelect").value === "true";
    const messageVal = document.getElementById("maintMessageInput").value.trim();
    const dateVal = document.getElementById("maintDateInput").value;

        let parsedDate = null;
        if (dateVal) {
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
                parsedDate = d.toISOString();
            }
        }

        const payload = {
            maintenance: maintenanceVal,
            message: messageVal || "🛠️ ReelsBundles is currently undergoing scheduled system upgrades.",
            expectedBack: parsedDate,
            showTimer: true
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
            showTimer: data.settings.showTimer !== false
        };

        updateAdminTopbarBadge();
        document.getElementById("adminMaintModal").style.display = "none";
        alert(data.message || "Maintenance settings saved successfully!");
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}

window.openMaintenanceConfigModal = openMaintenanceConfigModal;
