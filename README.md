# David Joy — The Idea Studio

A personal portfolio inside a real-time 3D studio, served from this repository by GitHub Pages. There is no build step.

## Files

- `index.html` — page structure and the panel templates (Work, Rig, Podcast, Writing, Talks, My story, Contact)
- `content.js` — **all the content**: `items` (the library cards), `journey` (the story chapters, newest first), `stats` and `profile`
- `library.js`, `library.css` — the content library: cards, filters and search for Work, Podcast, Writing and Talks
- `app.js` — panels, routes (`#work`, `#podcast`, `#writing`, `#talks`, `#story`, `#contact`), keyboard shortcuts 1–6, the Dallas clock
- `studio.css`, `world.css` — design tokens, typography and layout
- `world.js` — the Three.js scene: geometry, lighting, shaders, object picking and camera controls
- `vendor/` — Three.js 0.180.0 and helpers (MIT, see `vendor/THREE-LICENSE.txt`)
- `assets/studio-panorama.png` — the still image shown when WebGL is unavailable

## Add something

Open `content.js` and copy an entry in `items`:

```js
{ type: "writing", date: "2026-12-01", title: "Post title",
  description: "One sentence about it.",
  url: "https://…", source: "Where it was published", role: "Author", tags: ["ai"] },
```

- `type` is one of `project`, `integration`, `writing`, `video`, `podcast`, `talk`.
- `featured: true` puts the item in the Featured row.
- `youtubeId: "…"` adds a video thumbnail.
- A talk with a future date is marked Upcoming and sorted first.

## Preview locally

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

The page uses JavaScript modules, so it needs a local server and will not run from the file system.
