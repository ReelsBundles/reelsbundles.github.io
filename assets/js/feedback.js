/* ==========================================================
   REELSBUNDLES — MANDATORY CUSTOMER FEEDBACK & LIVE REVIEWS
   Handles buyer review submission on dashboard.html & downloads.html
   and live reviews rendering on index.html.
========================================================== */

import { robustFetch, getFirebaseIdToken } from "./auth-common.js";
import { auth } from "./firebase-client.js";

const API_BASE =
    window.REELS_BUNDLES_API_BASE ||
    (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:3000/api"
            : "https://reelsbundles-backend.onrender.com/api"
    );

let selectedStarRating = 5;

export function renderFeedbackWidget(containerId = "feedbackWidgetContainer") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const user = auth.currentUser;
    const defaultName = user?.displayName || (user?.email ? user.email.split("@")[0] : "");

    container.innerHTML = `
        <div class="feedback-card" style="background: rgba(17, 24, 39, 0.7); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 16px; padding: 24px; margin-top: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 28px;">⭐</span>
                <div>
                    <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: #f3f4f6;">Share Your Experience & Feedback</h3>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #9ca3af;">All fields are mandatory (*). Help us maintain 99% customer satisfaction!</p>
                </div>
            </div>

            <form id="feedbackForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="grid-column: span 1;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #d1d5db; margin-bottom: 6px;">Full Name *</label>
                    <input type="text" id="fbCustomerName" required value="${defaultName}" placeholder="Enter your full name" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: rgba(31, 41, 55, 0.8); border: 1px solid #374151; color: #fff; font-size: 14px;" />
                </div>

                <div style="grid-column: span 1;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #d1d5db; margin-bottom: 6px;">Purchased Bundle *</label>
                    <select id="fbBundlePlan" required style="width: 100%; padding: 10px 14px; border-radius: 8px; background: rgba(31, 41, 55, 0.8); border: 1px solid #374151; color: #fff; font-size: 14px;">
                        <option value="basic">Basic Bundle (₹49)</option>
                        <option value="premium" selected>Premium Bundle (₹69)</option>
                    </select>
                </div>

                <div style="grid-column: span 2;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #d1d5db; margin-bottom: 6px;">Overall Star Rating *</label>
                    <div id="starRatingGroup" style="display: flex; gap: 8px; cursor: pointer; font-size: 24px; color: #f59e0b;">
                        <span data-star="1" style="transition: transform 0.1s;">★</span>
                        <span data-star="2" style="transition: transform 0.1s;">★</span>
                        <span data-star="3" style="transition: transform 0.1s;">★</span>
                        <span data-star="4" style="transition: transform 0.1s;">★</span>
                        <span data-star="5" style="transition: transform 0.1s;">★</span>
                    </div>
                </div>

                <div style="grid-column: span 1;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #d1d5db; margin-bottom: 6px;">Content & Download Quality *</label>
                    <select id="fbQualityRating" required style="width: 100%; padding: 10px 14px; border-radius: 8px; background: rgba(31, 41, 55, 0.8); border: 1px solid #374151; color: #fff; font-size: 14px;">
                        <option value="5/5 Excellent Quality" selected>5/5 Excellent Quality</option>
                        <option value="4/5 Good Quality">4/5 Good Quality</option>
                        <option value="3/5 Average Quality">3/5 Average Quality</option>
                    </select>
                </div>

                <div style="grid-column: span 1;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #d1d5db; margin-bottom: 6px;">Support & Experience *</label>
                    <select id="fbSupportRating" required style="width: 100%; padding: 10px 14px; border-radius: 8px; background: rgba(31, 41, 55, 0.8); border: 1px solid #374151; color: #fff; font-size: 14px;">
                        <option value="10/10 Excellent Experience" selected>10/10 Excellent Experience</option>
                        <option value="9/10 Great Experience">9/10 Great Experience</option>
                        <option value="8/10 Good Experience">8/10 Good Experience</option>
                    </select>
                </div>

                <div style="grid-column: span 2;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #d1d5db; margin-bottom: 6px;">Detailed Review / Feedback *</label>
                    <textarea id="fbComment" required minlength="10" rows="3" placeholder="Share how ReelsBundles helped your page grow..." style="width: 100%; padding: 10px 14px; border-radius: 8px; background: rgba(31, 41, 55, 0.8); border: 1px solid #374151; color: #fff; font-size: 14px; resize: vertical;"></textarea>
                </div>

                <div style="grid-column: span 2; display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
                    <div id="feedbackStatusMsg" style="font-size: 14px; font-weight: 600;"></div>
                    <button type="submit" id="submitFeedbackBtn" style="padding: 12px 24px; border-radius: 8px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; border: none; font-weight: 700; font-size: 15px; cursor: pointer; transition: opacity 0.2s;">
                        💬 Submit Feedback
                    </button>
                </div>
            </form>
        </div>
    `;

    // Star Selection Event Listener
    const starGroup = document.getElementById("starRatingGroup");
    if (starGroup) {
        starGroup.addEventListener("click", (e) => {
            const star = e.target.closest("[data-star]");
            if (star) {
                selectedStarRating = Number(star.getAttribute("data-star"));
                updateStarDisplay(selectedStarRating);
            }
        });
    }

    // Form Submit Event Listener
    const form = document.getElementById("feedbackForm");
    if (form) {
        form.addEventListener("submit", handleFeedbackSubmit);
    }
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll("#starRatingGroup [data-star]");
    stars.forEach((s, idx) => {
        if (idx < rating) {
            s.style.color = "#f59e0b";
            s.style.opacity = "1";
        } else {
            s.style.color = "#4b5563";
            s.style.opacity = "0.5";
        }
    });
}

async function handleFeedbackSubmit(event) {
    event.preventDefault();

    const customerName = document.getElementById("fbCustomerName")?.value.trim();
    const bundlePlan = document.getElementById("fbBundlePlan")?.value;
    const qualityRating = document.getElementById("fbQualityRating")?.value;
    const supportRating = document.getElementById("fbSupportRating")?.value;
    const comment = document.getElementById("fbComment")?.value.trim();
    const statusMsg = document.getElementById("feedbackStatusMsg");
    const submitBtn = document.getElementById("submitFeedbackBtn");

    // Strict 100% Mandatory Validation
    if (!customerName || !bundlePlan || !qualityRating || !supportRating || !comment) {
        if (statusMsg) {
            statusMsg.textContent = "⚠️ All fields are mandatory. Please fill out all fields.";
            statusMsg.style.color = "#ef4444";
        }
        return;
    }

    if (comment.length < 10) {
        if (statusMsg) {
            statusMsg.textContent = "⚠️ Review comment must be at least 10 characters.";
            statusMsg.style.color = "#ef4444";
        }
        return;
    }

    if (statusMsg) {
        statusMsg.textContent = "Submitting feedback...";
        statusMsg.style.color = "#a78bfa";
    }
    if (submitBtn) submitBtn.disabled = true;

    try {
        const token = await getFirebaseIdToken();
        if (!token) {
            throw new Error("Please log in to submit feedback.");
        }

        const response = await robustFetch(`${API_BASE}/reviews`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                customerName,
                bundlePlan,
                rating: selectedStarRating,
                qualityRating,
                supportRating,
                comment
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Feedback submission failed.");
        }

        if (statusMsg) {
            statusMsg.textContent = data.message || "✓ Thank you for your feedback!";
            statusMsg.style.color = "#4ade80";
        }

        // Reset comment area on success
        const commentInput = document.getElementById("fbComment");
        if (commentInput) commentInput.value = "";
    } catch (err) {
        if (statusMsg) {
            statusMsg.textContent = `❌ ${err.message}`;
            statusMsg.style.color = "#ef4444";
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

export async function loadPublicCustomerReviews(containerId = "liveReviewsContainer") {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await robustFetch(`${API_BASE}/reviews`, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        if (!response || !response.ok) return;
        const data = await response.json().catch(() => null);
        if (!data || !data.success) return;

        const reviews = data.reviews || [];
        const stats = data.stats || {};

        if (reviews.length === 0) return;

        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 32px;">
        `;

        reviews.slice(0, 6).forEach(r => {
            const stars = "★".repeat(r.rating || 5);
            html += `
                <div class="review-card" style="background: rgba(17, 24, 39, 0.8); border: 1px solid rgba(124, 58, 237, 0.25); border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-weight: 700; color: #f3f4f6; font-size: 16px;">${r.customerName}</span>
                        <span style="color: #4ade80; font-size: 12px; font-weight: 600; background: rgba(74, 222, 128, 0.1); padding: 4px 8px; border-radius: 12px;">✓ Verified Buyer</span>
                    </div>
                    <div style="color: #f59e0b; font-size: 18px; margin-bottom: 10px;">${stars}</div>
                    <p style="color: #d1d5db; font-size: 14px; line-height: 1.5; margin: 0 0 12px 0;">"${r.comment}"</p>
                    <div style="display: flex; gap: 12px; font-size: 12px; color: #9ca3af; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
                        <span>🎬 ${r.qualityRating || "5/5 Quality"}</span>
                        <span>⚡ ${r.supportRating || "10/10 Support"}</span>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    } catch (e) {
        console.warn("[Reviews Loader] Unable to load public customer reviews:", e.message);
    }
}
