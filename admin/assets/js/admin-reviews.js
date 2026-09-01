import { robustFetch, getFirebaseIdToken } from "../../../assets/js/auth-common.js";

const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000/api"
        : "https://reelsbundles-backend.onrender.com/api"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
let currentReviews = [];

async function getAuthToken() {
    try {
        if (typeof getFirebaseIdToken === "function") {
            return await getFirebaseIdToken();
        } else if (typeof window.getFirebaseIdToken === "function") {
            return await window.getFirebaseIdToken();
        }
    } catch (e) {}
    return "";
}

async function doFetch(url, options = {}) {
    if (typeof robustFetch === "function") {
        return await robustFetch(url, options);
    } else if (typeof window.robustFetch === "function") {
        return await window.robustFetch(url, options);
    } else {
        return await fetch(url, options);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadAdminReviews();

    // Auto-refresh admin reviews table every 3 seconds in background
    setInterval(() => {
        const editId = document.getElementById("editReviewId")?.value;
        if (!editId) {
            loadAdminReviews(true);
        }
    }, 3000);

    const form = document.getElementById("adminReviewForm");
    if (form) {
        form.addEventListener("submit", handleSaveReview);
    }

    const refreshBtn = document.getElementById("refreshReviewsBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => loadAdminReviews());
    }

    const cancelBtn = document.getElementById("cancelEditBtn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", resetForm);
    }
});

async function loadAdminReviews(isSilent = false) {
    const tbody = document.getElementById("reviewsTbody");
    if (!isSilent && tbody && currentReviews.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding:24px; text-align:center; color:#94a3b8;">Loading feedback data...</td></tr>`;
    }

    try {
        const token = await getAuthToken();
        const response = await doFetch(`${API_BASE}/admin/reviews`, {
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response || !response.ok) throw new Error("Failed to load reviews.");
        const data = await response.json();
        if (!data || !data.success) throw new Error(data.message || "Failed to load reviews.");

        currentReviews = data.reviews || [];
        const stats = data.stats || {};

        const countBadge = document.getElementById("reviewCountBadge");
        if (countBadge) countBadge.textContent = `${currentReviews.length} Reviews`;

        const avgBadge = document.getElementById("avgRatingBadge");
        if (avgBadge) avgBadge.textContent = `${stats.averageRating || 4.9}★ Average (${stats.satisfactionPercentage || 99}% Positive)`;

        renderReviewsTable(currentReviews);
    } catch (err) {
        console.error("Load Reviews Error:", err);
        if (!isSilent && tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="padding:24px; text-align:center; color:#ef4444;">Failed to load feedback data: ${err.message}</td></tr>`;
        }
    }
}

function renderReviewsTable(reviews) {
    const tbody = document.getElementById("reviewsTbody");
    if (!tbody) return;

    if (reviews.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding:24px; text-align:center; color:#94a3b8;">No customer feedback found. Use the form on the left to add one!</td></tr>`;
        return;
    }

    let html = "";
    reviews.forEach(r => {
        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A";
        const stars = "★".repeat(r.rating || 5);
        const isActive = r.approved !== false;
        const statusBadge = isActive
            ? `<span class="badge-active">🟢 Active</span>`
            : `<span class="badge-inactive">🔴 Deactivated</span>`;

        html += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.06); transition:background 0.2s;">
                <td style="padding:12px 16px; font-weight:700; color:#fff;">${r.customerName || 'Anonymous'}</td>
                <td style="padding:12px 16px; font-weight:600; color:#c4b5fd;">${(r.bundlePlan || 'premium').toUpperCase()}</td>
                <td style="padding:12px 16px; color:#f59e0b; font-size:15px;">${stars} (${r.rating || 5}/5)</td>
                <td style="padding:12px 16px; max-width:260px; word-break:break-word; color:#e2e8f0;">"${r.comment || ''}"</td>
                <td style="padding:12px 16px; font-size:12px; color:#94a3b8;">${dateStr}</td>
                <td style="padding:12px 16px;">${statusBadge}</td>
                <td style="padding:12px 16px; text-align:right;">
                    <button type="button" class="btn-action edit-rev-btn" data-id="${r.id}">✏️ Edit</button>
                    <button type="button" class="btn-action toggle-rev-btn" data-id="${r.id}" data-active="${isActive}">${isActive ? '🔴 Deactivate' : '🟢 Activate'}</button>
                    <button type="button" class="btn-action btn-danger delete-rev-btn" data-id="${r.id}">🗑️ Delete</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    tbody.querySelectorAll(".edit-rev-btn").forEach(btn => {
        btn.addEventListener("click", () => handleEditClick(btn.getAttribute("data-id")));
    });

    tbody.querySelectorAll(".toggle-rev-btn").forEach(btn => {
        btn.addEventListener("click", () => handleToggleClick(btn.getAttribute("data-id"), btn.getAttribute("data-active") === "true"));
    });

    tbody.querySelectorAll(".delete-rev-btn").forEach(btn => {
        btn.addEventListener("click", () => handleDeleteClick(btn.getAttribute("data-id")));
    });
}

function handleEditClick(id) {
    const item = currentReviews.find(r => r.id === id);
    if (!item) return;

    document.getElementById("editReviewId").value = item.id;
    document.getElementById("reviewCustomerName").value = item.customerName || "";
    document.getElementById("reviewBundlePlan").value = item.bundlePlan || "premium";
    document.getElementById("reviewStarRating").value = String(item.rating || 5);
    document.getElementById("reviewQualityRating").value = item.qualityRating || "5/5 Excellent Quality";
    document.getElementById("reviewSupportRating").value = item.supportRating || "10/10 Excellent Experience";
    document.getElementById("reviewComment").value = item.comment || "";
    document.getElementById("reviewApproved").value = item.approved !== false ? "true" : "false";

    document.getElementById("formTitle").textContent = "✏️ Edit Customer Feedback";
    document.getElementById("saveReviewBtn").textContent = "Update Feedback";
    document.getElementById("cancelEditBtn").style.display = "block";
}

function resetForm() {
    document.getElementById("editReviewId").value = "";
    document.getElementById("adminReviewForm").reset();
    document.getElementById("formTitle").textContent = "➕ Add New Feedback";
    document.getElementById("saveReviewBtn").textContent = "Save Feedback";
    document.getElementById("cancelEditBtn").style.display = "none";
    document.getElementById("adminFormStatus").textContent = "";
}

async function handleSaveReview(e) {
    e.preventDefault();

    const editId = document.getElementById("editReviewId").value;
    const customerName = document.getElementById("reviewCustomerName").value.trim();
    const bundlePlan = document.getElementById("reviewBundlePlan").value;
    const rating = Number(document.getElementById("reviewStarRating").value);
    const qualityRating = document.getElementById("reviewQualityRating").value.trim();
    const supportRating = document.getElementById("reviewSupportRating").value.trim();
    const comment = document.getElementById("reviewComment").value.trim();
    const approved = document.getElementById("reviewApproved").value === "true";
    const statusEl = document.getElementById("adminFormStatus");
    const saveBtn = document.getElementById("saveReviewBtn");

    if (!customerName || !comment) {
        if (statusEl) {
            statusEl.textContent = "⚠️ Customer Name and Comment are required.";
            statusEl.style.color = "#f87171";
        }
        return;
    }

    if (statusEl) {
        statusEl.textContent = "Saving review...";
        statusEl.style.color = "#c4b5fd";
    }
    saveBtn.disabled = true;

    try {
        const token = await getAuthToken();
        const url = editId
            ? `${API_BASE}/admin/reviews/${editId}`
            : `${API_BASE}/admin/reviews`;
        const method = editId ? "PUT" : "POST";

        const response = await doFetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                customerName,
                bundlePlan,
                rating,
                qualityRating,
                supportRating,
                comment,
                approved
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to save review.");
        }

        if (statusEl) {
            statusEl.textContent = data.message || "✓ Review saved successfully!";
            statusEl.style.color = "#4ade80";
        }

        resetForm();
        await loadAdminReviews();
    } catch (err) {
        if (statusEl) {
            statusEl.textContent = `❌ ${err.message}`;
            statusEl.style.color = "#f87171";
        }
    } finally {
        saveBtn.disabled = false;
    }
}

async function handleToggleClick(id, currentActive) {
    if (!confirm(`Are you sure you want to ${currentActive ? 'deactivate' : 'activate'} this feedback?`)) return;

    try {
        const token = await getAuthToken();
        const response = await doFetch(`${API_BASE}/admin/reviews/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ approved: !currentActive })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to toggle review status.");
        }

        await loadAdminReviews();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}

async function handleDeleteClick(id) {
    if (!confirm("Are you sure you want to PERMANENTLY DELETE this feedback?")) return;

    try {
        const token = await getAuthToken();
        const response = await doFetch(`${API_BASE}/admin/reviews/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to delete review.");
        }

        await loadAdminReviews();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}
