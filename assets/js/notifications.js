/* ==========================================================
   REELSBUNDLES — GLOBAL NOTIFICATION CLIENT CONTROLLER
   FETCHES ANNOUNCEMENTS, RENDERS BELL BADGE & COUPON DRAWER
========================================================== */

(function () {
    const API_BASE = (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:3000"
            : "https://reelsbundles-backend.onrender.com"
    ) + "/api";

    let activeNotifications = [];
    let isDrawerOpen = false;

    // Load read notifications from localStorage
    function getReadNotificationIds() {
        try {
            const raw = localStorage.getItem("rb_read_notifications");
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function markNotificationRead(id) {
        try {
            const read = getReadNotificationIds();
            if (!read.includes(id)) {
                read.push(id);
                localStorage.setItem("rb_read_notifications", JSON.stringify(read));
            }
        } catch (e) {}
    }

    async function fetchPublicNotifications() {
        try {
            const res = await fetch(`${API_BASE}/notifications`, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.notifications)) {
                    activeNotifications = data.notifications;
                    updateBadgeCount();
                    renderNotificationList();
                }
            }
        } catch (err) {
            console.warn("[NOTIFICATIONS] Fetch warning:", err);
        }
    }

    function updateBadgeCount() {
        const badgeEl = document.getElementById("notifBadge");
        if (!badgeEl) return;

        const readIds = getReadNotificationIds();
        const unread = activeNotifications.filter(n => !readIds.includes(n.id));

        if (unread.length > 0) {
            badgeEl.textContent = unread.length > 9 ? "9+" : unread.length;
            badgeEl.classList.remove("hidden");
        } else {
            badgeEl.classList.add("hidden");
        }
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text || "";
        return div.innerHTML;
    }

    function copyToClipboard(text, btnElement) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            if (btnElement) {
                const origText = btnElement.innerHTML;
                btnElement.innerHTML = "✓ COPIED!";
                btnElement.classList.add("copied");
                setTimeout(() => {
                    btnElement.innerHTML = origText;
                    btnElement.classList.remove("copied");
                }, 2000);
            }
        }).catch(err => {
            console.warn("Copy error:", err);
        });
    }

    function renderNotificationList() {
        const bodyEl = document.getElementById("notifDrawerBody");
        if (!bodyEl) return;

        if (activeNotifications.length === 0) {
            bodyEl.innerHTML = `
                <div class="notif-empty">
                    <div class="notif-empty-icon">🔔</div>
                    <p>No new notifications right now.</p>
                </div>
            `;
            return;
        }

        const html = activeNotifications.map(n => {
            const typeClass = n.type || "announcement";
            const typeLabel = n.type === "coupon" ? "🎁 COUPON" : (n.type === "alert" ? "⚠️ ALERT" : "📢 INFO");

            let couponHtml = "";
            if (n.couponCode) {
                couponHtml = `
                    <div class="notif-coupon-box">
                        <span class="notif-code-text">${escapeHtml(n.couponCode)}</span>
                        <button type="button" class="notif-copy-btn" data-code="${escapeHtml(n.couponCode)}">
                            📋 COPY CODE
                        </button>
                    </div>
                `;
            }

            return `
                <div class="notif-item" data-id="${escapeHtml(n.id)}">
                    <div class="notif-item-header">
                        <h5 class="notif-item-title">${escapeHtml(n.title)}</h5>
                        <span class="notif-type-tag ${typeClass}">${typeLabel}</span>
                    </div>
                    <p class="notif-item-msg">${escapeHtml(n.message)}</p>
                    ${couponHtml}
                </div>
            `;
        }).join("");

        bodyEl.innerHTML = html;

        // Attach copy button click listeners
        bodyEl.querySelectorAll(".notif-copy-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const code = btn.getAttribute("data-code");
                copyToClipboard(code, btn);
            });
        });
    }

    function toggleDrawer() {
        const drawerEl = document.getElementById("notifDrawer");
        const backdropEl = document.getElementById("notifBackdrop");
        if (!drawerEl) return;

        isDrawerOpen = !isDrawerOpen;

        if (isDrawerOpen) {
            drawerEl.classList.add("open");
            if (backdropEl) backdropEl.classList.add("open");

            // Mark all current notifications as read when drawer is opened
            activeNotifications.forEach(n => markNotificationRead(n.id));
            updateBadgeCount();
        } else {
            drawerEl.classList.remove("open");
            if (backdropEl) backdropEl.classList.remove("open");
        }
    }

    function closeDrawer() {
        isDrawerOpen = false;
        const drawerEl = document.getElementById("notifDrawer");
        const backdropEl = document.getElementById("notifBackdrop");
        if (drawerEl) drawerEl.classList.remove("open");
        if (backdropEl) backdropEl.classList.remove("open");
    }

    function initNotificationUI() {
        // Create backdrop if missing
        if (!document.getElementById("notifBackdrop")) {
            const backdrop = document.createElement("div");
            backdrop.id = "notifBackdrop";
            backdrop.className = "notif-backdrop";
            backdrop.addEventListener("click", closeDrawer);
            document.body.appendChild(backdrop);
        }

        // Create drawer if missing
        if (!document.getElementById("notifDrawer")) {
            const drawer = document.createElement("div");
            drawer.id = "notifDrawer";
            drawer.className = "notif-drawer";
            drawer.innerHTML = `
                <div class="notif-header">
                    <h4>🔔 Announcements & Coupons</h4>
                    <button type="button" class="notif-close-btn" id="notifCloseBtn">&times;</button>
                </div>
                <div class="notif-body" id="notifDrawerBody">
                    <div class="notif-empty">
                        <div class="notif-empty-icon">🔔</div>
                        <p>Loading announcements...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(drawer);

            document.getElementById("notifCloseBtn")?.addEventListener("click", closeDrawer);
        }

        // Auto-inject Bell Button if missing on current page
        let bellBtn = document.getElementById("notifBellBtn");
        if (!bellBtn) {
            bellBtn = document.createElement("button");
            bellBtn.type = "button";
            bellBtn.id = "notifBellBtn";
            bellBtn.className = "notif-bell-btn floating";
            bellBtn.title = "Notifications & Coupons";
            bellBtn.innerHTML = `🔔<span class="notif-badge hidden" id="notifBadge">0</span>`;
            document.body.appendChild(bellBtn);
        }

        fetchPublicNotifications();
        setInterval(fetchPublicNotifications, 10000);
    }

    // Global Click Delegation for Bell Button
    document.addEventListener("click", (e) => {
        const bell = e.target.closest("#notifBellBtn, .notif-bell-btn");
        if (bell) {
            e.stopPropagation();
            toggleDrawer();
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNotificationUI);
    } else {
        initNotificationUI();
    }

    window.copyCouponCode = copyToClipboard;
})();
