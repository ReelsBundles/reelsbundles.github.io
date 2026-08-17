import { auth } from "./firebase-client.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const API_BASE =
    window.REELS_BUNDLES_API_BASE ||
    (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:3000"
            : "https://reelsbundles-backend.onrender.com"
    );

const contactForm = document.getElementById("contactForm");
const contactSubmit = document.querySelector(".contact-submit");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const subjectInput = document.getElementById("subject");

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

        try {
            const response = await robustFetch(`${API_BASE}/api/contact`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to send message. Please try again.");
            }

            contactForm.reset();
            
            // Re-fill user email/name if logged in after reset
            if (auth?.currentUser) {
                if (nameInput) nameInput.value = auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "";
                if (emailInput) emailInput.value = auth.currentUser.email || "";
            }

            showContactAlert("✅ Thanks! We've received your message. Our support team will reply within 24 hours.", "success");

        } catch (error) {
            console.error("Contact form submission error:", error);
            showContactAlert(error.message || "Unable to send your message right now. Please try again later.", "error");
        } finally {
            if (contactSubmit) {
                contactSubmit.disabled = false;
                contactSubmit.textContent = "✉ Send Message";
            }
        }
    });
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
