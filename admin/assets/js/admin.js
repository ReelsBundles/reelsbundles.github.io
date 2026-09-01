import { auth } from "./firebase-client.js";


import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "");
// Background warm-up ping to wake up backend server on page load
try {
    fetch(`${API_BASE}/api/system/maintenance`, { cache: "no-store" }).catch(() => {});
} catch (e) {}

const form = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const error = document.getElementById("error");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    error.textContent = "";

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {

        const email = document
            .getElementById("email")
            .value
            .trim();

        const password = document
            .getElementById("password")
            .value;

        // Firebase Login

        const userCredential =
            await signInWithEmailAndPassword(

                auth,

                email,

                password

            );

        // Firebase ID Token

        const idToken =
            await userCredential.user.getIdToken();

            //console.log("Firebase ID Token:", idToken);

        const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "");
const response = await fetch(

            `${API_BASE}/api/auth/login`,

            {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    idToken

                })

            }

        );

        const result =
            await response.json();

        if (!response.ok) {

            throw new Error(

                result.message ||

                "Login Failed"

            );

        }

        localStorage.setItem(

            "admin_token",

            result.token

        );

        localStorage.setItem(

            "admin_data",

            JSON.stringify(result.admin)

        );

        window.location.href =
            "dashboard.html";

    }

    catch (err) {

        console.error(err);

        error.textContent =
            err.message;

    }

    finally {

        loginBtn.disabled = false;

        loginBtn.textContent =
            "Login";

    }

});