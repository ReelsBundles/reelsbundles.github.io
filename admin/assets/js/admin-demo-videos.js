/* ==========================================================
   ADMIN DEMO YOUTUBE VIDEOS MANAGER
   ========================================================== */

const API_BASE = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
) + "/api";

async function fetchDemoVideos() {
    const grid = document.getElementById("videosGrid");
    if (!grid) return;
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#94a3b8;">Loading YouTube demo videos...</div>`;

    try {
        const res = await fetch(`${API_BASE}/admin/demo-videos`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        const videos = data.videos || [];
        if (videos.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#94a3b8;">No YouTube demo videos added yet.</div>`;
            return;
        }

        grid.innerHTML = videos.map(v => `
            <div class="video-card" style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow:hidden;">
                <div style="position:relative; padding-top:56.25%; background:#000;">
                    <iframe src="https://www.youtube.com/embed/${v.videoId}" title="${v.title}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;" allowfullscreen></iframe>
                </div>
                <div style="padding:16px;">
                    <span class="badge badge-purple" style="font-size:11px; text-transform:uppercase;">${v.category || 'General'}</span>
                    <h4 style="margin:8px 0 12px; color:#fff; font-size:15px; line-height:1.4;">${v.title}</h4>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="badge ${v.active ? 'badge-active' : 'badge-inactive'}">${v.active ? 'Active' : 'Hidden'}</span>
                        <div style="display:flex; gap:8px;">
                            <button class="btn-action" onclick="toggleVideoStatus('${v.id}')">${v.active ? '⏸️ Hide' : '▶️ Show'}</button>
                            <button class="btn-action btn-danger" onclick="deleteVideoItem('${v.id}')">🗑️ Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#ef4444;">Error: ${err.message}</div>`;
    }
}

async function handleAddVideo(e) {
    e.preventDefault();
    const btn = document.getElementById("addVideoBtn");
    const msg = document.getElementById("formMessage");
    msg.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Adding Video...";

    const title = document.getElementById("videoTitle").value.trim();
    const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
    const category = document.getElementById("videoCategory").value.trim();

    try {
        const res = await fetch(`${API_BASE}/admin/demo-videos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, youtubeUrl, category })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        msg.innerHTML = `<span style="color:#4ade80;">✓ ${data.message}</span>`;
        document.getElementById("addVideoForm").reset();
        fetchDemoVideos();
    } catch (err) {
        msg.innerHTML = `<span style="color:#ef4444;">✕ ${err.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.textContent = "+ Add YouTube Video";
    }
}

window.toggleVideoStatus = async function(id) {
    try {
        const res = await fetch(`${API_BASE}/admin/demo-videos/${id}/toggle`, { method: "PUT" });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        fetchDemoVideos();
    } catch (err) {
        alert("Error toggling video: " + err.message);
    }
};

window.deleteVideoItem = async function(id) {
    if (!confirm("Are you sure you want to delete this YouTube demo video?")) return;
    try {
        const res = await fetch(`${API_BASE}/admin/demo-videos/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        fetchDemoVideos();
    } catch (err) {
        alert("Error deleting video: " + err.message);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    fetchDemoVideos();
    const form = document.getElementById("addVideoForm");
    if (form) form.addEventListener("submit", handleAddVideo);
});
