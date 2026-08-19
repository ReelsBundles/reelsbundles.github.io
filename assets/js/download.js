import {
    auth
} from "./firebase-client.js";
import {
    protectUserPage,
    syncUserToBackend,
    startUserStatusSync
} from "./auth-common.js";
/* ==========================================================
   REELSBUNDLES
   USER DOWNLOAD LIBRARY
   PHASE A2

   LOCKED ARCHITECTURE

   - Same Dashboard UI
   - Firebase user authentication
   - Backend is final authority
   - Lifetime access
   - Basic / Premium separation
   - Admin bundle status respected
   - Admin lock respected
   - No 10-minute expiry
   - No hardcoded bundle data
   - No client-side payment verification
   - No raw Google Drive URL in page
========================================================== */


/* ==========================================================
   API CONFIG
========================================================== */

const API_BASE =
    window.REELS_BUNDLES_API_BASE ||
    (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"

            ? "http://localhost:3000"

            : "https://reelsbundles-backend.onrender.com"
    );


/* ==========================================================
   STATE
========================================================== */

let currentUser =
    null;

let firebaseIdToken =
    null;

let currentPlan =
    "basic";

let allBundles =
    [];

let basicBundles =
    [];

let premiumBundles =
    [];

let downloadInProgress =
    false;


/* ==========================================================
   DOM
========================================================== */

const sidebarOverlay =
    document.getElementById(
        "sidebarOverlay"
    );

const userSidebar =
    document.getElementById(
        "userSidebar"
    );

const mobileMenuButton =
    document.getElementById(
        "mobileMenuButton"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


/* USER */

const userAvatar =
    document.getElementById(
        "userAvatar"
    );

const headerUserName =
    document.getElementById(
        "headerUserName"
    );

const headerUserEmail =
    document.getElementById(
        "headerUserEmail"
    );

const welcomeUserName =
    document.getElementById(
        "welcomeUserName"
    );


/* ACCESS */

const accessTitle =
    document.getElementById(
        "accessTitle"
    );

const accessDescription =
    document.getElementById(
        "accessDescription"
    );

const accessBadge =
    document.getElementById(
        "accessBadge"
    );

const accountStatus =
    document.getElementById(
        "accountStatus"
    );


/* CATEGORY */

const selectedCategoryTitle =
    document.getElementById(
        "selectedCategoryTitle"
    );

const basicTab =
    document.getElementById(
        "basicTab"
    );

const premiumTab =
    document.getElementById(
        "premiumTab"
    );

const basicCategoryButton =
    document.getElementById(
        "basicCategoryButton"
    );

const premiumCategoryButton =
    document.getElementById(
        "premiumCategoryButton"
    );


/* SECTIONS */

const basicBundleSection =
    document.getElementById(
        "basicBundleSection"
    );

const premiumBundleSection =
    document.getElementById(
        "premiumBundleSection"
    );


const basicBundleGrid =
    document.getElementById(
        "basicBundleGrid"
    );

const premiumBundleGrid =
    document.getElementById(
        "premiumBundleGrid"
    );


/* STATES */

const libraryLoading =
    document.getElementById(
        "libraryLoading"
    );

const libraryError =
    document.getElementById(
        "libraryError"
    );

const libraryErrorMessage =
    document.getElementById(
        "libraryErrorMessage"
    );

const libraryEmpty =
    document.getElementById(
        "libraryEmpty"
    );


/* MODAL */

const lockedModal =
    document.getElementById(
        "lockedModal"
    );

const lockedModalMessage =
    document.getElementById(
        "lockedModalMessage"
    );

const lockedModalClose =
    document.getElementById(
        "lockedModalClose"
    );


/* ==========================================================
   FIREBASE
========================================================== */

/*
 * IMPORTANT
 *
 * Use the same Firebase configuration/module
 * that the existing user dashboard/login uses.
 *
 * If your project already exposes:
 *
 * window.reelsBundlesFirebaseAuth
 *
 * this file will use it.
 *
 * Otherwise Phase A3 will connect this file
 * directly to your existing Firebase module.
 */

let firebaseAuth =
    null;


/* ==========================================================
   GET BUNDLE ID FROM URL
========================================================== */

function getBundleIdFromUrl() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        params.get("bundleId") ||
        params.get("bundle") ||
        ""
    ).trim();

}


/* ==========================================================
   INIT
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeDownloadPage
);


/* ==========================================================
   INITIALIZE
========================================================== */

async function initializeDownloadPage() {

    try {

        protectUserPage();

        setupUI();

        const params = new URLSearchParams(window.location.search);
        if (params.get("suspended") === "true") {
            const reason = params.get("reason") || "Account suspended due to Developer Tools inspection detection.";
            showLibraryError(`🚫 ACCOUNT SUSPENDED: ${reason} Contact Administrator to unlock access.`);
            hideLoading();
            return;
        }

        const bundleId =
            getBundleIdFromUrl();

        console.log(
            "[Downloads] Requested bundle:",
            bundleId || "none"
        );

        await initializeFirebaseAuth();

        await waitForAuthenticatedUser();

        await loadCurrentUser();

        if (currentUser) {
            const syncRes = await syncUserToBackend(currentUser);
            if (syncRes && syncRes.disabled) return;
            startUserStatusSync(currentUser);
        }

        await loadBundleLibrary();

        selectRequestedBundle();

        const requestedBundleId =
            getBundleIdFromUrl();

        const params =
            new URLSearchParams(
                window.location.search
            );

        const requestedCategory =
            params.get("category") || params.get("plan");

        if (
            requestedCategory === "premium" ||
            requestedCategory === "basic"
        ) {
            setCurrentPlan(requestedCategory);
        }

        const isFilesView =
            params.get("view") === "files";

        if (
            requestedBundleId &&
            isFilesView
        ) {

            await openBundleFilesView(
                requestedBundleId
            );

        }

        hideLoading();

        console.log(
            "[Downloads] Initialization complete."
        );

    }

    catch (error) {

        console.error(
            "[Downloads] Initialization failed:",
            error
        );

        showLibraryError(
            error?.message ||
            "Unable to load your bundle library."
        );

    }

}


/* ==========================================================
   OPEN BUNDLE FILES VIEW
   ----------------------------------------------------------
   Loads the main Google Drive folder through the backend.

   IMPORTANT:
   - No Google Drive URL
   - No direct Drive redirect
   - No client-side Drive access
   - Backend checks ownership
========================================================== */

async function openBundleFilesView(
    bundleId
) {

    if (
        !bundleId
    ) {

        throw new Error(
            "Bundle ID is missing."
        );

    }


    console.log(
        "[Downloads] Loading bundle contents:",
        bundleId
    );


    const response =
        await apiFetch(
            `/api/user/bundles/${encodeURIComponent(
                bundleId
            )}/files`
        );


    if (
        response.status === 401
    ) {

        window.location.href =
            `login.html?redirect=${encodeURIComponent(
                window.location.href
            )}`;

        return;

    }


    if (
        !response.ok
    ) {

        await throwApiError(
            response,
            "Unable to load bundle contents."
        );

    }


    const data =
        await response.json();


    if (
        data?.success !== true
    ) {

        throw new Error(
            data?.message ||
            "Unable to load bundle contents."
        );

    }


    const items =
        Array.isArray(
            data?.items
        )
            ? data.items
            : [];


    renderBundleFilesView(
        data?.bundle,
        items
    );

}


/* ==========================================================
   UI SETUP
========================================================== */

function setupUI() {

    setupMobileMenu();

    setupLogout();

    setupCategoryNavigation();

    ensureDownloadStyles();

    setupModal();

}


/* ==========================================================
   MOBILE MENU
========================================================== */

function setupMobileMenu() {

    if (
        !mobileMenuButton ||
        !userSidebar
    ) {

        return;

    }


    mobileMenuButton.addEventListener(
        "click",
        () => {

            userSidebar.classList.toggle(
                "open"
            );

            sidebarOverlay?.classList.toggle(
                "active"
            );

        }
    );


    sidebarOverlay?.addEventListener(
        "click",
        () => {

            userSidebar.classList.remove(
                "open"
            );

            sidebarOverlay.classList.remove(
                "active"
            );

        }
    );

}


/* ==========================================================
   LOGOUT
========================================================== */

function setupLogout() {
    if (!logoutButton) return;

    logoutButton.addEventListener("click", async () => {
        try {
            if (firebaseAuth) {
                await firebaseAuth.signOut();
            } else if (auth) {
                await auth.signOut();
            }
        } catch (error) {
            console.error("[Downloads] Logout error:", error);
        } finally {
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch(e) {}
            window.location.href = "index.html";
        }
    });
}


/* ==========================================================
   CATEGORY NAVIGATION
========================================================== */

function setupCategoryNavigation() {

    basicTab?.addEventListener(
        "click",
        () => {

            setCurrentPlan(
                "basic"
            );

        }
    );


    premiumTab?.addEventListener(
        "click",
        () => {

            setCurrentPlan(
                "premium"
            );

        }
    );


    basicCategoryButton?.addEventListener(
        "click",
        () => {

            setCurrentPlan(
                "basic"
            );

        }
    );


    premiumCategoryButton?.addEventListener(
        "click",
        () => {

            setCurrentPlan(
                "premium"
            );

        }
    );

}


/* ==========================================================
   SET CURRENT PLAN
========================================================== */

function setCurrentPlan(
    plan
) {

    const normalized =
        normalizePlan(
            plan
        );


    if (
        normalized !== "basic" &&
        normalized !== "premium"
    ) {

        return;

    }


    currentPlan =
        normalized;


    updateCategoryUI();

}


/* ==========================================================
   CATEGORY UI
========================================================== */

function updateCategoryUI() {

    const isBasic =
        currentPlan ===
        "basic";


    basicTab?.classList.toggle(
        "active",
        isBasic
    );

    premiumTab?.classList.toggle(
        "active",
        !isBasic
    );


    basicCategoryButton?.classList.toggle(
        "active",
        isBasic
    );

    premiumCategoryButton?.classList.toggle(
        "active",
        !isBasic
    );


    if (
        selectedCategoryTitle
    ) {

        selectedCategoryTitle.textContent =
            isBasic
                ? "Basic Bundles"
                : "Premium Bundles";

    }


    if (
        basicBundleSection
    ) {

        basicBundleSection.style.display =
            isBasic
                ? "block"
                : "none";

        if (isBasic) {
            basicBundleSection.removeAttribute("hidden");
        } else {
            basicBundleSection.setAttribute("hidden", "true");
        }

    }


    if (
        premiumBundleSection
    ) {

        premiumBundleSection.style.display =
            isBasic
                ? "none"
                : "block";

        if (!isBasic) {
            premiumBundleSection.removeAttribute("hidden");
        } else {
            premiumBundleSection.setAttribute("hidden", "true");
        }

    }


    hideLoading();

}


/* ==========================================================
   FIREBASE INITIALIZATION
========================================================== */

async function initializeFirebaseAuth() {

    try {

        if (
            window.reelsBundlesFirebaseAuth
        ) {

            firebaseAuth =
                window.reelsBundlesFirebaseAuth;

            console.log(
                "[Downloads] Using global Firebase auth."
            );

            return;

        }


        if (
            auth
        ) {

            firebaseAuth =
                auth;

            console.log(
                "[Downloads] Using firebase-client auth."
            );

            return;

        }


        throw new Error(
            "Firebase authentication is unavailable."
        );

    }

    catch (
        error
    ) {

        console.error(
            "[Downloads] Firebase initialization failed:",
            error
        );

        throw error;

    }

}


/* ==========================================================
   WAIT FOR AUTHENTICATED USER
========================================================== */

function waitForAuthenticatedUser() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            if (
                !firebaseAuth
            ) {

                reject(
                    new Error(
                        "Firebase authentication is not initialized."
                    )
                );

                return;

            }


            let resolved =
                false;


            const unsubscribe =
                firebaseAuth.onAuthStateChanged(
                    async user => {

                        if (
                            resolved
                        ) {

                            return;

                        }


                        if (
                            user
                        ) {

                            resolved =
                                true;

                            unsubscribe?.();

                            currentUser =
                                user;

                            try {

                                firebaseIdToken =
                                    await user.getIdToken();

                            }

                            catch (
                                error
                            ) {

                                console.warn(
                                    "[Downloads] Unable to get Firebase ID token:",
                                    error
                                );

                            }


                            resolve(
                                user
                            );

                            return;

                        }


                        resolved =
                            true;

                        unsubscribe?.();

                        reject(
                            new Error(
                                "Authentication required."
                            )
                        );

                    }
                );

        }
    );

}
/* ==========================================================
   CURRENT USER
========================================================== */

async function loadCurrentUser() {

    if (
        !firebaseAuth
    ) {

        throw new Error(
            "Firebase authentication is not initialized."
        );

    }


    const user =
        firebaseAuth.currentUser;


    if (
        !user
    ) {

        throw new Error(
            "Authentication required."
        );

    }


    currentUser =
        user;


    try {

        firebaseIdToken =
            await user.getIdToken();

    }

    catch (
        error
    ) {

        console.warn(
            "[Downloads] Unable to refresh Firebase token:",
            error
        );

    }


    updateUserUI(
        user
    );


    console.log(
        "[Downloads] Current user:",
        user.email ||
        user.uid
    );

}


/* ==========================================================
   UPDATE USER UI
========================================================== */

function updateUserUI(
    user
) {

    if (
        !user
    ) {

        return;

    }


    const displayName =
        user.displayName ||
        (
            user.email
                ? user.email.split("@")[0]
                : "User"
        );


    const email =
        user.email ||
        "";


    if (
        headerUserName
    ) {

        headerUserName.textContent =
            displayName;

    }


    if (
        headerUserEmail
    ) {

        headerUserEmail.textContent =
            email;

    }


    if (
        welcomeUserName
    ) {

        welcomeUserName.textContent =
            displayName;

    }


    if (
        userAvatar
    ) {

        const photoURL =
            user.photoURL;


        if (
            photoURL
        ) {

            userAvatar.src =
                photoURL;

        }

        else {

            userAvatar.textContent =
                displayName
                    .charAt(0)
                    .toUpperCase();

        }

    }

}


/* ==========================================================
   LOAD BUNDLE LIBRARY
   ----------------------------------------------------------
   Backend is the authority.

   This page does NOT receive:
   - Google Drive URL
   - Google Drive folder URL
   - Google Drive credentials

   It only receives the user's authorized
   bundle library.
========================================================== */

async function loadBundleLibrary() {

    showLoading();


    try {

        const response =
            await apiFetch(
                "/api/user/bundles"
            );


        /* --------------------------------------------------
           AUTH ERROR
        -------------------------------------------------- */

        if (
            response.status === 401
        ) {

            window.location.href =
                `login.html?redirect=${encodeURIComponent(
                    window.location.href
                )}`;

            return;

        }


        /* --------------------------------------------------
           API ERROR
        -------------------------------------------------- */

        if (
            !response.ok
        ) {

            await throwApiError(
                response,
                "Unable to load your bundles."
            );

        }


        const data =
            await response.json();


        if (
            data?.success === false
        ) {

            throw new Error(
                data?.message ||
                "Unable to load your bundles."
            );

        }


        /* --------------------------------------------------
           AUTHORIZED BUNDLES
        -------------------------------------------------- */

        allBundles =
            Array.isArray(
                data?.bundles
            )
                ? data.bundles
                : [];


        /* --------------------------------------------------
           BASIC
        -------------------------------------------------- */

        basicBundles =
            allBundles.filter(
                bundle =>
                    normalizePlan(
                        bundle?.plan
                    ) === "basic"
            );


        /* --------------------------------------------------
           PREMIUM
        -------------------------------------------------- */

        premiumBundles =
            allBundles.filter(
                bundle =>
                    normalizePlan(
                        bundle?.plan
                    ) === "premium"
            );


        /* --------------------------------------------------
           RENDER
        -------------------------------------------------- */

        renderBundles();


        updateAccessUI(
            data
        );


        hideLoading();


        console.log(
            "[Downloads] Authorized bundles:",
            allBundles.length
        );

    }

    catch (
        error
    ) {

        console.error(
            "[Downloads] Bundle library error:",
            error
        );

        throw error;

    }

}


/* ==========================================================
   RENDER BUNDLES
========================================================== */

function renderBundles() {

    renderBundleCollection(
        basicBundleGrid,
        basicBundles,
        "basic"
    );


    renderBundleCollection(
        premiumBundleGrid,
        premiumBundles,
        "premium"
    );


    updateCategoryUI();

}


/* ==========================================================
   RENDER BUNDLE COLLECTION
========================================================== */

function renderBundleCollection(
    container,
    bundles,
    plan
) {

    if (
        !container
    ) {

        return;

    }


    container.innerHTML =
        "";


    if (
        !Array.isArray(
            bundles
        ) ||
        bundles.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "bundle-empty-state";


        empty.innerHTML = `

            <div class="bundle-empty-icon">
                📦
            </div>

            <h3>
                No ${plan === "basic"
                    ? "Basic"
                    : "Premium"} bundles
                available
            </h3>

            <p>
                Your available bundles will appear here.
            </p>

        `;


        container.appendChild(
            empty
        );


        return;

    }


    bundles.forEach(
        bundle => {

            const card =
                createBundleCard(
                    bundle
                );


            if (
                card
            ) {

                container.appendChild(
                    card
                );

            }

        }
    );

}


/* ==========================================================
   CREATE BUNDLE CARD
========================================================== */

function createBundleCard(
    bundle
) {

    if (
        !bundle
    ) {

        return null;

    }


    const card =
        document.createElement(
            "article"
        );


    card.className =
        "bundle-card";


    const bundleId =
        String(
            bundle.id ||
            bundle.bundleId ||
            ""
        );


    const plan =
        normalizePlan(
            bundle.plan
        );


    const title =
        safeText(
            bundle.name ||
            bundle.title ||
            "Reels Bundle"
        );


    const description =
        safeText(
            bundle.description ||
            "Ready-to-post Instagram reels bundle."
        );

    function formatDownloadThumbnail(value) {
        if (!value) return "";
        let str = String(value).trim();
        if (!str) return "";

        const driveMatch = str.match(/(?:file\/d\/|id=|folders\/|d\/)([a-zA-Z0-9_-]{20,})/i);
        if (driveMatch && driveMatch[1]) {
            return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
        }

        if (/^[a-zA-Z0-9_-]{25,}$/.test(str)) {
            return `https://drive.google.com/thumbnail?id=${str}&sz=w800`;
        }

        if (str.includes("dropbox.com")) {
            return str.replace("dl=0", "raw=1");
        }

        return str;
    }

    const thumbnail =
        formatDownloadThumbnail(
            bundle.thumbnail ||
            bundle.image ||
            bundle.coverImage ||
            ""
        );


    const isActive =
        bundle.active === true;

    const isUnlocked =
        bundle.unlocked === true;


    card.dataset.bundleId =
        bundleId;


    card.dataset.plan =
        plan;


    card.dataset.bundleAction =
        "download";


    card.innerHTML = `

        <div class="bundle-card-media">

            ${
                thumbnail

                    ? `

                        <img
                            src="${escapeAttribute(
                                thumbnail
                            )}"
                            alt="${escapeAttribute(
                                title
                            )}"
                            loading="lazy"
                            onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'bundle-placeholder\\'>📦</div>';"
                        >

                    `

                    : `

                        <div class="bundle-placeholder">
                            📦
                        </div>

                    `
            }

            <div class="bundle-plan-badge">
                ${
                    plan === "premium"
                        ? "PREMIUM"
                        : "BASIC"
                }
            </div>

        </div>


        <div class="bundle-card-content">

            <h3 class="bundle-card-title">
                ${title}
            </h3>


            <p class="bundle-card-description">
                ${description}
            </p>

            <div class="bundle-card-footer" style="display:flex; flex-direction:column; gap:10px; margin-top:12px;">

                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="bundle-access-status">
                        ${
                            isUnlocked
                                ? "🔓 Unlocked"
                                : "🔒 Locked"
                        }
                    </span>
                    <span style="font-size:11px; color:#94a3b8;">Lifetime Access</span>
                </div>

                ${
                    isUnlocked
                        ? `
                            <div style="display:flex; gap:8px; width:100%;">
                                <button
                                    type="button"
                                    class="bundle-download-button"
                                    data-bundle-action="download"
                                    data-bundle-id="${escapeAttribute(bundleId)}"
                                    style="width:100%;"
                                >
                                    ⬇️ Download
                                </button>
                            </div>
                        `
                        : `
                            <button
                                type="button"
                                class="bundle-download-button"
                                disabled
                                style="width:100%;"
                            >
                                🔒 Locked
                            </button>
                        `
                }

            </div>

        </div>

    `;


    const downloadButton =
        card.querySelector(
            "[data-bundle-action='download']"
        );


    downloadButton?.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            event.stopPropagation();


            if (
                !isUnlocked
            ) {

                showLockedModal(
                    bundle
                );

                return;

            }


            await startBundleDownload(
                bundle,
                downloadButton,
                card
            );

        }
    );


    return card;

}


/* ==========================================================
   SELECT REQUESTED BUNDLE
========================================================== */

function selectRequestedBundle() {

    const requestedBundleId =
        getBundleIdFromUrl();


    if (
        !requestedBundleId
    ) {

        return;

    }


    const bundles = [
        ...basicBundles,
        ...premiumBundles
    ];


    const selectedBundle =
        bundles.find(
            bundle =>
                String(
                    bundle?.id ||
                    bundle?.bundleId ||
                    ""
                ) ===
                String(
                    requestedBundleId
                )
        );


    if (
        !selectedBundle
    ) {

        console.warn(
            "[Downloads] Requested bundle was not found:",
            requestedBundleId
        );

        return;

    }


    const selectedPlan =
        normalizePlan(
            selectedBundle?.plan
        );


    if (
        selectedPlan
    ) {

        setActiveCategory(
            selectedPlan
        );

    }

}


/* ==========================================================
   RENDER BUNDLE FILES
========================================================== */

function renderBundleFilesView(
    bundle,
    items,
    folderName = null
) {

    const existingBrowser =
        document.getElementById("reelsBundlesFolderBrowser");

    if (existingBrowser) {
        existingBrowser.remove();
    }

    const browser = document.createElement("section");
    browser.id = "reelsBundlesFolderBrowser";
    browser.className = "reelsbundles-folder-browser";

    const title = safeText(bundle?.name || "Bundle Contents");
    const currentFolderTitle = safeText(folderName || "Bundle Root");

    browser.innerHTML = `
        <div class="folder-browser-header">
            <div>
                <div class="folder-browser-kicker">REELSBUNDLES</div>
                <h2 class="folder-browser-title">${title}</h2>
                <p class="folder-browser-subtitle">
                    Secure access • ${currentFolderTitle}
                </p>
            </div>
            <div class="folder-browser-status">🔐 Secure Access</div>
        </div>

        <div class="folder-browser-toolbar">
            <button
                type="button"
                class="folder-back-button"
                id="folderBrowserBack"
                style="cursor:pointer;"
            >${folderName ? "← Back to Root" : "← Back to Library"}</button>
            <span class="folder-browser-path">${currentFolderTitle}</span>
        </div>

        <div class="folder-browser-grid" id="reelsBundlesFolderGrid"></div>
    `;

    // Hide background bundle cards grid so only the file browser is displayed in view=files mode
    if (basicBundleSection) basicBundleSection.style.display = "none";
    if (premiumBundleSection) premiumBundleSection.style.display = "none";
    document.querySelectorAll(".rb-bundle-section").forEach(sec => sec.style.display = "none");

    const target = basicBundleSection || premiumBundleSection || document.body;

    if (target?.parentNode) {
        target.parentNode.insertBefore(browser, target);
    } else {
        document.body.appendChild(browser);
    }

    const grid = browser.querySelector("#reelsBundlesFolderGrid");
    if (!grid) return;

    const backButton = browser.querySelector("#folderBrowserBack");
    backButton?.addEventListener("click", () => {
        if (folderName) {
            const requestedBundleId = getBundleIdFromUrl();
            if (requestedBundleId) {
                loadFolderContents(requestedBundleId, null, null);
            }
        } else {
            window.location.href = "download.html";
        }
    });

    if (!Array.isArray(items) || items.length === 0) {
        grid.innerHTML = `
            <div class="folder-browser-empty">
                <div class="folder-empty-icon">📂</div>
                <h3>Folder is empty</h3>
                <p>No files or folders are available yet.</p>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const card = createDriveItemCard(item, bundle);
        if (card) grid.appendChild(card);
    });
}


/* ==========================================================
   FOLDER NAVIGATION
========================================================== */

async function loadFolderContents(
    bundleId,
    folderId = null,
    folderName = null
) {
    if (!bundleId) {
        throw new Error("Bundle ID is missing.");
    }

    const browser = document.getElementById("reelsBundlesFolderBrowser");
    const grid = browser?.querySelector("#reelsBundlesFolderGrid");

    if (grid) {
        grid.innerHTML = `
            <div class="folder-browser-loading">
                <div class="folder-loading-icon">⏳</div>
                <p>Loading secure contents...</p>
            </div>
        `;
    }

    try {
        let endpoint = `/api/user/bundles/${encodeURIComponent(bundleId)}/files`;

        if (folderId) {
            endpoint += `?folderId=${encodeURIComponent(folderId)}`;
        }

        const response = await apiFetch(endpoint);

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            await throwApiError(response, "Unable to load folder contents.");
        }

        const data = await response.json();

        if (data?.success !== true) {
            throw new Error(
                data?.message || "Unable to load folder contents."
            );
        }

        const items = Array.isArray(data.items) ? data.items : [];

        if (items.length === 0 && folderId) {
            window.open(`https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`, "_blank", "noopener,noreferrer");
            return;
        }

        renderBundleFilesView(
            data.bundle,
            items,
            folderName
        );
    } catch (error) {
        console.error("[Downloads] Folder navigation failed:", error);
        showLibraryError(
            error?.message || "Unable to load folder contents."
        );
    }
}


/* ==========================================================
   DRIVE ITEM CARD
========================================================== */

function isDriveFolder(item) {
    if (!item) return false;
    return (
        item.type === "folder" ||
        item.type === "drive" ||
        item.mimeType === "application/vnd.google-apps.folder" ||
        item.mimeType === "application/vnd.google-apps.shortcut"
    );
}

function createDriveItemCard(item, bundle) {
    const card = document.createElement("article");
    card.className = "drive-item-card";

    const isMega = Boolean(item.isMega) || item.type === "mega" || item.mimeType === "application/vnd.mega.cloud-storage";
    const isDriveLink = item.type === "drive" || Boolean(item.folderLink);
    const isFolder = isDriveFolder(item);

    const name = safeText(item.name || (isFolder ? "Folder" : "File"));
    const icon = isMega
        ? (isFolder ? "📁" : getDriveItemIcon(item))
        : (isDriveLink ? "📁" : getDriveItemIcon(item));

    const meta = (isMega && item.type === "mega")
        ? "MEGA Cloud Storage Package"
        : (isDriveLink ? "Google Drive Cloud Folder" : safeText(getDriveItemMeta(item)));

    const buttonLabel = isFolder
        ? "Open"
        : (isMega ? "Download" : (isDriveLink ? "Open Drive" : "Download"));

    card.innerHTML = `
        <div class="drive-item-icon">${icon}</div>
        <div class="drive-item-info">
            <h3 class="drive-item-name">${name}</h3>
            <p class="drive-item-type">
                ${isMega ? (isFolder ? "📁 Folder" : safeText(item.mimeType || "File")) : (isDriveLink ? "📁 Google Drive Folder" : (isFolder ? "Folder" : safeText(item.mimeType || "File")))}
                ${meta ? ` • ${meta}` : ""}
            </p>
        </div>
        <button type="button" class="drive-item-action">
            ${buttonLabel}
        </button>
    `;

    const actionButton = card.querySelector(".drive-item-action");

    actionButton?.addEventListener("click", async () => {
        if (actionButton.disabled) return;

        const bundleId = bundle?.id || getBundleIdFromUrl();

        if (!bundleId) {
            showCardError(card, "Bundle information is missing.");
            return;
        }

        actionButton.disabled = true;
        actionButton.textContent = "⏳ Please wait...";

        try {
            if (isFolder) {
                await loadFolderContents(
                    bundleId,
                    item.id,
                    item.name || "Folder"
                );
                return;
            }

            if (isMega && item.type === "mega") {
                const token = await getAuthToken();
                if (!token) {
                    redirectToLogin();
                    return;
                }

                let megaEndpoint = `/api/user/bundles/${encodeURIComponent(bundleId)}/mega`;
                if (item.id && item.type !== "mega") {
                    megaEndpoint += `?fileId=${encodeURIComponent(item.id)}`;
                }

                const response = await apiFetch(megaEndpoint);
                if (response.redirected && response.url) {
                    window.open(response.url, "_blank", "noopener,noreferrer");
                } else if (response.ok) {
                    window.open(`${API_BASE}${megaEndpoint}`, "_blank", "noopener,noreferrer");
                } else {
                    await throwApiError(response, "Unable to access MEGA storage.");
                }
                return;
            }

            if (isDriveLink && item.folderLink) {
                window.open(item.folderLink, "_blank", "noopener,noreferrer");
                return;
            }

            await downloadDriveItem(
                bundleId,
                item.id,
                item.name || "download",
                card
            );
        } catch (error) {
            console.error("[Downloads] Item action failed:", error);
            showCardError(
                card,
                error?.message || "Unable to complete this action."
            );
        } finally {
            if (document.body.contains(card)) {
                actionButton.disabled = false;
                actionButton.textContent = buttonLabel;
            }
        }
    });

    return card;
}


async function getAuthToken() {
    if (firebaseIdToken) return firebaseIdToken;
    const user = currentUser || firebaseAuth?.currentUser;
    if (user) {
        try {
            firebaseIdToken = await user.getIdToken();
            return firebaseIdToken;
        } catch (e) {
            console.warn("[Downloads] getAuthToken error:", e);
        }
    }
    return firebaseIdToken || null;
}

/* ==========================================================
   SECURE FILE DOWNLOAD
========================================================== */

async function downloadDriveItem(
    bundleId,
    fileId,
    fileName,
    card
) {
    if (!bundleId || !fileId) {
        throw new Error("File information is missing.");
    }

    const token = await getAuthToken();
    if (!token) {
        redirectToLogin();
        return;
    }

    const cleanName = String(fileName || "download").replace(/[\\/:*?"<>|]/g, "_");
    const downloadUrl = `${API_BASE}/api/user/bundles/${encodeURIComponent(bundleId)}/file/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token)}`;

    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = cleanName;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
        if (document.body.contains(anchor)) {
            anchor.remove();
        }
    }, 1000);

    if (card) {
        showCardError(card, "Download started.");
    }
}


/* ==========================================================
   DOWNLOAD PAGE STYLES
   Injected so newly-created cards always have a stable layout.
========================================================== */

function ensureDownloadStyles() {
    if (document.getElementById("reelsBundlesDownloadRuntimeStyles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "reelsBundlesDownloadRuntimeStyles";
    style.textContent = `
        .bundle-card-grid,
        #basicBundleGrid,
        #premiumBundleGrid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 24px;
            width: 100%;
            align-items: stretch;
        }

        .bundle-card-grid > *,
        #basicBundleGrid > *,
        #premiumBundleGrid > * {
            min-width: 0;
        }

        .bundle-card {
            position: relative;
            display: flex;
            flex-direction: column;
            min-width: 0;
            min-height: 360px;
            overflow: hidden;
            border-radius: 20px;
            box-sizing: border-box;
        }

        .bundle-card-media {
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 9;
            overflow: hidden;
        }

        .bundle-card-media img,
        .bundle-placeholder {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .bundle-placeholder {
            display: grid;
            place-items: center;
            font-size: 48px;
            background: rgba(255,255,255,.035);
        }

        .bundle-plan-badge {
            position: absolute;
            top: 14px;
            left: 14px;
            z-index: 2;
            padding: 7px 11px;
            border-radius: 999px;
            background: rgba(0,0,0,.72);
            backdrop-filter: blur(8px);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .08em;
        }

        .bundle-card-content {
            display: flex;
            flex: 1;
            flex-direction: column;
            padding: 20px;
            box-sizing: border-box;
        }

        .bundle-card-title {
            margin: 0 0 9px;
            font-size: 20px;
            line-height: 1.2;
            overflow-wrap: anywhere;
        }

        .bundle-card-description {
            margin: 0;
            opacity: .72;
            line-height: 1.55;
            overflow-wrap: anywhere;
        }

        .bundle-card-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: auto;
            padding-top: 22px;
        }

        .bundle-download-button,
        .drive-item-action,
        .folder-back-button {
            border: 0;
            cursor: pointer;
            border-radius: 12px;
            font-weight: 700;
        }

        .bundle-download-button {
            min-height: 44px;
            padding: 0 18px;
        }

        .bundle-download-button:disabled,
        .drive-item-action:disabled,
        .folder-back-button:disabled {
            cursor: not-allowed;
            opacity: .55;
        }

        .reelsbundles-folder-browser {
            width: 100%;
            margin: 0 0 28px;
            padding: 24px;
            box-sizing: border-box;
            border: 1px solid rgba(139,92,246,.35);
            border-radius: 24px;
            background: rgba(10,12,25,.78);
            box-shadow: 0 20px 60px rgba(0,0,0,.22);
        }

        .folder-browser-header,
        .folder-browser-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }

        .folder-browser-kicker {
            margin-bottom: 7px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .14em;
            opacity: .7;
        }

        .folder-browser-title {
            margin: 0;
            font-size: 28px;
        }

        .folder-browser-subtitle {
            margin: 7px 0 0;
            opacity: .68;
        }

        .folder-browser-status {
            white-space: nowrap;
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(34,197,94,.1);
        }

        .folder-browser-toolbar {
            margin-top: 22px;
            padding: 12px 0;
            border-top: 1px solid rgba(255,255,255,.07);
            border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .folder-back-button {
            padding: 9px 14px;
            background: rgba(255,255,255,.07);
            color: inherit;
        }

        .folder-browser-path {
            margin-left: auto;
            opacity: .65;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .folder-browser-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 16px;
            margin-top: 18px;
        }

        .drive-item-card {
            display: grid;
            grid-template-columns: auto minmax(0,1fr) auto;
            align-items: center;
            gap: 14px;
            min-width: 0;
            padding: 16px;
            border: 1px solid rgba(255,255,255,.08);
            border-radius: 16px;
            background: rgba(255,255,255,.025);
            box-sizing: border-box;
        }

        .drive-item-icon {
            display: grid;
            place-items: center;
            width: 44px;
            height: 44px;
            border-radius: 13px;
            background: rgba(139,92,246,.12);
            font-size: 22px;
        }

        .drive-item-info { min-width: 0; }

        .drive-item-name {
            margin: 0;
            font-size: 15px;
            line-height: 1.35;
            overflow-wrap: anywhere;
        }

        .drive-item-type {
            margin: 5px 0 0;
            font-size: 12px;
            opacity: .6;
            overflow-wrap: anywhere;
        }

        .drive-item-action {
            padding: 10px 13px;
            background: rgba(139,92,246,.18);
            color: inherit;
            white-space: nowrap;
        }

        .folder-browser-empty,
        .folder-browser-loading {
            grid-column: 1 / -1;
            padding: 50px 20px;
            text-align: center;
            opacity: .78;
        }

        .folder-empty-icon,
        .folder-loading-icon {
            font-size: 40px;
            margin-bottom: 10px;
        }

        .folder-browser-empty h3,
        .folder-browser-loading p {
            margin: 0;
        }

        .folder-browser-empty p {
            margin: 8px 0 0;
            opacity: .7;
        }

        .drive-item-error {
            grid-column: 1 / -1;
            margin-top: 8px;
            font-size: 12px;
            color: #fca5a5;
        }

        @media (max-width: 1100px) {
            #basicBundleGrid,
            #premiumBundleGrid,
            .folder-browser-grid {
                grid-template-columns: repeat(2, minmax(0,1fr));
            }
        }

        @media (max-width: 700px) {
            #basicBundleGrid,
            #premiumBundleGrid,
            .folder-browser-grid {
                grid-template-columns: 1fr;
            }

            .folder-browser-header,
            .folder-browser-toolbar {
                align-items: flex-start;
                flex-direction: column;
            }

            .folder-browser-status,
            .folder-browser-path {
                margin-left: 0;
            }

            .drive-item-card {
                grid-template-columns: auto minmax(0,1fr);
            }

            .drive-item-action {
                grid-column: 1 / -1;
                width: 100%;
            }
        }
    `;

    document.head.appendChild(style);
}


/* ==========================================================
   ACCESS UI
========================================================== */

function updateAccessUI(
    data
) {

    const plans =
        Array.isArray(
            data?.plans
        )
            ? data.plans
            : [];


    const hasBasic =
        plans.includes(
            "basic"
        );


    const hasPremium =
        plans.includes(
            "premium"
        );


    const hasBoth = hasBasic && hasPremium;


    if (
        accessTitle
    ) {

        if (hasBoth) {

            accessTitle.textContent =
                "Basic & Premium Access";

        }

        else if (
            hasPremium
        ) {

            accessTitle.textContent =
                "Premium Access";

        }

        else if (
            hasBasic
        ) {

            accessTitle.textContent =
                "Basic Access";

        }

        else {

            accessTitle.textContent =
                "No Active Bundle";

        }

    }


    if (
        accessDescription
    ) {

        if (hasBoth) {

            accessDescription.textContent =
                "Your Basic and Premium bundles are unlocked.";

        }

        else if (
            hasPremium
        ) {

            accessDescription.textContent =
                "Your Premium bundles are unlocked.";

        }

        else if (
            hasBasic
        ) {

            accessDescription.textContent =
                "Your Basic bundles are unlocked.";

        }

        else {

            accessDescription.textContent =
                "Purchase a bundle to unlock downloads.";

        }

    }


    if (
        accessBadge
    ) {

        accessBadge.textContent =
            hasBoth
                ? "BASIC & PREMIUM"
                : hasPremium
                    ? "PREMIUM"
                    : hasBasic
                        ? "BASIC"
                        : "LOCKED";

    }


    if (
        accountStatus
    ) {

        accountStatus.textContent =
            hasPremium ||
            hasBasic

                ? "Active"

                : "No active access";

    }

}


/* ==========================================================
   API FETCH
========================================================== */

async function apiFetch(
    endpoint,
    options = {}
) {

    const user =
        firebaseAuth?.currentUser ||
        currentUser;


    if (
        !user
    ) {

        throw new Error(
            "Authentication required."
        );

    }


    let token =
        firebaseIdToken;


    try {

        token =
            await user.getIdToken();

        firebaseIdToken =
            token;

    }

    catch (
        error
    ) {

        console.warn(
            "[Downloads] Token refresh failed:",
            error
        );

    }


    const headers =
        new Headers(
            options.headers ||
            {}
        );


    headers.set(
        "Authorization",
        `Bearer ${token}`
    );


    headers.set(
        "Accept",
        "application/json"
    );


    const requestOptions = {
        ...options,
        headers
    };


    const url =
        endpoint.startsWith(
            "http"
        )

            ? endpoint

            : `${API_BASE}${endpoint}`;


    return robustFetch(
        url,
        requestOptions
    );

}


/* ==========================================================
   API ERROR
========================================================== */

async function throwApiError(
    response,
    fallbackMessage
) {

    let message =
        fallbackMessage;


    try {

        const data =
            await response.json();


        if (
            data?.message
        ) {

            message =
                data.message;

        }

    }

    catch (
        error
    ) {

        console.warn(
            "[Downloads] Error response was not JSON.",
            error
        );

    }


    if (
        response.status === 401
    ) {

        message =
            "Your login session has expired.";

    }


    if (
        response.status === 403
    ) {

        message =
            message ||
            "You do not have access to this bundle.";

    }


    if (
        response.status === 404
    ) {

        message =
            message ||
            "Bundle was not found.";

    }


    throw new Error(
        message
    );

}


/* ==========================================================
   START BUNDLE DOWNLOAD
   ----------------------------------------------------------
   Dashboard / Bundle Card
          ↓
   download.html?bundleId=XXX&view=files

   IMPORTANT:
   This function does NOT:
   - open Google Drive
   - expose Google Drive URL
   - create ZIP
   - download directly from Drive
========================================================== */

async function startBundleDownload(
    bundle,
    button,
    card
) {

    if (
        !bundle ||
        !bundle.id
    ) {

        showCardError(
            card,
            "Bundle information is missing."
        );

        return;

    }


    if (
        downloadInProgress
    ) {

        return;

    }


    downloadInProgress =
        true;


    try {

        const user =
            firebaseAuth?.currentUser ||
            currentUser;


        if (
            !user
        ) {

            window.location.href =
                `login.html?redirect=${encodeURIComponent(
                    window.location.href
                )}`;

            return;

        }


        /* --------------------------------------------------
           CHECK THAT BUNDLE EXISTS IN AUTHORIZED LIBRARY
        -------------------------------------------------- */

        const authorizedBundle =
            allBundles.find(
                item =>
                    String(
                        item?.id ||
                        item?.bundleId ||
                        ""
                    ) ===
                    String(
                        bundle.id
                    )
            );


        if (
            !authorizedBundle
        ) {

            showLockedModal(
                bundle
            );

            return;

        }


        /* --------------------------------------------------
           ENTITLEMENT + ACTIVE CHECK
        -------------------------------------------------- */

        if (
            authorizedBundle.unlocked !== true
        ) {
            showLockedModal(
                authorizedBundle
            );
            return;
        }

        if (
            authorizedBundle.active !== true
        ) {

            showLockedModal(
                authorizedBundle
            );

            return;

        }


        /* --------------------------------------------------
           BUTTON LOADING
        -------------------------------------------------- */

        if (
            button
        ) {

            button.disabled =
                true;


            button.dataset.originalText =
                button.innerHTML;


            button.innerHTML =
                "⏳ Opening...";

        }


        /* --------------------------------------------------
           OPEN REELSBUNDLES FILE VIEW
        -------------------------------------------------- */

        const url =
            `download.html?bundleId=${encodeURIComponent(
                bundle.id
            )}&view=files`;


        console.log(
            "[Downloads] Opening bundle:",
            bundle.id
        );


        window.location.replace(
            url
        );


        return;

    }

    catch (
        error
    ) {

        console.error(
            "[Downloads] Unable to open bundle:",
            error
        );


        showCardError(
            card,
            error?.message ||
            "Unable to open bundle."
        );

    }

    finally {

        downloadInProgress =
            false;


        if (
            button
        ) {

            button.disabled =
                false;

            if (
                button.dataset.originalText
            ) {

                button.innerHTML =
                    button.dataset.originalText;

            }

        }

    }

}


/* ==========================================================
   LOCKED MODAL
========================================================== */

function setupModal() {

    lockedModalClose?.addEventListener(
        "click",
        closeLockedModal
    );


    lockedModal?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                lockedModal
            ) {

                closeLockedModal();

            }

        }
    );

}


function showLockedModal(
    bundle
) {

    if (
        !lockedModal
    ) {

        alert(
            "This bundle is currently locked."
        );

        return;

    }


    const name =
        bundle?.name ||
        bundle?.title ||
        "This bundle";


    if (
        lockedModalMessage
    ) {

        lockedModalMessage.textContent =
            `${name} is currently locked or you do not have access to it.`;

    }


    lockedModal.classList.add(
        "active"
    );


    lockedModal.setAttribute(
        "aria-hidden",
        "false"
    );

}


function closeLockedModal() {

    if (
        !lockedModal
    ) {

        return;

    }


    lockedModal.classList.remove(
        "active"
    );


    lockedModal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* ==========================================================
   LOADING
========================================================== */

function showLoading() {

    if (
        libraryLoading
    ) {

        libraryLoading.style.display =
            "";

    }


    if (
        libraryError
    ) {

        libraryError.style.display =
            "none";

    }


    if (
        libraryEmpty
    ) {

        libraryEmpty.style.display =
            "none";

    }

}


function hideLoading() {

    if (
        libraryLoading
    ) {

        libraryLoading.style.display =
            "none";

        libraryLoading.setAttribute(
            "hidden",
            "true"
        );

    }

}


function showLibraryError(
    message
) {

    hideLoading();


    if (
        libraryError
    ) {

        libraryError.style.display =
            "";

    }


    if (
        libraryErrorMessage
    ) {

        libraryErrorMessage.textContent =
            message ||
            "Unable to load your bundle library.";

    }

}


/* ==========================================================
   CARD ERROR
========================================================== */

function showCardError(
    card,
    message
) {

    if (
        !card
    ) {

        alert(
            message
        );

        return;

    }


    let errorElement =
        card.querySelector(
            ".drive-item-error"
        );


    if (
        !errorElement
    ) {

        errorElement =
            document.createElement(
                "div"
            );


        errorElement.className =
            "drive-item-error";


        card.appendChild(
            errorElement
        );

    }


    errorElement.textContent =
        message;


    window.setTimeout(
        () => {

            errorElement.remove();

        },
        3500
    );

}


/* ==========================================================
   NORMALIZE PLAN
========================================================== */

function normalizePlan(
    value
) {

    const plan =
        String(
            value ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        plan === "premium" ||
        plan === "pro" ||
        plan === "paid"
    ) {

        return "premium";

    }


    if (
        plan === "basic" ||
        plan === "standard"
    ) {

        return "basic";

    }


    return plan;

}


/* ==========================================================
   ACTIVE CATEGORY
========================================================== */

function setActiveCategory(
    plan
) {

    const normalized =
        normalizePlan(
            plan
        );


    if (
        normalized !== "basic" &&
        normalized !== "premium"
    ) {

        return;

    }


    currentPlan =
        normalized;


    updateCategoryUI();

}


/* ==========================================================
   SAFE TEXT
========================================================== */

function safeText(
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
   ESCAPE ATTRIBUTE
========================================================== */

function escapeAttribute(
    value
) {

    return safeText(
        value
    );

}


/* ==========================================================
   PAGE VISIBILITY
========================================================== */

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState !==
            "visible"
        ) {

            return;

        }


        if (
            !firebaseAuth
        ) {

            return;

        }


        const user =
            firebaseAuth.currentUser;


        if (
            !user
        ) {

            return;

        }


        try {

            currentUser =
                user;


            firebaseIdToken =
                await user.getIdToken(
                    true
                );


            await loadBundleLibrary();

        }

        catch (
            error
        ) {

            console.warn(
                "[Downloads] Visibility refresh failed:",
                error
            );

        }

    }
);


/* ==========================================================
   BACK/FORWARD CACHE
========================================================== */

window.addEventListener(
    "pageshow",
    async event => {

        if (
            !event.persisted
        ) {

            return;

        }


        try {

            if (
                firebaseAuth?.currentUser
            ) {

                currentUser =
                    firebaseAuth.currentUser;


                firebaseIdToken =
                    await currentUser.getIdToken(
                        true
                    );


                await loadBundleLibrary();

            }

        }

        catch (
            error
        ) {

            console.warn(
                "[Downloads] Page restore failed:",
                error
            );

        }

    }
);


/* ==========================================================
   GLOBAL ERROR HANDLER
========================================================== */

window.addEventListener(
    "error",
    event => {

        console.error(
            "[Downloads] Global error:",
            event.error ||
            event.message
        );

    }
);


/* ==========================================================
   UNHANDLED PROMISE HANDLER
========================================================== */

window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "[Downloads] Unhandled promise rejection:",
            event.reason
        );

    }
);
/* ==========================================================
   REELS BUNDLES DOWNLOAD PAGE
   PART 4
   FINAL COMPATIBILITY + SAFETY HELPERS
========================================================== */


/* ==========================================================
   SAFE JSON RESPONSE HELPER
========================================================== */

async function readJsonResponse(
    response
) {

    if (
        !response
    ) {

        throw new Error(
            "Invalid server response."
        );

    }


    const contentType =
        response.headers.get(
            "content-type"
        ) ||
        "";


    if (
        !contentType.includes(
            "application/json"
        )
    ) {

        return null;

    }


    try {

        return await response.json();

    }

    catch (
        error
    ) {

        console.warn(
            "[Downloads] Unable to parse JSON:",
            error
        );

        return null;

    }

}


/* ==========================================================
   REFRESH AUTH TOKEN
========================================================== */

async function refreshFirebaseToken() {

    const user =
        firebaseAuth?.currentUser ||
        currentUser;


    if (
        !user
    ) {

        throw new Error(
            "Authentication required."
        );

    }


    try {

        const token =
            await user.getIdToken(
                true
            );


        firebaseIdToken =
            token;


        currentUser =
            user;


        return token;

    }

    catch (
        error
    ) {

        console.error(
            "[Downloads] Token refresh failed:",
            error
        );

        throw new Error(
            "Your login session could not be refreshed."
        );

    }

}


/* ==========================================================
   AUTH CHECK
========================================================== */

function isAuthenticated() {

    return Boolean(
        firebaseAuth?.currentUser ||
        currentUser
    );

}


/* ==========================================================
   GET CURRENT AUTH USER
========================================================== */

function getCurrentAuthUser() {

    return (
        firebaseAuth?.currentUser ||
        currentUser ||
        null
    );

}


/* ==========================================================
   FORCE LOGIN
========================================================== */

function redirectToLogin() {

    const redirect =
        encodeURIComponent(
            window.location.href
        );


    window.location.href =
        `login.html?redirect=${redirect}`;

}


/* ==========================================================
   BUNDLE LOOKUP
========================================================== */

function findBundleById(
    bundleId
) {

    if (
        !bundleId
    ) {

        return null;

    }


    return allBundles.find(
        bundle =>
            String(
                bundle?.id ||
                bundle?.bundleId ||
                ""
            ) ===
            String(
                bundleId
            )
    ) || null;

}


/* ==========================================================
   CHECK BUNDLE ACCESS
========================================================== */

function hasBundleAccess(
    bundle
) {

    if (
        !bundle
    ) {

        return false;

    }


    return (
        bundle.active === true
    );

}


/* ==========================================================
   CHECK PLAN ACCESS
========================================================== */

function hasPlanAccess(
    plan
) {

    const normalized =
        normalizePlan(
            plan
        );


    if (
        normalized === "basic"
    ) {

        return basicBundles.length >
            0;

    }


    if (
        normalized === "premium"
    ) {

        return premiumBundles.length >
            0;

    }


    return false;

}


/* ==========================================================
   FORMAT FILE SIZE
========================================================== */

function formatFileSize(
    bytes
) {

    const size =
        Number(
            bytes
        );


    if (
        !Number.isFinite(
            size
        ) ||
        size <= 0
    ) {

        return "";

    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
    ];


    let index =
        0;


    let value =
        size;


    while (
        value >= 1024 &&
        index <
        units.length - 1
    ) {

        value /=
            1024;

        index++;

    }


    return `${value.toFixed(
        index === 0
            ? 0
            : 1
    )} ${units[index]}`;

}


/* ==========================================================
   FORMAT DATE
========================================================== */

function formatDate(
    value
) {

    if (
        !value
    ) {

        return "";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleDateString(
        undefined,
        {
            year:
                "numeric",

            month:
                "short",

            day:
                "numeric"
        }
    );

}


/* ==========================================================
   DRIVE ITEM ICON
========================================================== */

function getDriveItemIcon(
    item
) {

    if (
        item?.type ===
        "folder"
    ) {

        return "📁";

    }


    const mimeType =
        String(
            item?.mimeType ||
            ""
        ).toLowerCase();


    if (
        mimeType.includes(
            "video"
        )
    ) {

        return "🎬";

    }


    if (
        mimeType.includes(
            "audio"
        )
    ) {

        return "🎵";

    }


    if (
        mimeType.includes(
            "image"
        )
    ) {

        return "🖼️";

    }


    if (
        mimeType.includes(
            "pdf"
        )
    ) {

        return "📕";

    }


    if (
        mimeType.includes(
            "zip"
        ) ||
        mimeType.includes(
            "compressed"
        )
    ) {

        return "🗜️";

    }


    return "📄";

}


/* ==========================================================
   DRIVE ITEM META
========================================================== */

function getDriveItemMeta(
    item
) {

    if (
        item?.type ===
        "folder"
    ) {

        return "Folder";

    }


    const parts = [];


    const size =
        formatFileSize(
            item?.size
        );


    if (
        size
    ) {

        parts.push(
            size
        );

    }


    const date =
        formatDate(
            item?.modifiedTime
        );


    if (
        date
    ) {

        parts.push(
            date
        );

    }


    if (
        parts.length
    ) {

        return parts.join(
            " • "
        );

    }


    return "File";

}


/* ==========================================================
   UPDATE DRIVE ITEM CARD
========================================================== */

function updateDriveItemCard(
    card,
    item
) {

    if (
        !card ||
        !item
    ) {

        return;

    }


    const icon =
        card.querySelector(
            ".drive-item-icon"
        );


    const name =
        card.querySelector(
            ".drive-item-name"
        );


    const type =
        card.querySelector(
            ".drive-item-type"
        );


    if (
        icon
    ) {

        icon.textContent =
            getDriveItemIcon(
                item
            );

    }


    if (
        name
    ) {

        name.textContent =
            item.name ||
            "Untitled";

    }


    if (
        type
    ) {

        type.textContent =
            getDriveItemMeta(
                item
            );

    }

}


/* ==========================================================
   DISABLE BUTTON
========================================================== */

function setButtonLoading(
    button,
    text = "Loading..."
) {

    if (
        !button
    ) {

        return;

    }


    if (
        !button.dataset.originalText
    ) {

        button.dataset.originalText =
            button.innerHTML;

    }


    button.disabled =
        true;


    button.setAttribute(
        "aria-busy",
        "true"
    );


    button.innerHTML =
        `⏳ ${safeText(text)}`;

}


/* ==========================================================
   RESTORE BUTTON
========================================================== */

function restoreButton(
    button
) {

    if (
        !button
    ) {

        return;

    }


    button.disabled =
        false;


    button.removeAttribute(
        "aria-busy"
    );


    if (
        button.dataset.originalText
    ) {

        button.innerHTML =
            button.dataset.originalText;

    }

}


/* ==========================================================
   REMOVE FOLDER BROWSER
========================================================== */

function removeFolderBrowser() {

    const browser =
        document.getElementById(
            "reelsBundlesFolderBrowser"
        );


    browser?.remove();

}


/* ==========================================================
   SHOW EMPTY FOLDER
========================================================== */

function showEmptyFolder(
    container
) {

    if (
        !container
    ) {

        return;

    }


    container.innerHTML = `

        <div class="folder-browser-empty">

            <div class="folder-empty-icon">
                📂
            </div>

            <h3>
                No content available
            </h3>

            <p>
                This folder does not contain any available
                files or folders.
            </p>

        </div>

    `;

}


/* ==========================================================
   NETWORK ERROR
========================================================== */

function getNetworkErrorMessage(
    error
) {

    if (
        !navigator.onLine
    ) {

        return (
            "You appear to be offline. " +
            "Please check your internet connection."
        );

    }


    if (
        error?.message
    ) {

        return error.message;

    }


    return (
        "Something went wrong. " +
        "Please try again."
    );

}


/* ==========================================================
   RETRY LIBRARY
========================================================== */

async function retryLoadBundleLibrary() {

    try {

        showLoading();

        await loadBundleLibrary();

        hideLoading();

    }

    catch (
        error
    ) {

        console.error(
            "[Downloads] Retry failed:",
            error
        );


        showLibraryError(
            getNetworkErrorMessage(
                error
            )
        );

    }

}

/* ==========================================================
   ONLINE & OFFLINE EVENTS
========================================================== */

window.addEventListener(
    "online",
    async () => {
        console.log("[Downloads] Connection restored.");
        if (isAuthenticated()) {
            try {
                await loadBundleLibrary();
            } catch (error) {
                console.warn("[Downloads] Online refresh failed:", error);
            }
        }
    }
);

window.addEventListener(
    "offline",
    () => {
        console.warn("[Downloads] Browser is offline.");
    }
);

/* ==========================================================
   ESCAPE KEY
========================================================== */

document.addEventListener(
    "keydown",
    event => {
        if (event.key === "Escape") {
            closeLockedModal();
        }
    }
);

/* ==========================================================
   BEFORE UNLOAD
========================================================== */

window.addEventListener(
    "beforeunload",
    () => {
        downloadInProgress = false;
    }
);

console.log("[Downloads] ReelsBundles download module loaded.");
console.log("[Downloads] API:", API_BASE);

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
