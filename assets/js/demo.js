/* ==========================================================
   REELSBUNDLES — DEMO LIBRARY
   20 VIDEO SLOTS
   VIEW ONLY
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const player =
        document.getElementById("demoPlayer");

    const title =
        document.getElementById("demoVideoTitle");

    const description =
        document.getElementById("demoVideoDescription");

    const category =
        document.getElementById("playerCategory");

    const duration =
        document.getElementById("playerDuration");

    const grid =
        document.getElementById("videoGrid");

    const count =
        document.getElementById("videoCount");

    const filters =
        document.getElementById("demoFilters");


    if (!player || !grid) {
        return;
    }



    /* ========================================================
       VIDEO DATA

       IMPORTANT:

       Replace VIDEO_ID_2 etc.
       with actual YouTube Video IDs.

       Example:

       https://www.youtube.com/watch?v=ABC123XYZ

       becomes:

       id: "ABC123XYZ"
    ======================================================== */


    const demos = [

        {
            id: "GMkf14cw8e0",
            title: "Website Overview",
            description:
                "Complete walkthrough of the ReelsBundles product.",
            category: "overview",
            label: "Overview",
            duration: "3:15"
        },


        {
            id: "VIDEO_ID_2",
            title: "Motivation Bundle",
            description:
                "Preview motivation and success-focused reel content.",
            category: "motivation",
            label: "Motivation",
            duration: "2:00"
        },


        {
            id: "VIDEO_ID_3",
            title: "Business Bundle",
            description:
                "Preview business, marketing and entrepreneur content.",
            category: "business",
            label: "Business",
            duration: "2:30"
        },


        {
            id: "VIDEO_ID_4",
            title: "AI Bundle",
            description:
                "Preview AI and technology themed reels.",
            category: "ai",
            label: "AI & Tech",
            duration: "2:10"
        },


        {
            id: "VIDEO_ID_5",
            title: "Lifestyle Bundle",
            description:
                "Preview lifestyle, luxury and aesthetic content.",
            category: "lifestyle",
            label: "Lifestyle",
            duration: "2:20"
        },


        {
            id: "VIDEO_ID_6",
            title: "Luxury Reels",
            description:
                "Preview luxury and premium lifestyle reels.",
            category: "lifestyle",
            label: "Lifestyle",
            duration: "1:55"
        },


        {
            id: "VIDEO_ID_7",
            title: "Success Reels",
            description:
                "Preview success and achievement content.",
            category: "motivation",
            label: "Motivation",
            duration: "2:05"
        },


        {
            id: "VIDEO_ID_8",
            title: "Mindset Reels",
            description:
                "Preview mindset and personal growth content.",
            category: "motivation",
            label: "Motivation",
            duration: "2:15"
        },


        {
            id: "VIDEO_ID_9",
            title: "Marketing Reels",
            description:
                "Preview marketing and social media content.",
            category: "business",
            label: "Business",
            duration: "2:25"
        },


        {
            id: "VIDEO_ID_10",
            title: "Entrepreneur Reels",
            description:
                "Preview entrepreneurship themed content.",
            category: "business",
            label: "Business",
            duration: "2:12"
        },


        {
            id: "VIDEO_ID_11",
            title: "AI Tools",
            description:
                "Preview AI tools and futuristic technology reels.",
            category: "ai",
            label: "AI & Tech",
            duration: "1:48"
        },


        {
            id: "VIDEO_ID_12",
            title: "Future Tech",
            description:
                "Preview technology and innovation content.",
            category: "ai",
            label: "AI & Tech",
            duration: "2:08"
        },


        {
            id: "VIDEO_ID_13",
            title: "Travel Reels",
            description:
                "Preview travel and destination content.",
            category: "lifestyle",
            label: "Lifestyle",
            duration: "2:18"
        },


        {
            id: "VIDEO_ID_14",
            title: "Aesthetic Reels",
            description:
                "Preview aesthetic and visual content.",
            category: "lifestyle",
            label: "Lifestyle",
            duration: "1:50"
        },


        {
            id: "VIDEO_ID_15",
            title: "Daily Motivation",
            description:
                "Preview daily motivational content.",
            category: "motivation",
            label: "Motivation",
            duration: "2:05"
        },


        {
            id: "VIDEO_ID_16",
            title: "Money Mindset",
            description:
                "Preview money, ambition and success content.",
            category: "motivation",
            label: "Motivation",
            duration: "2:22"
        },


        {
            id: "VIDEO_ID_17",
            title: "Creator Bundle",
            description:
                "Preview content designed for creators and theme pages.",
            category: "business",
            label: "Business",
            duration: "2:35"
        },


        {
            id: "VIDEO_ID_18",
            title: "Social Media Bundle",
            description:
                "Preview social media growth focused reels.",
            category: "business",
            label: "Business",
            duration: "2:14"
        },


        {
            id: "VIDEO_ID_19",
            title: "AI Motivation",
            description:
                "Preview AI visuals combined with motivational content.",
            category: "ai",
            label: "AI & Tech",
            duration: "1:58"
        },


        {
            id: "VIDEO_ID_20",
            title: "Premium Collection",
            description:
                "Preview a selection from the premium collection.",
            category: "lifestyle",
            label: "Premium",
            duration: "3:00"
        }

    ];



    /* ========================================================
       VALIDATE YOUTUBE ID
    ======================================================== */

    function validId(id) {

        return (
            id &&
            !id.startsWith("VIDEO_ID_") &&
            /^[a-zA-Z0-9_-]{6,}$/.test(id)
        );

    }



    /* ========================================================
       THUMBNAIL
    ======================================================== */

    function thumbnail(video) {

        if (validId(video.id)) {

            return `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

        }

        return "";

    }



    /* ========================================================
       PLAY VIDEO
    ======================================================== */

    function playDemo(video) {

        if (!validId(video.id)) {

            alert(
                "This demo slot is ready. Add its YouTube Video ID in assets/js/demo.js."
            );

            return;

        }


        document
            .querySelectorAll(".demo-card")
            .forEach(card => {

                card.classList.remove("active");

            });


        const selected =
            document.querySelector(
                `.demo-card[data-video-id="${CSS.escape(video.id)}"]`
            );


        selected?.classList.add("active");


        player.src =
            `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1&playsinline=1`;


        title.textContent =
            video.title;


        description.textContent =
            video.description;


        category.textContent =
            video.label;


        duration.textContent =
            `▶ ${video.duration}`;


        document
            .getElementById("demo-player")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

    }



    /* ========================================================
       CREATE CARD
    ======================================================== */

    function createCard(video, index) {

        const card =
            document.createElement("article");


        card.className =
            "demo-card";


        card.dataset.category =
            video.category;


        card.dataset.videoId =
            video.id;


        card.tabIndex = 0;


        const isReady =
            validId(video.id);


        const image =
            thumbnail(video);


        card.innerHTML = `

            <div class="demo-card__thumb">

                ${
                    isReady

                    ? `
                        <img
                            src="${image}"
                            alt="${video.title}"
                            loading="lazy"
                        >
                    `

                    : `

                        <div class="demo-card__placeholder">

                            <span>
                                🎬
                            </span>

                            <small>
                                VIDEO ${String(index + 1).padStart(2, "0")}
                            </small>

                        </div>

                    `
                }


                <div class="demo-card__shade"></div>


                <div class="demo-card__play">

                    ${isReady ? "▶" : "+"}

                </div>


                <span class="demo-card__category">

                    ${video.label}

                </span>


                <span class="demo-card__duration">

                    ${video.duration}

                </span>


                ${
                    !isReady

                    ? `
                        <span class="demo-card__status">
                            ADD VIDEO ID
                        </span>
                    `

                    : `
                        <span class="demo-card__status demo-card__status--ready">
                            READY TO VIEW
                        </span>
                    `
                }

            </div>


            <div class="demo-card__body">

                <div class="demo-card__number">

                    DEMO ${String(index + 1).padStart(2, "0")}

                </div>


                <h3>

                    ${video.title}

                </h3>


                <p>

                    ${video.description}

                </p>


                <button
                    type="button"
                    class="demo-card__button"
                >

                    ${isReady ? "Watch Demo →" : "Set Video →"}

                </button>

            </div>

        `;


        const action =
            () => playDemo(video);


        card.addEventListener(
            "click",
            action
        );


        card.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    action();

                }

            }
        );


        return card;

    }



    /* ========================================================
       RENDER
    ======================================================== */

    function render(filter = "all") {

        grid.innerHTML = "";


        const filtered =
            demos.filter(video => {

                return (
                    filter === "all" ||
                    video.category === filter
                );

            });


        filtered.forEach(video => {

            grid.appendChild(
                createCard(
                    video,
                    demos.indexOf(video)
                )
            );

        });


        count.textContent =
            filtered.length;

    }



    /* ========================================================
       FILTERS
    ======================================================== */

    filters?.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(".filter-btn");


            if (!button) {
                return;
            }


            document
                .querySelectorAll(".filter-btn")
                .forEach(btn => {

                    btn.classList.remove("active");

                });


            button.classList.add("active");


            render(
                button.dataset.filter
            );

        }
    );



    /* ========================================================
       INITIAL LOAD
    ======================================================== */

    render("all");

});