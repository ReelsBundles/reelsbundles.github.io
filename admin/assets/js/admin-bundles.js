/* ==========================================================
   ReelsBundles Admin
   BUNDLES MANAGER - FIXED
========================================================== */

"use strict";

/* ==========================================================
   CONFIG
========================================================== */

const API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000"
        : (window.REELSBUNDLES_CONFIG?.API_BASE_URL || "https://reelsbundles-backend.onrender.com")
);
const API = `${API_BASE}/api/admin/bundles`;
const TOKEN_KEY = "admin_token";

const token =
    localStorage.getItem(TOKEN_KEY);

if (!token) {
    window.location.href = "login.html";
}

/* ==========================================================
   STATE
========================================================== */

let bundles = [];
let filteredBundles = [];

let currentPage = 1;

const ITEMS_PER_PAGE = 10;

let editId = null;
let deleteId = null;

/* ==========================================================
   DOM
========================================================== */

const tableBody =
    document.getElementById(
        "bundleTable"
    );

const form =
    document.getElementById(
        "bundleForm"
    );

const modal =
    document.getElementById(
        "bundleModal"
    );

const deleteModal =
    document.getElementById(
        "deleteModal"
    );

const loading =
    document.getElementById(
        "loadingOverlay"
    );

const toast =
    document.getElementById(
        "toast"
    );

const searchInput =
    document.getElementById(
        "search"
    );

const filterPlan =
    document.getElementById(
        "filterPlan"
    );

const pageNumber =
    document.getElementById(
        "pageNumber"
    );

const prevPage =
    document.getElementById(
        "prevPage"
    );

const nextPage =
    document.getElementById(
        "nextPage"
    );

const emptyState =
    document.getElementById(
        "emptyState"
    );

/* ==========================================================
   FORM DOM
========================================================== */

const bundleNameInput =
    document.getElementById(
        "bundleName"
    );

const planInput =
    document.getElementById(
        "plan"
    );

const pageInput =
    document.getElementById(
        "page"
    );

const activeInput =
    document.getElementById(
        "active"
    );

const thumbnailInput =
    document.getElementById(
        "thumbnail"
    );

const basicTitleInput =
    document.getElementById(
        "basicTitle"
    );

const basicFileInput =
    document.getElementById(
        "basicFileId"
    );

const premiumTitleInput =
    document.getElementById(
        "premiumTitle"
    );

const premiumFileInput =
    document.getElementById(
        "premiumFileId"
    );

const basicMegaInput =
    document.getElementById(
        "basicMegaLink"
    );

const premiumMegaInput =
    document.getElementById(
        "premiumMegaLink"
    );

/* The existing input IDs are kept for HTML compatibility.
 * They now contain Google Drive FOLDER links, not file links. */
function updateDriveFolderFieldText() {
    const pairs = [
        [basicFileInput, "Basic Google Drive Folder Link", "https://drive.google.com/drive/folders/..."] ,
        [premiumFileInput, "Premium Google Drive Folder Link", "https://drive.google.com/drive/folders/..."]
    ];

    for (const [input, labelText, placeholder] of pairs) {
        if (!input) continue;
        input.placeholder = placeholder;
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) label.textContent = labelText;
    }
}


const basicBundleSection =
    document.getElementById(
        "basicBundleSection"
    );

const premiumBundleSection =
    document.getElementById(
        "premiumBundleSection"
    );

const slugPreview =
    document.getElementById(
        "slugPreview"
    );

const thumbPreview =
    document.getElementById(
        "thumbPreview"
    );

/* ==========================================================
   API HELPER
========================================================== */

async function api(
    url,
    options = {}
) {

    const response =
        await robustFetch(
            url,
            {
                ...options,

                headers: {
                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    let data = null;

    if (
        contentType.includes(
            "application/json"
        )
    ) {

        data =
            await response.json();

    } else {
        const text = await response.text();
        const isHtml = text.trim().startsWith("<");
        data = {
            success: false,
            message: isHtml 
                ? `Server error (${response.status}). Please check backend status.`
                : (text || `Server returned ${response.status}`)
        };
    }

    if (!response.ok) {

        let message =
            data.message ||
            "Server Error";

        if (
            Array.isArray(
                data.errors
            ) &&
            data.errors.length
        ) {

            message =
                data.errors.join(" ");
        }

        throw new Error(
            message
        );
    }

    return data;
}

/* ==========================================================
   LOADING
========================================================== */

function showLoading() {

    if (loading) {

        loading.classList.add(
            "show"
        );
    }
}

function hideLoading() {

    if (loading) {

        loading.classList.remove(
            "show"
        );
    }
}

/* ==========================================================
   TOAST
========================================================== */

function toastMessage(
    message,
    type = "success"
) {

    if (!toast) {

        console.log(
            `[${type}]`,
            message
        );

        return;
    }

    toast.className =
        `toast ${type} show`;

    toast.textContent =
        message;

    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );
}

/* ==========================================================
   UTILITIES
========================================================== */

function capitalize(
    text
) {

    const value =
        String(
            text || ""
        );

    return (
        value.charAt(0)
            .toUpperCase() +
        value.slice(1)
    );
}

function slugify(
    text
) {

    return String(
        text || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            "-"
        )
        .replace(
            /[^a-z0-9-]/g,
            ""
        );
}

/* ==========================================================
   LOAD BUNDLES
========================================================== */

async function loadBundles() {

    try {

        showLoading();

        const result =
            await api(API);

        if (
            Array.isArray(
                result.bundles
            )
        ) {

            bundles =
                result.bundles;

        } else if (
            Array.isArray(
                result.data
            )
        ) {

            bundles =
                result.data;

        } else {

            bundles = [];
        }

        applyFilters();

        updateStats();

    } catch (error) {

        console.error(
            "[Admin Bundles] Load error:",
            error
        );

        bundles = [];
        filteredBundles = [];

        updateStats();
        renderTable();

        toastMessage(
            error.message ||
            "Failed to load bundles.",
            "error"
        );

    } finally {

        hideLoading();
    }
}

/* ==========================================================
   STATS
========================================================== */

function updateStats() {

    const total =
        bundles.length;

    const active =
        bundles.filter(
            bundle =>
                Boolean(
                    bundle.active
                )
        ).length;

    const inactive =
        bundles.filter(
            bundle =>
                !Boolean(
                    bundle.active
                )
        ).length;

    const totalPages =
        new Set(
            bundles.map(
                bundle =>
                    bundle.page
            )
        ).size;

    const totalElement =
        document.getElementById(
            "totalBundles"
        );

    const activeElement =
        document.getElementById(
            "activeBundles"
        );

    const inactiveElement =
        document.getElementById(
            "inactiveBundles"
        );

    const pagesElement =
        document.getElementById(
            "totalPages"
        );

    const countElement =
        document.getElementById(
            "bundleCount"
        );

    if (totalElement) {

        totalElement.textContent =
            total;
    }

    if (activeElement) {

        activeElement.textContent =
            active;
    }

    if (inactiveElement) {

        inactiveElement.textContent =
            inactive;
    }

    if (pagesElement) {

        pagesElement.textContent =
            totalPages;
    }

    if (countElement) {

        countElement.textContent =
            `${total} Bundle${
                total === 1
                    ? ""
                    : "s"
            }`;
    }
}

/* ==========================================================
   SEARCH
========================================================== */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        applyFilters
    );
}

/* ==========================================================
   PLAN FILTER
========================================================== */

if (filterPlan) {

    filterPlan.addEventListener(
        "change",
        applyFilters
    );
}

/* ==========================================================
   APPLY FILTERS
========================================================== */

function applyFilters() {

    const keyword =
        String(
            searchInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();

    const selectedPlan =
        String(
            filterPlan?.value ||
            "all"
        )
            .trim()
            .toLowerCase();

    filteredBundles =
        bundles.filter(
            bundle => {

                const name =
                    String(
                        bundle.name ||
                        ""
                    ).toLowerCase();

                const slug =
                    String(
                        bundle.slug ||
                        ""
                    ).toLowerCase();

                const plan =
                    String(
                        bundle.plan ||
                        ""
                    ).toLowerCase();

                const keywordMatch =
                    !keyword ||
                    name.includes(
                        keyword
                    ) ||
                    slug.includes(
                        keyword
                    );

                const planMatch =
                    selectedPlan ===
                        "all" ||
                    plan ===
                        selectedPlan;

                return (
                    keywordMatch &&
                    planMatch
                );
            }
        );

    currentPage = 1;

    renderTable();
}

/* ==========================================================
   RENDER TABLE
========================================================== */

function renderTable() {

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML =
        "";

    const tableContainer =
        document.querySelector(
            ".table-container"
        );

    if (
        !filteredBundles.length
    ) {

        if (tableContainer) {

            tableContainer.style.display =
                "none";
        }

        if (emptyState) {

            emptyState.style.display =
                "flex";
        }

        if (pageNumber) {

            pageNumber.textContent =
                "Page 1 of 1";
        }

        return;
    }

    if (tableContainer) {

        tableContainer.style.display =
            "block";
    }

    if (emptyState) {

        emptyState.style.display =
            "none";
    }

    const start =
        (
            currentPage - 1
        ) *
        ITEMS_PER_PAGE;

    const end =
        start +
        ITEMS_PER_PAGE;

    filteredBundles
        .slice(
            start,
            end
        )
        .forEach(
            bundle => {

                tableBody.insertAdjacentHTML(
                    "beforeend",
                    createRow(
                        bundle
                    )
                );
            }
        );

    bindEvents();

    updatePagination();
}

/* ==========================================================
   CREATE TABLE ROW
========================================================== */

function createRow(
    bundle
) {

    const plan =
        String(
            bundle.plan ||
            ""
        )
            .trim()
            .toLowerCase();

    const selectedData =
        plan === "premium"
            ? bundle.premium
            : bundle.basic;

    const selectedTitle =
        selectedData?.title ||
        "-";

    const thumbnail =
        bundle.thumbnail ||
        "https://placehold.co/70x70?text=No+Image";

    return `
<tr>

<td>

<img
    class="bundle-thumb"
    src="${thumbnail}"
    alt="${bundle.name || "Bundle"}"
    onerror="
        this.src='https://placehold.co/70x70?text=No+Image'
    "
>

</td>

<td>

<div class="bundle-name">
    ${bundle.name || "-"}
</div>

<div class="bundle-subtitle">
    ${selectedTitle}
</div>

</td>

<td>

<span class="badge ${plan}">
    ${capitalize(plan)}
</span>

</td>

<td>
    ${bundle.page ?? "-"}
</td>

<td>

<span class="status ${
    bundle.active
        ? "active"
        : "inactive"
}">

${
    bundle.active
        ? "Active"
        : "Inactive"
}

</span>

</td>

<td>

<div class="actions">

<button
    type="button"
    class="action-btn edit-btn"
    data-id="${bundle.id}"
    title="Edit">

<svg viewBox="0 0 24 24">

<path d="M12 20h9"/>

<path
    d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"
/>

</svg>

</button>

<button
    type="button"
    class="action-btn toggle-btn"
    data-id="${bundle.id}"
    title="Toggle Status">

<svg viewBox="0 0 24 24">

<path d="M12 2v10"/>

<path
    d="M6.2 6.2a8 8 0 1 0 11.6 0"
/>

</svg>

</button>

<button
    type="button"
    class="action-btn delete-btn"
    data-id="${bundle.id}"
    title="Delete">

<svg viewBox="0 0 24 24">

<polyline
    points="3 6 5 6 21 6"
/>

<path
    d="M19 6l-1 14H6L5 6"
/>

<path d="M10 11v6"/>

<path d="M14 11v6"/>

<path d="M9 6V4h6v2"/>

</svg>

</button>

</div>

</td>

</tr>
`;
}

/* ==========================================================
   PAGINATION
========================================================== */

function updatePagination() {

    const pages =
        Math.max(
            1,
            Math.ceil(
                filteredBundles.length /
                ITEMS_PER_PAGE
            )
        );

    if (pageNumber) {

        pageNumber.textContent =
            `Page ${
                currentPage
            } of ${
                pages
            }`;
    }

    if (prevPage) {

        prevPage.disabled =
            currentPage === 1;
    }

    if (nextPage) {

        nextPage.disabled =
            currentPage === pages;
    }
}

if (prevPage) {

    prevPage.addEventListener(
        "click",
        () => {

            if (
                currentPage > 1
            ) {

                currentPage--;

                renderTable();
            }
        }
    );
}

if (nextPage) {

    nextPage.addEventListener(
        "click",
        () => {

            const pages =
                Math.max(
                    1,
                    Math.ceil(
                        filteredBundles.length /
                        ITEMS_PER_PAGE
                    )
                );

            if (
                currentPage <
                pages
            ) {

                currentPage++;

                renderTable();
            }
        }
    );
}

/* ==========================================================
   BASIC / PREMIUM VISIBILITY
========================================================== */

function updateBundlePlanSection() {

    const selectedPlan =
        String(
            planInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();

    if (
        !basicBundleSection ||
        !premiumBundleSection
    ) {

        console.error(
            "[Bundles] Plan sections missing."
        );

        return;
    }

    if (
        selectedPlan ===
        "basic"
    ) {

        basicBundleSection.style.display =
            "block";

        premiumBundleSection.style.display =
            "none";

    } else if (
        selectedPlan ===
        "premium"
    ) {

        basicBundleSection.style.display =
            "none";

        premiumBundleSection.style.display =
            "block";

    } else {

        basicBundleSection.style.display =
            "none";

        premiumBundleSection.style.display =
            "none";
    }
}

if (planInput) {

    planInput.addEventListener(
        "change",
        updateBundlePlanSection
    );
}

/* ==========================================================
   MODAL
========================================================== */

function openModal(
    bundle = null
) {

    if (form) {

        form.reset();
    }

    editId = null;

    if (thumbPreview) {

        thumbPreview.src =
            "";
    }

    if (slugPreview) {

        slugPreview.textContent =
            "";
    }

    const modalTitle =
        document.getElementById(
            "modalTitle"
        );

    if (modalTitle) {

        modalTitle.textContent =
            "Add Bundle";
    }

    /*
     * DEFAULT PLAN
     */
    if (planInput) {

        planInput.value =
            "basic";
    }

    if (activeInput) {

        activeInput.value =
            "true";
    }

    if (pageInput) {

        pageInput.value =
            "1";
    }

    /*
     * EDIT
     */
    if (bundle) {

        editId =
            bundle.id;

        if (modalTitle) {

            modalTitle.textContent =
                "Edit Bundle";
        }

        bundleNameInput.value =
            bundle.name ||
            "";

        planInput.value =
            String(
                bundle.plan ||
                "basic"
            )
                .toLowerCase();

        pageInput.value =
            String(
                bundle.page ||
                1
            );

        activeInput.value =
            String(
                bundle.active !== false
            );

        thumbnailInput.value =
            bundle.thumbnail ||
            "";

        basicTitleInput.value =
            bundle.basic?.title ||
            "";

        basicFileInput.value =
            bundle.basic?.folderLink ||
            bundle.basic?.fileId ||
            "";

        if (basicMegaInput) {
            basicMegaInput.value =
                bundle.basic?.megaLink ||
                "";
        }

        premiumTitleInput.value =
            bundle.premium?.title ||
            "";

        premiumFileInput.value =
            bundle.premium?.folderLink ||
            bundle.premium?.fileId ||
            "";

        if (premiumMegaInput) {
            premiumMegaInput.value =
                bundle.premium?.megaLink ||
                "";
        }

        if (thumbPreview) {

            thumbPreview.src =
                bundle.thumbnail ||
                "";
        }

        updateSlug();
    }

    if (modal) {

        modal.classList.add(
            "show"
        );
    }

    updateBundlePlanSection();
}

function closeModal() {

    if (modal) {

        modal.classList.remove(
            "show"
        );
    }

    editId = null;
}

/* ==========================================================
   MODAL BUTTONS
========================================================== */

const closeModalButton =
    document.getElementById(
        "closeModal"
    );

if (closeModalButton) {

    closeModalButton.onclick =
        closeModal;
}

const cancelButton =
    document.getElementById(
        "cancelBtn"
    );

if (cancelButton) {

    cancelButton.onclick =
        closeModal;
}

/* ==========================================================
   SLUG
========================================================== */

if (bundleNameInput) {

    bundleNameInput.addEventListener(
        "input",
        updateSlug
    );
}

function updateSlug() {

    if (!slugPreview) {
        return;
    }

    slugPreview.textContent =
        slugify(
            bundleNameInput?.value ||
            ""
        );
}

/* ==========================================================
   THUMBNAIL PREVIEW
========================================================== */

if (thumbnailInput) {

    thumbnailInput.addEventListener(
        "input",
        () => {

            if (thumbPreview) {

                thumbPreview.src =
                    thumbnailInput.value.trim();
            }
        }
    );
}

/* ==========================================================
   GOOGLE DRIVE VALIDATION - FRONTEND
========================================================== */

function isValidGoogleDriveLink(
    value
) {

    const link =
        String(
            value || ""
        ).trim();

    if (!link) {
        return false;
    }

    return (
        link.includes(
            "drive.google.com"
        ) ||
        link.includes(
            "docs.google.com"
        )
    );
}

/* ==========================================================
   BUILD PAYLOAD
========================================================== */

function buildPayload() {

    const selectedPlan =
        String(
            planInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();

    if (
        selectedPlan !==
            "basic" &&
        selectedPlan !==
            "premium"
    ) {

        throw new Error(
            "Please select Basic or Premium."
        );
    }

    const name =
        bundleNameInput?.value.trim() ||
        "";

    const thumbnail =
        thumbnailInput?.value.trim() ||
        "";

    const page =
        Number(
            pageInput?.value ||
            0
        );

    if (!name) {

        throw new Error(
            "Bundle name is required."
        );
    }

    if (!thumbnail) {

        throw new Error(
            "Thumbnail URL is required."
        );
    }

    if (
        !Number.isFinite(page) ||
        page < 1
    ) {

        throw new Error(
            "Valid page is required."
        );
    }

    /*
     * BASE PAYLOAD
     *
     * Only selected plan receives
     * actual title + Google Drive link.
     */
    const payload = {

        name,

        plan:
            selectedPlan,

        page,

        thumbnail,

        active:
            activeInput?.value ===
            "true",

        basic: {
            title: "",
            folderLink: ""
        },

        premium: {
            title: "",
            folderLink: ""
        }
    };

    /*
     * BASIC
     */
    if (selectedPlan === "basic") {
        const title = basicTitleInput?.value.trim() || "";
        const folderLink = basicFileInput?.value.trim() || "";
        const megaLink = basicMegaInput?.value.trim() || "";

        if (!title) {
            throw new Error("Basic bundle title is required.");
        }

        if (!folderLink && !megaLink) {
            throw new Error("At least one cloud storage link (Google Drive or MEGA.nz) is required for Basic plan.");
        }

        payload.basic = {
            title,
            folderLink,
            megaLink
        };
    }

    /*
     * PREMIUM
     */
    if (selectedPlan === "premium") {
        const title = premiumTitleInput?.value.trim() || "";
        const folderLink = premiumFileInput?.value.trim() || "";
        const megaLink = premiumMegaInput?.value.trim() || "";

        if (!title) {
            throw new Error("Premium bundle title is required.");
        }

        if (!folderLink && !megaLink) {
            throw new Error("At least one cloud storage link (Google Drive or MEGA.nz) is required for Premium plan.");
        }

        payload.premium = {
            title,
            folderLink,
            megaLink
        };
    }

    return payload;
}

/* ==========================================================
   SAVE
========================================================== */

if (form) {

    form.addEventListener(
        "submit",
        saveBundle
    );
}

async function saveBundle(
    event
) {

    event.preventDefault();

    let payload;

    try {

        payload =
            buildPayload();

    } catch (error) {

        toastMessage(
            error.message,
            "error"
        );

        return;
    }

    try {

        showLoading();

        /*
         * UPDATE
         */
        if (editId) {

            await api(
                `${API}/${editId}`,
                {
                    method:
                        "PUT",

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

            toastMessage(
                "Bundle updated successfully."
            );

        }

        /*
         * CREATE
         */
        else {

            await api(
                API,
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

            toastMessage(
                "Bundle created successfully."
            );
        }

        closeModal();

        await loadBundles();

    } catch (error) {

        console.error(
            "[Admin Bundles] Save error:",
            error
        );

        toastMessage(
            error.message ||
            "Failed to save bundle.",
            "error"
        );

    } finally {

        hideLoading();
    }
}

/* ==========================================================
   DELETE
========================================================== */

async function deleteBundle(
    id
) {

    if (!id) {
        return;
    }

    try {

        showLoading();

        await api(
            `${API}/${id}`,
            {
                method:
                    "DELETE"
            }
        );

        toastMessage(
            "Bundle deleted successfully."
        );

        await loadBundles();

    } catch (error) {

        console.error(
            "[Admin Bundles] Delete error:",
            error
        );

        toastMessage(
            error.message ||
            "Failed to delete bundle.",
            "error"
        );

    } finally {

        hideLoading();
    }
}

/* ==========================================================
   TOGGLE
========================================================== */

async function toggleBundle(
    id
) {

    if (!id) {
        return;
    }

    try {

        showLoading();

        await api(
            `${API}/${id}/toggle`,
            {
                method:
                    "PATCH"
            }
        );

        toastMessage(
            "Bundle status updated."
        );

        await loadBundles();

    } catch (error) {

        console.error(
            "[Admin Bundles] Toggle error:",
            error
        );

        toastMessage(
            error.message ||
            "Failed to update status.",
            "error"
        );

    } finally {

        hideLoading();
    }
}

/* ==========================================================
   TABLE EVENTS
========================================================== */

function bindEvents() {

    document
        .querySelectorAll(
            ".edit-btn"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        const id =
                            button.dataset.id;

                        const bundle =
                            bundles.find(
                                item =>
                                    String(
                                        item.id
                                    ) ===
                                    String(
                                        id
                                    )
                            );

                        if (bundle) {

                            openModal(
                                bundle
                            );
                        }
                    };
            }
        );

    document
        .querySelectorAll(
            ".delete-btn"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        deleteId =
                            button.dataset.id;

                        if (
                            deleteModal
                        ) {

                            deleteModal.classList.add(
                                "show"
                            );
                        }
                    };
            }
        );

    document
        .querySelectorAll(
            ".toggle-btn"
        )
        .forEach(
            button => {

                button.onclick =
                    () => {

                        toggleBundle(
                            button.dataset.id
                        );
                    };
            }
        );
}

/* ==========================================================
   DELETE MODAL
========================================================== */

const confirmDelete =
    document.getElementById(
        "confirmDelete"
    );

if (confirmDelete) {

    confirmDelete.onclick =
        async () => {

            if (!deleteId) {
                return;
            }

            const id =
                deleteId;

            deleteId = null;

            if (deleteModal) {

                deleteModal.classList.remove(
                    "show"
                );
            }

            await deleteBundle(
                id
            );
        };
}

const cancelDelete =
    document.getElementById(
        "cancelDelete"
    );

if (cancelDelete) {

    cancelDelete.onclick =
        () => {

            deleteId = null;

            if (deleteModal) {

                deleteModal.classList.remove(
                    "show"
                );
            }
        };
}

/* ==========================================================
   ADD BUNDLE
========================================================== */

const addBundleButton =
    document.getElementById(
        "addBundleBtn"
    );

if (addBundleButton) {

    addBundleButton.onclick =
        event => {

            event.preventDefault();

            openModal();
        };
}

const emptyAddBundle =
    document.getElementById(
        "emptyAddBundle"
    );

if (emptyAddBundle) {

    emptyAddBundle.onclick =
        event => {

            event.preventDefault();

            openModal();
        };
}


/* ==========================================================
   TABLE EVENTS
========================================================== */

function bindEvents() {
    document.querySelectorAll(".edit-btn").forEach(button => {
        button.onclick = () => {
            const id = button.dataset.id;
            const bundle = bundles.find(item => String(item.id) === String(id));
            if (bundle) openModal(bundle);
        };
    });

    document.querySelectorAll(".delete-btn").forEach(button => {
        button.onclick = () => {
            deleteId = button.dataset.id;
            if (deleteModal) deleteModal.classList.add("show");
        };
    });

    document.querySelectorAll(".toggle-btn").forEach(button => {
        button.onclick = () => {
            toggleBundle(button.dataset.id);
        };
    });
}




/* ==========================================================
   BULK ADD & DELETE ALL BUNDLES LOGIC
========================================================== */

const bulkAddBtn = document.getElementById("bulkAddBtn");
const bulkBundleModal = document.getElementById("bulkBundleModal");
const closeBulkModal = document.getElementById("closeBulkModal");
const cancelBulkBtn = document.getElementById("cancelBulkBtn");
const submitBulkBtn = document.getElementById("submitBulkBtn");
const bulkTabPaste = document.getElementById("bulkTabPaste");
const bulkTabRows = document.getElementById("bulkTabRows");
const bulkPasteSection = document.getElementById("bulkPasteSection");
const bulkRowsSection = document.getElementById("bulkRowsSection");
const bulkPasteInput = document.getElementById("bulkPasteInput");
const bulkRowsContainer = document.getElementById("bulkRowsContainer");
const addBulkRowBtn = document.getElementById("addBulkRowBtn");

const deleteAllBundlesBtn = document.getElementById("deleteAllBundlesBtn");
const deleteAllModal = document.getElementById("deleteAllModal");
const cancelDeleteAllBtn = document.getElementById("cancelDeleteAllBtn");
const confirmDeleteAllBtn = document.getElementById("confirmDeleteAllBtn");
const deleteAllConfirmInput = document.getElementById("deleteAllConfirmInput");

let bulkMode = "paste"; // "paste" | "rows"

function openBulkModal() {
    if (bulkBundleModal) {
        bulkBundleModal.classList.add("show");
        setBulkMode("paste");
    }
}

function closeBulkModalFunc() {
    if (bulkBundleModal) {
        bulkBundleModal.classList.remove("show");
    }
}

function setBulkMode(mode) {
    bulkMode = mode;
    if (mode === "paste") {
        if (bulkPasteSection) bulkPasteSection.style.display = "block";
        if (bulkRowsSection) bulkRowsSection.style.display = "none";
        if (bulkTabPaste) { bulkTabPaste.className = "btn btn-primary"; }
        if (bulkTabRows) { bulkTabRows.className = "btn btn-secondary"; }
    } else {
        if (bulkPasteSection) bulkPasteSection.style.display = "none";
        if (bulkRowsSection) bulkRowsSection.style.display = "block";
        if (bulkTabPaste) { bulkTabPaste.className = "btn btn-secondary"; }
        if (bulkTabRows) { bulkTabRows.className = "btn btn-primary"; }
        if (bulkRowsContainer && bulkRowsContainer.children.length === 0) {
            addBulkRow();
            addBulkRow();
        }
    }
}

function addBulkRow() {
    if (!bulkRowsContainer) return;
    const row = document.createElement("div");
    row.className = "bulk-row";
    row.style.cssText = "display:grid; grid-template-columns: 2fr 1fr 1fr 2fr 2fr 2fr auto; gap:8px; align-items:center; margin-bottom:8px;";
    row.innerHTML = `
        <input type="text" class="bulk-name" placeholder="Bundle Name" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:8px; color:#fff; font-size:12px;">
        <select class="bulk-plan" style="background:#0b0f19; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:8px; color:#fff; font-size:12px;">
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
        </select>
        <select class="bulk-page" style="background:#0b0f19; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:8px; color:#fff; font-size:12px;">
            <option value="1">Page 1</option>
            <option value="2">Page 2</option>
            <option value="3">Page 3</option>
            <option value="4">Page 4</option>
            <option value="5">Page 5</option>
            <option value="6">Page 6</option>
        </select>
        <input type="text" class="bulk-link" placeholder="Drive Link (Optional)" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:8px; color:#fff; font-size:12px;">
        <input type="text" class="bulk-mega" placeholder="MEGA Link (Optional)" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:8px; color:#fff; font-size:12px;">
        <input type="text" class="bulk-thumb" placeholder="Thumbnail URL (Optional)" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:8px; color:#fff; font-size:12px;">
        <button type="button" class="btn btn-secondary remove-row-btn" style="padding:6px 10px; color:#f87171;">✕</button>
    `;
    row.querySelector(".remove-row-btn").onclick = () => row.remove();
    bulkRowsContainer.appendChild(row);
}

function parsePasteInput(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const items = [];
    lines.forEach(line => {
        let parts = line.split(",");
        if (parts.length < 2) parts = line.split("|");
        if (parts.length < 2) parts = line.split("\t");

        if (parts.length >= 2) {
            const name = parts[0].trim();
            let plan = "basic";
            let page = 1;
            let driveLink = "";
            let megaLink = "";
            let thumbnail = "";

            if (parts.length >= 6) {
                plan = parts[1].trim().toLowerCase() === "premium" ? "premium" : "basic";
                page = Number(parts[2]) || 1;
                driveLink = parts[3].trim();
                megaLink = parts[4].trim();
                thumbnail = parts[5].trim();
            } else if (parts.length === 5) {
                plan = parts[1].trim().toLowerCase() === "premium" ? "premium" : "basic";
                page = Number(parts[2]) || 1;
                const link1 = parts[3].trim();
                const link2 = parts[4].trim();
                if (link1.includes("mega.nz") || link1.includes("mega.io")) {
                    megaLink = link1;
                    thumbnail = link2;
                } else if (link2.includes("mega.nz") || link2.includes("mega.io")) {
                    driveLink = link1;
                    megaLink = link2;
                } else {
                    driveLink = link1;
                    thumbnail = link2;
                }
            } else if (parts.length === 4) {
                plan = parts[1].trim().toLowerCase() === "premium" ? "premium" : "basic";
                page = Number(parts[2]) || 1;
                const link = parts[3].trim();
                if (link.includes("mega.nz") || link.includes("mega.io")) {
                    megaLink = link;
                } else {
                    driveLink = link;
                }
            } else if (parts.length === 3) {
                if (parts[1].trim().toLowerCase() === "premium" || parts[1].trim().toLowerCase() === "basic") {
                    plan = parts[1].trim().toLowerCase();
                    const link = parts[2].trim();
                    if (link.includes("mega.nz") || link.includes("mega.io")) megaLink = link;
                    else driveLink = link;
                } else {
                    const link = parts[1].trim();
                    if (link.includes("mega.nz") || link.includes("mega.io")) megaLink = link;
                    else driveLink = link;
                    thumbnail = parts[2].trim();
                }
            } else {
                const link = parts[1].trim();
                if (link.includes("mega.nz") || link.includes("mega.io")) megaLink = link;
                else driveLink = link;
            }

            if (name && (driveLink || megaLink)) {
                items.push({ name, plan, page, driveLink, megaLink, thumbnail });
            }
        }
    });
    return items;
}

async function handleBulkSubmit() {
    let items = [];
    if (bulkMode === "paste") {
        const text = bulkPasteInput?.value || "";
        items = parsePasteInput(text);
    } else {
        const rows = Array.from(bulkRowsContainer?.children || []);
        rows.forEach(row => {
            const name = row.querySelector(".bulk-name")?.value?.trim();
            const plan = row.querySelector(".bulk-plan")?.value;
            const page = Number(row.querySelector(".bulk-page")?.value) || 1;
            const driveLink = row.querySelector(".bulk-link")?.value?.trim() || "";
            const megaLink = row.querySelector(".bulk-mega")?.value?.trim() || "";
            const thumbnail = row.querySelector(".bulk-thumb")?.value?.trim() || "";

            if (name && (driveLink || megaLink)) {
                items.push({ name, plan, page, driveLink, megaLink, thumbnail });
            }
        });
    }

    if (items.length === 0) {
        toastMessage("Please enter at least 1 valid bundle with Name and at least one storage link (Google Drive or MEGA.nz).", "error");
        return;
    }

    showLoading();
    try {
        const res = await robustFetch(`${API_BASE}/api/admin/bundles/bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ items })
        });

        const data = await res.json();
        hideLoading();

        if (res.ok && data.success) {
            toastMessage(data.message || `Successfully created ${items.length} bundles!`, "success");
            closeBulkModalFunc();
            if (bulkPasteInput) bulkPasteInput.value = "";
            if (bulkRowsContainer) bulkRowsContainer.innerHTML = "";
            loadBundles();
        } else {
            toastMessage(data.message || "Failed to create bundles.", "error");
        }
    } catch (err) {
        hideLoading();
        toastMessage(err.message || "Failed to import bundles.", "error");
    }
}

async function handleDeleteAllSubmit() {
    if (!confirm("Are you sure you want to delete ALL bundles from your database? This action cannot be undone.")) {
        return;
    }

    showLoading();
    try {
        const res = await robustFetch(`${API_BASE}/api/admin/bundles/all`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();
        hideLoading();

        if (res.ok && data.success) {
            toastMessage(data.message || "All bundles deleted successfully.", "success");
            loadBundles();
        } else {
            toastMessage(data.message || "Failed to delete bundles.", "error");
        }
    } catch (err) {
        hideLoading();
        toastMessage(err.message || "Failed to delete all bundles.", "error");
    }
}

if (bulkAddBtn) bulkAddBtn.onclick = openBulkModal;
if (closeBulkModal) closeBulkModal.onclick = closeBulkModalFunc;
if (cancelBulkBtn) cancelBulkBtn.onclick = closeBulkModalFunc;
if (bulkTabPaste) bulkTabPaste.onclick = () => setBulkMode("paste");
if (bulkTabRows) bulkTabRows.onclick = () => setBulkMode("rows");
if (addBulkRowBtn) addBulkRowBtn.onclick = addBulkRow;
if (submitBulkBtn) submitBulkBtn.onclick = handleBulkSubmit;

if (deleteAllBundlesBtn) deleteAllBundlesBtn.onclick = handleDeleteAllSubmit;


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
