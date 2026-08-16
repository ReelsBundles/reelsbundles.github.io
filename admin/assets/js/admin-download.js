/* ==========================================================
   ADMIN DOWNLOADS
========================================================== */

const API_BASE_URL =
    window.API_BASE_URL ||
    (
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
            ? "http://localhost:3000"
            : "https://reelsbundles-backend.onrender.com"
    );


let currentPage = 1;
let currentLimit = 20;


/* ==========================================================
   DOM
========================================================== */

const tableBody =
    document.getElementById(
        "downloadsTableBody"
    );

const searchInput =
    document.getElementById(
        "downloadSearch"
    );

const planFilter =
    document.getElementById(
        "downloadPlanFilter"
    );

const statusFilter =
    document.getElementById(
        "downloadStatusFilter"
    );

const pagination =
    document.getElementById(
        "downloadsPagination"
    );

const totalDownloadsElement =
    document.getElementById(
        "totalDownloads"
    );

const successfulDownloadsElement =
    document.getElementById(
        "successfulDownloads"
    );

const basicDownloadsElement =
    document.getElementById(
        "basicDownloads"
    );

const premiumDownloadsElement =
    document.getElementById(
        "premiumDownloads"
    );


/* ==========================================================
   LOAD DOWNLOADS
========================================================== */

async function loadDownloads(
    page = 1
) {

    try {

        currentPage =
            page;


        showLoading();


        const params =
            new URLSearchParams({

                page:
                    currentPage,

                limit:
                    currentLimit,

                search:
                    searchInput?.value
                        ?.trim() ||
                    "",

                plan:
                    planFilter?.value ||
                    "",

                status:
                    statusFilter?.value ||
                    ""

            });


        const response =
            await fetch(
                `${API_BASE_URL}/api/admin/downloads?${params.toString()}`,
                {
                    method:
                        "GET",

                    credentials:
                        "include",

                    headers: {

                        "Accept":
                            "application/json"

                    }

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Failed to load downloads."
            );

        }


        renderSummary(
            data.summary
        );


        renderDownloads(
            data.downloads
        );


        renderPagination(
            data.pagination
        );


    } catch (
        error
    ) {

        console.error(
            "[Admin Downloads]",
            error
        );


        showError(
            error.message
        );

    }

}


/* ==========================================================
   SUMMARY
========================================================== */

function renderSummary(
    summary
) {

    if (
        !summary
    ) {
        return;
    }


    if (
        totalDownloadsElement
    ) {

        totalDownloadsElement.textContent =
            summary.totalDownloads ??
            0;

    }


    if (
        successfulDownloadsElement
    ) {

        successfulDownloadsElement.textContent =
            summary.successfulDownloads ??
            0;

    }


    if (
        basicDownloadsElement
    ) {

        basicDownloadsElement.textContent =
            summary.basicDownloads ??
            0;

    }


    if (
        premiumDownloadsElement
    ) {

        premiumDownloadsElement.textContent =
            summary.premiumDownloads ??
            0;

    }

}

/* ==========================================================
   RENDER TABLE
========================================================== */

function renderDownloads(
    downloads
) {

    if (
        !tableBody
    ) {
        return;
    }


    if (
        !downloads ||
        downloads.length === 0
    ) {

        window.adminDownloadItems = [];

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="12"
                    class="empty-state"
                >

                    No download records found.

                </td>

            </tr>

        `;

        return;

    }


    /* Store current records for View button */

    window.adminDownloadItems =
        Array.isArray(downloads)
            ? downloads
            : [];


    tableBody.innerHTML =
        downloads
            .map(
                (download, index) =>
                    createDownloadRow(
                        download,
                        index
                    )
            )
            .join("");

}
/* ==========================================================
   CREATE ROW
========================================================== */

function createDownloadRow(
    item,
    index
) {

    const customerName =
        escapeHtml(
            item.customerName ||
            "Customer"
        );


    const email =
        escapeHtml(
            item.email ||
            "—"
        );


    const phone =
        escapeHtml(
            item.phone ||
            "—"
        );


    const orderId =
        escapeHtml(
            item.orderId ||
            "—"
        );


    const bundleName =
        escapeHtml(
            item.bundleName ||
            "—"
        );


    const plan =
        normalizePlan(
            item.plan
        );


    const amount =
        formatCurrency(
            item.amount
        );


    const paymentStatus =
        paymentStatusBadge(
            item.paymentStatus
        );


    const downloadStatus =
        statusBadge(
            item.status
        );


    const downloadCount =
        `${item.downloadCount ?? 0}/${item.maxDownloads ?? 1}`;


    const date =
        formatDate(
            item.downloadDate ||
            item.createdAt
        );


    return `

        <tr>

            <td>

                <div class="customer-cell">

                    <strong>
                        ${customerName}
                    </strong>

                    <span>
                        ${phone}
                    </span>

                </div>

            </td>


            <td>

                <span class="email-cell">
                    ${email}
                </span>

            </td>


            <td>

                <code>
                    ${orderId}
                </code>

            </td>


            <td>

                <strong>
                    ${amount}
                </strong>

            </td>


            <td>

                <span
                    class="plan-badge ${plan.className}"
                >

                    ${plan.label}

                </span>

            </td>


            <td>

                <span class="bundle-cell">
                    ${bundleName}
                </span>

            </td>


            <td>

                ${paymentStatus}

            </td>


            <td>

                ${downloadStatus}

            </td>


            <td>

                <span
                    class="download-count"
                >

                    ${downloadCount}

                </span>

            </td>


            <td>

                <span
                    class="date-cell"
                >

                    ${date}

                </span>

            </td>


            <td>

                <button
                     type="button"
                     class="view-download-btn"
                     data-download-index="${index}"
                    >
                       View
                    </button>
                    <button
                    type="button"
                    class="delete-download-btn"
                    data-download-index="${index}"
                    >
                     Delete
                     </button>

            </td>

        </tr>

    `;

}


/* ==========================================================
   PLAN BADGE
========================================================== */

function normalizePlan(
    plan
) {

    const value =
        String(
            plan ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        value ===
        "premium"
    ) {

        return {

            label:
                "Premium",

            className:
                "premium"

        };

    }


    if (
        value ===
        "basic"
    ) {

        return {

            label:
                "Basic",

            className:
                "basic"

        };

    }


    return {

        label:
            "Unknown",

        className:
            "unknown"

    };

}


/* ==========================================================
   PAYMENT STATUS
========================================================== */

function paymentStatusBadge(
    status
) {

    const value =
        String(
            status ||
            "UNKNOWN"
        )
            .trim()
            .toUpperCase();


    let className =
        "unknown";


    if (
        value ===
        "PAID"
    ) {

        className =
            "success";

    }


    if (
        value ===
        "FAILED"
    ) {

        className =
            "danger";

    }


    if (
        value ===
        "PENDING"
    ) {

        className =
            "warning";

    }


    return `

        <span
            class="status-badge ${className}"
        >

            ${escapeHtml(value)}

        </span>

    `;

}


/* ==========================================================
   DOWNLOAD STATUS
========================================================== */

function statusBadge(
    status
) {

    const value =
        String(
            status ||
            "UNKNOWN"
        )
            .trim()
            .toUpperCase();


    let className =
        "unknown";


    if (
        value ===
        "SUCCESS"
    ) {

        className =
            "success";

    }


    if (
        value ===
        "FAILED"
    ) {

        className =
            "danger";

    }


    return `

        <span
            class="status-badge ${className}"
        >

            ${escapeHtml(value)}

        </span>

    `;

}


/* ==========================================================
   PAGINATION
========================================================== */

function renderPagination(
    data
) {

    if (
        !pagination ||
        !data
    ) {

        return;

    }


    const page =
        Number(
            data.page
        ) || 1;


    const totalPages =
        Number(
            data.totalPages
        ) || 0;


    if (
        totalPages <= 1
    ) {

        pagination.innerHTML =
            "";

        return;

    }


    let html = "";


    html += `

        <button
            type="button"
            ${page <= 1 ? "disabled" : ""}
            onclick="loadDownloads(${page - 1})"
        >

            Previous

        </button>

    `;


    for (
        let i = 1;
        i <= totalPages;
        i++
    ) {

        if (
            i === 1 ||
            i === totalPages ||
            Math.abs(
                i - page
            ) <= 2
        ) {

            html += `

                <button
                    type="button"
                    class="${
                        i === page
                            ? "active"
                            : ""
                    }"
                    onclick="loadDownloads(${i})"
                >

                    ${i}

                </button>

            `;

        }

    }


    html += `

        <button
            type="button"
            ${
                page >= totalPages
                    ? "disabled"
                    : ""
            }
            onclick="loadDownloads(${page + 1})"
        >

            Next

        </button>

    `;


    pagination.innerHTML =
        html;

}

/* ==========================================================
   GLOBAL VIEW HANDLER
   ========================================================== */

window.viewAdminDownload = function(index) {

    const items =
        window.adminDownloadItems || [];

    const item =
        items[index];

    if (!item) {

        console.error(
            "[Admin Downloads] Download record not found:",
            index
        );

        return;

    }

    viewDownload(item);

};


/* ==========================================================
   GLOBAL MODAL CLOSE
   ========================================================== */

window.closeDownloadModal =
    closeDownloadModal;
/* ==========================================================
   DELETE SINGLE DOWNLOAD
========================================================== */

window.deleteAdminDownload = async function(
    index
) {

    const items =
        window.adminDownloadItems || [];


    const item =
        items[index];


    if (!item) {

        console.error(
            "[Admin Downloads] Download record not found:",
            index
        );

        return;

    }


    const downloadId =
        item.downloadId ||
        item.id;


    if (!downloadId) {

        alert(
            "Download ID is missing."
        );

        return;

    }


    const confirmed =
        window.confirm(
            "Are you sure you want to delete this download record?\n\nPayment and order data will NOT be deleted."
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/admin/downloads/${encodeURIComponent(downloadId)}`,
                {
                    method:
                        "DELETE",

                    credentials:
                        "include",

                    headers: {

                        "Accept":
                            "application/json"

                    }

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Failed to delete download."
            );

        }


        await loadDownloads(
            1
        );


    } catch (error) {

        console.error(
            "[Admin Downloads] Delete failed:",
            error
        );


        alert(
            error.message ||
            "Failed to delete download."
        );

    }

};
/* ==========================================================
   VIEW DOWNLOAD
========================================================== */

function viewDownload(
    item
) {

    const existing =
        document.getElementById(
            "downloadDetailsModal"
        );


    if (
        existing
    ) {

        existing.remove();

    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "downloadDetailsModal";


    modal.className =
        "download-modal";


    modal.innerHTML = `

        <div class="download-modal-backdrop">

            <div class="download-modal-content">

               <button
                 class="download-modal-close"
                type="button"
                 data-close-download-modal
                >
                  ×
                </button>


                <h2>
                    Download Details
                </h2>


                <div class="download-details-grid">

                    <div>
                        <span>Customer</span>
                        <strong>
                            ${escapeHtml(
                                item.customerName ||
                                "—"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Email</span>
                        <strong>
                            ${escapeHtml(
                                item.email ||
                                "—"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Phone</span>
                        <strong>
                            ${escapeHtml(
                                item.phone ||
                                "—"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Order ID</span>
                        <strong>
                            ${escapeHtml(
                                item.orderId ||
                                "—"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Amount</span>
                        <strong>
                            ${formatCurrency(
                                item.amount
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Plan</span>
                        <strong>
                            ${escapeHtml(
                                item.plan ||
                                "—"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Bundle</span>
                        <strong>
                            ${escapeHtml(
                                item.bundleName ||
                                "—"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Payment</span>
                        <strong>
                            ${escapeHtml(
                                item.paymentStatus ||
                                "—"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Downloads</span>
                        <strong>
                            ${item.downloadCount ?? 0}
                            /
                            ${item.maxDownloads ?? 1}
                        </strong>
                    </div>


                    <div>
                        <span>IP Address</span>
                        <strong>
                            ${escapeHtml(
                                item.ip ||
                                "—"
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Date</span>
                        <strong>
                            ${formatDate(
                                item.downloadDate ||
                                item.createdAt
                            )}
                        </strong>
                    </div>


                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );
    // ✅ YAHIN
    const closeButton =
        modal.querySelector(
            "[data-close-download-modal]"
        );

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            () => {
                closeDownloadModal();
            }
        );
    }

}



function closeDownloadModal() {

    const modal =
        document.getElementById(
            "downloadDetailsModal"
        );


    if (
        modal
    ) {

        modal.remove();

    }

}


/* ==========================================================
   SEARCH / FILTER
========================================================== */

let searchTimer;


if (
    searchInput
) {

    searchInput.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    () => {

                        loadDownloads(
                            1
                        );

                    },
                    400
                );

        }
    );

}


if (
    planFilter
) {

    planFilter.addEventListener(
        "change",
        () => {

            loadDownloads(
                1
            );

        }
    );

}


if (
    statusFilter
) {

    statusFilter.addEventListener(
        "change",
        () => {

            loadDownloads(
                1
            );

        }
    );

}


/* ==========================================================
   HELPERS
========================================================== */

function formatCurrency(
    amount
) {

    const value =
        Number(
            amount
        );


    if (
        !Number.isFinite(
            value
        )
    ) {

        return "₹0";

    }


    return new Intl.NumberFormat(
        "en-IN",
        {

            style:
                "currency",

            currency:
                "INR",

            maximumFractionDigits:
                0

        }
    ).format(
        value
    );

}


function formatDate(
    value
) {

    if (
        !value
    ) {

        return "—";

    }


    try {

        let date;


        if (
            value?.seconds
        ) {

            date =
                new Date(
                    value.seconds *
                    1000
                );

        } else {

            date =
                new Date(
                    value
                );

        }


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";

        }


        return date.toLocaleString(
            "en-IN",
            {

                day:
                    "2-digit",

                month:
                    "short",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit"

            }
        );

    } catch {

        return "—";

    }

}


function escapeHtml(
    value
) {

    return String(
        value ??
        ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* ==========================================================
   UI STATES
========================================================== */

function showLoading() {

    if (
        !tableBody
    ) {
        return;
    }


    tableBody.innerHTML = `

        <tr>

            <td
                colspan="12"
                class="loading-state"
            >

                Loading downloads...

            </td>

        </tr>

    `;

}


function showError(
    message
) {

    if (
        !tableBody
    ) {
        return;
    }


    tableBody.innerHTML = `

        <tr>

            <td
                colspan="12"
                class="error-state"
            >

                ${escapeHtml(
                    message ||
                    "Unable to load downloads."
                )}

            </td>

        </tr>

    `;

}


/* ==========================================================
   INITIAL LOAD
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDownloads(
            1
        );

    }
);


/* ==========================================================
   VIEW DOWNLOAD BUTTON
   CSP-SAFE EVENT HANDLER
========================================================== */

if (tableBody) {

    tableBody.addEventListener(
        "click",
        (event) => {

            const deleteButton =
    event.target.closest(
        ".delete-download-btn"
    );


if (deleteButton) {

    const index =
        Number(
            deleteButton.dataset.downloadIndex
        );


    if (
        Number.isInteger(index)
    ) {

        window.deleteAdminDownload(
            index
        );

    }


    return;

}


const button =
    event.target.closest(
        ".view-download-btn"
    );


if (!button) {
    return;
}

            const index =
                Number(
                    button.dataset.downloadIndex
                );


            if (
                !Number.isInteger(index)
            ) {

                console.error(
                    "[Admin Downloads] Invalid download index:",
                    button.dataset.downloadIndex
                );

                return;

            }


            window.viewAdminDownload(
                index
            );

        }
    );

}
/* ==========================================================
   DELETE ALL DOWNLOADS
========================================================== */

if (
    deleteAllDownloadsButton
) {

    deleteAllDownloadsButton.addEventListener(
        "click",
        async () => {

            const confirmed =
                window.confirm(
                    "⚠️ DELETE ALL DOWNLOADS?\n\nThis will permanently delete all download records.\n\nPayment and order records will NOT be deleted.\n\nThis action cannot be undone."
                );


            if (!confirmed) {
                return;
            }


            try {

                deleteAllDownloadsButton.disabled =
                    true;


                deleteAllDownloadsButton.textContent =
                    "Deleting...";


                const response =
                    await fetch(
                        `${API_BASE_URL}/api/admin/downloads`,
                        {
                            method:
                                "DELETE",

                            credentials:
                                "include",

                            headers: {

                                "Accept":
                                    "application/json"

                            }

                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Failed to delete downloads."
                    );

                }


                await loadDownloads(
                    1
                );


                alert(
                    data.message ||
                    "All downloads deleted successfully."
                );


            } catch (error) {

                console.error(
                    "[Admin Downloads] Delete all failed:",
                    error
                );


                alert(
                    error.message ||
                    "Failed to delete all downloads."
                );


            } finally {

                deleteAllDownloadsButton.disabled =
                    false;


                deleteAllDownloadsButton.textContent =
                    "🗑️ Delete All";

            }

        }
    );

}