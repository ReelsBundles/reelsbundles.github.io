/* ==========================================================
   REELSBUNDLES — BUY BUTTON AUTHENTICATION GUARD
   INTERCEPTS ALL BUY/PAYMENT BUTTON CLICKS IN < 1 SECOND
========================================================== */

import { auth } from "./firebase-client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

(function () {
    let authChecked = false;
    let currentUser = null;

    // Fast tracking of Firebase auth state
    onAuthStateChanged(auth, (user) => {
        authChecked = true;
        currentUser = user;
    });

    // Check fast local session fallback
    function isLocallyLoggedIn() {
        try {
            const userSession = localStorage.getItem("rb_user_session") || sessionStorage.getItem("rb_user_session");
            const firebaseUser = localStorage.getItem("firebase_user") || sessionStorage.getItem("firebase_user");
            return Boolean(userSession || firebaseUser || auth.currentUser);
        } catch (e) {
            return false;
        }
    }

    async function handleBuyClick(e) {
        const link = e.target.closest("a[href*='payment.html'], button[data-plan]");
        if (!link) return;

        e.preventDefault();

        // Determine plan (basic or premium)
        let href = link.getAttribute("href") || "payment.html?plan=basic";
        let plan = "basic";
        if (href.includes("plan=premium") || link.getAttribute("data-plan") === "premium" || (link.textContent && link.textContent.toLowerCase().includes("premium"))) {
            plan = "premium";
        }

        const targetPaymentUrl = `payment.html?plan=${plan}`;

        // 1. Fast check if user is already logged in
        if (auth.currentUser || currentUser || isLocallyLoggedIn()) {
            window.location.href = targetPaymentUrl;
            return;
        }

        // 2. Short 400ms wait if auth is still resolving on initial page load
        if (!authChecked) {
            await new Promise((resolve) => {
                const timer = setTimeout(resolve, 400);
                const unsub = onAuthStateChanged(auth, (user) => {
                    clearTimeout(timer);
                    currentUser = user;
                    authChecked = true;
                    unsub();
                    resolve();
                });
            });
        }

        // 3. Check again after fast resolution
        if (auth.currentUser || currentUser || isLocallyLoggedIn()) {
            window.location.href = targetPaymentUrl;
        } else {
            // User NOT logged in -> Redirect to login with payment redirect target
            const redirectUrl = `login.html?redirect=${encodeURIComponent(targetPaymentUrl)}&plan=${plan}`;
            window.location.href = redirectUrl;
        }
    }

    // Attach click listener globally using capture phase for instant intercept
    document.addEventListener("click", handleBuyClick, true);
})();
