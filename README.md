# David Joy — work dashboard

A static, single-page portfolio. No build step and no dependencies.

## Files

- `index.html` — page structure
- `styles.css` — look and feel (light and dark themes)
- `app.js` — renders the page, filters and search
- `content.js` — **all the content**: `profile` (the snapshot), `journey` (the chapters, newest first), `library.profiles` (links such as Medium and Stack Overflow) and `items` (the library cards). A talk with a future date shows under "Upcoming talks" automatically.

## Add something

Open `content.js` and copy an entry in `items`:

```js
{ type: "writing", date: "2026-12-01", title: "Post title",
  description: "One sentence about it.",
  url: "https://…", source: "Where it was published", role: "Author", tags: ["ai"] },
```

- `type` is one of `project`, `integration`, `writing`, `video`, `podcast`, `talk`.
- `featured: true` pins the item to the top.
- `youtubeId: "…"` adds a video thumbnail.

## Preview locally

Open `index.html` in a browser. It works straight from the file system.

## Publish on GitHub Pages

Put these files at the root of the `david7joy.github.io` repository and enable Pages for the `main` branch.
