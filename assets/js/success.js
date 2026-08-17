/* ==========================================================
   REELSBUNDLES
   SUCCESS PAGE
   PAYMENT VERIFICATION
   SECURE DOWNLOAD PAGE

   IMPORTANT:
   - Existing payment/Cashfree verification endpoint preserved
   - Successful payment flow preserved
   - Failed payment redirects to failed.html
========================================================== */

import { getFirebaseIdToken } from "./auth-common.js";


/* ==========================================================
   CONFIG
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

let orderId = null;

let downloadToken = null;

let downloadExpiresAt = null;

let verificationCompleted = false;

let verifiedPayment = null;

let verificationData = null;

let verificationAmount = null;

let failedRedirecting = false;


/* ==========================================================
   DOM ELEMENTS
   MATCHES CURRENT success.html
========================================================== */

const verificationState =
    document.getElementById(
        "verificationState"
    );


const successContent =
    document.getElementById(
        "successContent"
    );


const errorContent =
    document.getElementById(
        "errorContent"
    );


const errorMessageElement =
    document.getElementById(
        "errorMessage"
    );


const verificationBadge =
    document.getElementById(
        "verificationBadge"
    );


const orderIdElement =
    document.getElementById(
        "orderId"
    );


const paymentStatusElement =
    document.getElementById(
        "paymentStatus"
    );


const purchaseDateElement =
    document.getElementById(
        "purchaseDate"
    );


const amountPaidElement =
    document.getElementById(
        "amountPaid"
    );


const bundleNameElement =
    document.getElementById(
        "bundleName"
    );


const bundleAccessElement =
    document.getElementById(
        "bundleAccess"
    );


const bundleFeaturesElement =
    document.getElementById(
        "bundleFeatures"
    );


const successMessageElement =
    document.getElementById(
        "successMessage"
    );


const downloadButton =
    document.getElementById(
        "downloadButton"
    );


const downloadMessage =
    document.getElementById(
        "downloadMessage"
    );


const downloadStatus =
    document.getElementById(
        "downloadStatus"
    );


const invoiceButton =
    document.getElementById(
        "invoiceButton"
    );


/* ==========================================================
   PAGE INIT
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeSuccessPage
);


/* ==========================================================
   INITIALIZE SUCCESS PAGE
========================================================== */

async function initializeSuccessPage() {

    try {

        /*
         * Read order ID from URL.
         *
         * Expected:
         *
         * success.html?order_id=RB_basic_xxxxx
         */

        const params =
            new URLSearchParams(
                window.location.search
            );


        orderId =
            params.get(
                "order_id"
            );


        /*
         * Fallback for orderId.
         */

        if (!orderId) {

            orderId =
                params.get(
                    "orderId"
                );

        }


        /*
         * Order ID is required.
         *
         * This is not a payment failure.
         * Therefore keep it on success page.
         */

        if (!orderId) {

            showVerificationError(
                "Order ID is missing. Please contact support."
            );

            return;

        }


        /*
         * Show order ID immediately.
         */

        setText(
            orderIdElement,
            orderId
        );


        /*
         * Initial verification state.
         */

        showVerificationScreen();


        /*
         * Disable download button while verifying.
         */

        disableDownloadButton();


        /*
         * Verify payment.
         */

        await verifyPayment();


    } catch (error) {

        console.error(
            "[Success] Initialization error:",
            error
        );


        /*
         * Unexpected initialization problem.
         *
         * Do not pretend that payment definitely failed.
         */

        showVerificationError(
            error?.message ||
            "Unable to verify your payment."
        );

    }

}


/* ==========================================================
   VERIFY PAYMENT
========================================================== */

async function verifyPayment() {

    try {

        showVerificationLoading();


        /*
         * IMPORTANT:
         *
         * EXISTING PAYMENT VERIFICATION ENDPOINT.
         *
         * DO NOT CHANGE.
         */

        const verifyUrl =
            `${API_BASE}/api/payment/verify/${encodeURIComponent(orderId)}`;


        console.log(
            "[Success] Verifying order:",
            orderId
        );


        console.log(
            "[Success] Verification URL:",
            verifyUrl
        );


        /*
         * Abort controller for timeout.
         */

        const controller =
            new AbortController();


        /*
         * 30 second timeout.
         */

        const timeout =
            setTimeout(
                () => {

                    controller.abort();

                },
                30000
            );


        let response;


        try {

            /*
             * EXISTING GET REQUEST.
             *
             * PAYMENT FLOW NOT CHANGED.
             */

            const token = await getFirebaseIdToken();
            if (!token) {
                throw new Error("Authentication required. Please login again.");
            }

            response =
                await robustFetch(
                    verifyUrl,
                    {

                        method:
                            "GET",

                        headers: {

                            "Authorization":
                                `Bearer ${token}`,

                            "Accept":
                                "application/json"

                        },

                        cache:
                            "no-store",

                        signal:
                            controller.signal

                    }
                );

        } finally {

            clearTimeout(
                timeout
            );

        }


        console.log(
            "[Success] HTTP status:",
            response.status
        );


        /*
         * Parse backend response.
         */

        const data =
            await parseJsonResponse(
                response
            );


        /*
         * Keep complete verification response.
         */

        verificationData =
            data ||
            {};


        console.log(
            "[Success] Backend response:",
            data
        );


        /*
         * Get amount from response.
         *
         * This fixes the old undefined
         * orderData/paymentData issue.
         */

        verificationAmount =
            getAmountFromResponse(
                data
            );


        /*
         * ==================================================
         * PAYMENT FAILED / VERIFICATION FAILED
         * ==================================================
         *
         * If backend says success !== true,
         * redirect to failed.html.
         */

        if (
            !response.ok ||
            !data ||
            data.success !== true
        ) {

            const failureMessage =
                data?.message ||
                data?.error ||
                getPaymentFailureReason(
                    data
                ) ||
                `Payment verification failed (${response.status}).`;


            redirectToFailedPage(
                failureMessage,
                verificationAmount
            );


            return;

        }


        /*
         * ==================================================
         * PAYMENT VERIFIED
         * ==================================================
         */

        verificationCompleted =
            true;


        verifiedPayment =
            data.payment ||
            null;


        /*
         * Extract secure download object.
         */

        const download =
            data.download ||
            data.payment?.download ||
            null;


        /*
         * Extract secure token.
         */

        downloadToken =
            download?.token ||
            data.downloadToken ||
            data.payment?.downloadToken ||
            null;


        /*
         * Extract token expiry.
         */

        downloadExpiresAt =
            download?.expiresAt ||
            data.expiresAt ||
            data.payment?.expiresAt ||
            null;


        console.log(
            "[Success] Download token received:",
            Boolean(
                downloadToken
            )
        );


        console.log(
            "[Success] Download expiry:",
            downloadExpiresAt
        );


        /*
         * Token must exist for secure download.
         */

        if (!downloadToken) {

            /*
             * Payment itself is successful,
             * but secure download token is missing.
             *
             * This is not treated as a payment failure.
             */

            showVerificationError(
                "Payment was successful, but secure download access could not be created. Please contact support."
            );

            return;

        }


        /*
         * Render payment information.
         */

        renderPaymentDetails(
            data
        );


        /*
         * Show success UI.
         */

        showSuccess();


        /*
         * Enable download button.
         */

        enableDownloadButton();


    } catch (error) {

        console.error(
            "[Success] Payment verification error:",
            error
        );


        verificationCompleted =
            false;


        /*
         * Timeout / network error.
         *
         * We cannot truthfully say that the
         * payment itself failed.
         *
         * Therefore show verification error
         * instead of sending the customer to
         * failed payment page.
         */

        if (
            error?.name ===
            "AbortError"
        ) {

            showVerificationError(
                "Payment verification is taking too long. Please refresh the page and try again."
            );

            return;

        }


        /*
         * Network/server error.
         */

        showVerificationError(
            error?.message ||
            "Unable to verify your payment. Please try again."
        );

    }

}


/* ==========================================================
   PARSE JSON RESPONSE
========================================================== */

async function parseJsonResponse(
    response
) {

    const text =
        await response.text();


    /*
     * Empty response.
     */

    if (!text) {

        return {};

    }


    try {

        return JSON.parse(
            text
        );

    } catch (error) {

        console.error(
            "[Success] Invalid server response:",
            text
        );


        throw new Error(
            `Server returned an invalid response (${response.status}).`
        );

    }

}


/* ==========================================================
   GET AMOUNT FROM BACKEND RESPONSE
========================================================== */

function getAmountFromResponse(
    data
) {

    const payment =
        data?.payment ||
        {};


    const order =
        data?.order ||
        {};


    const amount =
        payment.order_amount ??
        payment.amount ??
        order.order_amount ??
        order.amount ??
        data?.order_amount ??
        data?.amount ??
        null;


    return amount;

}


/* ==========================================================
   GET PAYMENT FAILURE REASON
========================================================== */

function getPaymentFailureReason(
    data
) {

    const payment =
        data?.payment ||
        {};


    const order =
        data?.order ||
        {};


    return (
        payment.order_status ||
        payment.payment_status ||
        payment.paymentStatus ||
        payment.status ||
        order.order_status ||
        order.payment_status ||
        order.paymentStatus ||
        data?.status ||
        null
    );

}


/* ==========================================================
   RENDER PAYMENT DETAILS
========================================================== */

function renderPaymentDetails(
    data
) {

    const payment =
        data?.payment ||
        {};


    const order =
        data?.order ||
        {};


    /*
     * Amount.
     */

    const amount =
        getAmountFromResponse(
            data
        );


    /*
     * Payment status.
     */

    const status =
        payment.order_status ??
        payment.paymentStatus ??
        payment.status ??
        order.order_status ??
        "PAID";


    /*
     * Plan.
     */

    const plan =
        payment.bundlePlan ||
        payment.plan ||
        payment.bundle_plan ||
        order.bundlePlan ||
        order.bundle_plan ||
        order.plan ||
        getPlanFromAmount(
            amount
        );


    /*
     * Bundle name.
     */

    const bundleName =
        getBundleName(
            plan
        );


    /*
     * Purchase date.
     */

    const purchaseDate =
        payment.created_at ||
        payment.createdAt ||
        order.created_at ||
        order.createdAt ||
        null;


    /*
     * Order ID.
     */

    setText(
        orderIdElement,
        order.order_id ||
        payment.order_id ||
        orderId
    );


    /*
     * Payment status.
     */

    setText(
        paymentStatusElement,
        String(
            status
        ).toUpperCase()
    );


    /*
     * Purchase date.
     */

    setText(
        purchaseDateElement,
        formatDate(
            purchaseDate
        )
    );


    /*
     * Amount.
     */

    setText(
        amountPaidElement,
        amount
            ? `₹${amount}`
            : "—"
    );


    /*
     * Bundle name.
     */

    setText(
        bundleNameElement,
        bundleName
    );


    /*
     * Bundle access.
     */

    setText(
        bundleAccessElement,
        plan
            ? `${capitalize(plan)} Bundle • Secure Access Ready`
            : "Secure Bundle Access Ready"
    );


    /*
     * Features.
     */

    renderBundleFeatures(
        plan
    );

}


/* ==========================================================
   GET PLAN FROM AMOUNT
========================================================== */

function getPlanFromAmount(
    amount
) {

    const numericAmount =
        Number(
            amount
        );


    /*
     * FINAL LOCKED PRICES:
     *
     * Basic   = ₹49
     * Premium = ₹69
     */

    if (
        numericAmount ===
        49
    ) {

        return "basic";

    }


    if (
        numericAmount ===
        69
    ) {

        return "premium";

    }


    return "";

}


/* ==========================================================
   GET BUNDLE NAME
========================================================== */

function getBundleName(
    plan
) {

    const normalized =
        String(
            plan ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        normalized ===
        "premium"
    ) {

        return "Premium Bundle";

    }


    if (
        normalized ===
        "basic"
    ) {

        return "Basic Bundle";

    }


    return "ReelsBundles";

}


/* ==========================================================
   RENDER BUNDLE FEATURES
========================================================== */

function renderBundleFeatures(
    plan
) {

    if (!bundleFeaturesElement) {

        return;

    }


    const normalized =
        String(
            plan ||
            ""
        )
            .trim()
            .toLowerCase();


    const features =
        normalized === "premium"

            ? [

                "✓ Premium Bundle Access",

                "✓ Ready-To-Post Reels",

                "✓ Secure Download",

                "✓ Instant Access",

                "✓ Future Updates",

                "✓ Priority Support"

            ]

            : [

                "✓ Basic Bundle Access",

                "✓ Ready-To-Post Reels",

                "✓ Secure Download",

                "✓ Instant Access",

                "✓ Standard Support"

            ];


    /*
     * Existing UL.
     */

    if (
        bundleFeaturesElement.tagName ===
        "UL"
    ) {

        bundleFeaturesElement.innerHTML =
            "";


        features.forEach(
            feature => {

                const li =
                    document.createElement(
                        "li"
                    );


                li.textContent =
                    feature;


                bundleFeaturesElement.appendChild(
                    li
                );

            }
        );


        return;

    }


    /*
     * Fallback for non-list element.
     */

    bundleFeaturesElement.textContent =
        features.join(
            " • "
        );

}


/* ==========================================================
   SHOW VERIFICATION SCREEN
========================================================== */

function showVerificationScreen() {

    /*
     * Show verification state.
     */

    if (verificationState) {

        verificationState.classList.remove(
            "hidden"
        );

    }


    /*
     * Hide success.
     */

    if (successContent) {

        successContent.classList.add(
            "hidden"
        );

    }


    /*
     * Hide old inline error state.
     */

    if (errorContent) {

        errorContent.classList.add(
            "hidden"
        );

    }

}


/* ==========================================================
   SHOW VERIFICATION LOADING
========================================================== */

function showVerificationLoading() {

    if (verificationState) {

        verificationState.classList.remove(
            "hidden"
        );

    }


    if (successContent) {

        successContent.classList.add(
            "hidden"
        );

    }


    if (errorContent) {

        errorContent.classList.add(
            "hidden"
        );

    }


    if (paymentStatusElement) {

        paymentStatusElement.textContent =
            "VERIFYING";

    }


    if (downloadButton) {

        downloadButton.disabled =
            true;


        downloadButton.textContent =
            "🔒 Verifying Payment...";

    }

}


/* ==========================================================
   SHOW SUCCESS
========================================================== */

function showSuccess() {

    console.log(
        "[Success] Showing SUCCESS UI."
    );


    /*
     * Hide verification loader.
     */

    if (verificationState) {

        verificationState.classList.add(
            "hidden"
        );

    }


    /*
     * Show success content.
     */

    if (successContent) {

        successContent.classList.remove(
            "hidden"
        );

    }


    /*
     * Hide inline error.
     */

    if (errorContent) {

        errorContent.classList.add(
            "hidden"
        );

    }


    /*
     * Verification badge.
     */

    if (verificationBadge) {

        verificationBadge.textContent =
            "🛡 Payment Verified";

    }
     /*
     * Payment is already verified by backend.
     *
     * Show success page briefly,
     * then send the authenticated user
     * directly to the User Dashboard.
     */

    setTimeout(
        () => {

            window.location.replace(
                "download.html"
            );

        },
        2000
    );

    /*
     * Success message.
     */

    setText(
        successMessageElement,
        "Payment successful! Your bundle is ready to download go to Dashboard."
    );


    /*
     * Payment status.
     */

    setText(
        paymentStatusElement,
        "PAID"
    );

}


/* ==========================================================
   ENABLE DOWNLOAD BUTTON
========================================================== */

function enableDownloadButton() {
    if (!downloadButton) {
        console.error("[Success] downloadButton not found.");
        return;
    }

    /* Lifetime access flow: no temporary token/expiry is required. */
    downloadButton.disabled = false;
    downloadButton.textContent = "📦 Open My Downloads";
    downloadButton.onclick = handleDownload;

    showDownloadStatus(
        "Payment verified. Your bundle is now available in My Downloads.",
        "success"
    );
}


/* ==========================================================
   DISABLE DOWNLOAD BUTTON
========================================================== */

function disableDownloadButton() {

    if (!downloadButton) {

        return;

    }


    downloadButton.disabled =
        true;


    downloadButton.textContent =
        "🔒 Verifying Payment...";


    downloadButton.onclick =
        null;

}


/* ==========================================================
   HANDLE DOWNLOAD
========================================================== */

function handleDownload() {
    if (!verificationCompleted) {
        showDownloadStatus(
            "Payment verification is not complete.",
            "error"
        );
        return;
    }

    if (downloadButton) {
        downloadButton.disabled = true;
        downloadButton.textContent = "⏳ Opening Downloads...";
    }

    showDownloadStatus(
        "Payment verified. Opening your ReelsBundles library...",
        "success"
    );

    window.location.replace("download.html");
}


/* ==========================================================
   CHECK DOWNLOAD EXPIRY
========================================================== */

function isDownloadExpired() {

    if (!downloadExpiresAt) {

        return false;

    }


    const expiry =
        new Date(
            downloadExpiresAt
        ).getTime();


    if (
        !Number.isFinite(
            expiry
        )
    ) {

        return false;

    }


    return (
        Date.now() >=
        expiry
    );

}


/* ==========================================================
   DOWNLOAD STATUS
========================================================== */

function showDownloadStatus(
    message,
    type = ""
) {

    if (downloadStatus) {

        downloadStatus.textContent =
            message;


        downloadStatus.className =
            "download-status";


        if (type) {

            downloadStatus.classList.add(
                type
            );

        }

    }


    if (downloadMessage) {

        downloadMessage.textContent =
            message;

    }

}


/* ==========================================================
   REDIRECT TO FAILED PAYMENT PAGE
========================================================== */

function redirectToFailedPage(
    message = "Payment could not be completed.",
    amount = null
) {

    /*
     * Prevent duplicate redirect.
     */

    if (
        failedRedirecting ||
        window.__failedRedirecting === true
    ) {

        return;

    }


    failedRedirecting =
        true;


    window.__failedRedirecting =
        true;


    /*
     * Get final amount.
     *
     * IMPORTANT:
     * No undefined orderData/paymentData.
     */

    let finalAmount =
        amount;


    if (
        finalAmount === null ||
        finalAmount === undefined ||
        finalAmount === ""
    ) {

        finalAmount =
            verificationAmount;

    }


    /*
     * If still unavailable,
     * try current response.
     */

    if (
        (
            finalAmount === null ||
            finalAmount === undefined ||
            finalAmount === ""
        ) &&
        verificationData
    ) {

        finalAmount =
            getAmountFromResponse(
                verificationData
            );

    }


    /*
     * Build URL.
     */

    const params =
        new URLSearchParams();


    /*
     * Order ID.
     */

    if (orderId) {

        params.set(
            "order_id",
            orderId
        );

    }


    /*
     * Amount.
     */

    if (
        finalAmount !== null &&
        finalAmount !== undefined &&
        finalAmount !== ""
    ) {

        params.set(
            "amount",
            String(
                finalAmount
            )
        );

    }


    /*
     * Failure reason.
     */

    if (message) {

        params.set(
            "reason",
            String(
                message
            )
        );

    }


    /*
     * Redirect to failed page.
     */

    const failedUrl =
        `failed.html?${params.toString()}`;


    console.log(
        "[Success] Redirecting to failed page:",
        failedUrl
    );


    window.location.replace(
        failedUrl
    );

}


/* ==========================================================
   SHOW ERROR
   INTERNAL / NON-PAYMENT VERIFICATION ERROR
========================================================== */

function showVerificationError(
    message
) {

    console.error(
        "[Success] Verification error:",
        message
    );


    /*
     * Hide verification loader.
     */

    if (verificationState) {

        verificationState.classList.add(
            "hidden"
        );

    }


    /*
     * Hide success content.
     */

    if (successContent) {

        successContent.classList.add(
            "hidden"
        );

    }


    /*
     * Show existing inline error.
     *
     * This is used for:
     * - missing order ID
     * - network timeout
     * - temporary server issue
     * - successful payment but missing token
     *
     * We do NOT falsely call these payment failures.
     */

    if (errorContent) {

        errorContent.classList.remove(
            "hidden"
        );

    }


    /*
     * Error message.
     */

    setText(
        errorMessageElement,
        message ||
        "We could not verify this payment."
    );


    /*
     * Badge.
     */

    if (verificationBadge) {

        verificationBadge.textContent =
            "⚠ Payment Verification";

    }


    /*
     * Status.
     */

    setText(
        paymentStatusElement,
        "VERIFICATION FAILED"
    );


    /*
     * Disable download.
     */

    disableDownloadButton();

}


/* ==========================================================
   FORMAT DATE
========================================================== */

function formatDate(
    value
) {

    if (!value) {

        return "—";

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

        return String(
            value
        );

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

}


/* ==========================================================
   SAFE TEXT
========================================================== */

function setText(
    element,
    value
) {

    if (!element) {

        return;

    }


    element.textContent =
        value == null
            ? ""
            : String(
                value
            );

}


/* ==========================================================
   CAPITALIZE
========================================================== */

function capitalize(
    value
) {

    if (!value) {

        return "";

    }


    const text =
        String(
            value
        );


    return (
        text.charAt(0)
            .toUpperCase() +
        text.slice(1)
    );

}


/* ==========================================================
   EXPIRY WATCH
========================================================== */

setInterval(
    () => {

        /*
         * Only check after successful verification.
         */

        if (
            verificationCompleted &&
            downloadToken &&
            isDownloadExpired()
        ) {

            if (downloadButton) {

                downloadButton.disabled =
                    true;


                downloadButton.textContent =
                    "Download Expired";

            }


            showDownloadStatus(
                "Your secure download link has expired.",
                "error"
            );

        }

    },
    30000
);


async function robustFetch(url, options = {}, retries = 2, delayMs = 1500) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await robustFetch(url, options);
            return response;
        } catch (err) {
            console.warn(`[ROBUST FETCH] Attempt ${i + 1} failed for ${url}:`, err);
            if (i === retries) throw err;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
