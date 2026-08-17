"use strict";

import {
    auth
} from "./firebase-client.js";

import {
    createUserWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    createUserSession
} from "./auth-common.js";


/* ==========================================================
   ELEMENTS
========================================================== */

const form =
    document.getElementById("signupForm");

const signupBtn =
    document.getElementById("signupBtn");

const googleSignupBtn =
    document.getElementById("googleSignupBtn");

const message =
    document.getElementById("authMessage");

const password =
    document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");


/* ==========================================================
   GET REDIRECT DESTINATION
========================================================== */

function getSignupRedirect() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const redirect =
        params.get("redirect");


    /*
     * Normal signup:
     * No redirect = Dashboard
     */

    if (!redirect) {

        return "dashboard.html";

    }


    try {

        const decoded =
            decodeURIComponent(
                redirect
            );


        /*
         * Only allow internal pages.
         */

        if (
            decoded.startsWith(
                "payment.html"
            ) ||
            decoded ===
                "dashboard.html"
        ) {

            return decoded;

        }

    }
    catch (error) {

        console.warn(
            "Invalid signup redirect:",
            error
        );

    }


    /*
     * Safety fallback
     */

    return "dashboard.html";

}


/* ==========================================================
   GET SELECTED PLAN
========================================================== */

function getSelectedPlan() {

    const redirect =
        getSignupRedirect();


    try {

        const url =
            new URL(
                redirect,
                window.location.origin
            );


        const plan =
            url.searchParams.get(
                "plan"
            );


        if (
            plan === "basic" ||
            plan === "premium"
        ) {

            return plan;

        }

    }
    catch (error) {

        console.warn(
            "Unable to read selected plan:",
            error
        );

    }


    return null;

}


/* ==========================================================
   ACCOUNT CREATED POPUP
========================================================== */

function showSignupSuccess() {

    const redirect =
        getSignupRedirect();

    const selectedPlan =
        getSelectedPlan();


    /*
     * NORMAL SIGNUP
     */

    if (!selectedPlan) {

        const shouldContinue =
            window.confirm(
                "✅ Account Created\n\n" +
                "Your account has been created successfully.\n\n" +
                "Click OK to continue to your Dashboard."
            );


        if (shouldContinue) {

            window.location.replace(
                "dashboard.html"
            );

        }

        return;

    }


    /*
     * PURCHASE SIGNUP
     */

    const planName =
        selectedPlan === "basic"
            ? "Basic Bundle — ₹49"
            : "Premium Bundle — ₹69";


    const shouldContinue =
        window.confirm(
            "✅ Account Created\n\n" +
            "Your account has been created successfully.\n\n" +
            `${planName} is ready for payment.\n\n` +
            "Click OK to continue."
        );


    if (shouldContinue) {

        window.location.replace(
            redirect
        );

    }

}


/* ==========================================================
   MESSAGE
========================================================== */

const showMessage = (
    text,
    type = "error"
) => {

    if (!message) {

        return;

    }


    message.textContent =
        text;


    message.className =
        `auth-message ${type}`;

};


/* ==========================================================
   LOADING
========================================================== */

const setLoading = (
    loading
) => {

    if (!signupBtn) {

        return;

    }


    signupBtn.disabled =
        loading;


    signupBtn.textContent =
        loading
            ? "Creating account..."
            : "Create Account";

};


/* ==========================================================
   EMAIL SIGNUP
========================================================== */

form?.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        showMessage(
            ""
        );


        setLoading(
            true
        );


        try {

            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();


            const passwordValue =
                password.value;


            const confirmPassword =
                document
                    .getElementById(
                        "confirmPassword"
                    )
                    .value;


            /* ==============================================
               VALIDATION
            ============================================== */

            if (!name) {

                throw new Error(
                    "Please enter your name."
                );

            }


            if (!email) {

                throw new Error(
                    "Please enter your email."
                );

            }


            if (
                passwordValue.length < 6
            ) {

                throw new Error(
                    "Password must be at least 6 characters."
                );

            }


            if (
                passwordValue !==
                confirmPassword
            ) {

                throw new Error(
                    "Passwords do not match."
                );

            }


            /* ==============================================
               FIREBASE ACCOUNT CREATION
               DO NOT CHANGE
            ============================================== */

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    passwordValue
                );


            const user =
                userCredential.user;


            /* ==============================================
               FIREBASE PROFILE
               DO NOT CHANGE
            ============================================== */

            await updateProfile(
                user,
                {
                    displayName:
                        name
                }
            );


            /* ==============================================
               FIREBASE TOKEN
               DO NOT CHANGE
            ============================================== */

            await user.getIdToken(
                true
            );


            /* ==============================================
               BACKEND SESSION
               DO NOT CHANGE
            ============================================== */

            await createUserSession();


            /* ==============================================
               REDIRECT / SUCCESS
            ============================================== */

            showSignupSuccess();

        }
        catch (error) {

            console.error(
                "Signup error:",
                error
            );


            let errorMessage =
                "Unable to create account.";


            if (
                error.code ===
                "auth/email-already-in-use"
            ) {

                errorMessage =
                    "An account already exists with this email.";

            }

            else if (
                error.code ===
                "auth/weak-password"
            ) {

                errorMessage =
                    "Please choose a stronger password.";

            }

            else if (
                error.code ===
                "auth/invalid-email"
            ) {

                errorMessage =
                    "Please enter a valid email address.";

            }

            else if (
                error.message &&
                (error.message.toLowerCase().includes("fetch") || error.message.toLowerCase().includes("network"))
            ) {

                errorMessage =
                    "Network connection error. Please check your connection and try again.";

            }

            else if (
                error.message
            ) {

                errorMessage =
                    error.message;

            }


            showMessage(
                errorMessage,
                "error"
            );

        }
        finally {

            setLoading(
                false
            );

        }

    }
);


/* ==========================================================
   GOOGLE SIGNUP
========================================================== */

googleSignupBtn?.addEventListener(
    "click",
    async () => {

        showMessage(
            ""
        );


        googleSignupBtn.disabled =
            true;


        googleSignupBtn.textContent =
            "Creating account...";


        try {

            const provider =
                new GoogleAuthProvider();


            provider.setCustomParameters({
                prompt:
                    "select_account"
            });


            /*
             * Firebase Google signup/login
             * EXISTING FIREBASE LOGIC
             */

            await signInWithPopup(
                auth,
                provider
            );


            /* ==============================================
               BACKEND SESSION
            ============================================== */

            await createUserSession();


            /* ==============================================
               REDIRECT / SUCCESS
            ============================================== */

            showSignupSuccess();

        }
        catch (error) {

            console.error(
                "Google signup error:",
                error
            );


            let errorMessage =
                "Google signup failed.";


            if (
                error.code ===
                "auth/popup-closed-by-user"
            ) {

                errorMessage =
                    "Google signup was cancelled.";

            }

            else if (
                error.code ===
                "auth/popup-blocked"
            ) {

                errorMessage =
                    "Popup was blocked by your browser.";

            }

            else if (
                error.message
            ) {

                errorMessage =
                    error.message;

            }


            showMessage(
                errorMessage,
                "error"
            );

        }
        finally {

            googleSignupBtn.disabled =
                false;


            googleSignupBtn.innerHTML =
                '<span class="google-icon">G</span> Continue with Google';

        }

    }
);


/* ==========================================================
   PASSWORD TOGGLE
========================================================== */

togglePassword?.addEventListener(
    "click",
    () => {

        if (
            password.type ===
            "password"
        ) {

            password.type =
                "text";


            togglePassword.textContent =
                "Hide";

        }
        else {

            password.type =
                "password";


            togglePassword.textContent =
                "Show";

        }

    }
);