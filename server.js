import { createServer } from 'http';
import { readdir, readFile } from 'fs/promises';
import escapeHtml from 'escape-html';
import sanitizeFilename from "sanitize-filename";

const reactElementReplacer = (key, value) => {
    if (value === Symbol.for("react.element") || value === Symbol.for("react.transitional.element")) {
        return "$RE";
    } else if (typeof value === "string" && value.startsWith("$")) {
        return "$" + value;
    }
    return value;
}

async function sendScript(res, filename) {
    const content = await readFile(filename, "utf8");
    res.setHeader('Content-Type', 'text/javascript');
    res.end(content);
}

async function sendHtml(res, jsx) {
    const clientJSX = await renderJSXToClientJSX(jsx);
    const clientJSXString = JSON.stringify(clientJSX, reactElementReplacer, 2);
    let html = await renderJSXToHTML(clientJSX);
    html += `<script>window.__INITIAL_CLIENT_JSX_STRING__ =${JSON.stringify(clientJSXString)}</script>`;
    html += `<script type="module" src="/client.js"></script>`;
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
}

async function sendJSX(res, jsx) {
    const clientJSX = await renderJSXToClientJSX(jsx);
    const clientJSXString = JSON.stringify(clientJSX, reactElementReplacer, 2);
    res.setHeader("Content-Type", "application/json");
    res.end(clientJSXString);
}

function BlogLayout ({children}) {
    const author = 'Vitalii';
    const footerText = `(c) ${author}, ${new Date().getFullYear()}`

    return (
        <html lang="eng">
        <head>
            <title>My blog</title>
        </head>
        <body style="background: #000000bd">
            <nav>
                <a href="/">Home</a>
                <hr/>
                <input placeholder="Введи щось..." />
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

async function renderJSXToClientJSX(jsx) {
    if (
        typeof jsx === "string" ||
        typeof jsx === "number" ||
        typeof jsx === "boolean" ||
        jsx == null
    ) {
        // Don't need to do anything special with these types.
        return jsx;
    } else if (Array.isArray(jsx)) {
        // Process each item in an array.
        return Promise.all(jsx.map((child) => renderJSXToClientJSX(child)));
    } else if (jsx != null && typeof jsx === "object") {
        if (jsx.$$typeof === Symbol.for("react.element") || jsx.$$typeof === Symbol.for("react.transitional.element")) {
            if (typeof jsx.type === "string") {
                // This is a component like <div />.
                // Go over its props to make sure they can be turned into JSON.
                return {
                    ...jsx,
                    props: await renderJSXToClientJSX(jsx.props),
                };
            } else if (typeof jsx.type === "function") {
                // This is a custom React component (like <Footer />).
                // Call its function, and repeat the procedure for the JSX it returns.
                const Component = jsx.type;
                const props = jsx.props;
                const returnedJsx = await Component(props);
                return renderJSXToClientJSX(returnedJsx);
            } else throw new Error("Not implemented.");
        } else {
            // This is an arbitrary object (for example, props, or something inside of them).
            // Go over every value inside, and process it too in case there's some JSX in it.
            return Object.fromEntries(
                await Promise.all(
                    Object.entries(jsx).map(async ([propName, value]) => [
                        propName,
                        await renderJSXToClientJSX(value),
                    ])
                )
            );
        }
    } else throw new Error("Not implemented");
}

createServer( async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (url.pathname === '/client.js') {
            await sendScript(res, "./client.js");
        } else if (url.searchParams.has("jsx")) {
            url.searchParams.delete("jsx"); // Keep the url passed to the <Router> clean
            await sendJSX(res, <Router url={url} />);
        } else {
            await sendHtml(res, <Router url={url} />);
        }
    }
    catch (err) {
        console.error(err);
        res.statusCode = err.statusCode ?? 500;
        res.end();
    }
}).listen(8080);