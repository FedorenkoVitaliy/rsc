let currentPathname = window.location.pathname;

document.addEventListener(
    'click',
    async(e) => {
        if (e.target.tagName !== "A") {
            return;
        }
        if (e.target.tagName === 'A') {
            e.preventDefault();
            await navigate(e.target.href);
        }
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
        }
        const href = e.target.getAttribute("href");
        if (!href.startsWith("/")) {
            return;
        }
        e.preventDefault();
        window.history.pushState(null, null, href);
        navigate(href);
    },
    true
);

async function navigate(pathname) {
    currentPathname = pathname;
    const response = await fetch(pathname + "?jsx");
    const jsonString = await response.text();
    if (pathname === currentPathname) {
        alert(jsonString);
    }
}

window.addEventListener("popstate", () => {
    navigate(window.location.pathname);
});
