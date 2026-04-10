document.addEventListener('click', async(e) => {
    if (e.target.tagName === 'A') {
        e.preventDefault();
        await navigate(e.target.href);
    }
});

async function navigate (pathname) {
    const result = await fetch(pathname);
    const text = await result.text();
    document.body.innerHTML = text;
}