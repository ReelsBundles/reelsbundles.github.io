function initNavbar() {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    // Handle scroll background blur
    const handleScroll = () => {
        if (window.scrollY > 20) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();

    // Mobile menu toggle
    const toggleBtn = navbar.querySelector(".navbar__toggle");
    const menu = navbar.querySelector(".navbar__menu");

    if (!toggleBtn || !menu) return;

    // Toggle menu state
    const toggleMenu = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const isOpen = menu.classList.toggle("active");
        navbar.classList.toggle("active-menu", isOpen);

        if (isOpen) {
            toggleBtn.innerHTML = "✕";
            toggleBtn.setAttribute("aria-expanded", "true");
            document.body.style.overflow = "hidden";
        } else {
            toggleBtn.innerHTML = "☰";
            toggleBtn.setAttribute("aria-expanded", "false");
            document.body.style.overflow = "";
        }
    };

    toggleBtn.addEventListener("click", toggleMenu);

    // Close menu when clicking links inside menu
    menu.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (link && menu.classList.contains("active")) {
            menu.classList.remove("active");
            navbar.classList.remove("active-menu");
            toggleBtn.innerHTML = "☰";
            toggleBtn.setAttribute("aria-expanded", "false");
            document.body.style.overflow = "";
        }
    });

    // Close menu on click outside
    document.addEventListener("click", (e) => {
        if (menu.classList.contains("active") && !navbar.contains(e.target)) {
            menu.classList.remove("active");
            navbar.classList.remove("active-menu");
            toggleBtn.innerHTML = "☰";
            toggleBtn.setAttribute("aria-expanded", "false");
            document.body.style.overflow = "";
        }
    });

    // Close menu on ESC key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.classList.contains("active")) {
            menu.classList.remove("active");
            navbar.classList.remove("active-menu");
            toggleBtn.innerHTML = "☰";
            toggleBtn.setAttribute("aria-expanded", "false");
            document.body.style.overflow = "";
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavbar);
} else {
    initNavbar();
}