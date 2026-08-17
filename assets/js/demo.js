/* ==========================================================
   REELSBUNDLES — DEMO LIBRARY
   20 VIDEO SLOTS
   VIEW ONLY
========================================================== */

const API_BASE = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
) + "/api";

document.addEventListener("DOMContentLoaded", async () => {

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

    const demos = [];

    function validId(id) {
        return (
            id &&
            !id.startsWith("VIDEO_ID_") &&
            /^[a-zA-Z0-9_-]{6,}$/.test(id)
        );
    }

    function thumbnail(video) {
        if (validId(video.id)) {
            return `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
        }
        return "";
    }

    function safeCssEscape(str) {
        if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
            return CSS.escape(str);
        }
        return String(str || "").replace(/["'\\]/g, '\\$&');
    }

    function playDemo(video) {
        if (!validId(video.id)) {
            alert("This video is not available.");
            return;
        }

        document.querySelectorAll(".demo-card").forEach(card => {
            card.classList.remove("active");
        });

        const selected = document.querySelector(`.demo-card[data-video-id="${safeCssEscape(video.id)}"]`);
        selected?.classList.add("active");

        const playerContainer = player.parentElement;
        if (playerContainer) {
            if (video.videoType === "short") {
                playerContainer.style.maxWidth = "420px";
                playerContainer.style.margin = "0 auto";
                playerContainer.style.aspectRatio = "9/16";
            } else {
                playerContainer.style.maxWidth = "";
                playerContainer.style.margin = "";
                playerContainer.style.aspectRatio = "";
            }
        }

        player.src = `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1&playsinline=1`;
        if (title) title.textContent = video.title;
        if (description) description.textContent = video.description;
        if (category) category.textContent = video.label;
        if (duration) duration.textContent = `▶ ${video.duration}`;

        document.getElementById("demo-player")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function createCard(video, index) {
        const card = document.createElement("article");
        card.className = "demo-card";
        card.dataset.category = video.category;
        card.dataset.videoId = video.id;
        card.tabIndex = 0;

        const isReady = validId(video.id);
        const image = thumbnail(video);

        card.innerHTML = `
            <div class="demo-card__thumb">
                ${
                    isReady
                    ? `<img src="${image}" alt="${video.title}" loading="lazy">`
                    : `<div class="demo-card__placeholder"><span>${video.videoType === 'short' ? '📱' : '🎬'}</span><small>VIDEO ${String(index + 1).padStart(2, "0")}</small></div>`
                }
                <div class="demo-card__shade"></div>
            </div>
            <div class="demo-card__body">
                <span class="demo-card__badge" style="background:${video.videoType === 'short' ? 'rgba(236,72,153,0.15)' : ''}; color:${video.videoType === 'short' ? '#f472b6' : ''};">${video.label}</span>
                <h3>${video.title}</h3>
                <p>${video.description}</p>
                <button type="button" class="demo-card__button">${isReady ? (video.videoType === 'short' ? "Watch Short →" : "Watch Demo →") : "Set Video →"}</button>
            </div>
        `;

        const action = () => playDemo(video);
        card.addEventListener("click", action);
        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                action();
            }
        });

        return card;
    }

    function render(filter = "all") {
        grid.innerHTML = "";
        const filtered = demos.filter(video => {
            return (
                filter === "all" ||
                video.category === filter
            );
        });

        filtered.forEach(video => {
            grid.appendChild(createCard(video, demos.indexOf(video)));
        });

        if (count) count.textContent = filtered.length;
    }

    filters?.addEventListener("click", event => {
        const button = event.target.closest(".filter-btn");
        if (!button) return;
        document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        render(button.dataset.filter);
    });

    try {
        const res = await robustFetch(`${API_BASE}/demo/videos`);
        const data = await res.json();
        if (data.success && data.videos && data.videos.length > 0) {
            const liveVideos = data.videos.map(v => {
                const isShort = v.videoType === "short" || (v.youtubeUrl && v.youtubeUrl.includes("/shorts/"));
                return {
                    id: v.videoId,
                    title: v.title,
                    description: v.category ? `Category: ${v.category}` : (isShort ? "YouTube Short" : "YouTube Demo Video"),
                    category: (v.category || "overview").toLowerCase().replace(/[^a-z0-9]/g, ""),
                    label: isShort ? "📱 Short" : (v.category || "🎬 Video"),
                    videoType: isShort ? "short" : "video",
                    duration: isShort ? "0:60" : "2:00"
                };
            });
            demos.length = 0;
            demos.push(...liveVideos);
        } else {
            const validStatic = demos.filter(d => validId(d.id));
            demos.length = 0;
            demos.push(...validStatic);
        }
    } catch (e) {
        console.warn("Could not load backend demo videos", e);
    }

    render("all");
    if (demos.length > 0 && validId(demos[0].id)) {
        playDemo(demos[0]);
    }
});

async function robustFetch(url, options = {}, retries = 2, delayMs = 1500) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await window.fetch(url, options);
            return response;
        } catch (err) {
            console.warn(`[ROBUST FETCH] Attempt ${i + 1} failed for ${url}:`, err);
            if (i === retries) throw err;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
