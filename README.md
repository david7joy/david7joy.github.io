# David Joy — The Idea Studio

A personal portfolio set at a 3D model of my real desk, served from this repository by GitHub Pages. There is no build step.

Every object on the desk opens a section: the main monitor (Work), the second monitor (My story), the microphone (Podcast), the terminal laptop (Rig), the chat laptop (Contact), the stack of pages (Writing) and the wall calendar (Talks). The room's light follows the time in Dallas; add `?hour=22` to the URL to preview another hour.

## Files

- `index.html` — page structure, the intro screen and the panel templates
- `content.js` — **all the content**: `items` (the library cards), `journey` (the story chapters), `stats` and `profile`
- `library.js`, `library.css` — the content library: cards, filters and search for Work, Podcast, Writing and Talks
- `app.js` — intro, panels, routes (`#work`, `#podcast`, `#writing`, `#talks`, `#story`, `#contact`, `#rig`), keys 1–6, the exploration tracker, the Dallas clock
- `world.js` — the Three.js scene: the desk, canvas-drawn screens, lighting, object picking, camera close-ups (`focusViews`)
- `studio.css`, `world.css` — design tokens (fonts and colours are at the top of `studio.css`), layout and panels
- `game.css` — the intro, HUD, tracker, docked panel and type scale
- `assets/logos/` — brand marks for the desk stickers. Most are from Simple Icons (CC0 files; the marks remain their owners' trademarks); the Fiserv and UT Dallas logos are from Wikimedia Commons
- `vendor/` — Three.js 0.180.0 and helpers (MIT, see `vendor/THREE-LICENSE.txt`)

After changing a stylesheet or script, bump the `?v=` value on its link in `index.html` so browsers fetch the new file.

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
