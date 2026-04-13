import { createServer } from 'http';
import { readFile } from 'fs/promises';

import { renderToString } from 'react-dom/server';

const reactElementReplacer = (key, value) => {
    if (value === Symbol.for("react.element") || value === Symbol.for("react.transitional.element")) {
        return "$RE";
    } else if (typeof value === "string" && value.startsWith("$")) {
        return "$" + value;
    }
    return value;
}

const reactElementReviewer = (key, value) => {
    if (value === "$RE") {
        return Symbol.for("react.transitional.element");
    } else if (typeof value === "string" && value.startsWith("$$")) {
        return value.slice(1);
    }
    return value;
}

async function fetchClientJSX(url) {
    const response = await fetch('http://localhost:3001' + url.pathname + '?jsx');
    if (!response.ok) {
        const error = new Error('RSC error');
        error.statusCode = response.status;
        throw error;
    }
    const jsonString = await response.text();
    return JSON.parse(jsonString, reactElementReviewer);
}

async function sendScript(res, filename) {
    const content = await readFile(filename, "utf8");
    res.setHeader('Content-Type', 'text/javascript');
    res.end(content);
}

async function sendHtml(res, url) {
    const clientJSX = await fetchClientJSX(url);
    const clientJSXString = JSON.stringify(clientJSX, reactElementReplacer, 2);
    let html = renderToString(clientJSX);
    html += `<script>window.__INITIAL_CLIENT_JSX_STRING__ =${JSON.stringify(clientJSXString)}</script>`;
    html += `<script type="module" src="/client.js"></script>`;
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
}

async function sendRSC(res, url) {
    const rscUrl = 'http://localhost:3001' + url.pathname + '?jsx';
    const content = await fetch(rscUrl);
    const text = await content.text();
    res.setHeader("Content-Type", "application/json");
    res.end(text);
}

createServer( async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (url.pathname === '/client.js') {
            await sendScript(res, "./client.js");
        } else if (url.searchParams.has('jsx')) {
            await sendRSC(res, url);
        }  else {
            await sendHtml(res, url);
        }
    }
    catch (err) {
        console.error(err);
        res.statusCode = err.statusCode ?? 500;
        res.end();
    }
}).listen(3000);