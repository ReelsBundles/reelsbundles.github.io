/* ==========================================================
   REELSBUNDLES ADMIN — LIVE DIAGNOSTIC MONITOR CONTROLLER
   Real-time SSE streaming, evidentiary diagnostic inspection,
   dynamic health metrics, incident tracking, and test suite.
========================================================== */

"use strict";

const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000/api"
        : "https://reelsbundles-backend.onrender.com/api"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "") + "/api";

function getAdminToken() {
    return localStorage.getItem("admin_token") ||
           localStorage.getItem("rb_admin_token") ||
           localStorage.getItem("token") ||
           sessionStorage.getItem("admin_token") ||
           sessionStorage.getItem("rb_admin_token") ||
           sessionStorage.getItem("token") || "";
}

const token = getAdminToken();
let admin = {};
try {
    admin = JSON.parse(localStorage.getItem("admin_data") || "{}");
} catch (e) {
    admin = {};
}

if (!token) {
    location.href = "index.html";
}

// Sidebar admin name
const adminSidebarName = document.getElementById("adminSidebarName");
if (adminSidebarName) {
    adminSidebarName.textContent = admin.email || "Admin";
}

// Logout button
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
if (adminLogoutBtn) {
    adminLogoutBtn.onclick = () => {
        localStorage.clear();
        sessionStorage.clear();
        location.href = "index.html";
    };
}

/* ==========================================================
   STATE
========================================================== */
let isStreamPaused = false;
let sseSource = null;
let pollTimer = null;
let currentRequests = [];
let lastInspectedRequest = null;
let alertDismissTimeout = null;

// Filter State
const filters = {
    search: "",
    source: "ALL",
    result: "ALL",
    method: "ALL",
    statusCode: "ALL",
    category: "ALL"
};

/* ==========================================================
   DOM ELEMENTS
========================================================== */
const connectionBadge = document.getElementById("connectionBadge");
const toggleFeedBtn = document.getElementById("toggleFeedBtn");
const refreshBtn = document.getElementById("refreshBtn");
const clearLogsBtn = document.getElementById("clearLogsBtn");
const openTestSuiteBtn = document.getElementById("openTestSuiteBtn");

// Health & Overview
const overallHealthVal = document.getElementById("overallHealthVal");
const subHealthUser = document.getElementById("subHealthUser");
const subHealthAdmin = document.getElementById("subHealthAdmin");
const subHealthPayment = document.getElementById("subHealthPayment");
const subHealthDownload = document.getElementById("subHealthDownload");
const subHealthDatabase = document.getElementById("subHealthDatabase");
const subHealthFrontend = document.getElementById("subHealthFrontend");

// 10 Metric Cards
const metricTotal = document.getElementById("metricTotal");
const metricPass = document.getElementById("metricPass");
const metricFail = document.getElementById("metricFail");
const metric4xx = document.getElementById("metric4xx");
const metric5xx = document.getElementById("metric5xx");
const metricFrontend = document.getElementById("metricFrontend");
const metricDatabase = document.getElementById("metricDatabase");
const metricPayment = document.getElementById("metricPayment");
const metricAvgDuration = document.getElementById("metricAvgDuration");
const metricIncidents = document.getElementById("metricIncidents");

// Live Alert Banner
const liveAlertBanner = document.getElementById("liveAlertBanner");
const alertTitle = document.getElementById("alertTitle");
const alertDetails = document.getElementById("alertDetails");
const inspectAlertBtn = document.getElementById("inspectAlertBtn");

// Active Incidents
const incidentsSection = document.getElementById("incidentsSection");
const incidentsGrid = document.getElementById("incidentsGrid");
const incidentCountBadge = document.getElementById("incidentCountBadge");

// Tables & Inputs
const searchInput = document.getElementById("searchInput");
const filterSource = document.getElementById("filterSource");
const filterResult = document.getElementById("filterResult");
const filterMethod = document.getElementById("filterMethod");
const filterStatusCode = document.getElementById("filterStatusCode");
const filterCategory = document.getElementById("filterCategory");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const requestsTableBody = document.getElementById("requestsTableBody");
const endpointHealthBody = document.getElementById("endpointHealthBody");
const pageHealthBody = document.getElementById("pageHealthBody");
const showingCount = document.getElementById("showingCount");

// Drawer Elements
const drawerBackdrop = document.getElementById("drawerBackdrop");
const diagnosticDrawer = document.getElementById("diagnosticDrawer");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");
const drawerTitle = document.getElementById("drawerTitle");
const drawerRequestId = document.getElementById("drawerRequestId");
const copyRequestIdBtn = document.getElementById("copyRequestIdBtn");
const drawerStatusBadge = document.getElementById("drawerStatusBadge");
const drawerMethodBadge = document.getElementById("drawerMethodBadge");
const drawerCategoryBadge = document.getElementById("drawerCategoryBadge");
const drawerWhatFailed = document.getElementById("drawerWhatFailed");
const drawerCategoryText = document.getElementById("drawerCategoryText");
const drawerErrorCodeText = document.getElementById("drawerErrorCodeText");
const drawerRootCauseBox = document.getElementById("drawerRootCauseBox");
const drawerFailureChain = document.getElementById("drawerFailureChain");
const drawerPageText = document.getElementById("drawerPageText");
const drawerSourceText = document.getElementById("drawerSourceText");
const drawerEndpointText = document.getElementById("drawerEndpointText");
const drawerRouteText = document.getElementById("drawerRouteText");
const drawerServiceText = document.getElementById("drawerServiceText");
const drawerDurationText = document.getElementById("drawerDurationText");
const drawerTimestampText = document.getElementById("drawerTimestampText");
const drawerTimeline = document.getElementById("drawerTimeline");
const drawerUserMaskedText = document.getElementById("drawerUserMaskedText");
const drawerUserRoleText = document.getElementById("drawerUserRoleText");
const drawerCorrelationIdText = document.getElementById("drawerCorrelationIdText");
const drawerRefererText = document.getElementById("drawerRefererText");
const drawerUserAgentText = document.getElementById("drawerUserAgentText");
const drawerSafeErrorBox = document.getElementById("drawerSafeErrorBox");

// Test Suite Modal
const testSuiteModal = document.getElementById("testSuiteModal");
const closeTestModalBtn = document.getElementById("closeTestModalBtn");

/* ==========================================================
   INITIALIZATION & 3-SECOND LIVE TELEMETRY UPDATE
   Refreshes telemetry data every 3000ms. Page never reloads.
========================================================== */
initSSE();
loadAllTelemetry();
bindEventListeners();

const TELEMETRY_REFRESH_INTERVAL_MS = 3000;
let isTelemetryRefreshing = false;
setInterval(async () => {
    if (isTelemetryRefreshing) return;
    isTelemetryRefreshing = true;
    try {
        await Promise.allSettled([
            loadSummary(),
            loadIncidents(),
            loadEndpoints(),
            loadPages()
        ]);

        // Refresh request table if not paused and user is not currently typing in search
        if (!isStreamPaused && document.activeElement !== searchInput) {
            await loadRequests(true);
        }
    } catch (e) {
    } finally {
        isTelemetryRefreshing = false;
    }
}, TELEMETRY_REFRESH_INTERVAL_MS);

function bindEventListeners() {
    // 1. Refresh button
    const rBtn = document.getElementById("refreshBtn") || refreshBtn;
    if (rBtn) {
        rBtn.onclick = async () => {
            const origHtml = rBtn.innerHTML;
            rBtn.disabled = true;
            rBtn.innerHTML = "↻ Refreshing...";
            try {
                await loadAllTelemetry();
                rBtn.innerHTML = "✅ Refreshed!";
                setTimeout(() => {
                    rBtn.innerHTML = origHtml;
                    rBtn.disabled = false;
                }, 700);
            } catch (err) {
                rBtn.innerHTML = origHtml;
                rBtn.disabled = false;
            }
        };
    }

    // 2. Pause/Resume toggle
    const tBtn = document.getElementById("toggleFeedBtn") || toggleFeedBtn;
    if (tBtn) {
        tBtn.onclick = () => {
            isStreamPaused = !isStreamPaused;
            if (isStreamPaused) {
                tBtn.innerHTML = "▶️ Resume Stream";
                tBtn.style.background = "rgba(245, 158, 11, 0.2)";
                tBtn.style.borderColor = "rgba(245, 158, 11, 0.4)";
            } else {
                tBtn.innerHTML = "⏸️ Pause Stream";
                tBtn.style.background = "";
                tBtn.style.borderColor = "";
                loadRequests();
            }
        };
    }

    // 3. Clear logs button
    const cBtn = document.getElementById("clearLogsBtn") || clearLogsBtn;
    if (cBtn) {
        cBtn.onclick = async () => {
            if (!confirm("Are you sure you want to clear all monitoring logs?\n\n(This will strictly clear monitoring logs only. Users, orders, bundles, payments, and downloads will NEVER be affected.)")) {
                return;
            }
            const origHtml = cBtn.innerHTML;
            cBtn.disabled = true;
            cBtn.innerHTML = "⏳ Clearing...";
            try {
                const res = await fetch(`${API_BASE}/admin/monitor/clear`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    cBtn.innerHTML = "✅ Cleared!";
                    await loadAllTelemetry();
                    setTimeout(() => {
                        cBtn.innerHTML = origHtml;
                        cBtn.disabled = false;
                    }, 1000);
                } else {
                    let msg = "Server error " + res.status;
                    try {
                        const d = await res.json();
                        if (d.message) msg = d.message;
                    } catch (e) {}
                    alert("Failed to clear logs: " + msg);
                    cBtn.innerHTML = origHtml;
                    cBtn.disabled = false;
                }
            } catch (err) {
                alert("Failed to clear logs: " + err.message);
                cBtn.innerHTML = origHtml;
                cBtn.disabled = false;
            }
        };
    }

    // 4. Test Suite Modal
    const tsBtn = document.getElementById("openTestSuiteBtn") || openTestSuiteBtn;
    const tsModal = document.getElementById("testSuiteModal") || testSuiteModal;
    const ctBtn = document.getElementById("closeTestModalBtn") || closeTestModalBtn;
    if (tsBtn && tsModal) {
        tsBtn.onclick = () => {
            tsModal.style.display = "flex";
            tsModal.classList.add("active");
        };
    }
    if (ctBtn && tsModal) {
        ctBtn.onclick = () => {
            tsModal.style.display = "none";
            tsModal.classList.remove("active");
        };
    }
    if (tsModal) {
        tsModal.onclick = (e) => {
            if (e.target === tsModal) {
                tsModal.style.display = "none";
                tsModal.classList.remove("active");
            }
        };
    }

    // Test Event Buttons
    document.querySelectorAll(".test-run-btn").forEach(btn => {
        btn.onclick = async () => {
            const type = btn.dataset.type;
            try {
                btn.disabled = true;
                btn.textContent = "Simulating...";
                const res = await fetch(`${API_BASE}/admin/monitor/test-event`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ type })
                });
                const data = await res.json();
                if (data.success && data.event) {
                    if (testSuiteModal) testSuiteModal.style.display = "none";
                    loadAllTelemetry();
                    if (data.event.result === "FAIL") {
                        openDrawer(data.event);
                    }
                }
            } catch (err) {
                alert("Test failed: " + err.message);
            } finally {
                btn.disabled = false;
                loadAllTelemetry();
            }
        };
    });

    // Filters & Search
    let searchDebounce = null;
    if (searchInput) {
        searchInput.oninput = () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                filters.search = searchInput.value.trim();
                loadRequests();
            }, 250);
        };
    }

    if (filterSource) {
        filterSource.onchange = () => {
            filters.source = filterSource.value;
            loadRequests();
        };
    }

    if (filterResult) {
        filterResult.onchange = () => {
            filters.result = filterResult.value;
            loadRequests();
        };
    }

    if (filterMethod) {
        filterMethod.onchange = () => {
            filters.method = filterMethod.value;
            loadRequests();
        };
    }

    if (filterStatusCode) {
        filterStatusCode.onchange = () => {
            filters.statusCode = filterStatusCode.value;
            loadRequests();
        };
    }

    if (filterCategory) {
        filterCategory.onchange = () => {
            filters.category = filterCategory.value;
            loadRequests();
        };
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.onclick = () => {
            filters.search = "";
            filters.source = "ALL";
            filters.result = "ALL";
            filters.method = "ALL";
            filters.statusCode = "ALL";
            filters.category = "ALL";
            if (searchInput) searchInput.value = "";
            if (filterSource) filterSource.value = "ALL";
            if (filterResult) filterResult.value = "ALL";
            if (filterMethod) filterMethod.value = "ALL";
            if (filterStatusCode) filterStatusCode.value = "ALL";
            if (filterCategory) filterCategory.value = "ALL";
            loadRequests();
        };
    }

    // Drawer events
    if (closeDrawerBtn) closeDrawerBtn.onclick = closeDrawer;
    if (drawerBackdrop) drawerBackdrop.onclick = closeDrawer;
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeDrawer();
            if (testSuiteModal) testSuiteModal.style.display = "none";
        }
    });

    if (copyRequestIdBtn) {
        copyRequestIdBtn.onclick = () => {
            const reqId = drawerRequestId?.textContent;
            if (reqId) {
                navigator.clipboard.writeText(reqId).then(() => {
                    copyRequestIdBtn.textContent = "Copied!";
                    setTimeout(() => { copyRequestIdBtn.textContent = "Copy"; }, 1500);
                });
            }
        };
    }

    if (inspectAlertBtn) {
        inspectAlertBtn.onclick = () => {
            if (lastInspectedRequest) {
                openDrawer(lastInspectedRequest);
            }
            if (liveAlertBanner) liveAlertBanner.classList.remove("active");
        };
    }
}

/* ==========================================================
   REAL-TIME SSE CONNECTION & FALLBACK POLLING
========================================================== */
function initSSE() {
    if (sseSource) {
        sseSource.close();
        sseSource = null;
    }

    const sseUrl = `${API_BASE}/admin/monitor/stream?token=${encodeURIComponent(token)}`;

    try {
        sseSource = new EventSource(sseUrl);

        sseSource.addEventListener("connected", () => {
            setConnectionStatus("connected", "🟢 Live (SSE Connected)");
            if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        });

        sseSource.addEventListener("request", (event) => {
            try {
                const reqData = JSON.parse(event.data);
                if (!isStreamPaused) {
                    prependRequestRow(reqData);
                }
            } catch (e) {}
        });

        sseSource.addEventListener("alert", (event) => {
            try {
                const alertData = JSON.parse(event.data);
                showLiveAlert(alertData);
                // Also refresh stats
                loadSummary();
                loadIncidents();
            } catch (e) {}
        });

        sseSource.addEventListener("cleared", () => {
            loadAllTelemetry();
        });

        sseSource.addEventListener("ping", () => {
            // Heartbeat
        });

        sseSource.onerror = () => {
            setConnectionStatus("disconnected", "🔴 Reconnecting...");
            sseSource.close();
            sseSource = null;

            // Start fallback polling if not already active
            if (!pollTimer) {
                setConnectionStatus("polling", "🟡 Polling Fallback (5s)");
                pollTimer = setInterval(() => {
                    loadSummary();
                    loadRequests();
                }, 5000);
            }

            // Retry SSE after 6 seconds
            setTimeout(initSSE, 6000);
        };
    } catch (err) {
        setConnectionStatus("polling", "🟡 Polling Fallback (5s)");
        if (!pollTimer) {
            pollTimer = setInterval(() => {
                loadSummary();
                loadRequests();
            }, 5000);
        }
    }
}

function setConnectionStatus(type, label) {
    if (!connectionBadge) return;
    connectionBadge.className = `connection-badge ${type}`;
    connectionBadge.textContent = label;
}

/* ==========================================================
   ALERT BANNER
========================================================== */
function showLiveAlert(alertData) {
    if (!liveAlertBanner) return;
    lastInspectedRequest = alertData;

    if (alertTitle) alertTitle.textContent = `🔴 FAILURE: ${alertData.statusCode} ${alertData.category || "ERROR"}`;
    if (alertDetails) {
        alertDetails.textContent = `[${alertData.source}] ${alertData.method} ${alertData.endpoint} (${alertData.durationMs}ms) — ${alertData.message || alertData.rootCause || "Unknown failure"}`;
    }

    liveAlertBanner.classList.add("active");
    clearTimeout(alertDismissTimeout);
    alertDismissTimeout = setTimeout(() => {
        liveAlertBanner.classList.remove("active");
    }, 12000);
}

/* ==========================================================
   LOAD DATA
========================================================== */
async function loadAllTelemetry() {
    await Promise.allSettled([
        loadSummary(),
        loadRequests(),
        loadEndpoints(),
        loadPages(),
        loadIncidents()
    ]);
}

async function loadSummary() {
    try {
        const res = await fetch(`${API_BASE}/admin/monitor/summary`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.success) return;

        const s = data.summary;

        // Health Scores
        if (overallHealthVal) {
            overallHealthVal.textContent = `${s.health?.overall ?? 100}%`;
            overallHealthVal.style.color = s.health?.overall >= 95 ? "#34d399" : (s.health?.overall >= 80 ? "#fbbf24" : "#f87171");
        }
        if (subHealthUser) subHealthUser.textContent = `${s.health?.userApi ?? 100}%`;
        if (subHealthAdmin) subHealthAdmin.textContent = `${s.health?.adminApi ?? 100}%`;
        if (subHealthPayment) subHealthPayment.textContent = `${s.health?.payment ?? 100}%`;
        if (subHealthDownload) subHealthDownload.textContent = `${s.health?.download ?? 100}%`;
        if (subHealthDatabase) subHealthDatabase.textContent = `${s.health?.database ?? 100}%`;
        if (subHealthFrontend) subHealthFrontend.textContent = `${s.health?.frontend ?? 100}%`;

        // 10 Metric Cards
        if (metricTotal) metricTotal.textContent = (s.totalRequests || 0).toLocaleString();
        if (metricPass) metricPass.textContent = (s.pass || 0).toLocaleString();
        if (metricFail) metricFail.textContent = (s.fail || 0).toLocaleString();
        if (metric4xx) metric4xx.textContent = (s.count4xx || 0).toLocaleString();
        if (metric5xx) metric5xx.textContent = (s.count5xx || 0).toLocaleString();
        if (metricFrontend) metricFrontend.textContent = (s.frontendErrors || 0).toLocaleString();
        if (metricDatabase) metricDatabase.textContent = (s.databaseErrors || 0).toLocaleString();
        if (metricPayment) metricPayment.textContent = (s.paymentErrors || 0).toLocaleString();
        if (metricAvgDuration) metricAvgDuration.textContent = `${s.avgDurationMs || 0}ms`;
        if (metricIncidents) metricIncidents.textContent = (s.activeIncidentsCount || 0).toLocaleString();
    } catch (e) {}
}

async function loadRequests(silent = false) {
    try {
        const queryParams = new URLSearchParams();
        if (filters.source !== "ALL") queryParams.set("source", filters.source);
        if (filters.result !== "ALL") queryParams.set("result", filters.result);
        if (filters.method !== "ALL") queryParams.set("method", filters.method);
        if (filters.statusCode !== "ALL") queryParams.set("statusCode", filters.statusCode);
        if (filters.category !== "ALL") queryParams.set("category", filters.category);
        if (filters.search) queryParams.set("search", filters.search);
        queryParams.set("limit", "100");

        const res = await fetch(`${API_BASE}/admin/monitor/requests?${queryParams.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.success) return;

        const newItems = data.items || [];
        // If silent auto-refresh and items haven't changed, skip DOM re-render
        if (silent && currentRequests.length === newItems.length) {
            const firstOld = currentRequests[0]?.request_id || currentRequests[0]?.id;
            const firstNew = newItems[0]?.request_id || newItems[0]?.id;
            if (firstOld === firstNew) return;
        }

        currentRequests = newItems;
        renderRequestsTable(currentRequests, data.total || 0);
    } catch (e) {}
}

function renderRequestsTable(items, totalCount) {
    if (!requestsTableBody) return;

    if (showingCount) {
        showingCount.textContent = `Showing ${items.length} of ${totalCount} requests`;
    }

    if (items.length === 0) {
        requestsTableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center; padding:35px; color:var(--text-muted);">
                    No API requests match the selected filters.
                </td>
            </tr>
        `;
        return;
    }

    requestsTableBody.innerHTML = items.map(r => generateRequestRowHtml(r)).join("");
    attachRowClickHandlers();
}

function generateRequestRowHtml(r) {
    const isFail = r.result === "FAIL";
    const statusFamily = Math.floor((r.status_code || 200) / 100);
    const statusClass = `status-${statusFamily}xx`;

    const sourceBadgeClass = `badge-${(r.source || "public").toLowerCase()}`;
    const methodClass = `method-${(r.method || "get").toLowerCase()}`;

    const errorSnippet = r.safe_error_message || (r.safe_root_cause ? `${r.safe_root_cause}` : "-");

    return `
        <tr class="${isFail ? 'row-fail' : ''}" data-request-id="${escapeHtml(r.request_id || r.id)}">
            <td style="color:var(--text-dim); font-family:monospace;">${escapeHtml(r.time_formatted || "")}</td>
            <td><span class="badge ${sourceBadgeClass}">${escapeHtml(r.source || "PUBLIC")}</span></td>
            <td><strong>${escapeHtml(r.page || "Landing")}</strong></td>
            <td><span class="method-tag ${methodClass}">${escapeHtml(r.method || "GET")}</span></td>
            <td style="font-family:monospace; color:#fff; max-width:240px; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(r.endpoint)}">
                ${escapeHtml(r.endpoint || "/")}
            </td>
            <td><span class="${statusClass}">${r.status_code || 200}</span></td>
            <td><span class="badge ${isFail ? 'badge-fail' : 'badge-pass'}">${isFail ? 'FAIL' : 'PASS'}</span></td>
            <td style="color:${r.duration_ms > 500 ? '#fbbf24' : 'var(--text-muted)'}; font-family:monospace;">${r.duration_ms}ms</td>
            <td style="max-width:280px; overflow:hidden; text-overflow:ellipsis; color:${isFail ? '#fca5a5' : 'var(--text-dim)'};" title="${escapeHtml(errorSnippet)}">
                ${isFail ? `<strong>[${escapeHtml(r.error_category || 'FAIL')}]</strong> ` : ''}${escapeHtml(errorSnippet)}
            </td>
            <td><code style="font-size:11.5px; color:#38bdf8;">${escapeHtml(r.request_id || r.id)}</code></td>
        </tr>
    `;
}

function prependRequestRow(r) {
    if (!requestsTableBody) return;

    // Check if matches active filters
    if (filters.source !== "ALL" && r.source !== filters.source) return;
    if (filters.result !== "ALL" && r.result !== filters.result) return;
    if (filters.method !== "ALL" && r.method !== filters.method) return;
    if (filters.category !== "ALL" && r.error_category !== filters.category) return;

    // Insert at top of current array
    currentRequests.unshift(r);
    if (currentRequests.length > 100) currentRequests.pop();

    // Insert into DOM with highlight
    const rowHtml = generateRequestRowHtml(r);
    const temp = document.createElement("tbody");
    temp.innerHTML = rowHtml;
    const newRow = temp.firstElementChild;

    // If placeholder was there, clear it
    if (requestsTableBody.children.length === 1 && requestsTableBody.children[0].children.length === 1) {
        requestsTableBody.innerHTML = "";
    }

    newRow.style.background = r.result === "FAIL" ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)";
    newRow.style.transition = "background 1.5s ease";

    requestsTableBody.insertBefore(newRow, requestsTableBody.firstChild);
    setTimeout(() => {
        newRow.style.background = "";
    }, 1500);

    newRow.onclick = () => openDrawer(r);
}

function attachRowClickHandlers() {
    if (!requestsTableBody) return;
    const rows = requestsTableBody.querySelectorAll("tr[data-request-id]");
    rows.forEach(row => {
        row.onclick = () => {
            const reqId = row.dataset.requestId;
            const item = currentRequests.find(r => (r.request_id || r.id) === reqId);
            if (item) {
                openDrawer(item);
            } else {
                fetchRequestDetails(reqId);
            }
        };
    });
}

async function fetchRequestDetails(requestId) {
    try {
        const res = await fetch(`${API_BASE}/admin/monitor/requests/${encodeURIComponent(requestId)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.request) {
            openDrawer(data.request);
        }
    } catch (e) {}
}

/* ==========================================================
   ACTIVE INCIDENTS SECTION
========================================================== */
async function loadIncidents() {
    try {
        const res = await fetch(`${API_BASE}/admin/monitor/incidents`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.success) return;

        const incidents = data.incidents || [];
        if (!incidentsSection || !incidentsGrid) return;

        if (incidentCountBadge) {
            incidentCountBadge.textContent = incidents.length;
        }

        if (incidents.length === 0) {
            incidentsSection.style.display = "none";
            return;
        }

        incidentsSection.style.display = "block";
        incidentsGrid.innerHTML = incidents.map(inc => `
            <div class="incident-card ${inc.severity.toLowerCase()}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <span class="badge badge-fail" style="font-size:10px;">${escapeHtml(inc.severity)}</span>
                    <span style="font-size:12px; color:var(--text-muted);">${inc.count} failure${inc.count > 1 ? 's' : ''}</span>
                </div>
                <h4 style="margin:0 0 4px; font-size:14px; font-family:monospace; color:#fff;">${escapeHtml(inc.endpoint || "/")}</h4>
                <div style="font-size:12px; color:#fca5a5; font-weight:600; margin-bottom:8px;">${escapeHtml(inc.rootCause || "Needs investigation")}</div>
                <div style="font-size:11px; color:var(--text-dim); margin-bottom:12px;">Last seen: ${new Date(inc.lastSeen).toLocaleTimeString()}</div>
                <button type="button" class="action-btn" style="padding:4px 10px; font-size:11px; width:100%; justify-content:center;" onclick="window.__inspectIncident('${escapeHtml(inc.sampleRequestId)}')">
                    Inspect Sample Failure →
                </button>
            </div>
        `).join("");
    } catch (e) {}
}

window.__inspectIncident = function(sampleRequestId) {
    if (sampleRequestId) {
        fetchRequestDetails(sampleRequestId);
    }
};

/* ==========================================================
   ENDPOINT & PAGE HEALTH MATRICES
========================================================== */
async function loadEndpoints() {
    try {
        const res = await fetch(`${API_BASE}/admin/monitor/endpoints`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.success) return;

        const endpoints = data.endpoints || [];
        if (!endpointHealthBody) return;

        if (endpoints.length === 0) {
            endpointHealthBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:15px; color:var(--text-muted);">No endpoint telemetry available.</td></tr>`;
            return;
        }

        endpointHealthBody.innerHTML = endpoints.slice(0, 15).map(ep => `
            <tr>
                <td style="font-family:monospace; color:#fff;" title="${escapeHtml(ep.endpoint)}">${escapeHtml(ep.endpoint)}</td>
                <td><span class="badge badge-${(ep.source || "public").toLowerCase()}">${escapeHtml(ep.source || "PUBLIC")}</span></td>
                <td>${ep.requests}</td>
                <td style="color:#34d399;">${ep.pass}</td>
                <td style="color:${ep.fail > 0 ? '#f87171' : 'var(--text-dim)'};">${ep.fail}</td>
                <td>
                    <span style="color:${ep.errorRate > 0 ? '#f87171' : '#34d399'}; font-weight:700;">
                        ${ep.errorRate}%
                    </span>
                </td>
                <td style="color:var(--text-dim); font-family:monospace;">${ep.avgDurationMs}ms</td>
                <td style="color:var(--text-dim); font-family:monospace;">${ep.p95DurationMs}ms</td>
            </tr>
        `).join("");
    } catch (e) {}
}

async function loadPages() {
    try {
        const res = await fetch(`${API_BASE}/admin/monitor/pages`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.success) return;

        const pages = data.pages || [];
        if (!pageHealthBody) return;

        if (pages.length === 0) {
            pageHealthBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px; color:var(--text-muted);">No page telemetry available.</td></tr>`;
            return;
        }

        pageHealthBody.innerHTML = pages.map(pg => {
            let statusBadge = '<span class="badge badge-pass">HEALTHY</span>';
            if (pg.status === "CRITICAL") statusBadge = '<span class="badge badge-fail">CRITICAL</span>';
            else if (pg.status === "DEGRADED") statusBadge = '<span class="badge" style="background:rgba(245, 158, 11, 0.15); color:#fbbf24;">DEGRADED</span>';

            return `
                <tr>
                    <td><strong>${escapeHtml(pg.page)}</strong></td>
                    <td>${statusBadge}</td>
                    <td>${pg.totalRequests}</td>
                    <td style="color:${pg.apiFailures > 0 ? '#f87171' : 'var(--text-dim)'};">${pg.apiFailures}</td>
                    <td style="color:${pg.frontendErrors > 0 ? '#f472b6' : 'var(--text-dim)'};">${pg.frontendErrors}</td>
                </tr>
            `;
        }).join("");
    } catch (e) {}
}

/* ==========================================================
   DEEP DIAGNOSTIC SLIDEOVER DRAWER
========================================================== */
function openDrawer(r) {
    if (!diagnosticDrawer || !drawerBackdrop) return;
    lastInspectedRequest = r;

    const isFail = r.result === "FAIL";

    if (drawerStatusBadge) {
        drawerStatusBadge.className = `badge ${isFail ? 'badge-fail' : 'badge-pass'}`;
        drawerStatusBadge.textContent = `${r.status_code || 200} ${isFail ? 'FAIL' : 'PASS'}`;
    }

    if (drawerMethodBadge) {
        drawerMethodBadge.className = `method-tag method-${(r.method || "get").toLowerCase()}`;
        drawerMethodBadge.textContent = r.method || "GET";
    }

    if (drawerCategoryBadge) {
        drawerCategoryBadge.textContent = r.error_category || (isFail ? "ERROR" : "NORMAL");
        drawerCategoryBadge.style.display = isFail ? "inline-block" : "none";
    }

    if (drawerTitle) drawerTitle.textContent = r.endpoint || "/";
    if (drawerRequestId) drawerRequestId.textContent = r.request_id || r.id || "N/A";

    // 1. What failed
    if (drawerWhatFailed) {
        drawerWhatFailed.textContent = isFail
            ? (r.safe_error_message || "Operation failed with HTTP status " + r.status_code)
            : "Request completed successfully without errors.";
        drawerWhatFailed.style.color = isFail ? "#fca5a5" : "#34d399";
    }
    if (drawerCategoryText) drawerCategoryText.textContent = r.error_category || "N/A";
    if (drawerErrorCodeText) drawerErrorCodeText.textContent = r.error_code || (isFail ? "HTTP_" + r.status_code : "OK");

    // 2. Root Cause
    if (drawerRootCauseBox) {
        drawerRootCauseBox.textContent = r.safe_root_cause || (isFail ? "UNKNOWN / NEEDS INVESTIGATION" : "No root cause (Success)");
        drawerRootCauseBox.style.color = isFail ? "#fca5a5" : "#34d399";
        drawerRootCauseBox.style.background = isFail ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)";
        drawerRootCauseBox.style.borderColor = isFail ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)";
    }

    // 3. Failure Chain
    if (drawerFailureChain) {
        if (Array.isArray(r.failure_chain) && r.failure_chain.length > 0) {
            drawerFailureChain.innerHTML = r.failure_chain.map((step, idx) => {
                const isLast = idx === r.failure_chain.length - 1;
                return `
                    <div class="chain-step ${isLast && isFail ? 'failure' : ''}">
                        <span class="arrow">${idx === 0 ? '▶' : '↓'}</span>
                        <span>${escapeHtml(step)}</span>
                    </div>
                `;
            }).join("");
        } else {
            drawerFailureChain.innerHTML = `
                <div class="chain-step">
                    <span>${escapeHtml(r.page || "Client")} → ${escapeHtml(r.method || "GET")} ${escapeHtml(r.endpoint || "/")} → ${r.status_code || 200} ${r.result || "PASS"}</span>
                </div>
            `;
        }
    }

    // 4. Where & When
    if (drawerPageText) drawerPageText.textContent = r.page || "Landing";
    if (drawerSourceText) drawerSourceText.textContent = r.source || "PUBLIC";
    if (drawerEndpointText) drawerEndpointText.textContent = r.endpoint || "/";
    if (drawerRouteText) drawerRouteText.textContent = r.backend_route || r.endpoint || "/";
    if (drawerServiceText) drawerServiceText.textContent = r.external_service || "Internal Backend Service";
    if (drawerDurationText) drawerDurationText.textContent = `${r.duration_ms || 0}ms`;
    if (drawerTimestampText) drawerTimestampText.textContent = r.timestamp || "N/A";

    // 5. Timeline
    if (drawerTimeline) {
        if (Array.isArray(r.timeline) && r.timeline.length > 0) {
            drawerTimeline.innerHTML = r.timeline.map(m => `
                <div class="timeline-item">
                    <span class="timeline-time">${escapeHtml(m.time)}</span>
                    <span>${escapeHtml(m.step)}</span>
                </div>
            `).join("");
        } else {
            drawerTimeline.innerHTML = `<div class="timeline-item"><span class="timeline-time">${escapeHtml(r.time_formatted || "")}</span><span>Request completed</span></div>`;
        }
    }

    // 6. Context
    if (drawerUserMaskedText) drawerUserMaskedText.textContent = r.user_id_masked || "guest";
    if (drawerUserRoleText) drawerUserRoleText.textContent = r.user_role || "guest";
    if (drawerCorrelationIdText) drawerCorrelationIdText.textContent = r.correlation_id || "N/A";
    if (drawerRefererText) drawerRefererText.textContent = r.referer || "Direct Navigation / No Referer";
    if (drawerUserAgentText) drawerUserAgentText.textContent = r.user_agent || "Not provided";

    // 7. Safe Technical Error
    if (drawerSafeErrorBox) {
        if (r.client_error) {
            drawerSafeErrorBox.textContent = `[FRONTEND JAVASCRIPT EXCEPTION]\nFile: ${r.client_error.file}\nLine: ${r.client_error.line}\nColumn: ${r.client_error.column}\nMessage: ${r.client_error.message}\n\nStack:\n${r.errorStack || 'No stack captured'}`;
        } else if (r.errorStack) {
            drawerSafeErrorBox.textContent = r.errorStack;
        } else if (r.safe_error_message) {
            drawerSafeErrorBox.textContent = `Error: ${r.safe_error_message}`;
        } else {
            drawerSafeErrorBox.textContent = "No error occurred. Request was completed with HTTP 200 OK.";
        }
    }

    if (drawerBackdrop) {
        drawerBackdrop.classList.add("active");
        drawerBackdrop.style.display = "block";
    }
    if (diagnosticDrawer) {
        diagnosticDrawer.classList.add("active");
    }
}

function closeDrawer() {
    if (drawerBackdrop) {
        drawerBackdrop.classList.remove("active");
        drawerBackdrop.style.display = "none";
    }
    if (diagnosticDrawer) {
        diagnosticDrawer.classList.remove("active");
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
