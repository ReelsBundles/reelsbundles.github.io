/* ==========================================================
   REELSBUNDLES — ADMIN NOTIFICATIONS CONTROLLER
   PERSISTENT STORAGE, LIVE SYNC & ADMIN AUTHENTICATION
========================================================== */

const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000/api"
        : "https://reelsbundles-backend.onrender.com/api"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
const STORAGE_KEY = "rb_admin_persistent_notifications";

let editingNotificationId = null;
let cachedNotificationsList = [];

// Enforce Admin Authentication
const adminToken = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
if (!adminToken) {
    window.location.href = "index.html";
}

function getStoredNotifications() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function setStoredNotifications(list) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
    } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
    // Update admin user display in sidebar if available
    try {
        const adminData = JSON.parse(localStorage.getItem("admin_data") || "{}");
        const sidebarName = document.getElementById("adminSidebarName");
        if (sidebarName && adminData.email) {
            sidebarName.textContent = adminData.email;
        }
    } catch (e) {}

    // Attach safe logout handler that NEVER wipes notifications
    const logoutBtn = document.getElementById("adminLogoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_data");
            sessionStorage.removeItem("admin_token");
            sessionStorage.removeItem("admin_data");
            window.location.href = "index.html";
        };
    }

    // Immediately render cached notifications to eliminate empty-state flicker
    cachedNotificationsList = getStoredNotifications();
    if (cachedNotificationsList.length > 0) {
        renderNotificationsTable(cachedNotificationsList);
    }

    // Fetch live notifications from backend
    loadNotifications();

    const form = document.getElementById("createNotifForm");
    if (form) {
        form.addEventListener("submit", handleCreateNotification);
    }
});

function renderNotificationsTable(list) {
    const tbody = document.getElementById("notificationsTableBody");
    const countEl = document.getElementById("notifCount");
    if (!tbody) return;

    if (countEl) countEl.textContent = `${list.length} total`;

    if (!list || list.length === 0) {
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
}

async function loadNotifications() {
    const tbody = document.getElementById("notificationsTableBody");
    const countEl = document.getElementById("notifCount");
    if (!tbody) return;

    try {
        const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/admin/notifications`, {
            cache: "no-store",
            headers
        });

        if (!res.ok) throw new Error("Failed to load notifications");
        const data = await res.json();
        const serverList = Array.isArray(data.notifications) ? data.notifications : [];

        if (serverList.length > 0) {
            cachedNotificationsList = serverList;
            setStoredNotifications(serverList);
            renderNotificationsTable(cachedNotificationsList);
        } else if (cachedNotificationsList.length > 0) {
            // Server was restarted/empty: restore persistent notifications back to the server
            renderNotificationsTable(cachedNotificationsList);
            for (const notif of cachedNotificationsList) {
                try {
                    await fetch(`${API_BASE}/admin/notifications`, {
                        method: "POST",
                        headers,
                        body: JSON.stringify(notif)
                    });
                } catch (e) {}
            }
        } else {
            cachedNotificationsList = [];
            setStoredNotifications([]);
            renderNotificationsTable([]);
        }
    } catch (err) {
        console.warn("[ADMIN NOTIFICATIONS] Server load warning:", err.message);
        // Ensure local persistent notifications are shown even during network issues
        const localList = getStoredNotifications();
        if (localList.length > 0) {
            cachedNotificationsList = localList;
            renderNotificationsTable(cachedNotificationsList);
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:30px; color:#f87171;">
                        Notice: Connecting to notification engine... ${escapeHtml(err.message)}
                    </td>
                </tr>
            `;
        }
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
        const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const isEditing = Boolean(editingNotificationId);
        const url = isEditing
            ? `${API_BASE}/admin/notifications/${editingNotificationId}`
            : `${API_BASE}/admin/notifications`;
        const method = isEditing ? "PUT" : "POST";

        const res = await fetch(url, {
            method: method,
            headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to save notification");
        }

        const resJson = await res.json().catch(() => ({}));
        const savedItem = resJson.notification || {
            id: isEditing ? editingNotificationId : `notif_${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString()
        };

        if (isEditing) {
            const idx = cachedNotificationsList.findIndex(n => n.id === editingNotificationId);
            if (idx !== -1) cachedNotificationsList[idx] = savedItem;
        } else {
            cachedNotificationsList.unshift(savedItem);
        }

        // Save immediately to persistent localStorage
        setStoredNotifications(cachedNotificationsList);
        renderNotificationsTable(cachedNotificationsList);

        cancelEditNotification();
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function toggleNotificationStatus(id, newStatus) {
    try {
        const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Update local state immediately for instant feedback
        const idx = cachedNotificationsList.findIndex(n => n.id === id);
        if (idx !== -1) {
            cachedNotificationsList[idx].active = newStatus;
            setStoredNotifications(cachedNotificationsList);
            renderNotificationsTable(cachedNotificationsList);
        }

        const res = await fetch(`${API_BASE}/admin/notifications/${id}`, {
            method: "PUT",
            headers,
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
        const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Remove from local persistent storage immediately
        cachedNotificationsList = cachedNotificationsList.filter(n => n.id !== id);
        setStoredNotifications(cachedNotificationsList);
        renderNotificationsTable(cachedNotificationsList);

        const res = await fetch(`${API_BASE}/admin/notifications/${id}`, {
            method: "DELETE",
            headers
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
