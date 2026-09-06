"use strict";

import { auth } from "./firebase-client.js";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { createUserSession, logoutUser, syncUserToBackend } from "./auth-common.js";

// Helper function to extract redirect target URL cleanly
function getSignupRedirect() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("return") || params.get("redirect");

    if (!redirect) {
        return "/dashboard";
    }

    try {
        const decoded = decodeURIComponent(redirect).trim();
        // Disallow external URLs (prevent open redirect vulnerability)
        if (decoded.includes("://") || decoded.startsWith("//") || decoded.startsWith("\\")) {
            console.warn("[SIGNUP] External redirect rejected for security:", decoded);
            return "/dashboard";
        }
        // Normalize any .html to clean route
        let clean = decoded.replace(/(?:^|\/|\.\/|\.\.\/)?([a-zA-Z0-9_-]+)\.html(\?|#|$)/g, (m, page, suffix) => {
            return page === "index" ? "/" + suffix : "/" + page + suffix;
        });
        if (!clean.startsWith("/")) clean = "/" + clean;
        return clean;
    } catch (error) {
        console.warn("[SIGNUP] Invalid redirect target:", error);
    }

    return "/dashboard";
}

// Preserve redirect query parameters on login links
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const returnParam = params.get("return") || params.get("redirect");
    const planParam = params.get("plan");

    if (returnParam) {
        const loginLink = document.getElementById("loginLink") || document.querySelector("a[href*='login']");
        if (loginLink) {
            let target = `/login?return=${encodeURIComponent(returnParam)}`;
            if (planParam) target += `&plan=${encodeURIComponent(planParam)}`;
            loginLink.setAttribute("href", target);
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
        showSignupSuccessAndRedirect();
    }
}).catch((err) => {
    console.warn("[SIGNUP] Google redirect signup result info:", err);
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
        showSignupSuccessAndRedirect();
    }
});

const form = document.getElementById("signupForm");
const signupBtn = document.getElementById("signupBtn");
const googleSignupBtn = document.getElementById("googleSignupBtn");
const message = document.getElementById("authMessage");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

function showSignupSuccessAndRedirect() {
    const redirect = getSignupRedirect();
    showMessage("✅ Account Created! Redirecting you now...", "success");
    setTimeout(() => {
        window.location.replace(redirect);
    }, 600);
}

const showMessage = (text, type = "error") => {
    if (!message) return;
    message.textContent = text;
    message.style.display = text ? "block" : "none";
    message.className = `auth-message ${type}`;
    if (type === "success") {
        message.style.color = "#4ade80";
        message.style.backgroundColor = "rgba(34, 197, 94, 0.15)";
        message.style.border = "1px solid rgba(34, 197, 94, 0.3)";
        message.style.padding = "10px 14px";
        message.style.borderRadius = "8px";
    }
};

const setLoading = (loading) => {
    if (!signupBtn) return;
    signupBtn.disabled = loading;
    signupBtn.textContent = loading ? "Creating account..." : "Create Account";
};

if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage("");
        setLoading(true);

        try {
            const name = document.getElementById("name")?.value.trim();
            const email = document.getElementById("email")?.value.trim();
            const passwordValue = passwordInput?.value;
            const confirmPassword = document.getElementById("confirmPassword")?.value;

            if (!name) throw new Error("Please enter your name.");
            if (!email) throw new Error("Please enter your email.");
            if (!passwordValue || passwordValue.length < 6) throw new Error("Password must be at least 6 characters.");
            if (passwordValue !== confirmPassword) throw new Error("Passwords do not match.");

            const userCredential = await createUserWithEmailAndPassword(auth, email, passwordValue);
            const user = userCredential.user;

            await updateProfile(user, { displayName: name });
            const syncRes = await syncUserToBackend(user);
            if (syncRes && syncRes.disabled) {
                await logoutUser();
                throw new Error("⛔ Your account has been disabled by the admin. Please contact support.");
            }

            await createUserSession();
            showSignupSuccessAndRedirect();
        } catch (error) {
            console.error("Signup error:", error);
            let errorMessage = "Unable to create account.";

            if (error.code === "auth/email-already-in-use") {
                errorMessage = "An account with this email already exists. Please sign in instead.";
            } else if (error.code === "auth/invalid-email") {
                errorMessage = "Please enter a valid email address.";
            } else if (error.code === "auth/weak-password") {
                errorMessage = "Password must be at least 6 characters.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            showMessage(errorMessage, "error");
        } finally {
            setLoading(false);
        }
    });
}

if (googleSignupBtn) {
    googleSignupBtn.addEventListener("click", async () => {
        showMessage("");
        googleSignupBtn.disabled = true;
        googleSignupBtn.textContent = "Signing up with Google...";

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
                showSignupSuccessAndRedirect();
                return;
            } catch (popupErr) {
                console.warn("[SIGNUP] Popup blocked or failed, trying redirect fallback:", popupErr);
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
            console.error("Google signup error:", error);
            let errorMessage = "Google sign up failed.";

            if (error.code === "auth/popup-closed-by-user") {
                errorMessage = "Google sign up was cancelled.";
            } else if (error.code === "auth/popup-blocked") {
                errorMessage = "Popup was blocked by your browser.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            showMessage(errorMessage, "error");
        } finally {
            googleSignupBtn.disabled = false;
            googleSignupBtn.innerHTML = '<span class="google-icon">G</span> Continue with Google';
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