const API_BASE = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
) + "/api";

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const admin = JSON.parse(localStorage.getItem("admin_data") || "{}");
    const adminName = document.getElementById("adminName");
    if (adminName && admin.email) {
        adminName.textContent = admin.email.split("@")[0];
    }

    const logoutBtn = document.getElementById("logoutBtn");
    logoutBtn?.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "index.html";
    });

    const protectionEnabledToggle = document.getElementById("protectionEnabledToggle");
    const rightClickToggle = document.getElementById("rightClickToggle");
    const devToolsToggle = document.getElementById("devToolsToggle");
    const saveProtectionBtn = document.getElementById("saveProtectionBtn");
    const statusMessage = document.getElementById("statusMessage");

    function showMessage(text, isError = false) {
        if (!statusMessage) return;
        statusMessage.textContent = text;
        statusMessage.style.color = isError ? "#f87171" : "#4ade80";
    }

    async function loadProtectionSettings() {
        try {
            const response = await fetch(`${API_BASE}/protection/status`, { cache: "no-store" });
            const data = await response.json();
            if (data.success && data.settings) {
                protectionEnabledToggle.checked = Boolean(data.settings.protectionEnabled);
                rightClickToggle.checked = Boolean(data.settings.disableRightClick);
                devToolsToggle.checked = Boolean(data.settings.disableDevTools);
            }
        } catch (error) {
            console.error("Failed to load protection settings:", error);
            showMessage("Failed to load settings from server.", true);
        }
    }

    saveProtectionBtn?.addEventListener("click", async () => {
        saveProtectionBtn.disabled = true;
        saveProtectionBtn.textContent = "⏳ Saving...";
        showMessage("");

        try {
            const body = {
                protectionEnabled: protectionEnabledToggle.checked,
                disableRightClick: rightClickToggle.checked,
                disableDevTools: devToolsToggle.checked
            };

            const response = await fetch(`${API_BASE}/admin/protection/update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (response.ok && data.success) {
                showMessage("✅ Protection settings saved successfully!");

                // Broadcast live update to all open user tabs instantly
                try {
                    const channel = new BroadcastChannel("reelsbundles_protection_sync");
                    channel.postMessage({ type: "PROTECTION_UPDATED", timestamp: Date.now() });
                } catch (err) {}
                try {
                    localStorage.setItem("reelsbundles_protection_sync_time", String(Date.now()));
                } catch (err) {}
            } else {
                showMessage(data.message || "Failed to save protection settings.", true);
            }
        } catch (error) {
            console.error("Save error:", error);
            showMessage("Network error saving protection settings.", true);
        } finally {
            saveProtectionBtn.disabled = false;
            saveProtectionBtn.innerHTML = "💾 Save Protection Settings";
        }
    });

    loadProtectionSettings();
});
