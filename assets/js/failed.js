/* ==========================================================
   REELSBUNDLES
   FAILED PAYMENT PAGE
========================================================== */


document.addEventListener(
    "DOMContentLoaded",
    initializeFailedPage
);


/* ==========================================================
   INITIALIZE
========================================================== */

function initializeFailedPage() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const orderId =
        params.get(
            "order_id"
        ) ||
        params.get(
            "orderId"
        );


    const amount =
        params.get(
            "amount"
        );


    const reason =
        params.get(
            "reason"
        );


    /*
     * Order ID
     */

    setText(
        document.getElementById(
            "orderId"
        ),
        orderId ||
        "Not available"
    );


    /*
     * Amount
     */

    if (amount) {

        setText(
            document.getElementById(
                "amount"
            ),
            `₹${amount}`
        );

    }


    /*
     * Failure reason
     */

    if (reason) {

        setText(
            document.getElementById(
                "failureReason"
            ),
            reason
        );


        setText(
            document.getElementById(
                "failedMessage"
            ),
            reason
        );

    }


    /*
     * Retry payment.
     */

    const retryButton =
        document.getElementById(
            "retryButton"
        );


    if (retryButton) {

        retryButton.addEventListener(
            "click",
            retryPayment
        );

    }

}


/* ==========================================================
   RETRY PAYMENT
========================================================== */

function retryPayment() {

    /*
     * IMPORTANT:
     *
     * Do not carry the failed order ID.
     *
     * Start a fresh payment flow.
     */

    window.location.href =
        "payment.html";

}


/* ==========================================================
   SAFE TEXT
========================================================== */

function setText(
    element,
    value
) {

    if (!element) {

        return;

    }


    element.textContent =
        value == null
            ? ""
            : String(
                value
            );

}