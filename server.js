import { createServer } from 'http';
import { readdir, readFile } from 'fs/promises';
import escapeHtml from 'escape-html';
import sanitizeFilename from "sanitize-filename";

function sendHtml(res, jsx) {
    const html = renderJSXToHTML(jsx)
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
}

function BlogLayout ({children}) {
    const author = 'Vitalii';
    const footerText = `(c) ${author}, ${new Date().getFullYear()}`

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
        <main>
            {children}
        </main>
        <Footer footerText={footerText} />
        </body>
        </html>
    )
}

function BlogIndexPage({ postSlugs, postContents }) {
    return (
        <section>
            <h1>Welcome to my blog</h1>
            <div>
                {postSlugs.map((postSlug, index) => (
                    <section key={postSlug}>
                        <h2>
                            <a href={"/" + postSlug}>{postSlug}</a>
                        </h2>
                        <article>{postContents[index]}</article>
                    </section>
                ))}
            </div>
        </section>
    );
}

function BlogPostPage ({postSlug, postContent}) {
     return (
        <section>
            <h2>
                <a href={"/" + postSlug}>{postSlug}</a>
                <hr/>
            </h2>
            <article>
                {postContent}
            </article>
        </section>
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
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const page = await matchRoute(url);

        sendHtml(
            res,
            <BlogLayout>
                {page}
            </BlogLayout>
        );
    }
    catch (err) {
        console.error(err);
        res.statusCode = err.statusCode ?? 500;
        res.end();
    }
}).listen(8080);

function throwNotFound(cause) {
    const notFound = new Error("Not found.", { cause });
    notFound.statusCode = 404;
    throw notFound;
}

async function matchRoute (url){
    if(url.pathname === '/'){
        const postFiles = await readdir('./posts');
        const postSlugs = postFiles.map((file) =>
            file.slice(0, file.lastIndexOf("."))
        );
        const postContents = await Promise.all(postFiles.map(async (postSlug) => {
            return await readFile(`./posts/${postSlug}`, 'utf-8');
        }));

        return <BlogIndexPage
            postSlugs={postSlugs}
            postContents={postContents}
        />
    } else {
        const postSlug = sanitizeFilename(url.pathname.slice(1));
        try{
            const postContent = await readFile(`./posts/${postSlug}.txt`, 'utf-8');
            return <BlogPostPage
                postSlug={postSlug}
                postContent={postContent}
            />
        }
        catch(err){
            throwNotFound(err);
        }
    }
}

function renderJSXToHTML(jsx) {
    if (typeof jsx === 'string' || typeof jsx === 'number') {
        return escapeHtml(String(jsx));
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