/* ==========================================================
   REELSBUNDLES — GLOBAL NOTIFICATION CLIENT CONTROLLER
   FETCHES ANNOUNCEMENTS, RENDERS BELL BADGE & COUPON DRAWER
========================================================== */

(function () {
    const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000/api"
        : "https://reelsbundles-backend.onrender.com/api"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
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
                    try {
                        localStorage.setItem("rb_cached_notifications", JSON.stringify(data.notifications));
                    } catch (e) {}
                    updateBadgeCount();
                    renderNotificationList();
                    updateTopTickerBar(data.notifications);
                }
            }
        } catch (err) {
            console.warn("[NOTIFICATIONS] Fetch warning:", err);
            try {
                const cached = localStorage.getItem("rb_cached_notifications");
                if (cached) {
                    activeNotifications = JSON.parse(cached);
                    updateBadgeCount();
                    renderNotificationList();
                    updateTopTickerBar(activeNotifications);
                }
            } catch (e) {}
        }
    }

    function updateBadgeCount() {
        const readIds = getReadNotificationIds();
        const unread = (activeNotifications || []).filter(n => n.active !== false && !readIds.includes(n.id));

        const badges = document.querySelectorAll("#notifBadge, .bell-badge, .notif-badge");
        badges.forEach(badgeEl => {
            if (unread.length > 0) {
                badgeEl.textContent = unread.length > 9 ? "9+" : unread.length;
                badgeEl.classList.remove("hidden");
                badgeEl.style.display = "inline-block";
            } else {
                badgeEl.classList.add("hidden");
                badgeEl.style.display = "none";
            }
        });
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

        const notifs = (activeNotifications || []).filter(n => n.active !== false);

        if (notifs.length === 0) {
            bodyEl.innerHTML = `
                <div class="notif-empty">
                    <div class="notif-empty-icon">🔔</div>
                    <p>No notifications right now.</p>
                </div>
            `;
            return;
        }

        const html = notifs.map(n => {
            const isCoupon = n.type === "coupon";
            const tagText = isCoupon ? "🎁 COUPON" : "📢 ANNOUNCEMENT";
            const tagStyle = isCoupon
                ? "background:rgba(124, 58, 237, 0.2); border:1px solid rgba(124, 58, 237, 0.4); color:#c4b5fd;"
                : "background:rgba(59, 130, 246, 0.2); border:1px solid rgba(59, 130, 246, 0.4); color:#93c5fd;";

            let couponActionHtml = "";
            if (isCoupon && n.couponCode) {
                couponActionHtml = `
                    <div style="margin-top:10px; display:flex; align-items:center; gap:8px;">
                        <code style="background:rgba(255,255,255,0.08); border:1px dashed rgba(255,255,255,0.25); color:#4ade80; padding:4px 10px; border-radius:6px; font-weight:700; font-size:13px; letter-spacing:0.5px;">${escapeHtml(n.couponCode)}</code>
                        <button type="button" class="btn-copy-code" onclick="copyCouponCode('${escapeHtml(n.couponCode)}', this)" style="background:linear-gradient(135deg, #7c3aed, #4f46e5); border:none; color:#fff; padding:5px 12px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">Copy Code</button>
                    </div>
                `;
            }

            return `
                <div class="notif-item ${n.type || ''}" data-id="${escapeHtml(n.id)}">
                    <div class="notif-item-header">
                        <h5 class="notif-item-title">${escapeHtml(n.title)}</h5>
                        <span class="notif-type-tag" style="${tagStyle}">${tagText}</span>
                    </div>
                    <p class="notif-item-msg">${escapeHtml(n.message)}</p>
                    ${couponActionHtml}
                </div>
            `;
        }).join("");

        bodyEl.innerHTML = html;
    }

    function updateTopTickerBar(notifications) {
        const tickerContentEl = document.querySelector(".top-ticker-bar .ticker-track span") || 
                                document.querySelector(".top-ticker-bar .ticker-track") || 
                                document.querySelector(".top-ticker-bar .marquee-content");
        const tickerBadgeEl = document.querySelector(".top-ticker-bar .ticker-badge");
        if (!tickerContentEl) return;

        // ROUTING RULE: Top Ticker Bar displays ANNOUNCEMENTS & COUPONS
        const tickerNotifs = (notifications || []).filter(n => (n.type === "announcement" || n.type === "coupon") && n.active !== false);

        if (tickerNotifs.length === 0) {
            // Standard clean default marquee when no custom announcements exist
            tickerContentEl.innerHTML = `📢 No any kind of announcements and offers`;
            if (tickerBadgeEl) {
                tickerBadgeEl.style.display = "none";
                tickerBadgeEl.textContent = "";
            }
            return;
        }

        const hasCoupon = tickerNotifs.some(n => n.type === "coupon");
        if (tickerBadgeEl) {
            tickerBadgeEl.style.display = "inline-flex";
            tickerBadgeEl.innerHTML = hasCoupon ? `🎁 OFFER` : `📢 ANNOUNCEMENT`;
        }

        const itemsHtml = tickerNotifs.map(n => {
            if (n.type === "coupon") {
                const codePart = n.couponCode ? ` (Use Code: <strong>${escapeHtml(n.couponCode)}</strong>)` : "";
                return `🎁 <strong>${escapeHtml(n.title)}</strong>: ${escapeHtml(n.message)}${codePart}`;
            } else {
                return `📢 <strong>${escapeHtml(n.title)}</strong>: ${escapeHtml(n.message)}`;
            }
        }).join(" &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; ");

        tickerContentEl.innerHTML = itemsHtml;
    }

    function isNotificationAllowedPage() {
        const path = window.location.pathname.toLowerCase();

        if (path.includes("/admin/")) {
            return false;
        }

        // Maintenance page should never render normal user notifications
        if (path.includes("maintenance.html") || path.endsWith("/maintenance") || path.includes("/maintenance/")) {
            return false;
        }

        const isIndex = path.endsWith("/") || 
                        path.endsWith("/index.html") || 
                        path.endsWith("/index") || 
                        path.endsWith("/reelsbundles.github.io/") || 
                        path === "" ||
                        path.endsWith("/reelsbundles.github.io");

        const isDashboard = path.includes("dashboard.html") || path.endsWith("/dashboard") || path.includes("/dashboard/");

        return isIndex || isDashboard;
    }

    function toggleDrawer() {
        if (!isNotificationAllowedPage()) return;
        initNotificationUI();
        const drawerEl = document.getElementById("notifDrawer");
        const backdropEl = document.getElementById("notifBackdrop");
        if (!drawerEl) return;

        isDrawerOpen = !isDrawerOpen;

        if (isDrawerOpen) {
            renderNotificationList();
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
        if (!isNotificationAllowedPage()) {
            const floatingBtn = document.getElementById("notifBellBtn");
            if (floatingBtn) floatingBtn.remove();
            const drawerEl = document.getElementById("notifDrawer");
            if (drawerEl) drawerEl.remove();
            const backdropEl = document.getElementById("notifBackdrop");
            if (backdropEl) backdropEl.remove();
            return;
        }
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
                    <h4>🔔 Notifications</h4>
                    <button type="button" class="notif-close-btn" id="notifCloseBtn">&times;</button>
                </div>
                <div class="notif-body" id="notifDrawerBody">
                    <div class="notif-empty">
                        <div class="notif-empty-icon">🔔</div>
                        <p>No notifications right now.</p>
                    </div>
                </div>
            `;
            document.body.appendChild(drawer);

            document.getElementById("notifCloseBtn")?.addEventListener("click", closeDrawer);
        }

        // Format or auto-inject Notification Card Button if missing
        let bellBtn = document.getElementById("notifBellBtn");
        if (!bellBtn) {
            bellBtn = document.createElement("button");
            bellBtn.type = "button";
            bellBtn.id = "notifBellBtn";
            bellBtn.className = "notif-card-btn floating";
            bellBtn.title = "Notifications";
            bellBtn.innerHTML = `<span>🔔</span> Notifications <span class="notif-badge hidden" id="notifBadge">0</span>`;
            document.body.appendChild(bellBtn);
        } else if (!bellBtn.innerHTML.includes("Notifications")) {
            bellBtn.className = "notif-card-btn";
            bellBtn.innerHTML = `<span>🔔</span> Notifications <span class="notif-badge hidden" id="notifBadge">0</span>`;
        }

        fetchPublicNotifications();
        setInterval(fetchPublicNotifications, 3000);
    }

    // Global Click Delegation for Bell Button
    document.addEventListener("click", (e) => {
        const bell = e.target.closest("#notifBellBtn, .notif-bell-btn, .notif-card-btn, .notification-bell-btn");
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

    function syncMaintenanceNotifications() {
        updateBadgeCount();
        renderNotificationList();
    }

    window.addEventListener("storage", (e) => {
        if (e.key === "rb_cached_notifications") {
            fetchPublicNotifications();
        }
    });

    window.copyCouponCode = copyToClipboard;
    window.toggleNotifDrawer = function() {
        initNotificationUI();
        toggleDrawer();
    };
    window.initNotificationUI = initNotificationUI;
    window.syncMaintenanceNotifications = syncMaintenanceNotifications;
})();
