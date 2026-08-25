import {
    auth
} from "./firebase-client.js";

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    createUserSession,
    syncUserToBackend,
    logoutUser
} from "./auth-common.js";

getRedirectResult(auth).then(async (result) => {
    if (result && result.user) {
        const syncRes = await syncUserToBackend(result.user);
        if (syncRes && syncRes.disabled) {
            await logoutUser();
            return;
        }
        await createUserSession();
        window.location.replace(getLoginRedirect());
    }
}).catch((err) => {
    console.warn("Google redirect result info:", err);
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const syncRes = await syncUserToBackend(user);
        if (syncRes && syncRes.disabled) {
            await logoutUser();
            const msgEl = document.getElementById("authMessage");
            if (msgEl) {
                msgEl.style.display = "block";
                msgEl.style.color = "#ef4444";
                msgEl.textContent = "⛔ Your account has been disabled by the admin. Please contact support.";
            }
            return;
        }
        window.location.replace(getLoginRedirect());
    }
});

const form =
    document.getElementById("loginForm");

const loginBtn =
    document.getElementById("loginBtn");

const googleLoginBtn =
    document.getElementById("googleLoginBtn");

const message =
    document.getElementById("authMessage");

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("disabled") === "1" || params.get("disabled") === "true") {
        if (message) {
            message.style.display = "block";
            message.style.color = "#ef4444";
            message.textContent = "⛔ Your account has been disabled by the admin. Please contact support.";
        }
    } else if (params.get("redirect") && params.get("redirect").includes("payment")) {
        if (message) {
            message.style.display = "block";
            message.style.color = "#a78bfa";
            message.style.backgroundColor = "rgba(124, 58, 237, 0.15)";
            message.style.border = "1px solid rgba(124, 58, 237, 0.3)";
            message.style.padding = "10px 14px";
            message.style.borderRadius = "8px";
            message.style.marginBottom = "16px";
            message.textContent = "🔑 Please sign in to complete your Reels Bundle purchase.";
        }
    }
});

const togglePassword =
    document.getElementById("togglePassword");

const password =
    document.getElementById("password");
const getLoginRedirect = () => {

    const params = new URLSearchParams(
        window.location.search
    );

    const redirect = params.get("redirect");

    if (!redirect) {
        return "download.html";
    }

    try {

        const decoded = decodeURIComponent(redirect).trim();

        if (
            decoded.includes("payment") ||
            decoded.includes("download") ||
            decoded.includes("dashboard") ||
            decoded.startsWith("user/") ||
            decoded.startsWith("/") ||
            decoded.startsWith(".")
        ) {
            return decoded;
        }

    } catch (error) {

        console.warn(
            "Invalid redirect:",
            error
        );

    }

    return "download.html";
};

const showMessage = (
    text,
    type = "error"
) => {

    message.textContent = text;

    message.className =
        `auth-message ${type}`;

};

const setLoading = (loading) => {

    loginBtn.disabled = loading;

    loginBtn.textContent =
        loading
            ? "Signing in..."
            : "Sign In";

};

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        showMessage("");

        setLoading(true);

        try {

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const passwordValue =
                password.value;

            if (!email || !passwordValue) {

                throw new Error(
                    "Please enter email and password."
                );

            }

            await signInWithEmailAndPassword(
                auth,
                email,
                passwordValue
            );

            await createUserSession();

            window.location.replace(
            getLoginRedirect()
            );

        }
        catch (error) {

            console.error(
                "Login error:",
                error
            );

            let errorMessage =
                "Unable to sign in.";

            if (
                error.code ===
                "auth/invalid-credential"
            ) {

                errorMessage =
                    "Invalid email or password.";

            }
            else if (
                error.code ===
                "auth/user-not-found"
            ) {

                errorMessage =
                    "No account found with this email.";

            }
            else if (
                error.code ===
                "auth/wrong-password"
            ) {

                errorMessage =
                    "Incorrect password.";

            }
            else if (
                error.code ===
                "auth/too-many-requests"
            ) {

                errorMessage =
                    "Too many attempts. Please try again later.";

            }
            else if (error.message && (error.message.toLowerCase().includes("fetch") || error.message.toLowerCase().includes("network"))) {

                errorMessage =
                    "Network connection error. Please check your connection and try again.";

            }
            else if (error.message) {

                errorMessage =
                    error.message;

            }

            showMessage(
                errorMessage,
                "error"
            );

        }
        finally {

            setLoading(false);

        }

    }
);

googleLoginBtn.addEventListener(
    "click",
    async () => {

        showMessage("");

        googleLoginBtn.disabled = true;

        googleLoginBtn.textContent =
            "Signing in with Google...";

        try {

            const provider =
                new GoogleAuthProvider();

            provider.setCustomParameters({
                prompt: "select_account"
            });

            try {
                await signInWithPopup(
                    auth,
                    provider
                );

                await createUserSession();

                window.location.replace(
                    getLoginRedirect()
                );
                return;
            } catch (popupErr) {
                console.warn("[AUTH] Popup blocked or failed, falling back to signInWithRedirect:", popupErr);
                if (
                    popupErr.code === "auth/popup-blocked" ||
                    popupErr.code === "auth/popup-closed-by-user" ||
                    popupErr.code === "auth/cancelled-popup-request" ||
                    (popupErr.message && popupErr.message.toLowerCase().includes("popup"))
                ) {
                    await signInWithRedirect(auth, provider);
                    return;
                }
                throw popupErr;
            }

        }
        catch (error) {

            console.error(
                "Google login error:",
                error
            );

            let errorMessage =
                "Google sign in failed.";

            if (
                error.code ===
                "auth/popup-closed-by-user"
            ) {

                errorMessage =
                    "Google sign in was cancelled.";

            }
            else if (
                error.code ===
                "auth/popup-blocked"
            ) {

                errorMessage =
                    "Popup was blocked by your browser.";

            }
            else if (error.message) {

                errorMessage =
                    error.message;

            }

            showMessage(
                errorMessage,
                "error"
            );

        }
        finally {

            googleLoginBtn.disabled = false;

            googleLoginBtn.innerHTML =
                '<span class="google-icon">G</span> Continue with Google';

        }

    }
);

togglePassword.addEventListener(
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