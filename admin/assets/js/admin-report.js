/* ==========================================================
   REELSBUNDLES ADMIN — OBSERVABILITY REPORT GENERATOR
   Exports high-fidelity PDF reports & multi-sheet Excel (.xlsx)
   workbooks for USER, ADMIN, and ALL production monitoring data.
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

// Modal and Control Elements
const reportConfigModal = document.getElementById("reportConfigModal");
const openReportModalBtn = document.getElementById("openReportModalBtn");
const openCustomReportBtn = document.getElementById("openCustomReportBtn");
const closeReportModalBtn = document.getElementById("closeReportModalBtn");
const generatePdfBtn = document.getElementById("generatePdfBtn");
const generateExcelBtn = document.getElementById("generateExcelBtn");
const reportStatusNotice = document.getElementById("reportStatusNotice");
const customDateRangeBox = document.getElementById("customDateRangeBox");
const reportStartDate = document.getElementById("reportStartDate");
const reportEndDate = document.getElementById("reportEndDate");

const reportFilterResult = document.getElementById("reportFilterResult");
const reportFilterStatusCode = document.getElementById("reportFilterStatusCode");
const reportFilterMethod = document.getElementById("reportFilterMethod");
const reportFilterCategory = document.getElementById("reportFilterCategory");

// Active selection state in modal
let activeScope = "USER";
let activeDateRange = "7d";

/* ==========================================================
   INITIALIZATION & EVENT BINDINGS
========================================================== */
export function initReportControls() {
    // Topbar & Shortcut buttons
    if (openReportModalBtn) {
        openReportModalBtn.onclick = () => openModal("ALL");
    }
    if (openCustomReportBtn) {
        openCustomReportBtn.onclick = () => openModal(activeScope);
    }
    if (closeReportModalBtn && reportConfigModal) {
        closeReportModalBtn.onclick = closeModal;
    }
    if (reportConfigModal) {
        reportConfigModal.onclick = (e) => {
            if (e.target === reportConfigModal) closeModal();
        };
    }

    // Quick export buttons: [ USER ], [ ADMIN ], [ ALL ] -> (PDF | Excel)
    document.querySelectorAll(".report-quick-btn").forEach(btn => {
        btn.onclick = async () => {
            const reportType = btn.dataset.type || "ALL";
            const format = btn.dataset.format || "pdf";
            await executeQuickExport(btn, reportType, format);
        };
    });

    // Scope selection in modal
    document.querySelectorAll(".report-scope-btn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".report-scope-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeScope = btn.dataset.scope || "ALL";
        };
    });

    // Date range presets in modal
    document.querySelectorAll(".report-range-preset-btn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".report-range-preset-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeDateRange = btn.dataset.range || "7d";
            if (customDateRangeBox) {
                customDateRangeBox.style.display = activeDateRange === "custom" ? "grid" : "none";
            }
        };
    });

    // Modal action buttons
    if (generatePdfBtn) {
        generatePdfBtn.onclick = () => handleModalExport("pdf");
    }
    if (generateExcelBtn) {
        generateExcelBtn.onclick = () => handleModalExport("xlsx");
    }
}

function openModal(defaultScope = "ALL") {
    if (!reportConfigModal) return;
    activeScope = defaultScope;
    document.querySelectorAll(".report-scope-btn").forEach(b => {
        if (b.dataset.scope === defaultScope) b.classList.add("active");
        else b.classList.remove("active");
    });
    reportConfigModal.style.display = "flex";
}

function closeModal() {
    if (reportConfigModal) {
        reportConfigModal.style.display = "none";
    }
}

/* ==========================================================
   QUICK EXPORT FROM SHORTCUT BUTTONS
========================================================== */
async function executeQuickExport(btn, reportType, format) {
    const origText = btn.textContent;
    try {
        btn.disabled = true;
        btn.textContent = "⏳...";

        const params = {
            reportType,
            dateRange: "7d"
        };
        const reportData = await fetchReportData(params);

        if (format === "xlsx") {
            generateExcelWorkbook(reportData);
        } else {
            generatePdfDocument(reportData);
        }
    } catch (err) {
        alert("Report generation failed: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = origText;
    }
}

/* ==========================================================
   MODAL EXPORT HANDLER
========================================================== */
async function handleModalExport(format) {
    showStatusNotice("⏳ Fetching verified telemetry from production backend...", false);

    try {
        const params = {
            reportType: activeScope,
            dateRange: activeDateRange,
            result: reportFilterResult?.value || "ALL",
            statusCode: reportFilterStatusCode?.value || "ALL",
            method: reportFilterMethod?.value || "ALL",
            category: reportFilterCategory?.value || "ALL"
        };

        if (activeDateRange === "custom") {
            params.startDate = reportStartDate?.value || "";
            params.endDate = reportEndDate?.value || "";
        }

        const reportData = await fetchReportData(params);

        if (format === "xlsx") {
            showStatusNotice("📊 Building multi-sheet Excel (.xlsx) workbook...", false);
            generateExcelWorkbook(reportData);
        } else {
            showStatusNotice("📄 Rendering multi-page PDF diagnostic report...", false);
            generatePdfDocument(reportData);
        }

        showStatusNotice("✅ Report downloaded successfully!", true);
        setTimeout(() => {
            closeModal();
            hideStatusNotice();
        }, 1200);
    } catch (err) {
        showStatusNotice("❌ Report generation failed: " + err.message, false, true);
    }
}

function showStatusNotice(msg, isSuccess = false, isError = false) {
    if (!reportStatusNotice) return;
    reportStatusNotice.style.display = "block";
    reportStatusNotice.textContent = msg;
    if (isSuccess) {
        reportStatusNotice.style.background = "rgba(16, 185, 129, 0.2)";
        reportStatusNotice.style.borderColor = "rgba(16, 185, 129, 0.4)";
        reportStatusNotice.style.color = "#34d399";
    } else if (isError) {
        reportStatusNotice.style.background = "rgba(239, 68, 68, 0.2)";
        reportStatusNotice.style.borderColor = "rgba(239, 68, 68, 0.4)";
        reportStatusNotice.style.color = "#fca5a5";
    } else {
        reportStatusNotice.style.background = "rgba(59, 130, 246, 0.15)";
        reportStatusNotice.style.borderColor = "rgba(59, 130, 246, 0.3)";
        reportStatusNotice.style.color = "#93c5fd";
    }
}

function hideStatusNotice() {
    if (reportStatusNotice) reportStatusNotice.style.display = "none";
}

/* ==========================================================
   BACKEND DATA FETCHER
========================================================== */
async function fetchReportData(params) {
    const token = getAdminToken();
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v && v !== "ALL") query.set(k, v);
    }
    if (params.reportType) query.set("reportType", params.reportType);
    if (params.dateRange) query.set("dateRange", params.dateRange);

    const res = await fetch(`${API_BASE}/admin/monitor/report-data?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        let errMessage = "Server returned status " + res.status;
        try {
            const errData = await res.json();
            if (errData.message) errMessage = errData.message;
        } catch (e) {}
        throw new Error(errMessage);
    }

    const data = await res.json();
    if (!data || !data.success) {
        throw new Error(data?.message || "Failed to retrieve report data.");
    }
    return data;
}

/* ==========================================================
   EXCEL (.XLSX) GENERATION (SHEETJS)
   6 Separate Worksheets: SUMMARY, REQUEST LOG, ENDPOINT HEALTH,
   ERROR SUMMARY, PAGE HEALTH, INCIDENTS.
========================================================== */
function generateExcelWorkbook(report) {
    if (typeof XLSX === "undefined") {
        throw new Error("SheetJS (XLSX) library not loaded. Please check network connectivity.");
    }

    const s = report.summary || {};
    const wb = XLSX.utils.book_new();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    // ----------------------------------------------------
    // SHEET 1: SUMMARY
    // ----------------------------------------------------
    const summaryData = [
        ["REELSBUNDLES — API & ERROR DIAGNOSTIC MONITOR REPORT"],
        [""],
        ["METADATA", ""],
        ["Report Type", report.reportType || "ALL"],
        ["Date Range", report.dateRange || "All Time"],
        ["Generated At", report.generatedAt || now.toISOString()],
        ["Environment", "PRODUCTION"],
        ["Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"],
        [""],
        ["TRAFFIC & EXECUTION SUMMARY", ""],
        ["Total Requests", s.totalRequests || 0],
        ["Passed Requests (2xx/3xx)", s.pass || 0],
        ["Failed Requests (4xx/5xx)", s.fail || 0],
        ["4xx Client / Auth Errors", s.count4xx || 0],
        ["5xx Server / Gateway Errors", s.count5xx || 0],
        ["Error Rate (%)", (s.errorRate ?? 0) + "%"],
        ["Average Response Time (ms)", (s.avgDurationMs || 0) + " ms"],
        ["User API Requests", s.userRequests || 0],
        ["Admin API Requests", s.adminRequests || 0],
        [""],
        ["SUBSYSTEM HEALTH SCORES", ""],
        ["Overall System Health", (s.overallHealth ?? 100) + "%"],
        ["User APIs Health", (s.userApiHealth ?? 100) + "%"],
        ["Admin APIs Health", (s.adminApiHealth ?? 100) + "%"],
        ["UroPay Payment Health", (s.paymentHealth ?? 100) + "%"],
        ["Download & Drive Health", (s.downloadHealth ?? 100) + "%"],
        ["Database Health", (s.databaseHealth ?? 100) + "%"]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "SUMMARY");

    // ----------------------------------------------------
    // SHEET 2: REQUEST LOG
    // ----------------------------------------------------
    const requestHeaders = [
        "Timestamp",
        "Source",
        "Page",
        "Method",
        "Endpoint",
        "Status Code",
        "Result",
        "Duration (ms)",
        "Error Category",
        "Error Code",
        "Safe Error Message",
        "Root Cause",
        "Request ID"
    ];

    const requestRows = (report.requests || []).map(r => [
        r.timestamp || "",
        r.source || "PUBLIC",
        r.page || "Landing",
        r.method || "GET",
        r.endpoint || "/",
        Number(r.statusCode) || 200,
        r.result || "PASS",
        Number(r.durationMs) || 0,
        r.errorCategory || "",
        r.errorCode || "",
        r.safeErrorMessage || "",
        r.safeRootCause || "",
        r.requestId || ""
    ]);

    if (requestRows.length === 0) {
        requestRows.push(["No monitoring events found for the selected period.", "", "", "", "", "", "", "", "", "", "", "", ""]);
    }

    const wsRequests = XLSX.utils.aoa_to_sheet([requestHeaders, ...requestRows]);
    wsRequests["!cols"] = [
        { wch: 24 }, // Timestamp
        { wch: 10 }, // Source
        { wch: 16 }, // Page
        { wch: 8 },  // Method
        { wch: 32 }, // Endpoint
        { wch: 12 }, // Status Code
        { wch: 8 },  // Result
        { wch: 14 }, // Duration
        { wch: 20 }, // Category
        { wch: 22 }, // Code
        { wch: 40 }, // Safe Error
        { wch: 35 }, // Root Cause
        { wch: 28 }  // Request ID
    ];
    if (requestRows.length > 0) {
        wsRequests["!autofilter"] = { ref: `A1:M${requestRows.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsRequests, "REQUEST LOG");

    // ----------------------------------------------------
    // SHEET 3: ENDPOINT HEALTH
    // ----------------------------------------------------
    const epHeaders = [
        "Endpoint",
        "Source",
        "Total Requests",
        "Passed",
        "Failed",
        "4xx",
        "5xx",
        "Error Rate (%)",
        "Avg Response (ms)",
        "P95 Latency (ms)"
    ];

    const epRows = (report.endpointHealth || []).map(e => [
        e.endpoint || "/",
        e.source || "PUBLIC",
        Number(e.requests) || 0,
        Number(e.passed) || 0,
        Number(e.failed) || 0,
        Number(e.count4xx) || 0,
        Number(e.count5xx) || 0,
        Number(e.errorRate) || 0,
        Number(e.avgResponse) || 0,
        Number(e.p95Response) || 0
    ]);

    if (epRows.length === 0) {
        epRows.push(["No endpoint telemetry recorded for this period.", "", "", "", "", "", "", "", "", ""]);
    }

    const wsEp = XLSX.utils.aoa_to_sheet([epHeaders, ...epRows]);
    wsEp["!cols"] = [
        { wch: 35 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
        { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 16 }
    ];
    if (epRows.length > 0) {
        wsEp["!autofilter"] = { ref: `A1:J${epRows.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsEp, "ENDPOINT HEALTH");

    // ----------------------------------------------------
    // SHEET 4: ERROR SUMMARY
    // ----------------------------------------------------
    const errorHeaders = [
        "Error Category",
        "Count",
        "Percentage (%)",
        "Affected Endpoints",
        "Latest Occurrence"
    ];

    const errorRows = (report.errorSummary || []).map(c => [
        c.category || "UNKNOWN",
        Number(c.count) || 0,
        Number(c.percentage) || 0,
        c.affectedEndpoints || "-",
        c.latestOccurrence || "-"
    ]);

    if (errorRows.length === 0) {
        errorRows.push(["Zero failures recorded in this period. All requests passed successfully.", "", "", "", ""]);
    }

    const wsErr = XLSX.utils.aoa_to_sheet([errorHeaders, ...errorRows]);
    wsErr["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 14 }, { wch: 45 }, { wch: 24 }];
    if (errorRows.length > 0) {
        wsErr["!autofilter"] = { ref: `A1:E${errorRows.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsErr, "ERROR SUMMARY");

    // ----------------------------------------------------
    // SHEET 5: PAGE HEALTH
    // ----------------------------------------------------
    const pageHeaders = [
        "Page Name",
        "Primary Source",
        "Total Requests",
        "Passed",
        "Failed",
        "Error Rate (%)",
        "Avg Response (ms)"
    ];

    const pageRows = (report.pageHealth || []).map(p => [
        p.page || "Landing",
        p.source || "PUBLIC",
        Number(p.requests) || 0,
        Number(p.passed) || 0,
        Number(p.failed) || 0,
        Number(p.errorRate) || 0,
        Number(p.avgResponse) || 0
    ]);

    if (pageRows.length === 0) {
        pageRows.push(["No page activity recorded for this period.", "", "", "", "", "", ""]);
    }

    const wsPg = XLSX.utils.aoa_to_sheet([pageHeaders, ...pageRows]);
    wsPg["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 18 }];
    if (pageRows.length > 0) {
        wsPg["!autofilter"] = { ref: `A1:G${pageRows.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsPg, "PAGE HEALTH");

    // ----------------------------------------------------
    // SHEET 6: INCIDENTS
    // ----------------------------------------------------
    const incHeaders = [
        "Timestamp",
        "Severity",
        "Source",
        "Page",
        "Endpoint",
        "Status",
        "Category",
        "Safe Error Message",
        "Root Cause",
        "Request ID"
    ];

    const incRows = (report.incidents || []).map(inc => [
        inc.timestamp || "",
        inc.severity || "MEDIUM",
        inc.source || "PUBLIC",
        inc.page || "Landing",
        inc.endpoint || "/",
        Number(inc.statusCode) || 500,
        inc.category || "ERROR",
        inc.safeError || "",
        inc.rootCause || "UNKNOWN / NEEDS INVESTIGATION",
        inc.requestId || ""
    ]);

    if (incRows.length === 0) {
        incRows.push(["Zero active incidents. System operates with zero critical/high failures.", "", "", "", "", "", "", "", "", ""]);
    }

    const wsInc = XLSX.utils.aoa_to_sheet([incHeaders, ...incRows]);
    wsInc["!cols"] = [
        { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 32 },
        { wch: 8 }, { wch: 20 }, { wch: 38 }, { wch: 35 }, { wch: 28 }
    ];
    if (incRows.length > 0) {
        wsInc["!autofilter"] = { ref: `A1:J${incRows.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsInc, "INCIDENTS");

    // Filename: ReelsBundles_User_Report_YYYY-MM-DD.xlsx
    const typeClean = (report.reportType || "ALL").charAt(0).toUpperCase() + (report.reportType || "ALL").slice(1).toLowerCase();
    const filename = `ReelsBundles_${typeClean}_Report_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
}

/* ==========================================================
   PDF GENERATION (JSPDF + AUTOTABLE)
   Landscape A4 multi-page document with executive branding,
   summary cards, top failures, and paginated event table.
========================================================== */
function generatePdfDocument(report) {
    if (typeof window.jspdf === "undefined" || typeof window.jspdf.jsPDF === "undefined") {
        throw new Error("jsPDF library not loaded. Please check network connectivity.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape", "pt", "a4");
    const s = report.summary || {};
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Header Banner
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, pageWidth, 60, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("ReelsBundles", 30, 32);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("OBSERVABILITY & LIVE ERROR DIAGNOSTIC REPORT", 160, 32);

    const typeLabel = (report.reportType || "ALL").toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setTextColor(168, 85, 247); // Purple
    doc.text(`[ ${typeLabel} MONITORING ]`, pageWidth - 160, 32);

    // 2. Metadata Strip
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 60, pageWidth, 28, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Date Range: ${report.dateRange || "Last 7 Days"}`, 30, 77);
    doc.text(`Generated: ${new Date(report.generatedAt || now).toLocaleString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"})`, 260, 77);
    doc.text("Environment: PRODUCTION", 590, 77);
    doc.text(`Overall Health: ${s.overallHealth ?? 100}%`, pageWidth - 160, 77);

    // 3. Summary Statistics Cards
    const statCardsData = [
        ["Total Requests", `${s.totalRequests || 0}`],
        ["Pass Rate", `${s.totalRequests > 0 ? Math.round(((s.pass || 0) / s.totalRequests) * 100) : 100}%`],
        ["Failed (4xx/5xx)", `${s.fail || 0}`],
        ["Error Rate", `${s.errorRate ?? 0}%`],
        ["Avg Latency", `${s.avgDurationMs || 0} ms`],
        ["User API Health", `${s.userApiHealth ?? 100}%`],
        ["Admin API Health", `${s.adminApiHealth ?? 100}%`],
        ["Active Incidents", `${(report.incidents || []).length}`]
    ];

    doc.autoTable({
        startY: 100,
        head: [statCardsData.map(c => c[0])],
        body: [statCardsData.map(c => c[1])],
        theme: "grid",
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [203, 213, 225],
            fontSize: 8,
            fontStyle: "bold",
            halign: "center"
        },
        bodyStyles: {
            fontSize: 10,
            fontStyle: "bold",
            textColor: [15, 23, 42],
            halign: "center"
        },
        margin: { left: 30, right: 30 }
    });

    let currentY = doc.lastAutoTable.finalY + 15;

    // 4. Error Categories / Failures Summary (if any errors exist)
    if (report.errorSummary && report.errorSummary.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(220, 38, 38);
        doc.text("Top Failure Categories & Root Cause Distribution", 30, currentY);
        currentY += 8;

        const errHead = ["Category", "Count", "% Total Errors", "Affected Endpoints", "Latest Failure"];
        const errBody = report.errorSummary.slice(0, 5).map(c => [
            c.category,
            String(c.count),
            `${c.percentage}%`,
            c.affectedEndpoints || "-",
            c.latestOccurrence ? new Date(c.latestOccurrence).toLocaleTimeString() : "-"
        ]);

        doc.autoTable({
            startY: currentY,
            head: [errHead],
            body: errBody,
            theme: "striped",
            headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: 30, right: 30 }
        });

        currentY = doc.lastAutoTable.finalY + 18;
    }

    // 5. Detailed Event Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Detailed API Requests & Diagnostics Log", 30, currentY);
    currentY += 8;

    const eventHead = [
        "Time",
        "Source",
        "Page",
        "Method",
        "Endpoint",
        "Status",
        "Result",
        "Latency",
        "Error / Root Cause",
        "Request ID"
    ];

    const eventRows = (report.requests || []).map(r => {
        const isFail = r.result === "FAIL";
        let diagText = "-";
        if (isFail) {
            diagText = `[${r.errorCategory || 'FAIL'}] ${r.safeErrorMessage || ''}`;
            if (r.safeRootCause) diagText += ` | ${r.safeRootCause}`;
        }

        return [
            r.timeFormatted || new Date(r.timestamp).toLocaleTimeString(),
            r.source || "PUBLIC",
            r.page || "Landing",
            r.method || "GET",
            r.endpoint || "/",
            String(r.statusCode || 200),
            r.result || "PASS",
            `${r.durationMs || 0}ms`,
            diagText,
            r.requestId || ""
        ];
    });

    if (eventRows.length === 0) {
        eventRows.push(["No monitoring events found for the selected period.", "", "", "", "", "", "", "", "", ""]);
    }

    doc.autoTable({
        startY: currentY,
        head: [eventHead],
        body: eventRows,
        theme: "striped",
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontSize: 7.5,
            fontStyle: "bold"
        },
        bodyStyles: {
            fontSize: 7,
            cellPadding: 3.5
        },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 45 },
            2: { cellWidth: 55 },
            3: { cellWidth: 40 },
            4: { cellWidth: 140 },
            5: { cellWidth: 40, halign: "center" },
            6: { cellWidth: 42, halign: "center" },
            7: { cellWidth: 45, halign: "right" },
            8: { cellWidth: 200 },
            9: { cellWidth: 120 }
        },
        didParseCell: function(data) {
            if (data.section === "body") {
                if (data.column.index === 6) { // Result column
                    if (data.cell.raw === "FAIL") {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = "bold";
                    } else if (data.cell.raw === "PASS") {
                        data.cell.styles.textColor = [16, 185, 129];
                    }
                }
            }
        },
        didDrawPage: function(data) {
            // Footer on every page
            const totalPages = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text(
                `ReelsBundles Diagnostic Monitor — Page ${data.pageNumber} of ${totalPages}`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 14,
                { align: "center" }
            );
        },
        margin: { left: 30, right: 30, bottom: 25 }
    });

    // Filename: ReelsBundles_User_Report_YYYY-MM-DD.pdf
    const typeClean = (report.reportType || "ALL").charAt(0).toUpperCase() + (report.reportType || "ALL").slice(1).toLowerCase();
    const filename = `ReelsBundles_${typeClean}_Report_${dateStr}.pdf`;

    doc.save(filename);
}

// Auto-bind on load
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initReportControls);
    } else {
        initReportControls();
    }
}
