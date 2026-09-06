/* ==========================================
   REELSBUNDLES PRICING BUTTONS
   LOGIN CHECK BEFORE PAYMENT
   ========================================== */

import { auth } from "./firebase-client.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


document.addEventListener(
    "DOMContentLoaded",
    () => {

        const basicBtn =
            document.getElementById("buy-basic");

        const premiumBtn =
            document.getElementById("buy-premium");


        /* ==========================================
           CHECK LOGIN
           ========================================== */

        function checkLoginAndContinue(plan) {

            return new Promise(
                (resolve) => {

                    let finished = false;

                    const unsubscribe =
                        onAuthStateChanged(
                            auth,
                            (user) => {

                                if (finished) {
                                    return;
                                }

                                finished = true;

                                unsubscribe();


                                /* ==========================================
                                   USER ALREADY LOGGED IN
                                   ========================================== */

                                if (user) {

                                    window.location.href =
                                        `/payment?plan=${encodeURIComponent(plan)}`;

                                    resolve(true);

                                    return;
                                }


                                /* ==========================================
                                   USER NOT LOGGED IN -> SEAMLESS LOGIN REDIRECT
                                   ========================================== */

                                const returnUrl =
                                    `/payment?plan=${encodeURIComponent(plan)}`;


                                window.location.href =
                                    `/login?return=${encodeURIComponent(returnUrl)}&plan=${encodeURIComponent(plan)}`;

                                resolve(false);

                            }
                        );

                }
            );

        }


        /* ==========================================
           BASIC
           ========================================== */

        if (basicBtn) {

            basicBtn.addEventListener(
                "click",
                async (event) => {

                    event.preventDefault();

                    await checkLoginAndContinue(
                        "basic"
                    );

                }
            );

        }


        /* ==========================================
           PREMIUM
           ========================================== */

        if (premiumBtn) {

            premiumBtn.addEventListener(
                "click",
                async (event) => {

                    event.preventDefault();

                    await checkLoginAndContinue(
                        "premium"
                    );

                }
            );

        }

    }
);