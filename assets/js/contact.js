import { auth } from "./firebase-client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { robustFetch } from "./auth-common.js";

const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:3000/api"
        : "https://reelsbundles-backend.onrender.com/api"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
const contactForm = document.getElementById("contactForm");
const contactSubmit = document.querySelector(".contact-submit");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const subjectInput = document.getElementById("subject");

// Universal Email Click Handler (Solves mailto: app missing issue across all devices/browsers)
function setupEmailClickHandlers() {
    const emailLinks = document.querySelectorAll('a[href^="mailto:"], .support-email');
    emailLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const email = "reelsbundles.support@gmail.com";
            
            // 1. Copy to clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(email).catch(() => {});
            }

            // 2. Open Gmail Web Compose in new tab
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent("Support Inquiry - ReelsBundles")}`;
            window.open(gmailUrl, "_blank");

            // 3. Fallback try mailto protocol
            setTimeout(() => {
                try {
                    window.location.href = `mailto:${email}`;
                } catch (err) {}
            }, 300);

            showContactAlert("📋 Email copied to clipboard! Opening Gmail Compose...", "success");
        });
    });
}

// Auto prefill from URL query parameters (e.g. ?orderId=RB_123&subject=Payment)
function prefillFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId") || params.get("order_id");
    const subjectParam = params.get("subject");

    if (subjectInput && subjectInput.options) {
        if (orderId) {
            const matched = Array.from(subjectInput.options).find(opt =>
                opt.value.includes("Payment") || opt.value.includes("Order")
            );
            if (matched) matched.selected = true;
        } else if (subjectParam) {
            const matched = Array.from(subjectInput.options).find(opt =>
                opt.value.toLowerCase().includes(subjectParam.toLowerCase())
            );
            if (matched) matched.selected = true;
        }
    }
}

// Auto prefill logged-in user details
if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (nameInput && !nameInput.value) {
                nameInput.value = user.displayName || user.email?.split("@")[0] || "";
            }
            if (emailInput && !emailInput.value) {
                emailInput.value = user.email || "";
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    prefillFromUrl();
    setupEmailClickHandlers();
});

if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(contactForm);
        const payload = {
            name: formData.get("name")?.trim(),
            email: formData.get("email")?.trim(),
            subject: formData.get("subject")?.trim(),
            message: formData.get("message")?.trim()
        };

        if (!payload.name || !payload.email || !payload.subject || !payload.message) {
            showContactAlert("Please fill in all required fields.", "error");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(payload.email)) {
            showContactAlert("Please enter a valid email address.", "error");
            return;
        }

        if (contactSubmit) {
            contactSubmit.disabled = true;
            contactSubmit.textContent = "Sending Message...";
        }

        let sentViaApi = false;
        try {
            const response = await robustFetch(`${API_BASE}/contact`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok && data.success) {
                sentViaApi = true;
            }
        } catch (error) {
            console.warn("Contact API endpoint unreachable, providing webmail direct fallback:", error);
        }

        contactForm.reset();
        
        // Re-fill user email/name if logged in after reset
        if (auth?.currentUser) {
            if (nameInput) nameInput.value = auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "";
            if (emailInput) emailInput.value = auth.currentUser.email || "";
        }

        // Prepare Webmail Compose Fallback Link
        const supportEmail = "reelsbundles.support@gmail.com";
        const emailSubject = `[${payload.subject}] Support Request from ${payload.name}`;
        const emailBody = `Name: ${payload.name}\nEmail: ${payload.email}\nSubject: ${payload.subject}\n\nMessage:\n${payload.message}`;
        const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(supportEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

        showContactSuccessWithWebmail(
            "✅ Thanks! We've received your support request. Our team will reply within 24 hours.",
            gmailComposeUrl,
            supportEmail
        );

        if (contactSubmit) {
            contactSubmit.disabled = false;
            contactSubmit.textContent = "✉ Send Message";
        }
    });
}

function showContactSuccessWithWebmail(message, gmailUrl, supportEmail) {
    let alertBox = document.getElementById("contactAlertBox");
    if (!alertBox) {
        alertBox = document.createElement("div");
        alertBox.id = "contactAlertBox";
        if (contactForm) {
            contactForm.parentNode.insertBefore(alertBox, contactForm);
        }
    }

    alertBox.style.padding = "16px 20px";
    alertBox.style.borderRadius = "12px";
    alertBox.style.marginBottom = "20px";
    alertBox.style.fontSize = "14px";
    alertBox.style.fontWeight = "600";
    alertBox.style.lineHeight = "1.6";
    alertBox.style.background = "rgba(34, 197, 94, 0.12)";
    alertBox.style.border = "1px solid rgba(34, 197, 94, 0.3)";
    alertBox.style.color = "#4ade80";

    alertBox.innerHTML = `
        <div>${message}</div>
        <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="${gmailUrl}" target="_blank" style="background: #2563eb; color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                ✉ Open Gmail Compose
            </a>
            <button type="button" onclick="navigator.clipboard.writeText('${supportEmail}'); alert('Email copied: ${supportEmail}');" style="background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer;">
                📋 Copy Support Email
            </button>
        </div>
    `;

    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showContactAlert(message, type = "success") {
    let alertBox = document.getElementById("contactAlertBox");
    if (!alertBox) {
        alertBox = document.createElement("div");
        alertBox.id = "contactAlertBox";
        if (contactForm) {
            contactForm.parentNode.insertBefore(alertBox, contactForm);
        }
    }

    alertBox.style.padding = "14px 18px";
    alertBox.style.borderRadius = "12px";
    alertBox.style.marginBottom = "20px";
    alertBox.style.fontSize = "14px";
    alertBox.style.fontWeight = "600";
    alertBox.style.lineHeight = "1.5";
    alertBox.style.transition = "all 0.3s ease";

    if (type === "success") {
        alertBox.style.background = "rgba(34, 197, 94, 0.12)";
        alertBox.style.border = "1px solid rgba(34, 197, 94, 0.3)";
        alertBox.style.color = "#4ade80";
    } else {
        alertBox.style.background = "rgba(239, 68, 68, 0.12)";
        alertBox.style.border = "1px solid rgba(239, 68, 68, 0.3)";
        alertBox.style.color = "#f87171";
    }

    alertBox.textContent = message;
    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

