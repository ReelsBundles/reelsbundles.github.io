/* ==========================================================
   DYNAMIC DEMO YOUTUBE VIDEOS LOADER FOR PUBLIC DEMO PAGE
   ========================================================== */

const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000/api"
        : "https://reelsbundles-backend.onrender.com/api"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
async function loadPublicDemoVideos() {
    const container = document.getElementById("demoVideosGrid") || document.querySelector(".demo-grid") || document.querySelector(".videos-grid");
    if (!container) return;

    try {
        const res = await robustFetch(`${API_BASE}/demo/videos`);
        const data = await res.json();
        if (!data.success || !data.videos || data.videos.length === 0) return;

        const videos = data.videos;
        container.innerHTML = videos.map(v => `
            <div class="demo-video-card" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; backdrop-filter: blur(12px);">
                <div style="position: relative; padding-top: 56.25%; background: #000;">
                    <iframe src="https://www.youtube.com/embed/${v.videoId}" title="${v.title}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allowfullscreen loading="lazy"></iframe>
                </div>
                <div style="padding: 20px;">
                    <span style="background: rgba(167, 139, 250, 0.15); color: #c4b5fd; border: 1px solid rgba(167, 139, 250, 0.3); padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 11px; text-transform: uppercase;">${v.category || 'Reels Bundle'}</span>
                    <h3 style="margin: 10px 0 0; color: #ffffff; font-size: 17px; font-weight: 700; line-height: 1.4;">${v.title}</h3>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.warn("Dynamic demo videos loader warning:", e);
    }
}

document.addEventListener("DOMContentLoaded", loadPublicDemoVideos);



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
