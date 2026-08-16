const form = document.getElementById(
    "forgotPasswordForm"
);

const resetBtn = document.getElementById(
    "resetBtn"
);

const message = document.getElementById(
    "authMessage"
);


/* ==========================================================
   MESSAGE HELPER
========================================================== */

const showMessage = (
    text,
    type = "error"
) => {

    message.textContent = text;

    message.className =
        `auth-message ${type}`;

};


/* ==========================================================
   LOADING STATE
========================================================== */

const setLoading = (loading) => {

    resetBtn.disabled = loading;

    resetBtn.textContent =
        loading
            ? "Sending..."
            : "Send Reset Link";

};


/* ==========================================================
   FORGOT PASSWORD
========================================================== */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        showMessage("");

        setLoading(true);

        try {

            const emailInput =
                document.getElementById("email");

            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            /* ------------------------------------------------
               VALIDATION
            ------------------------------------------------ */

            if (!email) {

                throw new Error(
                    "Please enter your email address."
                );

            }


            /*
             * Basic email validation.
             */

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (!emailPattern.test(email)) {

                throw new Error(
                    "Please enter a valid email address."
                );

            }


            console.log(
                "Sending ReelsBundles password reset request..."
            );


            /* ------------------------------------------------
               BACKEND REQUEST
            ------------------------------------------------ */

            const response =
                await fetch(
                    "/api/auth/user/forgot-password",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                email: email
                            })
                    }
                );


            /* ------------------------------------------------
               RESPONSE
            ------------------------------------------------ */

            let result = {};

            try {

                result =
                    await response.json();

            }
            catch (jsonError) {

                console.error(
                    "Invalid server response:",
                    jsonError
                );

                throw new Error(
                    "Server returned an invalid response."
                );

            }


            /* ------------------------------------------------
               SERVER ERROR
            ------------------------------------------------ */

            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Unable to send password reset email."
                );

            }


            /* ------------------------------------------------
               SUCCESS
            ------------------------------------------------ */

            console.log(
                "Password reset request accepted:",
                result
            );


            showMessage(
                "If an account exists for this email, a password reset email has been sent. Please check your Inbox and Spam folder.",
                "success"
            );


            /*
             * Clear the email field after successful request.
             */

            form.reset();


        }
        catch (error) {

            console.error(
                "PASSWORD RESET ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to send password reset email. Please try again.",
                "error"
            );

        }
        finally {

            setLoading(false);

        }

    }
);