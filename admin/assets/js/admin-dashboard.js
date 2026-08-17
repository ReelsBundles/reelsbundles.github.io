const API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000"
        : (window.REELSBUNDLES_CONFIG?.API_BASE_URL || "https://reelsbundles-backend.onrender.com")
);

const token = localStorage.getItem("admin_token");
const admin = JSON.parse(localStorage.getItem("admin_data") || "{}");

if (!token) {
    location.href = "index.html";
}

// Show Admin Name
const adminName = document.getElementById("adminName");
if (adminName) {
    adminName.textContent = admin.email || "Admin";
}

// Logout Handlers
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
if (adminLogoutBtn) {
    adminLogoutBtn.onclick = () => {
        localStorage.clear();
        location.href = "index.html";
    };
}

const refreshDashboardBtn = document.getElementById("refreshDashboardBtn");
if (refreshDashboardBtn) {
    refreshDashboardBtn.onclick = () => {
        loadDashboard();
    };
}

// Initialize & 10-second silent polling
window.loadDashboard = loadDashboard;
loadDashboard();
setInterval(loadDashboard, 10000);

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) return;

        const data = await response.json();
        if (!data || !data.success) return;

        const stats = data.stats || data.dashboard || data;

        // Metrics
        const totalRevenue = document.getElementById("totalRevenue");
        if (totalRevenue) totalRevenue.textContent = `₹${(stats.revenue || 0).toLocaleString("en-IN")}`;

        const totalOrders = document.getElementById("totalOrders");
        if (totalOrders) totalOrders.textContent = stats.orders ?? 0;

        const totalDownloads = document.getElementById("totalDownloads");
        if (totalDownloads) totalDownloads.textContent = stats.downloads ?? 0;

        const totalCategories = document.getElementById("totalCategories");
        if (totalCategories) totalCategories.textContent = stats.bundles ?? stats.categories ?? 0;

        // Recent Orders Live Table
        const ordersTable = document.getElementById("ordersTable");
        if (ordersTable && Array.isArray(stats.recentOrders)) {
            if (stats.recentOrders.length === 0) {
                ordersTable.innerHTML = `<p style="color:rgba(255,255,255,0.4); font-size:13px; text-align:center; padding:15px;">No orders found yet.</p>`;
            } else {
                ordersTable.innerHTML = `
                    <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                        <thead>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6);">
                                <th style="padding:10px 8px;">Customer</th>
                                <th style="padding:10px 8px;">Amount</th>
                                <th style="padding:10px 8px;">Plan</th>
                                <th style="padding:10px 8px;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.recentOrders.map(order => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <td style="padding:10px 8px;">
                                        <strong>${escapeHtml(order.customerName)}</strong><br>
                                        <small style="color:rgba(255,255,255,0.5);">${escapeHtml(order.email)}</small>
                                    </td>
                                    <td style="padding:10px 8px; font-weight:700; color:#4ade80;">₹${order.amount}</td>
                                    <td style="padding:10px 8px;">
                                        <span style="background:rgba(124, 58, 237, 0.15); color:#a78bfa; padding:4px 8px; border-radius:6px; font-size:11px; text-transform:uppercase;">${escapeHtml(order.plan)}</span>
                                    </td>
                                    <td style="padding:10px 8px;">
                                        <span style="background:${order.status === 'PAID' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 191, 36, 0.15)'}; color:${order.status === 'PAID' ? '#4ade80' : '#fbbf24'}; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:600;">${order.status}</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        }

        // Recent Downloads Live Table
        const downloadsTable = document.getElementById("downloadsTable");
        if (downloadsTable && Array.isArray(stats.recentDownloads)) {
            if (stats.recentDownloads.length === 0) {
                downloadsTable.innerHTML = `<p style="color:rgba(255,255,255,0.4); font-size:13px; text-align:center; padding:15px;">No download logs yet.</p>`;
            } else {
                downloadsTable.innerHTML = `
                    <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                        <thead>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6);">
                                <th style="padding:10px 8px;">Customer</th>
                                <th style="padding:10px 8px;">Bundle</th>
                                <th style="padding:10px 8px;">Plan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.recentDownloads.map(dl => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <td style="padding:10px 8px;">
                                        <strong>${escapeHtml(dl.customerName)}</strong>
                                    </td>
                                    <td style="padding:10px 8px; color:rgba(255,255,255,0.8);">${escapeHtml(dl.bundleName)}</td>
                                    <td style="padding:10px 8px;">
                                        <span style="background:rgba(96, 165, 250, 0.15); color:#60a5fa; padding:4px 8px; border-radius:6px; font-size:11px; text-transform:uppercase;">${escapeHtml(dl.plan)}</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        }

    } catch (err) {
        console.error("[Admin Dashboard] Live telemetry error:", err);
    }
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