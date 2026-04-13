# RSC From Scratch

Implementation of React Server Components from scratch, based on the tutorial [RSC From Scratch. Part 1](https://github.com/reactwg/server-components/discussions/5) by Dan Abramov.

## What was built

A blog with two pages (post list and individual post) that demonstrates how RSC works under the hood.

## Architecture

```
Browser
  ↕ HTTP (port 3000)
SSR Server (server/ssr.js)
  ↕ HTTP (port 3001)
RSC Server (server/rsc.js)
  ↕ fs
posts/*.txt
```

**RSC Server** — executes components, reads files, returns JSX as JSON.

**SSR Server** — receives JSX from RSC, generates HTML for initial load or passes JSX through for navigation.

**Client** — intercepts navigation, fetches JSX from server, passes it to React for DOM updates.

## Implementation Steps

**Step 1 — JSX**
Replaced template literals with JSX. Wrote a custom `renderJSXToHTML` that converts JSX objects to an HTML string with automatic escaping.

**Step 2 — Components**
Split HTML into function components. `renderJSXToHTML` learned to call functions when `jsx.type` is a function.

**Step 3 — Routing**
Added `Router` component, `BlogIndexPage`, `BlogPostPage`. 404 handling, path traversal protection via `sanitize-filename`.

**Step 4 — Async Components**
Components fetch their own data via `async/await`. `renderJSXToClientJSX` executes all components and returns a tree of only native HTML elements.

**Step 5 — Preserving State on Navigation**
- 5.1: Intercept clicks, `fetch` HTML, `history.pushState`
- 5.2: Server returns JSX as JSON via `?jsx` parameter. Symbol is serialized as `"$RE"`
- 5.3: `hydrateRoot` + `root.render()` — React updates only changed parts of the DOM, `<input>` state is preserved

**Step 6 — Clean Up**
- Components execute only once (first `renderJSXToClientJSX`, then `renderToString`)
- Replaced custom `renderJSXToHTML` with React's `renderToString`
- Split into two servers: RSC and SSR

## Challenges

Ideas from the original article for further exploration:

1. **Background animation** — add a random background color to `<body>` with a CSS transition on navigation
2. **Fragment support** — implement `<>...</>` syntax in the RSC renderer
3. **Markdown** — use `react-markdown` to format blog posts
4. **Image optimization** — a component that automatically adds `width`/`height` attributes
5. **Comments** — a comment system stored in JSON files with a form that prevents page reloads
6. **Navigation caching** — Back/Forward buttons reuse cached responses while link clicks always fetch fresh data
7. **Component identity** — navigating between different posts should not preserve `<input>` state
8. **Payload optimization** — make JSX serialization more compact
9. **Client Components** — add support for components that execute in the browser (`"use client"`)

## Getting Started

```bash
npm install
npm start
```

Open `http://localhost:3000`

## Project Structure

```
server/
  rsc.js             — RSC server (port 3001)
  ssr.js             — SSR server (port 3000)
client.js            — client-side JS
posts/               — blog post text files
node-jsx-loader.js   — Babel loader for JSX in Node.js
```
