/* ==========================================================
   ADMIN REGISTERED USERS MANAGER
   ========================================================== */

const API_BASE = (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:3000"
            : "https://reelsbundles-backend.onrender.com"
    );

function getAdminToken() {
    return localStorage.getItem("admin_token") ||
           localStorage.getItem("rb_admin_token") ||
           sessionStorage.getItem("admin_token") ||
           sessionStorage.getItem("rb_admin_token") || "";
}

let allUsers = [];

async function fetchAdminUsers(isSilent = false) {
    const tbody = document.getElementById("usersTableBody");
    const countEl = document.getElementById("totalUsersCount");
    if (!tbody) return;

    try {
        const token = getAdminToken();
        const res = await robustFetch(`${API_BASE}/admin/users`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        allUsers = data.users || [];
        if (countEl) countEl.textContent = allUsers.length;

        const searchInput = document.getElementById("userSearchInput");
        const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
        if (query) {
            const filtered = allUsers.filter(u =>
                (u.displayName || "").toLowerCase().includes(query) ||
                (u.email || "").toLowerCase().includes(query) ||
                (u.id || "").toLowerCase().includes(query)
            );
            renderUsers(filtered);
        } else {
            renderUsers(allUsers);
        }
    } catch (err) {
        if (!isSilent) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:#ef4444;">Error loading users: ${err.message}</td></tr>`;
        }
    }
}

function renderUsers(usersList) {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    if (usersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:#94a3b8;">No registered users found.</td></tr>`;
        return;
    }

    tbody.innerHTML = usersList.map(u => {
        const isGoogle = (u.providerId || "").includes("google");
        const name = u.displayName || u.email?.split("@")[0] || "User";
        const initial = name.charAt(0).toUpperCase();
        const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
        const isSuspended = u.locked === true || u.status === "SUSPENDED" || u.status === "disabled";
        const reasonText = u.suspensionReason ? ` — ${u.suspensionReason}` : "";

        return `
            <tr>
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar-badge">
                            ${u.photoURL ? `<img src="${u.photoURL}" alt="${name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : initial}
                        </div>
                        <div>
                            <strong style="color:#fff; font-size:14px; display:block;">${escapeHtml(name)}</strong>
                            <small style="color:#94a3b8; font-size:12px;">${escapeHtml(u.email || '')}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="provider-badge ${isGoogle ? 'google' : ''}">
                        ${isGoogle ? '🌐 Google' : '✉️ Email'}
                    </span>
                </td>
                <td>
                    <span class="badge badge-purple" style="text-transform:capitalize;">${u.plan || 'Free'}</span>
                </td>
                <td style="color:#cbd5e1; font-size:13px;">${dateStr}</td>
                <td>
                    <span class="badge ${isSuspended ? 'badge-disabled' : 'badge-active'}" title="${escapeHtml(u.suspensionReason || '')}">
                        ${isSuspended ? '⛔ Suspended' + escapeHtml(reasonText) : '🟢 Active'}
                    </span>
                </td>
                <td style="text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:8px;">
                        <button class="btn-action" onclick="toggleUser('${u.id}')">${isSuspended ? '🔓 Unlock' : '⏸️ Suspend'}</button>
                        <button class="btn-action btn-danger" onclick="deleteUserItem('${u.id}')">🗑️ Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}

function broadcastUserStatusUpdate(userId) {
    try {
        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel("rb_user_status_sync");
            bc.postMessage({ type: "user_status_changed", userId, timestamp: Date.now() });
            setTimeout(() => bc.close(), 500);
        }
        localStorage.setItem("rb_user_status_event", JSON.stringify({ userId, timestamp: Date.now() }));
    } catch (e) {}
}

window.toggleUser = async function(userId) {
    try {
        const token = getAdminToken();
        const res = await robustFetch(`${API_BASE}/admin/users/${userId}/toggle-status`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        broadcastUserStatusUpdate(userId);
        fetchAdminUsers(true);
    } catch (err) {
        alert("Error updating user: " + err.message);
    }
};

window.deleteUserItem = async function(userId) {
    if (!confirm("Are you sure you want to permanently delete this user account?")) return;
    try {
        const token = getAdminToken();
        const res = await robustFetch(`${API_BASE}/admin/users/${userId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        broadcastUserStatusUpdate(userId);
        fetchAdminUsers(true);
    } catch (err) {
        alert("Error deleting user: " + err.message);
    }
};

window.deleteAllUsersAction = async function() {
    if (!confirm("⚠️ ARE YOU SURE YOU WANT TO PERMANENTLY DELETE ALL REGISTERED USERS?\n\nThis will remove all registered user accounts!")) {
        return;
    }
    const input = prompt("Type 'DELETE ALL' to confirm permanent deletion of all registered users:");
    if (!input || input.trim().toUpperCase() !== "DELETE ALL") {
        alert("Action cancelled. Deletion code did not match.");
        return;
    }

    try {
        const token = getAdminToken();
        const res = await robustFetch(`${API_BASE}/admin/users/all`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        alert("✅ All registered users have been deleted successfully!");
        broadcastUserStatusUpdate("all");
        fetchAdminUsers(true);
    } catch (err) {
        alert("Error deleting users: " + err.message);
    }
};

function startUserListAutoRefresh() {
    // 5-second periodic live polling
    setInterval(() => fetchAdminUsers(true), 5000);

    // Cross-tab BroadcastChannel listener
    try {
        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel("rb_user_status_sync");
            bc.onmessage = () => fetchAdminUsers(true);
        }
    } catch (e) {}

    // Storage event listener
    window.addEventListener("storage", (e) => {
        if (e.key === "rb_user_status_event") {
            fetchAdminUsers(true);
        }
    });

    // Window focus listener
    window.addEventListener("focus", () => fetchAdminUsers(true));
}

document.addEventListener("DOMContentLoaded", () => {
    fetchAdminUsers();
    startUserListAutoRefresh();

    const searchInput = document.getElementById("userSearchInput");
    searchInput?.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderUsers(allUsers);
            return;
        }
        const filtered = allUsers.filter(u =>
            (u.displayName || "").toLowerCase().includes(query) ||
            (u.email || "").toLowerCase().includes(query) ||
            (u.id || "").toLowerCase().includes(query)
        );
        renderUsers(filtered);
    });
});

async function robustFetch(url, options = {}, retries = 2, delayMs = 1500) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await window.fetch(url, options);
            return response;
        } catch (err) {
            console.warn(`[ROBUST FETCH] Attempt ${i + 1} failed for ${url}:`, err);
            if (i === retries) throw err;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
