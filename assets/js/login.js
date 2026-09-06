import { auth } from "./firebase-client.js";
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { createUserSession, logoutUser, syncUserToBackend } from "./auth-common.js";

// Helper function to extract redirect target URL cleanly
function getLoginRedirect() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("return") || params.get("redirect");

    if (!redirect) {
        return "/dashboard";
    }

    try {
        const decoded = decodeURIComponent(redirect).trim();
        // Disallow external URLs (prevent open redirect vulnerability)
        if (decoded.includes("://") || decoded.startsWith("//") || decoded.startsWith("\\")) {
            console.warn("[AUTH] External redirect rejected for security:", decoded);
            return "/dashboard";
        }
        // Normalize any .html to clean route
        let clean = decoded.replace(/(?:^|\/|\.\/|\.\.\/)?([a-zA-Z0-9_-]+)\.html(\?|#|$)/g, (m, page, suffix) => {
            return page === "index" ? "/" + suffix : "/" + page + suffix;
        });
        if (!clean.startsWith("/")) clean = "/" + clean;
        return clean;
    } catch (error) {
        console.warn("[AUTH] Invalid redirect target:", error);
    }

    return "/dashboard";
}

// Preserve redirect query parameters across link navigations
document.addEventListener("DOMContentLoaded", () => {
    const message = document.getElementById("authMessage");
    const params = new URLSearchParams(window.location.search);
    const returnParam = params.get("return") || params.get("redirect");
    const planParam = params.get("plan");

    // Preserve return parameters on Signup link
    if (returnParam) {
        const signupLink = document.getElementById("signupLink") || document.querySelector("a[href*='signup']");
        if (signupLink) {
            let target = `/signup?return=${encodeURIComponent(returnParam)}`;
            if (planParam) target += `&plan=${encodeURIComponent(planParam)}`;
            signupLink.setAttribute("href", target);
        }
    }

    if (params.get("disabled") === "1" || params.get("disabled") === "true") {
        if (message) {
            message.style.display = "block";
            message.style.color = "#ef4444";
            message.textContent = "⛔ Your account has been disabled by the admin. Please contact support.";
        }
    } else if (redirectParam && redirectParam.includes("payment")) {
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

// Handle Google Redirect Result fallback
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
    console.warn("[AUTH] Google redirect result info:", err);
});

// Auto-redirect logged in users unless disabled
onAuthStateChanged(auth, async (user) => {
    const params = new URLSearchParams(window.location.search);
    if (user && params.get("disabled") !== "1" && params.get("disabled") !== "true") {
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

const form = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const message = document.getElementById("authMessage");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

const showMessage = (text, type = "error") => {
    if (!message) return;
    message.textContent = text;
    message.style.display = text ? "block" : "none";
    message.className = `auth-message ${type}`;
};

const setLoading = (loading) => {
    if (!loginBtn) return;
    loginBtn.disabled = loading;
    loginBtn.textContent = loading ? "Signing in..." : "Sign In";
};

if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage("");
        setLoading(true);

        try {
            const email = document.getElementById("email")?.value.trim();
            const passwordValue = passwordInput?.value;

            if (!email || !passwordValue) {
                throw new Error("Please enter email and password.");
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, passwordValue);
            const syncRes = await syncUserToBackend(userCredential.user);
            if (syncRes && syncRes.disabled) {
                await logoutUser();
                throw new Error("⛔ Your account has been disabled by the admin. Please contact support.");
            }

            await createUserSession();
            window.location.replace(getLoginRedirect());
        } catch (error) {
            console.error("Login error:", error);
            let errorMessage = "Unable to sign in.";

            if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
                errorMessage = "Incorrect email or password.";
            } else if (error.code === "auth/too-many-requests") {
                errorMessage = "Too many failed login attempts. Please try again in a few minutes.";
            } else if (error.code === "auth/invalid-email") {
                errorMessage = "Please enter a valid email address.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            showMessage(errorMessage, "error");
        } finally {
            setLoading(false);
        }
    });
}

if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", async () => {
        showMessage("");
        googleLoginBtn.disabled = true;
        googleLoginBtn.textContent = "Signing in with Google...";

        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });

            try {
                const userCredential = await signInWithPopup(auth, provider);
                const syncRes = await syncUserToBackend(userCredential.user);
                if (syncRes && syncRes.disabled) {
                    await logoutUser();
                    throw new Error("⛔ Your account has been disabled by the admin. Please contact support.");
                }

                await createUserSession();
                window.location.replace(getLoginRedirect());
                return;
            } catch (popupErr) {
                console.warn("[AUTH] Popup blocked or failed, trying redirect fallback:", popupErr);
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
        } catch (error) {
            console.error("Google login error:", error);
            let errorMessage = "Google sign in failed.";

            if (error.code === "auth/popup-closed-by-user") {
                errorMessage = "Google sign in was cancelled.";
            } else if (error.code === "auth/popup-blocked") {
                errorMessage = "Popup was blocked by your browser.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            showMessage(errorMessage, "error");
        } finally {
            googleLoginBtn.disabled = false;
            googleLoginBtn.innerHTML = '<span class="google-icon">G</span> Continue with Google';
        }
    });
}

if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            togglePassword.textContent = "Hide";
        } else {
            passwordInput.type = "password";
            togglePassword.textContent = "Show";
        }
    });
}