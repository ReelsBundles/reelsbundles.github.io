/* ==========================================
   REELS BUNDLES
   PREVIEW MODAL
   Safe on every page
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    /*
     * Preview elements
     */

    const previewModal =
        document.getElementById("previewModal");

    const closePreview =
        document.getElementById("closePreview");

    const previewPrev =
        document.getElementById("previewPrev");

    const previewNext =
        document.getElementById("previewNext");

    const modalImage =
        document.getElementById("modalImage");

    const modalTitle =
        document.getElementById("modalTitle");

    const modalStats =
        document.getElementById("modalStats");

    const overlay =
        document.querySelector(".preview-modal__overlay");


    /*
     * Preview cards
     *
     * Supports the existing preview gallery
     * and also safely works if the gallery
     * does not exist on a page.
     */

    const previewCards =
        Array.from(
            document.querySelectorAll(
                ".preview-card"
            )
        );


    /*
     * If the page has no preview modal,
     * do nothing.
     *
     * IMPORTANT:
     * app.js loads this module globally.
     */

    if (!previewModal) {
        return;
    }


    /*
     * Current preview index
     */

    let currentIndex = 0;


    /*
     * Close modal
     */

    function closeModal() {

        previewModal.classList.remove("active");

        previewModal.classList.remove("show");

        document.body.classList.remove(
            "preview-modal-open"
        );

    }


    /*
     * Open modal
     */

    function openModal(index) {

        if (
            !previewCards.length ||
            !modalImage
        ) {
            return;
        }


        /*
         * Keep index inside range
         */

        if (index < 0) {
            index =
                previewCards.length - 1;
        }

        if (index >= previewCards.length) {
            index = 0;
        }


        currentIndex = index;


        const card =
            previewCards[currentIndex];


        /*
         * Find image
         */

        const image =
            card.querySelector(
                "img"
            );


        /*
         * Find title
         */

        const title =
            card.querySelector(
                "h3"
            );


        /*
         * Find stats
         */

        const stats =
            card.querySelector(
                ".preview-card__meta"
            );


        /*
         * Update image
         */

        if (image) {

            modalImage.src =
                image.currentSrc ||
                image.src ||
                "";

            modalImage.alt =
                image.alt ||
                "Reels Bundle Preview";
        }


        /*
         * Update title
         */

        if (modalTitle) {

            modalTitle.textContent =
                title
                    ? title.textContent.trim()
                    : "ReelsBundles Preview";
        }


        /*
         * Update stats
         */

        if (modalStats) {

            modalStats.textContent =
                stats
                    ? stats.textContent.trim()
                    : "ReelsBundles Preview";
        }


        /*
         * Show modal
         */

        previewModal.classList.add(
            "active"
        );

        document.body.classList.add(
            "preview-modal-open"
        );

    }


    /*
     * Close button
     */

    if (closePreview) {

        closePreview.addEventListener(
            "click",
            closeModal
        );

    }


    /*
     * Overlay click
     */

    if (overlay) {

        overlay.addEventListener(
            "click",
            closeModal
        );

    }


    /*
     * Previous button
     */

    if (previewPrev) {

        previewPrev.addEventListener(
            "click",
            () => {

                openModal(
                    currentIndex - 1
                );

            }
        );

    }


    /*
     * Next button
     */

    if (previewNext) {

        previewNext.addEventListener(
            "click",
            () => {

                openModal(
                    currentIndex + 1
                );

            }
        );

    }


    /*
     * Preview cards
     */

    previewCards.forEach(
        (card, index) => {

            card.addEventListener(
                "click",
                () => {

                    openModal(index);

                }
            );

        }
    );


    /*
     * ESC key
     */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                (
                    previewModal.classList.contains(
                        "active"
                    ) ||
                    previewModal.classList.contains(
                        "show"
                    )
                )
            ) {

                closeModal();

            }

        }
    );


    /*
     * Keyboard navigation
     */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                !previewModal.classList.contains(
                    "active"
                )
            ) {
                return;
            }


            if (event.key === "ArrowLeft") {

                openModal(
                    currentIndex - 1
                );

            }


            if (event.key === "ArrowRight") {

                openModal(
                    currentIndex + 1
                );

            }

        }
    );

});