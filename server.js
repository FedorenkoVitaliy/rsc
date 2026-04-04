import { createServer } from 'http';
import { readFile } from 'fs/promises';
import escapeHtml from 'escape-html';

function sendHtml(res, jsx) {
    const html = renderJSXToHTML(jsx)
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
}

createServer( async (req, res) => {
    const author = 'Vitalii'
    const postContent = await readFile('./posts/hello-world.txt','utf-8');

    sendHtml(res,
        <html lang="eng">
            <head>
                <title>My blog</title>
            </head>
            <body>
            <nav>
                <a href="/">Home</a>
                <hr/>
            </nav>
            <article>
                {postContent}
            </article>
            <footer>
                <hr/>
                <p><i>{`(c) ${author}, ${new Date().getFullYear()}`}</i></p>
            </footer>
            </body>
        </html>
    );
}).listen(8080);

function renderJSXToHTML(value) {
    if (typeof value === 'string' || typeof value === 'number') {
        return escapeHtml(String(value));
    }

    if (typeof value === "boolean" || value == null) {
        return "";
    }

    if(Array.isArray(value)){
        return value.map((item) => renderJSXToHTML(item)).join("");
    }

    if(!value.props.children){
        return `<${value.type}>`;
    }

    if (typeof value === 'object') {
        const {children, ...props} = value.props;
        let attrs = '';
        for (const prop in props) {
            attrs += ` ${prop}="${escapeHtml(props[prop])}"`;
        }

        return `<${value.type}${attrs}>${renderJSXToHTML(value.props.children)}</${value.type}>`
    }
}