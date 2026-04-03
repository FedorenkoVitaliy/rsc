import { createServer } from 'http';
import { readFile } from 'fs/promises';
import escapeHtml from 'escape-html';

function sendHtml(res, html) {
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
}

createServer( async (req, res) => {
    const author = '(c) Vitalii, 2026'
    const postContent = await readFile('./posts/hello-world.txt','utf-8');

    sendHtml(res, `<html lang="eng">
      <head>
        <title>My blog</title>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <hr />
        </nav>
        <article>
          ${escapeHtml(postContent)}
        </article>
        <footer>
          <hr>
          <p><i>(c) ${escapeHtml(author)}, ${new Date().getFullYear()}</i></p>
        </footer>
      </body>
    </html>`);
}).listen(8080);