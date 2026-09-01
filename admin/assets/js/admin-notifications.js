/* ==========================================================
   REELSBUNDLES — ADMIN NOTIFICATIONS CONTROLLER
========================================================== */

const API_BASE = (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:3000"
            : "https://reelsbundles-backend.onrender.com"
    );

let editingNotificationId = null;
let cachedNotificationsList = [];

document.addEventListener("DOMContentLoaded", () => {
    loadNotifications();

    const form = document.getElementById("createNotifForm");
    if (form) {
        form.addEventListener("submit", handleCreateNotification);
    }
});

async function loadNotifications() {
    const tbody = document.getElementById("notificationsTableBody");
    const countEl = document.getElementById("notifCount");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/admin/notifications`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load notifications");
        const data = await res.json();
        const list = data.notifications || [];
        cachedNotificationsList = list;

        if (countEl) countEl.textContent = `${list.length} total`;

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">
                        No notifications found. Create one using the form on the left!
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = list.map(n => {
            const typeBadge = n.type === "coupon"
                ? `<span class="badge-coupon">🎁 COUPON</span>`
                : (n.type === "alert" ? `<span class="badge-alert">⚠️ ALERT</span>` : `<span class="badge-announcement">📢 INFO</span>`);

            const statusBadge = n.active
                ? `<span class="badge-active">ACTIVE</span>`
                : `<span class="badge-inactive">INACTIVE</span>`;

            return `
                <tr>
                    <td>
                        <strong style="color:#fff; display:block; font-size:14px;">${escapeHtml(n.title)}</strong>
                        <small style="color:#94a3b8; font-size:12px;">${escapeHtml(n.message)}</small>
                    </td>
                    <td>${typeBadge}</td>
                    <td><code style="color:#4ade80; background:rgba(34,197,94,0.1); padding:2px 6px; border-radius:4px;">${escapeHtml(n.couponCode || "-")}</code></td>
                    <td style="color:#cbd5e1; font-size:12px;">${escapeHtml(n.targetAudience || "all")}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn-action" style="background:rgba(59,130,246,0.2); border-color:rgba(59,130,246,0.4); color:#93c5fd; margin-right:4px;" onclick="editNotificationItem('${n.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn-action" onclick="toggleNotificationStatus('${n.id}', ${!n.active})">
                            ${n.active ? "Deactivate" : "Activate"}
                        </button>
                        <button class="btn-action btn-danger" onclick="deleteNotificationItem('${n.id}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (err) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:30px; color:#f87171;">
                    Error loading notifications: ${escapeHtml(err.message)}
                </td>
            </tr>
        `;
    }
}

function editNotificationItem(id) {
    const item = cachedNotificationsList.find(n => n.id === id);
    if (!item) return;

    editingNotificationId = id;

    const titleInput = document.getElementById("notifTitle");
    const msgInput = document.getElementById("notifMessage");
    const typeSelect = document.getElementById("notifType");
    const couponInput = document.getElementById("couponCode");
    const audienceSelect = document.getElementById("targetAudience");

    if (titleInput) titleInput.value = item.title || "";
    if (msgInput) msgInput.value = item.message || "";
    if (typeSelect) typeSelect.value = item.type || "announcement";
    if (couponInput) couponInput.value = item.couponCode || "";
    if (audienceSelect) audienceSelect.value = item.targetAudience || "all";

    const submitBtn = document.getElementById("submitBtn");
    const cancelBtn = document.getElementById("cancelEditBtn");

    if (submitBtn) submitBtn.textContent = "💾 Save Notification Changes";
    if (cancelBtn) cancelBtn.style.display = "inline-block";

    if (titleInput) titleInput.focus();
}

function cancelEditNotification() {
    editingNotificationId = null;
    const form = document.getElementById("createNotifForm");
    if (form) form.reset();

    const submitBtn = document.getElementById("submitBtn");
    const cancelBtn = document.getElementById("cancelEditBtn");

    if (submitBtn) submitBtn.textContent = "➕ Publish Notification";
    if (cancelBtn) cancelBtn.style.display = "none";
}

async function handleCreateNotification(e) {
    e.preventDefault();
    const btn = document.getElementById("submitBtn");
    if (btn) btn.disabled = true;

    const payload = {
        title: document.getElementById("notifTitle").value.trim(),
        message: document.getElementById("notifMessage").value.trim(),
        type: document.getElementById("notifType").value,
        couponCode: document.getElementById("couponCode").value.trim().toUpperCase(),
        targetAudience: document.getElementById("targetAudience").value,
        active: true
    };

    try {
        const isEditing = Boolean(editingNotificationId);
        const url = isEditing
            ? `${API_BASE}/admin/notifications/${editingNotificationId}`
            : `${API_BASE}/admin/notifications`;
        const method = isEditing ? "PUT" : "POST";

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "Failed to save notification");
        }

        cancelEditNotification();
        loadNotifications();
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function toggleNotificationStatus(id, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/admin/notifications/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: newStatus })
        });

        if (res.ok) {
            loadNotifications();
        }
    } catch (err) {
        alert("Error updating notification: " + err.message);
    }
}

async function deleteNotificationItem(id) {
    if (!confirm("Are you sure you want to delete this notification?")) return;

    try {
        const res = await fetch(`${API_BASE}/admin/notifications/${id}`, {
            method: "DELETE"
        });

        if (res.ok) {
            loadNotifications();
        }
    } catch (err) {
        alert("Error deleting notification: " + err.message);
    }
}

function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}

window.toggleNotificationStatus = toggleNotificationStatus;
window.deleteNotificationItem = deleteNotificationItem;
window.editNotificationItem = editNotificationItem;
window.cancelEditNotification = cancelEditNotification;
