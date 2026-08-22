/* ==========================================================
   REELSBUNDLES — ADMIN NOTIFICATIONS CONTROLLER
========================================================== */

const API_BASE = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
) + "/api";

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
        const res = await fetch(`${API_BASE}/admin/notifications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "Failed to create notification");
        }

        document.getElementById("createNotifForm").reset();
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
