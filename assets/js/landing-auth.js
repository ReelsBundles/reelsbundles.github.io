import { auth } from "./firebase-client.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Logout if user navigates back to index.html using the browser back arrow/navigation
window.addEventListener("pageshow", async (event) => {
    const isBackNavigation = event.persisted || 
        (typeof window.performance !== "undefined" && 
         window.performance.navigation.type === 2);

    if (isBackNavigation) {
        console.log("[Auth] Browser back navigation detected on landing page. Performing session logout...");
        try {
            await signOut(auth);
            console.log("[Auth] Successfully logged out on back navigation.");
        } catch (error) {
            console.error("[Auth] Logout error during back navigation:", error);
        }
    }
});

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const authActions =
            document.getElementById(
                "landingAuthActions"
            );


        /* ======================================================
           SAFETY CHECK
        ====================================================== */

        if (!authActions) {
            return;
        }


        /* ======================================================
           ALWAYS SHOW PUBLIC LANDING ACTIONS & NOTIFICATION BELL
        ====================================================== */

        authActions.innerHTML = `

            <button type="button" class="notif-bell-btn" id="notifBellBtn" title="Notifications & Coupons">
                🔔<span class="notif-badge hidden" id="notifBadge">0</span>
            </button>

            <a
                href="login.html"
                class="btn btn--secondary"
                id="landingSignIn"
            >
                Sign In
            </a>


            <a
                href="signup.html"
                class="btn btn--primary"
                id="landingGetStarted"
            >
                Get Started
            </a>

        `;

    }
);