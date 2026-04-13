import { hydrateRoot } from "https://esm.sh/react-dom/client";

const reactElementReviewer = (key, value) => {
    if (value === "$RE") {
        return Symbol.for("react.transitional.element");
    }
    return value;
}

const initialJSX = JSON.parse(window.__INITIAL_CLIENT_JSX_STRING__, reactElementReviewer);
const root = hydrateRoot(document, initialJSX);

let currentPathname = window.location.pathname;

document.addEventListener(
    'click',
    async(e) => {
        if (e.target.tagName !== "A") {
            return;
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
        const clientJSX = JSON.parse(jsonString, reactElementReviewer);
        root.render(clientJSX);
    }
}

window.addEventListener("popstate", () => {
    navigate(window.location.pathname);
});
