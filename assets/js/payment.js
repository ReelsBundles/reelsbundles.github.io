"use strict";
import {
    getFirebaseIdToken
} from "./auth-common.js";
import { auth } from "./firebase-client.js";
import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
/* ==========================================================
   REELSBUNDLES PAYMENT
   PAYMENT PAGE JAVASCRIPT
========================================================== */


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


/*
 * Cashfree mode.
 *
 * Current project is using Cashfree.
 * Keep "sandbox" while testing.
 *
 * Production mein backend/payment credentials
 * production par switch karne ke baad "production"
 * karna hai.
 */

const CASHFREE_MODE =
    "sandbox";


/* ==========================================================
   PLAN CONFIG
========================================================== */

const PLANS = {

    basic: {

        id: "basic",

        name: "Basic Bundle",

        price: 49,

        oldPrice: 99,

        saving: 50,

        icon: "📦",

        access:
            "Limited Bundle Access",

        features: [

            "Limited Bundle Access",

            "2 Downloads",

            "Temporary Download Link",

            "30 Minute Access",

            "Standard Support"

        ]

    },


    premium: {

        id: "premium",

        name: "Premium Bundle",

        price: 69,

        oldPrice: 149,

        saving: 80,

        icon: "👑",

        access:
            "Lifetime Access",

        features: [

            "Lifetime Access",

            "Unlimited Downloads",

            "Direct Bundle Download",

            "Future Updates",

            "Priority Support"

        ]

    }

};


/* ==========================================================
   READ PLAN FROM URL
========================================================== */

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const requestedPlan =
    (
        urlParams.get("plan") ||
        "premium"
    ).toLowerCase();


let currentPlan =
    PLANS[requestedPlan]
        ? requestedPlan
        : "premium";


/* ==========================================================
   PAYMENT STATE
========================================================== */

let paymentOrderId =
    null;


let isProcessingPayment =
    false;


/* ==========================================================
   DOM ELEMENTS
========================================================== */

const planCards =
    document.querySelectorAll(
        ".plan-card"
    );


const fullNameInput =
    document.getElementById(
        "fullName"
    );


const emailInput =
    document.getElementById(
        "email"
    );


const phoneInput =
    document.getElementById(
        "phone"
    );


const agreeTerms =
    document.getElementById(
        "agreeTerms"
    );


const summaryIcon =
    document.getElementById(
        "summaryIcon"
    );


const summaryProduct =
    document.getElementById(
        "summaryProduct"
    );


const summaryAccess =
    document.getElementById(
        "summaryAccess"
    );


const summaryPrice =
    document.getElementById(
        "summaryPrice"
    );


const subtotalPrice =
    document.getElementById(
        "subtotalPrice"
    );


const discountPrice =
    document.getElementById(
        "discountPrice"
    );


const savingPrice =
    document.getElementById(
        "savingPrice"
    );


const totalPrice =
    document.getElementById(
        "totalPrice"
    );


const orderIdElement =
    document.getElementById(
        "orderId"
    );


const checkoutButton =
    document.getElementById(
        "checkoutButton"
    );


const paymentLoader =
    document.getElementById(
        "paymentLoader"
    );


const couponInput =
    document.getElementById(
        "coupon"
    );


const couponButton =
    document.getElementById(
        "couponButton"
    );


const couponMessage =
    document.getElementById(
        "couponMessage"
    );


/* ==========================================================
   SAFETY CHECK
========================================================== */

if (!checkoutButton) {

    console.error(
        "ReelsBundles: checkoutButton not found."
    );

}


/* ==========================================================
   MONEY FORMAT
========================================================== */

function formatMoney(
    amount
) {

    return `₹${Number(amount).toFixed(0)}`;

}


/* ==========================================================
   GET CURRENT PLAN
========================================================== */

function getCurrentPlan() {

    return PLANS[currentPlan];

}


/* ==========================================================
   PLAN CARD UI
========================================================== */

function updatePlanCards() {

    planCards.forEach(
        (card) => {

            const plan =
                card.dataset.plan;


            const isActive =
                plan === currentPlan;


            card.classList.toggle(
                "active",
                isActive
            );


            const button =
                card.querySelector(
                    ".plan-select"
                );


            if (!button) {

                return;

            }


            button.textContent =
                isActive
                    ? "✓ Selected"
                    : "Select Plan";

        }
    );

}


/* ==========================================================
   SUMMARY UPDATE
========================================================== */

function updateSummary() {

    const plan =
        getCurrentPlan();


    if (!plan) {

        return;

    }


    /* PRODUCT */

    if (summaryProduct) {

        summaryProduct.textContent =
            plan.name;

    }


    /* ACCESS */

    if (summaryAccess) {

        summaryAccess.textContent =
            plan.access;

    }


    /* ICON */

    if (summaryIcon) {

        summaryIcon.textContent =
            plan.icon;

    }


    /* PRODUCT PRICE */

    if (summaryPrice) {

        summaryPrice.textContent =
            formatMoney(
                plan.price
            );

    }


    /* SUBTOTAL */

    if (subtotalPrice) {

        subtotalPrice.textContent =
            formatMoney(
                plan.price
            );

    }


    /* DISCOUNT */

    if (discountPrice) {

        discountPrice.textContent =
            "₹0";

    }


    /* SAVING */

    if (savingPrice) {

        savingPrice.textContent =
            formatMoney(
                plan.saving
            );

    }


    /* TOTAL */

    if (totalPrice) {

        totalPrice.textContent =
            formatMoney(
                plan.price
            );

    }


    /* PAY BUTTON */

    if (
        checkoutButton &&
        !isProcessingPayment
    ) {

        checkoutButton.textContent =
            `🔒 Pay ${formatMoney(plan.price)} Securely`;

    }


    updatePlanCards();

}


/* ==========================================================
   SELECT PLAN
========================================================== */

planCards.forEach(
    (card) => {

        card.addEventListener(
            "click",
            () => {

                const selectedPlan =
                    card.dataset.plan;


                if (
                    !PLANS[selectedPlan]
                ) {

                    return;

                }


                if (
                    isProcessingPayment
                ) {

                    return;

                }


                currentPlan =
                    selectedPlan;


                /*
                 * Keep URL synchronized.
                 *
                 * Example:
                 * payment.html?plan=basic
                 */

                const newUrl =
                    `${window.location.pathname}?plan=${encodeURIComponent(currentPlan)}`;


                window.history.replaceState(
                    {},
                    "",
                    newUrl
                );


                updateSummary();

            }
        );

    }
);


/* ==========================================================
   LOADER
========================================================== */

function showLoader() {

    if (!paymentLoader) {

        return;

    }


    paymentLoader.classList.remove(
        "hidden"
    );

}


function hideLoader() {

    if (!paymentLoader) {

        return;

    }


    paymentLoader.classList.add(
        "hidden"
    );

}


/* ==========================================================
   CUSTOMER DATA
========================================================== */

function getCustomerData() {

    return {

        fullName:
            fullNameInput
                ? fullNameInput.value.trim()
                : "",

        email:
            emailInput
                ? emailInput.value.trim()
                : "",

        phone:
            phoneInput
                ? phoneInput.value.trim()
                : "",

        agree:
            Boolean(
                agreeTerms &&
                agreeTerms.checked
            )

    };

}


/* ==========================================================
   EMAIL VALIDATION
========================================================== */

function isValidEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


/* ==========================================================
   PHONE VALIDATION
========================================================== */

function normalizePhone(
    phone
) {

    return String(phone)
        .replace(/\D/g, "");

}


function isValidPhone(
    phone
) {

    const normalized =
        normalizePhone(phone);


    return (
        normalized.length >= 10 &&
        normalized.length <= 15
    );

}


/* ==========================================================
   CUSTOMER VALIDATION
========================================================== */

function validateCustomer(
    customer
) {

    if (
        !customer.fullName ||
        customer.fullName.length < 2
    ) {

        alert(
            "Please enter your full name."
        );


        fullNameInput?.focus();


        return false;

    }


    if (
        !customer.email
    ) {

        alert(
            "Please enter your email address."
        );


        emailInput?.focus();


        return false;

    }


    if (
        !isValidEmail(
            customer.email
        )
    ) {

        alert(
            "Please enter a valid email address."
        );


        emailInput?.focus();


        return false;

    }


    if (
        !customer.phone
    ) {

        alert(
            "Please enter your phone number."
        );


        phoneInput?.focus();


        return false;

    }


    if (
        !isValidPhone(
            customer.phone
        )
    ) {

        alert(
            "Please enter a valid phone number."
        );


        phoneInput?.focus();


        return false;

    }


    if (
        !customer.agree
    ) {

        alert(
            "Please accept the Terms and Privacy Policy."
        );


        agreeTerms?.focus();


        return false;

    }


    return true;

}


/* ==========================================================
   SAVE CHECKOUT SESSION
========================================================== */

function saveCheckoutSession(
    data
) {

    try {

        sessionStorage.setItem(

            "reelsbundles_checkout",

            JSON.stringify({

                orderId:
                    data.order.order_id,

                plan:
                    currentPlan,

                customer: {

                    fullName:
                        data.customer.fullName,

                    email:
                        data.customer.email,

                    phone:
                        data.customer.phone

                },

                createdAt:
                    new Date().toISOString()

            })

        );

    }
    catch (error) {

        console.warn(
            "Unable to save checkout session:",
            error
        );

    }

}


/* ==========================================================
   CREATE ORDER
========================================================== */

async function createPaymentOrder(customer) {

    const idToken =
        await getFirebaseIdToken();

    if (!idToken) {

        throw new Error(
            "Authentication required. Please login again."
        );

    }

    const response =
        await fetch(
            `${API_BASE}/api/payment/create-order`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${idToken}`
                },

                body: JSON.stringify({

                    plan:
                        currentPlan,

                    fullName:
                        customer.fullName,

                    email:
                        customer.email,

                    phone:
                        normalizePhone(
                            customer.phone
                        ),

                    couponCode:
                        appliedCoupon
                            ? appliedCoupon.code
                            : undefined

                })
            }
        );


    let data;

    try {

        data =
            await response.json();

    }
    catch {

        throw new Error(
            "Invalid response received from payment server."
        );

    }


    if (
        !response.ok ||
        !data ||
        !data.success
    ) {

        let msg = data?.message || "Unable to create payment order.";
        if (String(msg).toLowerCase().includes("authentication failed")) {
            msg = "Payment Gateway Credentials Error: Please check Cashfree API Keys on server.";
        }

        throw new Error(
            msg
        );

    }


    if (
        !data.order ||
        !data.order.order_id
    ) {

        throw new Error(
            "Payment order ID was not returned by the server."
        );

    }


    if (
        !data.payment ||
        !data.payment.payment_session_id
    ) {

        throw new Error(
            "Cashfree payment session was not returned by the server."
        );

    }


    return data;
}

/* ==========================================================
   UPDATE ORDER ID
========================================================== */

function updateOrderId(
    id
) {

    paymentOrderId =
        id || null;


    if (
        orderIdElement &&
        paymentOrderId
    ) {

        orderIdElement.textContent =
            paymentOrderId;

    }

}

/* ==========================================================
   LOAD CASHFREE SDK
========================================================== */

const CASHFREE_SDK_URL =
    "https://sdk.cashfree.com/js/v3/cashfree.js";

let cashfreeSDKPromise = null;

function loadCashfreeSDK() {

    /* Already available */
    if (
        typeof window.Cashfree ===
        "function"
    ) {
        return Promise.resolve(
            window.Cashfree
        );
    }

    /* Already loading */
    if (cashfreeSDKPromise) {
        return cashfreeSDKPromise;
    }

    cashfreeSDKPromise =
        new Promise(
            (resolve, reject) => {

                let script =
                    document.querySelector(
                        'script[src*="sdk.cashfree.com/js/v3/cashfree.js"]'
                    );

                /* ==================================================
                   SAFETY TIMEOUT
                ================================================== */

                const timeout =
                    setTimeout(
                        () => {

                            reject(
                                new Error(
                                    "Cashfree SDK loading timed out. Please check the browser console, internet connection and CSP settings."
                                )
                            );

                        },
                        10000
                    );

                /* ==================================================
                   CHECK GLOBAL
                ================================================== */

                const checkCashfree =
                    () => {

                        if (
                            typeof window.Cashfree ===
                            "function"
                        ) {

                            clearTimeout(
                                timeout
                            );

                            resolve(
                                window.Cashfree
                            );

                            return true;
                        }

                        return false;
                    };

                /* Already available */
                if (
                    checkCashfree()
                ) {
                    return;
                }

                /* ==================================================
                   EXISTING SCRIPT
                ================================================== */

                if (script) {

                    const handleLoad =
                        () => {

                            if (
                                checkCashfree()
                            ) {
                                return;
                            }

                            clearTimeout(
                                timeout
                            );

                            reject(
                                new Error(
                                    "Cashfree SDK loaded but window.Cashfree was not initialized."
                                )
                            );
                        };

                    const handleError =
                        () => {

                            clearTimeout(
                                timeout
                            );

                            reject(
                                new Error(
                                    "Cashfree SDK could not be loaded."
                                )
                            );
                        };

                    script.addEventListener(
                        "load",
                        handleLoad,
                        {
                            once: true
                        }
                    );

                    script.addEventListener(
                        "error",
                        handleError,
                        {
                            once: true
                        }
                    );

                    return;
                }

                /* ==================================================
                   CREATE SCRIPT
                ================================================== */

                script =
                    document.createElement(
                        "script"
                    );

                script.src =
                    CASHFREE_SDK_URL;

                script.async =
                    true;

                script.onload =
                    () => {

                        if (
                            checkCashfree()
                        ) {
                            return;
                        }

                        clearTimeout(
                            timeout
                        );

                        reject(
                            new Error(
                                "Cashfree SDK loaded but Cashfree function is unavailable."
                            )
                        );
                    };

                script.onerror =
                    () => {

                        clearTimeout(
                            timeout
                        );

                        reject(
                            new Error(
                                "Cashfree SDK failed to load. Check CSP/network settings."
                            )
                        );
                    };

                document.head.appendChild(
                    script
                );
            }
        );

    return cashfreeSDKPromise;
}

/* ==========================================================
   WAIT FOR CASHFREE GLOBAL
========================================================== */

function waitForCashfree(
    resolve,
    reject
) {

    const startedAt =
        Date.now();


    const check =
        () => {

            if (
                typeof window.Cashfree ===
                "function"
            ) {

                resolve(
                    window.Cashfree
                );

                return;

            }


            /*
             * Wait maximum 5 seconds
             */
            if (
                Date.now() -
                startedAt >=
                5000
            ) {

                reject(
                    new Error(
                        "Cashfree SDK loaded, but the Cashfree checkout function is unavailable."
                    )
                );

                return;

            }


            setTimeout(
                check,
                100
            );

        };


    check();

}


/* ==========================================================
   OPEN CASHFREE CHECKOUT
========================================================== */

async function openCashfreeCheckout(
    paymentSessionId
) {

    /*
     * Payment session required
     */
    if (!paymentSessionId) {

        throw new Error(
            "Cashfree payment session is missing."
        );

    }


    /*
     * Load Cashfree SDK
     */
    const Cashfree =
        await loadCashfreeSDK();


    /*
     * Verify SDK
     */
    if (
        typeof Cashfree !==
        "function"
    ) {

        throw new Error(
            "Cashfree checkout could not be initialized."
        );

    }


    /*
     * Initialize Cashfree
     */
    const cashfree =
        Cashfree({

            mode:
                CASHFREE_MODE

        });


    /*
     * Verify checkout
     */
    if (
        !cashfree ||
        typeof cashfree.checkout !==
            "function"
    ) {

        throw new Error(
            "Cashfree checkout could not be initialized."
        );

    }


    /*
     * Open Cashfree Checkout
     */
    await cashfree.checkout({

        paymentSessionId:
            paymentSessionId,

        redirectTarget:
            "_self"

    });

}


/* ==========================================================
   PAYMENT BUTTON STATE
========================================================== */

function setPaymentProcessing(
    processing
) {

    isProcessingPayment =
        processing;


    if (!checkoutButton) {

        return;

    }


    checkoutButton.disabled =
        processing;


    if (processing) {

        checkoutButton.textContent =
            "⏳ Creating Secure Order...";

    }
    else {

        updateSummary();

    }

}


/* ==========================================================
   CHECKOUT CLICK
========================================================== */

checkoutButton?.addEventListener(

    "click",

    async () => {


        /*
         * Prevent double-click payment orders.
         */

        if (
            isProcessingPayment
        ) {

            return;

        }


        const customer =
            getCustomerData();


        if (
            !validateCustomer(
                customer
            )
        ) {

            return;

        }


        const selectedPlan =
            getCurrentPlan();


        if (!selectedPlan) {

            alert(
                "Please select a valid plan."
            );

            return;

        }


        showLoader();


        setPaymentProcessing(
            true
        );


        try {


            /* ==============================================
               CREATE ORDER
            ============================================== */

            const data =
                await createPaymentOrder(
                    customer
                );


            /* ==============================================
               ORDER ID
            ============================================== */

            updateOrderId(
                data.order.order_id
            );


            /* ==============================================
               SAVE CHECKOUT SESSION
            ============================================== */

            saveCheckoutSession({

                order:
                    data.order,

                customer

            });


            /*
             * The backend already creates/saves the
             * payment record and secure download token.
             *
             * Frontend does NOT create a token.
             */


            /* ==============================================
               CASHFREE CHECKOUT
            ============================================== */

            if (
                checkoutButton
            ) {

                checkoutButton.textContent =
                    "🔐 Opening Secure Payment...";

            }


            await openCashfreeCheckout(

                data
                    .payment
                    .payment_session_id

            );

        }
        catch (error) {

            console.error(
                "ReelsBundles Payment Error:",
                error
            );


            alert(

                error?.message ||

                "Payment initialization failed. Please try again."

            );

        }
        finally {

            hideLoader();


            setPaymentProcessing(
                false
            );

        }

    }

);


let appliedCoupon = null;

couponButton?.addEventListener(

    "click",

    async () => {

        const code =
            couponInput
                ? couponInput.value
                    .trim()
                    .toUpperCase()
                : "";


        if (!code) {

            if (couponMessage) {

                couponMessage.textContent =
                    "Please enter a coupon code.";

                couponMessage.style.color =
                    "#fbbf24";

            }

            return;

        }

        if (couponMessage) {
            couponMessage.textContent = "Validating coupon...";
            couponMessage.style.color = "#a78bfa";
        }

        try {
            const response = await fetch(`${API_BASE}/apply-coupon`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, planKey: currentPlan })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                appliedCoupon = null;
                if (couponMessage) {
                    couponMessage.textContent = data.message || "Invalid coupon code.";
                    couponMessage.style.color = "#ef4444";
                }
                return;
            }

            appliedCoupon = data.coupon;

            if (discountPrice) {
                discountPrice.textContent = `₹${data.discountAmount}`;
            }

            if (totalPrice) {
                totalPrice.textContent = `₹${data.finalPrice}`;
            }

            if (checkoutButton) {
                checkoutButton.textContent = `🔒 Pay ₹${data.finalPrice} Securely`;
            }

            if (couponMessage) {
                couponMessage.textContent = `✓ ${data.message}`;
                couponMessage.style.color = "#4ade80";
            }
        } catch (err) {
            if (couponMessage) {
                couponMessage.textContent = "Unable to validate coupon at this time.";
                couponMessage.style.color = "#ef4444";
            }
        }

    }

);


/* ==========================================================
   PHONE INPUT
========================================================== */

phoneInput?.addEventListener(

    "input",

    () => {

        /*
         * Keep only numbers and +.
         */

        let value =
            phoneInput.value
                .replace(/[^\d+]/g, "");


        /*
         * Allow + only at the beginning.
         */

        if (
            value.includes("+")
        ) {

            value =
                "+" +
                value
                    .replace(/\+/g, "")
                    .slice(0, 14);

        }
        else {

            value =
                value.slice(0, 15);

        }


        phoneInput.value =
            value;

    }

);


/* ==========================================================
   EMAIL ENTER
========================================================== */

emailInput?.addEventListener(

    "keydown",

    (event) => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            checkoutButton?.click();

        }

    }

);


/* ==========================================================
   FORM ENTER SUPPORT
========================================================== */

[
    fullNameInput,
    emailInput,
    phoneInput
].forEach(

    (input) => {

        input?.addEventListener(

            "keydown",

            (event) => {

                if (
                    event.key !==
                    "Enter"
                ) {

                    return;

                }


                event.preventDefault();


                if (
                    input ===
                    fullNameInput
                ) {

                    emailInput?.focus();

                    return;

                }


                if (
                    input ===
                    emailInput
                ) {

                    phoneInput?.focus();

                    return;

                }


                checkoutButton?.click();

            }

        );

    }

);


/* ==========================================================
   INITIALIZE
========================================================== */

function initializePaymentPage() {

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            const currentUrl = window.location.pathname + window.location.search;
            window.location.replace(`login.html?redirect=${encodeURIComponent(currentUrl)}`);
        } else {
            if (fullNameInput && !fullNameInput.value) {
                fullNameInput.value = user.displayName || "";
            }
            if (emailInput && !emailInput.value) {
                emailInput.value = user.email || "";
            }
        }
    });

    /*
     * URL:
     *
     * payment.html?plan=basic
     *
     * or
     *
     * payment.html?plan=premium
     */


    updateSummary();


    /*
     * Show the current plan in URL.
     *
     * This does not reload the page.
     */

    try {

        const expectedPlan =
            urlParams.get("plan");


        if (
            expectedPlan !==
            currentPlan
        ) {

            const newUrl =
                `${window.location.pathname}?plan=${encodeURIComponent(currentPlan)}`;


            window.history.replaceState(
                {},
                "",
                newUrl
            );

        }

    }
    catch {

        /*
         * URL synchronization is non-critical.
         */

    }

}


/* ==========================================================
   PAGE LOAD
========================================================== */

window.addEventListener(
    "load",
    () => {

        initializePaymentPage();

        if (window.innerWidth > 600) {
            fullNameInput?.focus();
        }

    }
);
/* ==========================================================
   BACK/FORWARD URL SUPPORT
========================================================== */

window.addEventListener(

    "popstate",

    () => {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const plan =
            (
                params.get("plan") ||
                "premium"
            ).toLowerCase();


        if (
            PLANS[plan]
        ) {

            currentPlan =
                plan;

        }


        updateSummary();

    }

);
        


