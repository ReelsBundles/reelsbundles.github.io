import {
    auth
} from "./firebase-client.js";

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    createUserSession
} from "./auth-common.js";

const form =
    document.getElementById("loginForm");

const loginBtn =
    document.getElementById("loginBtn");

const googleLoginBtn =
    document.getElementById("googleLoginBtn");

const message =
    document.getElementById("authMessage");

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

        const decoded = decodeURIComponent(redirect);

        // Only allow internal pages
        if (
            decoded.startsWith("payment.html") ||
            decoded.startsWith("user/") ||
            decoded === "dashboard.html"
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

            /*
             * Firebase automatically creates
             * the account on first Google login.
             */

            await signInWithPopup(
                auth,
                provider
            );

            await createUserSession();

                    window.location.replace(
                    getLoginRedirect()
                    );

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