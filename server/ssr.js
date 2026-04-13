import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { renderToString } from 'react-dom/server';

const RSC_URL = 'http://localhost:3001';

const reactElementReviver = (key, value) => {
    if (value === "$RE") {
        return Symbol.for("react.transitional.element");
    } else if (typeof value === "string" && value.startsWith("$$")) {
        return value.slice(1);
    }
    return value;
}

async function sendScript(res, filename) {
    const content = await readFile(filename, "utf8");
    res.setHeader('Content-Type', 'text/javascript');
    res.end(content);
}

async function fetchFromRSC(url) {
    const response = await fetch(RSC_URL + url.pathname);
    if (!response.ok) {
        const error = new Error('RSC error');
        error.statusCode = response.status;
        throw error;
    }
    return response;
}

async function sendHtml(res, clientJSXString) {
    const clientJSX = JSON.parse(clientJSXString, reactElementReviver);
    let html = renderToString(clientJSX);
    html += `<script>window.__INITIAL_CLIENT_JSX_STRING__ = `;
    html += JSON.stringify(clientJSXString).replace(/</g, "\\u003c");
    html += `</script>`;
    html += `
        <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@canary",
              "react-dom/client": "https://esm.sh/react-dom@canary/client"
            }
          }
        </script>
        <script type="module" src="/client.js"></script>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
}

createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (url.pathname === '/client.js') {
            await sendScript(res, "./client.js");
            return;
        }
        const response = await fetchFromRSC(url);
        const clientJSXString = await response.text();
        if (url.searchParams.has('jsx')) {
            res.setHeader("Content-Type", "application/json");
            res.end(clientJSXString);
        } else {
            await sendHtml(res, clientJSXString);
        }
    } catch (err) {
        console.error(err);
        res.statusCode = err.statusCode ?? 500;
        res.end();
    }
}).listen(3000);
