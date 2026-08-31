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
                    try {
                        localStorage.setItem("rb_cached_notifications", JSON.stringify(data.notifications));
                    } catch (e) {}
                    updateBadgeCount();
                    renderNotificationList();
                    updateTopTickerBar(data.notifications);
                    updateDashboardAlerts(data.notifications);
                }
            }
        } catch (err) {
            console.warn("[NOTIFICATIONS] Fetch warning:", err);
            // Fallback cached notifications
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
        const badgeEl = document.getElementById("notifBadge");
        if (!badgeEl) return;

        // FILTER: Bell Badge & Drawer displays ALERTS ONLY
        const alertNotifs = activeNotifications.filter(n => n.type === "alert" && n.active !== false);
        const readIds = getReadNotificationIds();
        const unreadAlerts = alertNotifs.filter(n => !readIds.includes(n.id));

        if (unreadAlerts.length > 0) {
            badgeEl.textContent = unreadAlerts.length > 9 ? "9+" : unreadAlerts.length;
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

        // ROUTING RULE: Bell Drawer displays ALERTS ONLY
        const alertNotifs = activeNotifications.filter(n => n.type === "alert" && n.active !== false);

        if (alertNotifs.length === 0) {
            bodyEl.innerHTML = `
                <div class="notif-empty">
                    <div class="notif-empty-icon">🔔</div>
                    <p>No active system alerts right now.</p>
                </div>
            `;
            return;
        }

        const html = alertNotifs.map(n => {
            return `
                <div class="notif-item alert" data-id="${escapeHtml(n.id)}">
                    <div class="notif-item-header">
                        <h5 class="notif-item-title">${escapeHtml(n.title)}</h5>
                        <span class="notif-type-tag alert">⚠️ ALERT</span>
                    </div>
                    <p class="notif-item-msg">${escapeHtml(n.message)}</p>
                </div>
            `;
        }).join("");

        bodyEl.innerHTML = html;
    }

    function updateTopTickerBar(notifications) {
        const tickerContentEl = document.querySelector(".top-ticker-bar .ticker-track span") || 
                                document.querySelector(".top-ticker-bar .ticker-track") || 
                                document.querySelector(".top-ticker-bar .marquee-content");
        if (!tickerContentEl) return;

        // ROUTING RULE: Top Ticker Bar displays ANNOUNCEMENTS & COUPONS
        const tickerNotifs = (notifications || []).filter(n => (n.type === "announcement" || n.type === "coupon") && n.active !== false);

        if (tickerNotifs.length === 0) {
            // Standard clean default marquee when no custom announcements exist
            tickerContentEl.innerHTML = `📢 Welcome to ReelsBundles — Instant Access to 200,000+ HD Instagram Reels Packs`;
            return;
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

    function updateDashboardAlerts(notifications) {
        const container = document.getElementById("dashboardAlertContainer") || document.getElementById("dashboardAlerts");
        if (!container) return;

        // ROUTING RULE: User Dashboard displays ALERTS ONLY
        const alertNotifs = notifications.filter(n => n.type === "alert" && n.active !== false);
        if (alertNotifs.length === 0) {
            container.style.display = "none";
            return;
        }

        container.style.display = "block";
        container.innerHTML = alertNotifs.map(n => `
            <div class="dashboard-alert-card" style="background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.35); border-radius:14px; padding:14px 18px; margin-bottom:16px; color:#f87171; display:flex; align-items:center; gap:12px;">
                <span style="font-size:20px;">⚠️</span>
                <div>
                    <strong style="color:#fff; font-size:14px; display:block;">${escapeHtml(n.title)}</strong>
                    <span style="font-size:13px; color:#fca5a5;">${escapeHtml(n.message)}</span>
                </div>
            </div>
        `).join("");
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
        setInterval(fetchPublicNotifications, 10000);
    }

    // Global Click Delegation for Bell Button
    document.addEventListener("click", (e) => {
        const bell = e.target.closest("#notifBellBtn, .notif-bell-btn, .notif-card-btn");
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
