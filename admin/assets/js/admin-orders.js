const token = localStorage.getItem("admin_token");
const RAW_API_BASE = window.REELS_BUNDLES_API_BASE || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://reelsbundles-backend.onrender.com"
);
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "");
let page = 1;

loadOrders();


async function loadOrders() {

    try {

        const search =
            document.getElementById("search").value.trim();

        const status =
            document.getElementById("status").value;


        const res = await robustFetch(
            `${API_BASE}/api/admin/orders?page=${page}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );


        if (!res.ok) {

            throw new Error(
                `Orders API Error: ${res.status}`
            );

        }


        const data = await res.json();


        const body =
            document.getElementById("ordersBody");


        body.innerHTML = "";


        if (
            !data.orders ||
            data.orders.length === 0
        ) {

            body.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="empty-orders"
                    >
                        No orders found
                    </td>
                </tr>
            `;

            return;

        }


        data.orders.forEach(order => {

            const orderId =
                order.orderId ||
                order.id ||
                "";


            const email =
                order.email ||
                "-";


            const amount =
                order.amount ??
                0;


            const paymentStatus =
                String(
                    order.paymentStatus ||
                    order.status ||
                    "UNKNOWN"
                ).toUpperCase();


            const createdAt =
                order.createdAt ||
                "-";


            let statusClass =
                "status-unknown";


            let statusIcon =
                "●";


            if (
                paymentStatus === "PAID" ||
                paymentStatus === "SUCCESS" ||
                paymentStatus === "COMPLETED"
            ) {

                statusClass =
                    "status-paid";

                statusIcon =
                    "●";

            }
            else if (
                paymentStatus === "PENDING"
            ) {

                statusClass =
                    "status-pending";

                statusIcon =
                    "●";

            }
            else if (
                paymentStatus === "FAILED" ||
                paymentStatus === "CANCELLED"
            ) {

                statusClass =
                    "status-failed";

                statusIcon =
                    "●";

            }


             body.innerHTML += `
        <tr>

            <td>
                ${orderId}
            </td>

            <td>
                ${order.email || "-"}
            </td>

            <td>
                ₹${order.amount || 0}
            </td>

            <td>
                ${order.paymentStatus || "-"}
            </td>

            <td>
                ${order.createdAt || "-"}
            </td>

            <td>

                <button
                    type="button"
                    class="delete-order-btn"
                    data-order-id="${orderId}"
                >
                    🗑️ Delete
                </button>

            </td>

        </tr>
    `;

});


        attachDeleteButtons();

        document.getElementById(
            "pageNumber"
        ).textContent = page;


    }
    catch (error) {

        console.error(
            "Failed to load orders:",
            error
        );


        document.getElementById(
            "ordersBody"
        ).innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="orders-error"
                >
                    Failed to load orders.
                    Please check the server.
                </td>

            </tr>

        `;

    }

}


/* ==========================================================
   DELETE ORDER
========================================================== */

function attachDeleteButtons() {

    document
        .querySelectorAll(".delete-order-btn")
        .forEach(button => {

            button.onclick =
                async function () {

                    const orderId =
                        this.dataset.orderId;


                    if (!orderId) {

                        alert(
                            "Order ID not found."
                        );

                        return;

                    }


                    const confirmed =
                        confirm(
                            `Are you sure you want to delete order ${orderId}?`
                        );


                    if (!confirmed) {

                        return;

                    }


                    try {

                        this.disabled = true;

                        this.textContent =
                            "Deleting...";


                        const res =
                            await robustFetch(
                                `${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}`,
                                {
                                    method: "DELETE",

                                    headers: {
                                        Authorization:
                                            `Bearer ${token}`
                                    }
                                }
                            );


                        const result =
                            await res.json()
                                .catch(() => ({}));


                        if (!res.ok) {

                            throw new Error(
                                result.message ||
                                `Delete failed: ${res.status}`
                            );

                        }


                        alert(
                            "Order deleted successfully."
                        );


                        await loadOrders();

                    }
                    catch (error) {

                        console.error(
                            "Delete order error:",
                            error
                        );


                        alert(
                            error.message ||
                            "Failed to delete order."
                        );


                        this.disabled = false;

                        this.innerHTML =
                            "🗑 Delete";

                    }

                };

        });

}


/* ==========================================================
   HTML ESCAPE
========================================================== */

function escapeHtml(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


/* ==========================================================
   REFRESH
========================================================== */

document
    .getElementById("refresh")
    .onclick = () => {

        loadOrders();

    };


/* ==========================================================
   SEARCH
========================================================== */

document
    .getElementById("search")
    .onkeyup = () => {

        page = 1;

        loadOrders();

    };


/* ==========================================================
   STATUS FILTER
========================================================== */

document
    .getElementById("status")
    .onchange = () => {

        page = 1;

        loadOrders();

    };


/* ==========================================================
   NEXT
========================================================== */

document
    .getElementById("next")
    .onclick = () => {

        page++;

        loadOrders();

    };


/* ==========================================================
   PREVIOUS
========================================================== */

document
    .getElementById("prev")
    .onclick = () => {

        if (page > 1) {

            page--;

            loadOrders();

        }

    };
    /* ==========================================================
   DELETE SINGLE ORDER
========================================================== */

export async function deleteOrder(orderId) {

    if (!orderId) {
        throw new Error("Order ID is required.");
    }

    const docRef = db
        .collection("payments")
        .doc(orderId);

    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error("Order not found.");
    }

    await docRef.delete();

    return true;
}


/* ==========================================================
   DELETE ALL ORDERS
========================================================== */

document
    .getElementById("deleteAllOrdersButton")
    .addEventListener(
        "click",
        async () => {

            const confirmed =
                confirm(
                    "⚠️ Are you sure you want to DELETE ALL ORDERS?\n\nThis action cannot be undone."
                );

            if (!confirmed) {
                return;
            }

            try {

                const res = await robustFetch(
                    `${API_BASE}/api/admin/orders/all`,
                    {
                        method: "DELETE",

                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

                const data =
                    await res.json();

                if (!res.ok) {

                    throw new Error(
                        data.message ||
                        "Delete all failed."
                    );

                }

                alert(
                    data.message ||
                    "All orders deleted successfully."
                );

                page = 1;

                await loadOrders();

            } catch (error) {

                console.error(
                    "[Admin Orders] Delete all failed:",
                    error
                );

                alert(
                    error.message ||
                    "Delete all failed."
                );

            }

        }
    );


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
