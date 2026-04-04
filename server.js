import { createServer } from 'http';
import { readFile } from 'fs/promises';
import escapeHtml from 'escape-html';

function sendHtml(res, jsx) {
    const html = renderJSXToHTML(jsx)
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
}

function BlogPostPage ({postContent, footerText}) {
     return (
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
        <Footer footerText={footerText} />
        </body>
        </html>
    )
}

function Footer (props) {
    return(
        <footer>
            <hr/>
            <p><i>{ props.footerText }</i></p>
        </footer>
    )
}

createServer( async (req, res) => {
    const author = 'Vitalii';
    const footerText = `(c) ${author}, ${new Date().getFullYear()}`
    const postContent = await readFile('./posts/hello-world.txt','utf-8');

    sendHtml(
        res,
        <BlogPostPage
            postContent={postContent}
            footerText={footerText}
        />
    );
}).listen(8080);

function renderJSXToHTML(jsx) {
    if (typeof jsx === 'string' || typeof jsx === 'number') {
        return escapeHtml(String(value));
    }

    if (typeof jsx === "boolean" || jsx == null) {
        return "";
    }

    if(Array.isArray(jsx)){
        return jsx.map((item) => renderJSXToHTML(item)).join("");
    }

    if(typeof jsx.type === 'function'){
        const Component = jsx.type;
        return renderJSXToHTML(Component(jsx.props));
    }

    if(!jsx.props.children){
        return `<${jsx.type}>`;
    }

    if (typeof jsx === 'object') {
        const {children, ...props} = jsx.props;
        let attrs = '';
        for (const prop in props) {
            attrs += ` ${prop}="${escapeHtml(props[prop])}"`;
        }

        return `<${jsx.type}${attrs}>${renderJSXToHTML(jsx.props.children)}</${jsx.type}>`
    }
}