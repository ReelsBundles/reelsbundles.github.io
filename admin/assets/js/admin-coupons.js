/* ==========================================================
   ADMIN COUPON CODE MANAGER
   ========================================================== */

const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000/api"
        : "https://reelsbundles-backend.onrender.com/api"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
let fetchedCouponsList = [];

async function fetchCoupons() {
    const tableBody = document.getElementById("couponsTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">Loading coupon codes...</td></tr>`;

    try {
        const res = await robustFetch(`${API_BASE}/admin/coupons`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        fetchedCouponsList = data.coupons || [];
        if (fetchedCouponsList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No coupon codes created yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = fetchedCouponsList.map(c => {
            const targetType = (c.eligibleUserType || 'all').toLowerCase();
            let targetTag = '<span style="color:#94a3b8; font-size:12px; font-weight:600;">🌐 All Users</span>';
            if (targetType === 'new_users') {
                targetTag = '<span style="color:#fbbf24; font-size:12px; font-weight:700;">✨ New Users Only</span>';
            } else if (targetType === 'existing_users' || targetType === 'premium') {
                targetTag = '<span style="color:#f43f5e; font-size:12px; font-weight:700;">🔥 Returning Users</span>';
            }

            return `
                <tr>
                    <td><strong style="color:#a78bfa; font-size:15px;">${c.code}</strong></td>
                    <td>
                        <span class="badge ${c.discountType === 'percentage' ? 'badge-purple' : 'badge-green'}">
                            ${c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT OFF`}
                        </span>
                    </td>
                    <td>${targetTag}</td>
                    <td>${c.usageCount || 0} / ${c.maxUses ? c.maxUses : '∞'}</td>
                    <td>
                        ${c.expiryDate ? `<span style="color:#38bdf8; font-weight:500;">📅 ${new Date(c.expiryDate).toLocaleDateString()}</span>` : '<span style="color:#4ade80; font-weight:600;">♾️ No Expiry</span>'}
                    </td>
                    <td>
                        <span class="badge ${c.active ? 'badge-active' : 'badge-inactive'}">
                            ${c.active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td style="display:flex; gap:6px;">
                        <button class="btn-action" onclick="copyCode('${c.code}')">📋 Copy</button>
                        <button class="btn-action" style="background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); color:#60a5fa;" onclick="editCouponItem('${c.id}')">✏️ Edit</button>
                        <button class="btn-action" onclick="toggleCouponStatus('${c.id}')">${c.active ? '⏸️ Disable' : '▶️ Enable'}</button>
                        <button class="btn-action btn-danger" onclick="deleteCouponItem('${c.id}')">🗑️ Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#ef4444;">Error: ${err.message}</td></tr>`;
    }
}

async function handleCreateCoupon(e) {
    e.preventDefault();
    const btn = document.getElementById("saveCouponBtn");
    const msg = document.getElementById("formMessage");
    msg.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Creating...";

    const code = document.getElementById("couponCode").value.trim();
    const discountType = document.getElementById("discountType").value;
    const discountValue = parseFloat(document.getElementById("discountValue").value);
    const eligibleUserType = document.getElementById("eligibleUserType")?.value || "all";
    const maxUses = document.getElementById("maxUses").value ? parseInt(document.getElementById("maxUses").value) : null;
    
    const expiryType = document.getElementById("expiryType")?.value || "none";
    const expiryDate = (expiryType === "custom" && document.getElementById("expiryDate")?.value)
        ? document.getElementById("expiryDate").value
        : null;

    try {
        const res = await robustFetch(`${API_BASE}/admin/coupons`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, discountType, discountValue, eligibleUserType, maxUses, expiryDate })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        msg.innerHTML = `<span style="color:#4ade80;">✓ ${data.message}</span>`;
        document.getElementById("createCouponForm").reset();
        
        const expiryDateContainer = document.getElementById("expiryDateContainer");
        if (expiryDateContainer) expiryDateContainer.style.display = "none";

        fetchCoupons();
    } catch (err) {
        msg.innerHTML = `<span style="color:#ef4444;">✕ ${err.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.textContent = "+ Create Coupon";
    }
}

window.editCouponItem = function(id) {
    const coupon = fetchedCouponsList.find(c => c.id === id);
    if (!coupon) return;

    document.getElementById("editCouponId").value = coupon.id;
    document.getElementById("editCouponCode").value = coupon.code;
    document.getElementById("editDiscountType").value = coupon.discountType || "percentage";
    document.getElementById("editDiscountValue").value = coupon.discountValue || "";
    document.getElementById("editEligibleUserType").value = coupon.eligibleUserType || "all";
    document.getElementById("editMaxUses").value = coupon.maxUses !== null ? coupon.maxUses : "";

    const editExpiryType = document.getElementById("editExpiryType");
    const editExpiryDateContainer = document.getElementById("editExpiryDateContainer");
    const editExpiryDateInput = document.getElementById("editExpiryDate");

    if (coupon.expiryDate) {
        editExpiryType.value = "custom";
        editExpiryDateContainer.style.display = "block";
        const dateObj = new Date(coupon.expiryDate);
        editExpiryDateInput.value = dateObj.toISOString().split("T")[0];
    } else {
        editExpiryType.value = "none";
        editExpiryDateContainer.style.display = "none";
        editExpiryDateInput.value = "";
    }

    document.getElementById("editFormMessage").innerHTML = "";
    const modal = document.getElementById("editCouponModal");
    if (modal) modal.style.display = "flex";
};

function closeEditModal() {
    const modal = document.getElementById("editCouponModal");
    if (modal) modal.style.display = "none";
}

async function handleUpdateCoupon(e) {
    e.preventDefault();
    const btn = document.getElementById("saveEditCouponBtn");
    const msg = document.getElementById("editFormMessage");
    const id = document.getElementById("editCouponId").value;
    msg.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Saving...";

    const code = document.getElementById("editCouponCode").value.trim();
    const discountType = document.getElementById("editDiscountType").value;
    const discountValue = parseFloat(document.getElementById("editDiscountValue").value);
    const eligibleUserType = document.getElementById("editEligibleUserType").value;
    const maxUses = document.getElementById("editMaxUses").value ? parseInt(document.getElementById("editMaxUses").value) : null;

    const expiryType = document.getElementById("editExpiryType").value;
    const expiryDate = (expiryType === "custom" && document.getElementById("editExpiryDate").value)
        ? document.getElementById("editExpiryDate").value
        : null;

    try {
        const res = await robustFetch(`${API_BASE}/admin/coupons/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, discountType, discountValue, eligibleUserType, maxUses, expiryDate })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        msg.innerHTML = `<span style="color:#4ade80;">✓ ${data.message}</span>`;
        setTimeout(() => {
            closeEditModal();
            fetchCoupons();
        }, 500);
    } catch (err) {
        msg.innerHTML = `<span style="color:#ef4444;">✕ ${err.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.textContent = "Save Changes";
    }
}

window.copyCode = function(code) {
    navigator.clipboard.writeText(code);
    alert(`Coupon code '${code}' copied to clipboard!`);
};

window.toggleCouponStatus = async function(id) {
    try {
        const res = await robustFetch(`${API_BASE}/admin/coupons/${id}/toggle`, { method: "PUT" });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        fetchCoupons();
    } catch (err) {
        alert("Error toggling coupon: " + err.message);
    }
};

window.deleteCouponItem = async function(id) {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
        const res = await robustFetch(`${API_BASE}/admin/coupons/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        fetchCoupons();
    } catch (err) {
        alert("Error deleting coupon: " + err.message);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    fetchCoupons();
    
    const expiryTypeSelect = document.getElementById("expiryType");
    const expiryDateContainer = document.getElementById("expiryDateContainer");
    const expiryDateInput = document.getElementById("expiryDate");

    if (expiryTypeSelect && expiryDateContainer) {
        expiryTypeSelect.addEventListener("change", () => {
            if (expiryTypeSelect.value === "custom") {
                expiryDateContainer.style.display = "block";
                if (expiryDateInput) expiryDateInput.required = true;
            } else {
                expiryDateContainer.style.display = "none";
                if (expiryDateInput) {
                    expiryDateInput.required = false;
                    expiryDateInput.value = "";
                }
            }
        });
    }

    const editExpiryType = document.getElementById("editExpiryType");
    const editExpiryDateContainer = document.getElementById("editExpiryDateContainer");
    const editExpiryDateInput = document.getElementById("editExpiryDate");
    if (editExpiryType && editExpiryDateContainer) {
        editExpiryType.addEventListener("change", () => {
            if (editExpiryType.value === "custom") {
                editExpiryDateContainer.style.display = "block";
                if (editExpiryDateInput) editExpiryDateInput.required = true;
            } else {
                editExpiryDateContainer.style.display = "none";
                if (editExpiryDateInput) {
                    editExpiryDateInput.required = false;
                    editExpiryDateInput.value = "";
                }
            }
        });
    }

    const closeBtn = document.getElementById("closeEditModalBtn");
    const cancelBtn = document.getElementById("cancelEditBtn");
    if (closeBtn) closeBtn.addEventListener("click", closeEditModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeEditModal);

    const editForm = document.getElementById("editCouponForm");
    if (editForm) editForm.addEventListener("submit", handleUpdateCoupon);

    const form = document.getElementById("createCouponForm");
    if (form) form.addEventListener("submit", handleCreateCoupon);
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
