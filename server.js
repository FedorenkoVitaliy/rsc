import { createServer } from 'http';
import { readdir, readFile } from 'fs/promises';
import escapeHtml from 'escape-html';
import sanitizeFilename from "sanitize-filename";

async function sendHtml(res, jsx) {
    const html = await renderJSXToHTML(jsx)
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

async function Post ({ postSlug }){
    try{
        const postContent = await readFile(`./posts/${postSlug}.txt`, 'utf-8');
        return (
            <section key={postSlug}>
                <h2>
                    <a href={"/" + postSlug}>{postSlug}</a>
                </h2>
                <article>{postContent}</article>
            </section>
        )
    }
    catch(err){
        throwNotFound(err);
    }
}

async function BlogIndexPage() {
    const postFiles = await readdir('./posts');
    const postSlugs = postFiles.map((file) =>
        file.slice(0, file.lastIndexOf("."))
    );

    return (
        <section>
            <h1>Welcome to my blog</h1>
            <div>
                {postSlugs.map((postSlug) => (
                    <Post
                        key={postSlug}
                        postSlug={postSlug}
                    />
                ))}
            </div>
        </section>
    );
}

function BlogPostPage ({postSlug}) {
     return (
         <Post
             key={postSlug}
             postSlug={postSlug}
         />
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
        await sendHtml(res, <Router url={url} />);
    }
    catch (err) {
        res.statusCode = err.statusCode ?? 500;
        res.end();
    }
}).listen(8080);

function throwNotFound(cause) {
    const notFound = new Error("Not found", { cause });
    notFound.statusCode = 404;
    throw notFound;
}

async function Router ({ url }){
    let page;
    if(url.pathname === '/'){
        page =  <BlogIndexPage/>
    } else {
        const postSlug = sanitizeFilename(url.pathname.slice(1));
        page = <BlogPostPage postSlug={postSlug}/>
    }
    return  <BlogLayout>{page}</BlogLayout>
}

async function renderJSXToHTML(jsx) {
    if (typeof jsx === 'string' || typeof jsx === 'number') {
        return escapeHtml(String(jsx));
    }

    if (typeof jsx === "boolean" || jsx == null) {
        return "";
    }

    if(Array.isArray(jsx)){
        return (await Promise.all(jsx.map(item => renderJSXToHTML(item)))).join("");
    }

    if(typeof jsx.type === 'function'){
        const Component = jsx.type;
        const result = await Component(jsx.props)
        return await renderJSXToHTML(result);
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

        const component = await renderJSXToHTML(jsx.props.children);

        return `<${jsx.type}${attrs}>${component}</${jsx.type}>`
    }
}