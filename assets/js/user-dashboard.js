/* ==========================================================
   REELSBUNDLES USER DASHBOARD
   PHASE 2
   LIVE ADMIN BUNDLES + LOCK / UNLOCK
========================================================== */

import {
    protectUserPage,
    getCurrentFirebaseUser,
    getFirebaseIdToken,
    getCurrentUserFromBackend,
    getCurrentUserEntitlement,
    logoutUser
} from "./auth-common.js";


const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000"
        : (window.REELSBUNDLES_CONFIG?.API_BASE_URL || "https://reelsbundles-backend.onrender.com")
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "");

/* ==========================================================
   GLOBAL STATE
========================================================== */

let currentUserProfile = null;
let currentPlan = "free";
let lifetimeAccess = false;
let liveBundles = [];


/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /* ==============================================
           PROTECT DASHBOARD
        ============================================== */

        protectUserPage();


        /* ==============================================
           ELEMENTS
        ============================================== */

        const sidebar =
            document.getElementById(
                "userSidebar"
            );

        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );

        const menuButton =
            document.getElementById(
                "mobileMenuButton"
            );

        const logoutButton =
            document.getElementById(
                "logoutButton"
            );


        /* ==============================================
           MOBILE SIDEBAR
        ============================================== */

        const openSidebar = () => {

            sidebar?.classList.add(
                "open"
            );

            overlay?.classList.add(
                "active"
            );

        };


        const closeSidebar = () => {

            sidebar?.classList.remove(
                "open"
            );

            overlay?.classList.remove(
                "active"
            );

        };


        menuButton?.addEventListener(
            "click",
            openSidebar
        );


        overlay?.addEventListener(
            "click",
            closeSidebar
        );


        sidebar
            ?.querySelectorAll(
                ".sidebar-link"
            )
            .forEach(
                (link) => {

                    link.addEventListener(
                        "click",
                        closeSidebar
                    );

                }
            );


        /* ==============================================
           LOGOUT
        ============================================== */

        logoutButton?.addEventListener(
            "click",
            async () => {

                try {

                    logoutButton.disabled =
                        true;

                    const label =
                        logoutButton.querySelector(
                            "span:last-child"
                        );

                    if (label) {

                        label.textContent =
                            "Logging out...";

                    }


                    await logoutUser();


                    window.location.href =
                        "index.html";

                }

                catch (error) {

                    console.error(
                        "Logout failed:",
                        error
                    );


                    logoutButton.disabled =
                        false;


                    const label =
                        logoutButton.querySelector(
                            "span:last-child"
                        );

                    if (label) {

                        label.textContent =
                            "Logout";

                    }

                }

            }
        );


        /* ==============================================
           LOAD USER
        ============================================== */

        await loadUser();


        /* ==============================================
           LOAD LIVE BUNDLES
        ============================================== */

        await loadLiveBundles();

        startBundleAutoRefresh();

    }
);


/* ==========================================================
   LOAD USER PROFILE
========================================================== */

async function loadUser() {

    try {

        let firebaseUser =
            getCurrentFirebaseUser();


        /* ==============================================
           LIVE PURCHASE ENTITLEMENT
        ============================================== */

        try {

            const entitlement = null;


            if (entitlement) {

                currentPlan =
                    String(
                        entitlement.plan ||
                        "free"
                    )
                        .trim()
                        .toLowerCase();


                lifetimeAccess =
                    entitlement.lifetimeAccess === true;


                console.log(
                    "[Dashboard] User entitlement:",
                    entitlement
                );


                updateText(
                    "currentPlan",
                    formatPlan(
                        currentPlan
                    )
                );


                updateAccessStatus(
                    lifetimeAccess,
                    currentPlan
                );

            }

            else {

                currentPlan =
                    "free";

                lifetimeAccess =
                    false;


                updateText(
                    "currentPlan",
                    "Free"
                );


                updateAccessStatus(
                    false,
                    "free"
                );

            }

        }

        catch (entitlementError) {

            console.warn(
                "[Dashboard] Entitlement unavailable:",
                entitlementError
            );


            /*
             * FAIL CLOSED
             *
             * Never unlock paid content
             * when entitlement cannot be verified.
             */

            currentPlan =
                "free";

            lifetimeAccess =
                false;


            updateText(
                "currentPlan",
                "Free"
            );


            updateAccessStatus(
                false,
                "free"
            );

        }


        /* ==============================================
           WAIT FOR FIREBASE AUTH
        ============================================== */

        if (!firebaseUser) {

            firebaseUser =
                await waitForFirebaseUser();

        }


        if (!firebaseUser) {

            console.warn(
                "No Firebase user found."
            );

            return;

        }


        /* ==============================================
           FIREBASE BASIC DATA
        ============================================== */

        const displayName =
            firebaseUser.displayName ||
            getNameFromEmail(
                firebaseUser.email
            ) ||
            "Creator";


        const email =
            firebaseUser.email ||
            "No email";


        updateText(
            "welcomeUserName",
            displayName
        );


        updateText(
            "headerUserName",
            displayName
        );


        updateText(
            "headerUserEmail",
            email
        );


        updateAvatar(
            displayName
        );


        /* ==============================================
           BACKEND USER PROFILE
        ============================================== */

        try {

            const backendUser =
                await getCurrentUserFromBackend();


            if (backendUser) {

                currentUserProfile =
                    backendUser;


                applyBackendUser(
                    backendUser,
                    displayName
                );

            }

        }

        catch (backendError) {

            console.warn(
                "Backend profile unavailable:",
                backendError
            );


            /*
             * Keep dashboard usable.
             *
             * Without verified backend
             * purchase information we keep
             * the user on FREE / LOCKED state.
             */

            currentUserProfile =
                null;

            currentPlan =
                "free";

            lifetimeAccess =
                false;


            updateText(
                "currentPlan",
                "Free"
            );


            updateAccessStatus(
                false,
                "free"
            );

        }

    }

    catch (error) {

        console.error(
            "Unable to load dashboard user:",
            error
        );

    }

}


/* ==========================================================
   APPLY BACKEND USER
========================================================== */

function applyBackendUser(
    backendUser,
    fallbackName
) {

    const profile =
        backendUser.user ||
        backendUser.profile ||
        backendUser.data ||
        backendUser;


    /* ==============================================
       USER INFORMATION
    ============================================== */

    const name =
        profile.name ||
        profile.displayName ||
        fallbackName;


    const email =
        profile.email ||
        getCurrentFirebaseUser()?.email ||
        "No email";


    updateText(
        "welcomeUserName",
        name
    );


    updateText(
        "headerUserName",
        name
    );


    updateText(
        "headerUserEmail",
        email
    );


    updateAvatar(
        name
    );


    /* ==============================================
       PLAN
    ============================================== */

    currentPlan =
        String(
            profile.plan ||
            "free"
        )
            .trim()
            .toLowerCase();


    if (
        currentPlan !== "basic" &&
        currentPlan !== "premium"
    ) {

        currentPlan =
            "free";

    }


    updateText(
        "currentPlan",
        formatPlan(
            currentPlan
        )
    );


    /* ==============================================
       LIFETIME ACCESS
    ============================================== */

    lifetimeAccess =
        profile.lifetime_access === true ||
        profile.lifetimeAccess === true;


    updateAccessStatus(
        lifetimeAccess,
        currentPlan
    );

}


/* ==========================================================
   ACCESS STATUS
========================================================== */

function updateAccessStatus(
    lifetime,
    plan
) {

    const title =
        document.getElementById(
            "accessTitle"
        );


    const description =
        document.getElementById(
            "accessDescription"
        );


    const badge =
        document.getElementById(
            "accessBadge"
        );


    if (
        lifetime ||
        plan === "basic" ||
        plan === "premium"
    ) {

        if (title) {

            title.textContent =
                "Lifetime Access";

        }


        if (description) {

            description.textContent =
                "Your purchased access does not expire.";

        }


        if (badge) {

            badge.textContent =
                "✓ Lifetime";


            badge.style.color =
                "#86efac";


            badge.style.background =
                "rgba(34,197,94,.10)";

        }


        return;

    }


    if (title) {

        title.textContent =
            "No Paid Access";

    }


    if (description) {

        description.textContent =
            "Choose a bundle plan to unlock paid content.";

    }


    if (badge) {

        badge.textContent =
            "Locked";


        badge.style.color =
            "#fbbf24";


        badge.style.background =
            "rgba(245,158,11,.10)";

    }

}


/* ==========================================================
   LOAD LIVE BUNDLES
========================================================== */

/* ==========================================================
   LOAD LIVE USER BUNDLES
========================================================== */

async function loadLiveBundles(isSilent = false) {

    const grid =
        document.getElementById(
            "bundleGrid"
        );


    if (!grid) {

        return;

    }


    if (!isSilent && (!grid.children.length || grid.querySelector(".library-empty"))) {

        grid.innerHTML = `
            <div class="library-empty">

                <div class="stat-icon">
                    ⏳
                </div>

                <p>
                    Loading your bundle library...
                </p>

                <small>
                    Fetching live bundles.
                </small>

            </div>
        `;

    }


    try {

        /* --------------------------------------------------
           CURRENT FIREBASE USER
        -------------------------------------------------- */

        const firebaseUser =
            getCurrentFirebaseUser();


        if (!firebaseUser) {

            throw new Error(
                "User authentication required."
            );

        }


        /* --------------------------------------------------
           FIREBASE ID TOKEN
        -------------------------------------------------- */

        const idToken =
            await firebaseUser.getIdToken();


        /* --------------------------------------------------
           LIVE USER BUNDLE API
        -------------------------------------------------- */
        const response =
            await robustFetch(
                `${API_BASE}/api/user/bundles`,
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json",

                        "Authorization":
                            `Bearer ${idToken}`
                    },

                    cache:
                        "no-store"
                }
            );
            

        const contentType =
            response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            throw new Error(`Server status ${response.status}. Backend server may be offline or deploying.`);
        }

        const result =
            await response.json();


        /* --------------------------------------------------
           AUTH ERROR
        -------------------------------------------------- */

        if (
            response.status ===
            401
        ) {

            throw new Error(
                "Your login session has expired. Please login again."
            );

        }


        /* --------------------------------------------------
           SERVER ERROR
        -------------------------------------------------- */

        if (
            !response.ok
        ) {

            throw new Error(

                result?.message ||

                `Bundle API failed: ${response.status}`

            );

        }


        /* --------------------------------------------------
           RESPONSE VALIDATION
        -------------------------------------------------- */

        if (
            !result ||
            result.success !== true ||
            !Array.isArray(
                result.bundles
            )
        ) {

            throw new Error(
                "Invalid bundle API response."
            );

        }


        /* --------------------------------------------------
           LIVE BUNDLES
        -------------------------------------------------- */

        const liveBundles =
            result.bundles.filter(
                bundle =>
                    bundle &&
                    bundle.active === true
            );


        /* --------------------------------------------------
           UPDATE STATS & CARDS SILENTLY
        -------------------------------------------------- */

        updateBundleStats(
            liveBundles
        );


        renderBundleCards(
            liveBundles
        );

    }

    catch (
        error
    ) {

        if (!isSilent) {

            console.error(
                "[Dashboard] User bundle loading failed:",
                error
            );


            grid.innerHTML = `
                <div class="library-empty">

                    <div class="stat-icon">
                        ⚠️
                    </div>

                    <p>
                        Unable to load bundles.
                    </p>

                    <small>
                        ${escapeHtml(
                            error?.message ||
                            "Please refresh the page and try again."
                        )}
                    </small>

                </div>
            `;


            updateBundleStats(
                []
            );

        }

    }

}


/* ==========================================================
   LIVE BUNDLE AUTO REFRESH
========================================================== */

let bundleRefreshTimer = null;

let bundleRefreshRunning =
    false;


async function refreshLiveBundles() {

    if (bundleRefreshRunning) {

        return;

    }


    if (document.hidden) {

        return;

    }


    bundleRefreshRunning =
        true;


    try {

        await loadLiveBundles(true);

    }

    catch {

        /* Silent background retry */

    }

    finally {

        bundleRefreshRunning =
            false;

    }

}


/* ==========================================================
   START AUTO REFRESH
========================================================== */

function startBundleAutoRefresh() {

    if (bundleRefreshTimer) {

        clearInterval(
            bundleRefreshTimer
        );

    }


    bundleRefreshTimer =
        setInterval(
            refreshLiveBundles,
            10000
        );

}


/* ==========================================================
   STOP AUTO REFRESH
========================================================== */

function stopBundleAutoRefresh() {

    if (bundleRefreshTimer) {

        clearInterval(
            bundleRefreshTimer
        );

        bundleRefreshTimer =
            null;

    }

}


/* ==========================================================
   TAB VISIBILITY
========================================================== */

document.addEventListener(
    "visibilitychange",
    async () => {

        if (document.hidden) {

            stopBundleAutoRefresh();

            return;

        }


        /*
         * Tab visible again:
         * immediately fetch latest bundles.
         */

        await refreshLiveBundles();

        startBundleAutoRefresh();

    }
);


/* ==========================================================
   UPDATE BUNDLE STATS
========================================================== */

function updateBundleStats(
    bundles
) {

    const total =
        bundles.length;


    let unlocked =
        0;


    bundles.forEach(
        (bundle) => {

            if (
                isBundleUnlocked(
                    bundle
                )
            ) {

                unlocked++;

            }

        }
    );


    const locked =
        total - unlocked;


    updateText(
        "totalBundles",
        total
    );


    updateText(
        "unlockedBundles",
        unlocked
    );


    updateText(
        "lockedBundles",
        locked
    );

}


/* ==========================================================
   CHECK BUNDLE ACCESS
========================================================== */

function isBundleUnlocked(
    bundle
) {

    if (!bundle) {

        return false;

    }


    if (lifetimeAccess) {

        return true;

    }


    const bundlePlan =
        String(
            bundle.plan || ""
        )
            .trim()
            .toLowerCase();


    /*
     * Premium purchase includes
     * Basic + Premium.
     */

    if (
        currentPlan === "premium"
    ) {

        return (
            bundlePlan === "basic" ||
            bundlePlan === "premium"
        );

    }


    /*
     * Basic purchase includes
     * Basic only.
     */

    if (
        currentPlan === "basic"
    ) {

        return (
            bundlePlan === "basic"
        );

    }


    /*
     * Free user:
     * everything locked.
     */

    return false;

}


/* ==========================================================
   RENDER BUNDLE CARDS
========================================================== */

function renderBundleCards(
    bundles
) {

    const grid =
        document.getElementById(
            "bundleGrid"
        );


    if (!grid) {

        return;

    }


    if (
        !bundles.length
    ) {

        grid.innerHTML = `
            <div class="library-empty">

                <div class="stat-icon">
                    📦
                </div>

                <p>
                    No active bundles available.
                </p>

                <small>
                    New bundles will appear here automatically
                    when added by the admin.
                </small>

            </div>
        `;

        return;

    }


    const basicBundles =
        bundles.filter(
            (bundle) =>
                String(
                    bundle.plan || ""
                )
                    .toLowerCase() ===
                "basic"
        );


    const premiumBundles =
        bundles.filter(
            (bundle) =>
                String(
                    bundle.plan || ""
                )
                    .toLowerCase() ===
                "premium"
        );


    let html =
        "";


    /* ==============================================
       BASIC SECTION
    ============================================== */

    if (
        basicBundles.length
    ) {

        html += `
            <div class="rb-bundle-section">

                <div class="rb-section-heading">

                    <div>

                        <span class="rb-section-label">
                            BASIC COLLECTION
                        </span>

                        <h3>
                            📦 Basic Bundles
                        </h3>

                    </div>

                    <span class="rb-section-count">
                        ${basicBundles.length}
                        Bundle${basicBundles.length === 1 ? "" : "s"}
                    </span>

                </div>

                <div class="rb-bundle-cards">
        `;


        basicBundles.forEach(
            (bundle) => {

                html +=
                    createBundleCard(
                        bundle
                    );

            }
        );


        html += `
                </div>

            </div>
        `;

    }


    /* ==============================================
       PREMIUM SECTION
    ============================================== */

    if (
        premiumBundles.length
    ) {

        html += `
            <div class="rb-bundle-section rb-premium-section">

                <div class="rb-section-heading">

                    <div>

                        <span class="rb-section-label">
                            PREMIUM COLLECTION
                        </span>

                        <h3>
                            👑 Premium Bundles
                        </h3>

                    </div>

                    <span class="rb-section-count">
                        ${premiumBundles.length}
                        Bundle${premiumBundles.length === 1 ? "" : "s"}
                    </span>

                </div>

                <div class="rb-bundle-cards">
        `;


        premiumBundles.forEach(
            (bundle) => {

                html +=
                    createBundleCard(
                        bundle
                    );

            }
        );


        html += `
                </div>

            </div>
        `;

    }


    grid.innerHTML =
        html;


    injectBundleStyles();

}
/* ==========================================================
   CREATE SINGLE CARD
========================================================== */

function createBundleCard(
    bundle
) {

    const unlocked =
        bundle?.unlocked === true ||
        isBundleUnlocked(
            bundle
        );


    const plan =
        String(
            bundle.plan || ""
        )
            .trim()
            .toLowerCase();


    const planName =
        plan === "premium"
            ? "Premium"
            : "Basic";


    const price =
        plan === "premium"
            ? "₹69"
            : "₹49";


    const name =
        escapeHtml(
            bundle.name ||
            bundle.title ||
            "Reels Bundle"
        );


    const title =
        escapeHtml(
            bundle.title ||
            bundle.name ||
            "Ready-To-Post Reels"
        );


    const thumbnail =
        safeImageUrl(
            bundle.thumbnail
        );


    const image =
        thumbnail
            ? `
                <img
                    src="${thumbnail}"
                    alt="${name}"
                    loading="lazy"
                    onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'rb-no-thumbnail\\'>🎬</div>';"
                >
              `
            : `
                <div class="rb-no-thumbnail">
                    🎬
                </div>
              `;


    const status =
        unlocked
            ? `
                <span class="rb-status rb-status-unlocked">
                    🔓 UNLOCKED
                </span>
              `
            : `
                <span class="rb-status rb-status-locked">
                    🔒 LOCKED
                </span>
              `;


    const action =
        unlocked
            ? `
                <div style="display:flex; gap:6px; width:100%;">
                    <button
                        type="button"
                        class="rb-card-button rb-card-button-unlocked"
                        data-bundle-action="download"
                        data-bundle-id="${escapeAttribute(bundle.id)}"
                        style="flex:1;"
                    >
                        📁 Google Drive
                    </button>
                    ${
                        bundle.megaLink
                            ? `
                                <a
                                    href="${escapeAttribute(bundle.megaLink)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="rb-card-button mega-btn"
                                    style="flex:1; background:rgba(239, 68, 68, 0.18); border:1px solid rgba(239, 68, 68, 0.4); color:#f87171; text-decoration:none; display:inline-flex; align-items:center; justify-content:center;"
                                >
                                    ☁️ MEGA Cloud
                                </a>
                            `
                            : ""
                    }
                </div>
              `
            : `
                <button
                    type="button"
                    class="rb-card-button rb-card-button-locked"
                    data-bundle-action="unlock"
                    data-plan="${planName.toLowerCase()}"
                >
                    🔒 Unlock ${price}
                </button>
              `;


    return `
        <article
            class="rb-bundle-card ${unlocked ? "is-unlocked" : "is-locked"}"
            data-bundle-id="${escapeAttribute(bundle.id)}"
            data-plan="${escapeAttribute(plan)}"
        >

            <div class="rb-card-image">

                ${image}

                <div class="rb-plan-badge">
                    ${
                        plan === "premium"
                            ? "👑 PREMIUM"
                            : "📦 BASIC"
                    }
                </div>

                <div class="rb-status-wrap">
                    ${status}
                </div>

            </div>


            <div class="rb-card-content">

                <div class="rb-card-top">

                    <div>

                        <span class="rb-card-plan">
                            ${planName} Bundle
                        </span>

                        <h4>
                            ${name}
                        </h4>

                    </div>


                    <strong class="rb-card-price">
                        ${price}
                    </strong>

                </div>


                <p class="rb-card-title">
                    ${title}
                </p>


                <div class="rb-card-footer">

                    <span class="rb-card-access">

                        ${
                            unlocked
                                ? "Lifetime Access"
                                : "Purchase required"
                        }

                    </span>


                    ${action}

                </div>

            </div>

        </article>
    `;

}
/* ==========================================================
   DYNAMIC CARD STYLES
========================================================== */

function injectBundleStyles() {

    if (
        document.getElementById(
            "rb-phase2-card-styles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "rb-phase2-card-styles";


    style.textContent = `

        .rb-bundle-section {
            margin-bottom: 32px;
        }

        .rb-section-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
        }

        .rb-section-label {
            display: block;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
            opacity: .55;
            margin-bottom: 5px;
        }

        .rb-section-heading h3 {
            margin: 0;
            font-size: 18px;
        }

        .rb-section-count {
            font-size: 12px;
            opacity: .65;
            white-space: nowrap;
        }

        .rb-bundle-cards {
            display: grid;
            grid-template-columns:
                repeat(
                    auto-fill,
                    minmax(
                        260px,
                        1fr
                    )
                );
            gap: 18px;
        }

        .rb-bundle-card {
            position: relative;
            overflow: hidden;
            border-radius: 18px;
            border: 1px solid
                rgba(
                    255,
                    255,
                    255,
                    .08
                );
            background:
                rgba(
                    255,
                    255,
                    255,
                    .035
                );
            transition:
                transform .2s ease,
                border-color .2s ease,
                box-shadow .2s ease;
        }

        .rb-bundle-card:hover {
            transform:
                translateY(-3px);
            border-color:
                rgba(
                    255,
                    255,
                    255,
                    .16
                );
            box-shadow:
                0 18px 40px
                rgba(
                    0,
                    0,
                    0,
                    .18
                );
        }

        .rb-card-image {
            position: relative;
            height: 165px;
            overflow: hidden;
            background:
                rgba(
                    255,
                    255,
                    255,
                    .04
                );
        }

        .rb-card-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .rb-no-thumbnail {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 42px;
            opacity: .55;
        }

        .rb-plan-badge {
            position: absolute;
            top: 12px;
            left: 12px;
            padding: 6px 9px;
            border-radius: 999px;
            background:
                rgba(
                    0,
                    0,
                    0,
                    .62
                );
            backdrop-filter:
                blur(8px);
            font-size: 10px;
            font-weight: 800;
        }

        .rb-status-wrap {
            position: absolute;
            right: 12px;
            top: 12px;
        }

        .rb-status {
            display: inline-flex;
            align-items: center;
            padding: 6px 9px;
            border-radius: 999px;
            background:
                rgba(
                    0,
                    0,
                    0,
                    .62
                );
            backdrop-filter:
                blur(8px);
            font-size: 10px;
            font-weight: 800;
        }

        .rb-status-unlocked {
            border: 1px solid
                rgba(
                    34,
                    197,
                    94,
                    .25
                );
        }

        .rb-status-locked {
            border: 1px solid
                rgba(
                    245,
                    158,
                    11,
                    .25
                );
        }

        .rb-card-content {
            padding: 16px;
        }

        .rb-card-top {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
        }

        .rb-card-plan {
            font-size: 11px;
            opacity: .55;
        }

        .rb-card-content h4 {
            margin:
                4px 0 0;
            font-size: 16px;
            line-height: 1.3;
        }

        .rb-card-price {
            font-size: 14px;
            white-space: nowrap;
        }

        .rb-card-title {
            margin:
                12px 0;
            font-size: 12px;
            line-height: 1.5;
            opacity: .7;
        }

        .rb-card-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .rb-card-access {
            font-size: 11px;
            opacity: .6;
        }

        .rb-card-button {
    appearance: none;
    -webkit-appearance: none;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    border: 0 !important;
    border-radius: 10px;

    padding: 10px 14px;

    min-height: 40px;

    font-family: inherit;
    font-size: 12px;
    font-weight: 800;

    line-height: 1;
    white-space: nowrap;

    cursor: pointer;

    opacity: 1 !important;

    transition:
        transform .2s ease,
        filter .2s ease,
        box-shadow .2s ease;
}

.rb-card-button-unlocked {
    color: #052e16 !important;
    background: #4ade80 !important;

    box-shadow:
        0 8px 20px rgba(74, 222, 128, .20);
}

.rb-card-button-unlocked:hover {
    color: #022c16 !important;
    background: #22c55e !important;

    transform: translateY(-2px);

    box-shadow:
        0 12px 26px rgba(34, 197, 94, .30);
}

.rb-card-button-locked {
    color: #ffffff !important;

    background:
        linear-gradient(
            135deg,
            #7c3aed,
            #2563eb
        ) !important;

    box-shadow:
        0 8px 20px rgba(59, 130, 246, .20);
}

.rb-card-button-locked:hover {
    filter: brightness(1.12);
    transform: translateY(-2px);
}

        .rb-card-button:hover {
            transform:
                translateY(-1px);
        }

        .rb-card-button:disabled {
            opacity: .6;
            cursor: wait;
            transform: none;
        }

        .rb-card-button-unlocked {
            background:
                rgba(
                    34,
                    197,
                    94,
                    .16
                );
        }

        .rb-card-button-locked {
            background:
                rgba(
                    245,
                    158,
                    11,
                    .16
                );
        }

        @media (
            max-width: 700px
        ) {

            .rb-section-heading {
                align-items:
                    flex-start;
                flex-direction:
                    column;
            }

            .rb-bundle-cards {
                grid-template-columns:
                    1fr;
            }

            .rb-card-image {
                height: 180px;
            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* ==========================================================
   FORMAT NUMBER
========================================================== */

function formatNumber(
    value
) {

    const number =
        Number(
            value || 0
        );


    if (
        !Number.isFinite(
            number
        )
    ) {

        return "0";

    }


    return number.toLocaleString(
        "en-IN"
    );

}


/* ==========================================================
   UPDATE TEXT
========================================================== */

function updateText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


/* ==========================================================
   AVATAR
========================================================== */

function updateAvatar(
    name
) {

    const avatar =
        document.getElementById(
            "userAvatar"
        );


    if (!avatar) {

        return;

    }


    const firstLetter =
        String(
            name || "U"
        )
            .trim()
            .charAt(0)
            .toUpperCase();


    avatar.textContent =
        firstLetter || "U";

}


/* ==========================================================
   NAME FROM EMAIL
========================================================== */

function getNameFromEmail(
    email
) {

    if (!email) {

        return "Creator";

    }


    const localPart =
        email.split("@")[0];


    return localPart
        .replace(
            /[._-]+/g,
            " "
        )
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase()
        );

}


/* ==========================================================
   PLAN FORMAT
========================================================== */

function formatPlan(
    plan
) {

    if (!plan) {

        return "Free";

    }


    const normalized =
        String(
            plan
        )
            .toLowerCase();


    if (
        normalized ===
        "premium"
    ) {

        return "Premium";

    }


    if (
        normalized ===
        "basic"
    ) {

        return "Basic";

    }


    return "Free";

}


/* ==========================================================
   FIREBASE USER WAIT
========================================================== */

function waitForFirebaseUser(
    timeout = 5000
) {

    return new Promise(
        (resolve) => {

            const started =
                Date.now();


            const timer =
                setInterval(
                    () => {

                        const user =
                            getCurrentFirebaseUser();


                        if (user) {

                            clearInterval(
                                timer
                            );


                            resolve(
                                user
                            );


                            return;

                        }


                        if (
                            Date.now() -
                            started >=
                            timeout
                        ) {

                            clearInterval(
                                timer
                            );


                            resolve(
                                null
                            );

                        }

                    },
                    100
                );

        }
    );

}


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
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

    return escapeHtml(
        value
    );

}


/* ==========================================================
   SAFE THUMBNAIL URL
========================================================== */

function safeImageUrl(
    value
) {

    if (!value) {

        return "";

    }

    let str = String(value).trim();
    if (!str) return "";

    if (str.startsWith("data:image/")) {
        return escapeAttribute(str);
    }

    if (/^(www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/)/i.test(str)) {
        str = "https://" + str;
    }

    const driveMatch = str.match(/(?:file\/d\/|id=|folders\/|d\/)([a-zA-Z0-9_-]{20,})/i);
    if (driveMatch && driveMatch[1]) {
        return escapeAttribute(`https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`);
    }

    if (/^[a-zA-Z0-9_-]{25,}$/.test(str)) {
        return escapeAttribute(`https://drive.google.com/thumbnail?id=${str}&sz=w800`);
    }

    const ytMatch = str.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/i);
    if (ytMatch && ytMatch[1]) {
        return escapeAttribute(`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`);
    }

    if (str.includes("dropbox.com")) {
        str = str.replace("dl=0", "raw=1");
    }

    try {

        const url =
            new URL(
                str,
                window.location.origin
            );


        if (
            url.protocol !==
                "http:" &&
            url.protocol !==
                "https:"
        ) {

            return "";

        }


        return escapeAttribute(
            url.href
        );

    }

    catch {

        return "";

    }

}


/* ==========================================================
   SECURE DOWNLOAD
========================================================== */
/* ==========================================================
   SECURE USER BUNDLE DOWNLOAD
   ----------------------------------------------------------
   Dashboard
       ↓
   Firebase ID Token
       ↓
   /api/user/bundles/:bundleId/download
       ↓
   Backend verifies:
       - Firebase user
       - payment ownership
       - purchased plan
       - bundle active
       - encrypted Drive file
       ↓
   Backend returns secure Drive URL
       ↓
   Browser opens Drive
========================================================== */

/* ==========================================================
   SECURE USER BUNDLE DOWNLOAD
   ----------------------------------------------------------
   Dashboard
       ↓
   Firebase User
       ↓
   Fresh Firebase ID Token
       ↓
   /api/user/bundles/:bundleId/download
       ↓
   Backend verifies ownership + entitlement
       ↓
   Backend returns secure download URL
       ↓
   Browser opens secure URL
========================================================== */

async function handleBundleDownload(
    bundleId,
    button
) {

    /* --------------------------------------------------
       VALIDATE BUNDLE ID
    -------------------------------------------------- */

    if (!bundleId) {

        console.error(
            "[Download] Bundle ID missing."
        );

        alert(
            "Bundle information is missing."
        );

        return;
    }


    /* --------------------------------------------------
       PREVENT DOUBLE CLICK
    -------------------------------------------------- */

    if (
        button?.dataset.downloadLoading ===
        "true"
    ) {
        return;
    }


    try {

        /* --------------------------------------------------
           BUTTON LOADING
        -------------------------------------------------- */

        if (button) {

            button.dataset.downloadLoading =
                "true";

            button.disabled =
                true;

            button.dataset.originalText =
                button.innerHTML;

            button.innerHTML =
                "⏳ Preparing...";
        }


        console.log(
            "[Download] Preparing bundle:",
            bundleId
        );


        /* --------------------------------------------------
           GET CURRENT FIREBASE USER
        -------------------------------------------------- */

        let firebaseUser =
            getCurrentFirebaseUser();


        /*
         * Firebase may still be initializing.
         */

        if (!firebaseUser) {

            firebaseUser =
                await waitForFirebaseUser();
        }


        if (!firebaseUser) {

            throw new Error(
                "Your login session has expired. Please login again."
            );
        }


        /* --------------------------------------------------
           GET FRESH FIREBASE ID TOKEN
        -------------------------------------------------- */

        const idToken =
            await getFirebaseIdToken();


        if (!idToken) {

            throw new Error(
                "Authentication token is unavailable. Please login again."
            );
        }


        console.log(
            "[Download] Firebase authentication ready."
        );


        /* --------------------------------------------------
           SECURE DOWNLOAD API
        -------------------------------------------------- */

        const response =
            await robustFetch(
                `${API_BASE}/api/user/bundles/${encodeURIComponent(bundleId)}/download`,
                {
                    method:
                        "GET",

                    headers: {

                        "Accept":
                            "application/json",

                        "Authorization":
                            `Bearer ${idToken}`

                    },

                    cache:
                        "no-store"
                }
            );


        /* --------------------------------------------------
           PARSE RESPONSE
        -------------------------------------------------- */

        let data = null;


        try {

            data =
                await response.json();

        }
        catch (
            parseError
        ) {

            console.error(
                "[Download] Invalid backend response:",
                parseError
            );

            throw new Error(
                "Download server returned an invalid response."
            );
        }


        console.log(
            "[Download] Backend status:",
            response.status
        );


        console.log(
            "[Download] Backend response:",
            data
        );


        /* --------------------------------------------------
           AUTH ERROR
        -------------------------------------------------- */

        if (
            response.status ===
            401
        ) {

            throw new Error(
                data?.message ||
                "Your login session has expired. Please login again."
            );
        }


        /* --------------------------------------------------
           ACCESS DENIED
        -------------------------------------------------- */

        if (
            response.status ===
            403
        ) {

            throw new Error(
                data?.message ||
                "You do not have access to this bundle."
            );
        }


        /* --------------------------------------------------
           NOT FOUND
        -------------------------------------------------- */

        if (
            response.status ===
            404
        ) {

            throw new Error(
                data?.message ||
                "This bundle is no longer available."
            );
        }


        /* --------------------------------------------------
           OTHER SERVER ERROR
        -------------------------------------------------- */

        if (
            !response.ok
        ) {

            throw new Error(
                data?.message ||
                `Download server error (${response.status}).`
            );
        }


        /* --------------------------------------------------
           SUCCESS CHECK
        -------------------------------------------------- */
/* --------------------------------------------------
   SUCCESS
   -------------------------------------------------- */

if (
    !data ||
    data.success !== true
) {
    throw new Error(
        data?.message ||
        "Unable to prepare secure download."
    );
}

/*
 * Do NOT open Google Drive directly here.
 *
 * Open the secure download page instead.
 */

/* --------------------------------------------------
   OPEN SECURE DOWNLOAD PAGE
-------------------------------------------------- */

const downloadPage =
    `download.html?bundleId=${encodeURIComponent(bundleId)}`;

console.log(
    "[Download] Opening secure download page:",
    downloadPage
);

window.location.href =
    downloadPage;

return;

    }


    catch (
        error
    ) {

        console.error(
            "[Download] Failed:",
            error
        );


        alert(
            error?.message ||
            "Unable to start download. Please try again."
        );


        /* --------------------------------------------------
           RESTORE BUTTON
        -------------------------------------------------- */

        if (button) {

            button.disabled =
                false;

            button.dataset.downloadLoading =
                "false";

            button.innerHTML =
                button.dataset.originalText ||
                "⬇️ Download";
        }

    }

}

/* ==========================================================
   UNLOCK BUTTON EVENTS
   ----------------------------------------------------------
   FREE USER
      ↓
   Unlock Basic
      ↓
   payment.html?plan=basic

   FREE USER
      ↓
   Unlock Premium
      ↓
   payment.html?plan=premium
========================================================== */

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                '[data-bundle-action="unlock"]'
            );

        if (!button) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        /* --------------------------------------------------
           GET PLAN
        -------------------------------------------------- */

        const plan =
            String(
                button.dataset.plan || ""
            )
                .trim()
                .toLowerCase();


        /* --------------------------------------------------
           VALIDATE PLAN
        -------------------------------------------------- */

        if (
            plan !== "basic" &&
            plan !== "premium"
        ) {

            console.error(
                "[Unlock] Invalid plan:",
                plan
            );

            alert(
                "Invalid bundle plan."
            );

            return;
        }


        /* --------------------------------------------------
           PREVENT DOUBLE CLICK
        -------------------------------------------------- */

        if (
            button.dataset.unlockLoading ===
            "true"
        ) {
            return;
        }


        try {

            button.dataset.unlockLoading =
                "true";

            button.disabled =
                true;

            button.dataset.originalText =
                button.innerHTML;

            button.innerHTML =
                "⏳ Please wait...";


            console.log(
                "[Unlock] Selected plan:",
                plan
            );


            /* --------------------------------------------------
               CHECK FIREBASE LOGIN
            -------------------------------------------------- */

            let firebaseUser =
                getCurrentFirebaseUser();


            /*
             * Firebase may still be initializing.
             * Give it a short chance to become available.
             */

            if (!firebaseUser) {

                firebaseUser =
                    await waitForFirebaseUser();

            }


            /* --------------------------------------------------
               USER NOT LOGGED IN
            -------------------------------------------------- */

            if (!firebaseUser) {

                console.warn(
                    "[Unlock] User is not logged in."
                );


                /*
                 * Login page can redirect the user
                 * back to payment after authentication.
                 */

                const paymentUrl =
                    `payment.html?plan=${encodeURIComponent(plan)}`;


                window.location.href =
                    `login.html?redirect=${encodeURIComponent(paymentUrl)}`;


                return;
            }


            /* --------------------------------------------------
               USER LOGGED IN
            -------------------------------------------------- */

            console.log(
                "[Unlock] Firebase user:",
                firebaseUser.email || firebaseUser.uid
            );


            /* --------------------------------------------------
               GO TO PAYMENT
            -------------------------------------------------- */

            const paymentUrl =
                `payment.html?plan=${encodeURIComponent(plan)}`;


            console.log(
                "[Unlock] Redirecting to:",
                paymentUrl
            );


            window.location.href =
                paymentUrl;

        }

        catch (error) {

            console.error(
                "[Unlock] Failed:",
                error
            );


            alert(
                error?.message ||
                "Unable to open payment page. Please try again."
            );


            /* --------------------------------------------------
               RESTORE BUTTON
            -------------------------------------------------- */

            button.disabled =
                false;

            button.dataset.unlockLoading =
                "false";

            button.innerHTML =
                button.dataset.originalText ||
                `🔒 Unlock ${plan === "premium" ? "₹69" : "₹49"}`;
        }

    }
);
/* ==========================================================
   DOWNLOAD BUTTON EVENTS
========================================================== */

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                '[data-bundle-action="download"]'
            );


        if (!button) {

            return;

        }


        event.preventDefault();


        const bundleId =
            button.dataset.bundleId;


        await handleBundleDownload(
            bundleId,
            button
        );

    }
);
/* ==========================================================
   CSP-SAFE IMAGE ERROR HANDLER
   ----------------------------------------------------------
   No inline onerror handlers.
   Broken bundle thumbnails are hidden safely.
========================================================== */

document.addEventListener(
    "error",
    (event) => {

        const image =
            event.target;

        if (
            image instanceof
            HTMLImageElement &&
            image.closest(
                ".rb-card-image"
            )
        ) {
            image.style.display =
                "none";
        }

    },
    true
);


async function robustFetch(url, options = {}, retries = 4, delayMs = 2000) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await window.fetch(url, options);
            if (response.ok || response.status === 401 || response.status === 403) {
                return response;
            }
            if (i < retries && (response.status === 502 || response.status === 503 || response.status === 504)) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
            }
            return response;
        } catch (err) {
            console.warn(`[ROBUST FETCH] Attempt ${i + 1} failed for ${url}:`, err);
            if (i === retries) throw err;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
